import json
import re
from pathlib import Path
from typing import Any, Dict, FrozenSet, Optional, Tuple

import yaml
from fastapi import HTTPException, status

from app.schemas.mock_api import MockApiImportPreview

HTTP_METHODS = ("get", "put", "post", "delete", "patch", "head", "options", "trace")
JSON_MEDIA_TYPE = "application/json"
_MISSING = object()


def _resolve_local_references(
    value: Any,
    document: Dict[str, Any],
    active_refs: FrozenSet[str] = frozenset(),
) -> Any:
    if isinstance(value, list):
        return [_resolve_local_references(item, document, active_refs) for item in value]
    if not isinstance(value, dict):
        return value

    reference = value.get("$ref")
    if isinstance(reference, str) and reference.startswith("#/"):
        if reference in active_refs:
            return {"$ref": reference}
        resolved = document
        for token in reference[2:].split("/"):
            token = token.replace("~1", "/").replace("~0", "~")
            if isinstance(resolved, list):
                try:
                    resolved = resolved[int(token)]
                except (ValueError, IndexError) as error:
                    raise ValueError(
                        f"Unresolvable local reference: {reference}"
                    ) from error
            elif isinstance(resolved, dict) and token in resolved:
                resolved = resolved[token]
            else:
                raise ValueError(f"Unresolvable local reference: {reference}")
        resolved = _resolve_local_references(
            resolved, document, active_refs | {reference}
        )
        siblings = {key: item for key, item in value.items() if key != "$ref"}
        if siblings and isinstance(resolved, dict):
            resolved = {**resolved, **siblings}
        return resolved

    return {
        key: _resolve_local_references(item, document, active_refs)
        for key, item in value.items()
    }


def _json_media_type(content: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(content, dict):
        return None
    for media_type, media in content.items():
        if (
            isinstance(media_type, str)
            and media_type.lower() == JSON_MEDIA_TYPE
            and isinstance(media, dict)
        ):
            return media
    for media_type, media in content.items():
        if (
            isinstance(media_type, str)
            and media_type.lower().endswith("+json")
            and isinstance(media, dict)
        ):
            return media
    return None


def _schema_and_example(
    media: Optional[Dict[str, Any]], document: Dict[str, Any]
) -> Tuple[Any, Any]:
    if media is None:
        return None, _MISSING

    raw_schema = media.get("schema", _MISSING)
    schema = (
        _resolve_local_references(raw_schema, document)
        if raw_schema is not _MISSING
        else None
    )

    if "example" in media:
        return schema, media["example"]
    media_examples = media.get("examples")
    if isinstance(media_examples, dict):
        for example in media_examples.values():
            if isinstance(example, dict) and "value" in example:
                return schema, example["value"]
    if isinstance(schema, dict):
        if "example" in schema:
            return schema, schema["example"]
        examples = schema.get("examples")
        if isinstance(examples, list) and examples:
            return schema, examples[0]
    return schema, _MISSING


def _selected_response(operation: Dict[str, Any]) -> Tuple[Optional[int], Any]:
    responses = operation.get("responses")
    if not isinstance(responses, dict) or not responses:
        return None, None

    status_codes = []
    for code in responses:
        try:
            numeric_code = int(code)
        except (TypeError, ValueError):
            continue
        if 100 <= numeric_code <= 599:
            status_codes.append(numeric_code)

    successful_codes = sorted(code for code in status_codes if 200 <= code <= 299)
    if 200 in successful_codes:
        selected_code = 200
    elif successful_codes:
        selected_code = successful_codes[0]
    elif status_codes:
        selected_code = min(status_codes)
    elif "default" in responses:
        return None, responses["default"]
    else:
        return None, None

    response = responses.get(str(selected_code), responses.get(selected_code))
    return selected_code, response


def _preview_endpoint(
    method: str, path: str, operation: Dict[str, Any], document: Dict[str, Any]
) -> Dict[str, Any]:
    endpoint: Dict[str, Any] = {"method": method.upper(), "path": path}

    status_code, response = _selected_response(operation)
    if status_code is not None:
        endpoint["status_code"] = status_code
    resolved_response = _resolve_local_references(response, document)
    response_media = _json_media_type(
        resolved_response.get("content")
        if isinstance(resolved_response, dict)
        else None
    )
    response_schema, response_example = _schema_and_example(response_media, document)
    if response_schema is not None:
        endpoint["response_schema"] = response_schema
    if response_example is not _MISSING:
        endpoint["response_example"] = response_example

    request_body = _resolve_local_references(operation.get("requestBody"), document)
    request_media = _json_media_type(
        request_body.get("content") if isinstance(request_body, dict) else None
    )
    request_schema, request_example = _schema_and_example(request_media, document)
    if request_schema is not None:
        endpoint["request_body_schema"] = request_schema
    if request_example is not _MISSING:
        endpoint["request_body_example"] = request_example

    return endpoint


def parse_openapi_document(filename: str, contents: bytes) -> MockApiImportPreview:
    extension = Path(filename).suffix.lower()
    if extension not in {".json", ".yaml", ".yml"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .json, .yaml, and .yml OpenAPI files are supported",
        )

    try:
        document_text = contents.decode("utf-8")
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded") from error

    try:
        document: Any
        if extension == ".json":
            document = json.loads(document_text)
        else:
            document = yaml.safe_load(document_text)
    except (json.JSONDecodeError, yaml.YAMLError) as error:
        raise HTTPException(status_code=400, detail="Invalid OpenAPI document") from error

    if not isinstance(document, dict):
        raise HTTPException(status_code=400, detail="Invalid OpenAPI document")

    openapi_version = document.get("openapi")
    if not isinstance(openapi_version, str) or not re.fullmatch(
        r"3\.\d+\.\d+", openapi_version
    ):
        raise HTTPException(status_code=400, detail="Only OpenAPI 3.x documents are supported")

    info = document.get("info")
    title = info.get("title") if isinstance(info, dict) else None
    if not isinstance(title, str) or not title.strip():
        raise HTTPException(status_code=400, detail="OpenAPI document must include info.title")

    paths = document.get("paths")
    if not isinstance(paths, dict) or not paths:
        raise HTTPException(status_code=400, detail="OpenAPI document must include paths")

    try:
        endpoints = []
        for path, path_item in paths.items():
            if (
                not isinstance(path, str)
                or not path.startswith("/")
                or not isinstance(path_item, dict)
            ):
                raise HTTPException(
                    status_code=400,
                    detail="OpenAPI paths must map paths to objects",
                )
            for method in HTTP_METHODS:
                if method in path_item:
                    operation = path_item[method]
                    if not isinstance(operation, dict):
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"OpenAPI operation for {method.upper()} {path} "
                                "must be an object"
                            ),
                        )
                    endpoints.append(
                        _preview_endpoint(method, path, operation, document)
                    )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return MockApiImportPreview(title=title, endpoints=endpoints)
