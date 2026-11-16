from typing import Any

from fastapi import HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.models.mock_api import MockApi
from app.models.mock_endpoint import MockEndpoint
from app.services.fake_data_generator import generate_fake_data


def _path_matches_template(template: str, requested_path: str) -> bool:
    template_segments = template.strip("/").split("/")
    requested_segments = requested_path.strip("/").split("/")
    if len(template_segments) != len(requested_segments):
        return False
    return all(
        (segment.startswith("{") and segment.endswith("}") and bool(value))
        or segment == value
        for segment, value in zip(template_segments, requested_segments)
    )


def generate_mock_response(
    token: str,
    path: str,
    method: str,
    count: int,
    db: Session,
) -> JSONResponse:
    mock_api = db.query(MockApi).filter(MockApi.token == token).first()
    if mock_api is None or mock_api.status != "active":
        raise HTTPException(status_code=404, detail="Mock endpoint not found")

    endpoint_path = f"/{path}" if path else "/"
    endpoint = (
        db.query(MockEndpoint)
        .filter(
            MockEndpoint.mock_api_id == mock_api.id,
            MockEndpoint.path == endpoint_path,
            MockEndpoint.method == method.upper(),
        )
        .first()
    )
    if endpoint is None:
        endpoints = (
            db.query(MockEndpoint)
            .filter(
                MockEndpoint.mock_api_id == mock_api.id,
                MockEndpoint.method == method.upper(),
            )
            .order_by(MockEndpoint.id)
            .all()
        )
        endpoint = next(
            (
                candidate
                for candidate in endpoints
                if _path_matches_template(candidate.path, endpoint_path)
            ),
            None,
        )
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Mock endpoint not found")
    if not isinstance(endpoint.response_body, dict):
        raise HTTPException(status_code=404, detail="Mock endpoint not found")

    try:
        response_data: Any = generate_fake_data(
            endpoint.response_body,
            record_count=count,
        )
    except (TypeError, ValueError) as error:
        if isinstance(endpoint.response_body, (dict, list)):
            response_data = endpoint.response_body
        else:
            raise HTTPException(
                status_code=500,
                detail="Mock endpoint response schema is invalid",
            ) from error

    return JSONResponse(content=response_data, status_code=endpoint.status_code)
