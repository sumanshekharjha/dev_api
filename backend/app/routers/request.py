import base64
import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.routers.auth import get_db, get_current_user_obj
from app.models.user import User
from app.models.collection import Collection
from app.models.api import Api
from app.models.credential import ApiCredential
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.schemas.request import (
    RequestCreate,
    RequestUpdate,
    RequestResponse,
    TestExecutionRequest,
    TestExecutionResponse,
)
from app.schemas.request_history import RequestHistoryResponse

router = APIRouter(tags=["TestSpace Requests"])

SENSITIVE_HEADER_NAMES = {"authorization", "proxy-authorization", "cookie", "x-api-key", "api-key"}

# =========================================================
# HELPER FUNCTIONS
# =========================================================

def get_user_request(request_id: int, current_user: User, db: Session) -> Request:
    """
    Finds a Request by ID and verifies that the current user owns it.
    A request is owned by the user if:
      1. It is part of a Collection owned by current_user.
      2. Or it is linked to an API owned by current_user.
      3. Or its execution was recorded by current_user in RequestHistory.
    """
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    is_owner = False
    if req.collection_id is not None:
        collection = db.query(Collection).filter(Collection.id == req.collection_id).first()
        if collection and collection.user_id == current_user.id:
            is_owner = True
    elif req.api_id is not None:
        api = db.query(Api).filter(Api.id == req.api_id).first()
        if api and api.user_id == current_user.id:
            is_owner = True
    else:
        # Standalone request: check if this user created it
        history = (
            db.query(RequestHistory)
            .filter(RequestHistory.request_id == req.id, RequestHistory.user_id == current_user.id)
            .first()
        )
        if history:
            is_owner = True

    if not is_owner:
        raise HTTPException(status_code=404, detail="Request not found")

    return req


def normalize_headers(headers_input: Any) -> Dict[str, str]:
    """Converts headers input (dict or list of key-value objects) into a clean dictionary."""
    headers: Dict[str, str] = {}
    if isinstance(headers_input, dict):
        for k, v in headers_input.items():
            if k is not None and str(k).strip():
                headers[str(k).strip()] = str(v) if v is not None else ""
    elif isinstance(headers_input, list):
        for item in headers_input:
            if isinstance(item, dict):
                k = item.get("key")
                v = item.get("value")
                if k is not None and str(k).strip():
                    headers[str(k).strip()] = str(v) if v is not None else ""
    return headers


def headers_safe_to_persist(headers_input: Any) -> Dict[str, str]:
    """Keep request configuration while excluding authentication material from storage."""
    return {
        key: value
        for key, value in normalize_headers(headers_input).items()
        if key.lower() not in SENSITIVE_HEADER_NAMES
    }


def auth_safe_to_persist(auth_input: Any) -> Optional[Dict[str, Any]]:
    """Persist only the selected auth type; auth values must be entered for each use."""
    if not isinstance(auth_input, dict):
        return None
    auth_type = auth_input.get("auth_type")
    return {"auth_type": auth_type} if auth_type else None


def redact_url_for_history(url: str) -> str:
    """History is metadata, not a replayable request: never retain query values."""
    parsed = urllib.parse.urlsplit(url)
    query_keys = [key for key, _ in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)]
    redacted_query = urllib.parse.urlencode([(key, "[redacted]") for key in query_keys])
    # Strip user-info as well; it can contain a username/password pair.
    netloc = parsed.netloc.rsplit("@", 1)[-1]
    return urllib.parse.urlunsplit(parsed._replace(netloc=netloc, query=redacted_query))


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Prevent authenticated requests from forwarding credentials to redirect targets."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def build_final_url(raw_url: str, query_params: Any, extra_query_params: list) -> str:
    """Merges existing URL query parameters, query_params argument, and auth query parameters."""
    parsed = urllib.parse.urlparse(raw_url)
    existing_pairs = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)

    new_pairs = []
    if isinstance(query_params, dict):
        for k, v in query_params.items():
            if k is not None and str(k).strip():
                new_pairs.append((str(k).strip(), str(v) if v is not None else ""))
    elif isinstance(query_params, list):
        for item in query_params:
            if isinstance(item, dict):
                k = item.get("key")
                v = item.get("value")
                if k is not None and str(k).strip():
                    new_pairs.append((str(k).strip(), str(v) if v is not None else ""))

    combined = existing_pairs + new_pairs + extra_query_params
    new_query = urllib.parse.urlencode(combined)
    return urllib.parse.urlunparse(parsed._replace(query=new_query))


def parse_response_content(raw_bytes: bytes) -> Any:
    """Attempts to decode and parse response bytes as JSON, falling back to a string."""
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return f"<Binary data: {len(raw_bytes)} bytes>"

    try:
        return json.loads(text)
    except Exception:
        return text


def url_is_within_api_scope(request_url: str, base_url: str) -> bool:
    """Return whether a request URL is inside an API's scheme/host/port/path scope."""
    try:
        request_parts = urllib.parse.urlsplit(request_url)
        base_parts = urllib.parse.urlsplit(base_url)
    except ValueError:
        return False

    if not all((request_parts.scheme, request_parts.hostname, base_parts.scheme, base_parts.hostname)):
        return False
    if request_parts.scheme.lower() != base_parts.scheme.lower():
        return False
    if request_parts.hostname.lower() != base_parts.hostname.lower():
        return False

    def effective_port(parts: urllib.parse.SplitResult) -> int:
        if parts.port is not None:
            return parts.port
        return 443 if parts.scheme.lower() == "https" else 80

    try:
        if effective_port(request_parts) != effective_port(base_parts):
            return False
    except ValueError:
        return False

    base_path = base_parts.path.rstrip("/") or "/"
    request_path = request_parts.path or "/"
    return base_path == "/" or request_path == base_path or request_path.startswith(f"{base_path}/")


def credential_is_expired(credential: ApiCredential) -> bool:
    if credential.expires_at is None:
        return False
    expires_at = credential.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= datetime.now(timezone.utc)


def apply_saved_credential(
    credential: ApiCredential, headers: Dict[str, str], extra_query_params: list
) -> None:
    """Add an unmasked credential directly from the database to an outbound request."""
    if credential.type == "bearer_token":
        headers["Authorization"] = f"Bearer {credential.value}"
    elif credential.type == "basic_auth":
        username, separator, password = credential.value.partition(":")
        if separator:
            encoded = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("utf-8")
            headers["Authorization"] = f"Basic {encoded}"
    elif credential.type == "api_key":
        # API Vault has no saved key-location field; use the conventional header.
        # The secret value never leaves this process.
        headers["X-API-Key"] = credential.value


# =========================================================
# 1. REQUEST CRUD ROUTES
# =========================================================

# Create a new saved or standalone request
@router.post("/requests", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    request_in: RequestCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    # Verify collection ownership if provided
    if request_in.collection_id is not None:
        collection = (
            db.query(Collection)
            .filter(Collection.id == request_in.collection_id, Collection.user_id == current_user.id)
            .first()
        )
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

    # Verify API ownership if provided
    if request_in.api_id is not None:
        api = (
            db.query(Api)
            .filter(Api.id == request_in.api_id, Api.user_id == current_user.id)
            .first()
        )
        if not api:
            raise HTTPException(status_code=404, detail="API not found")

    new_request = Request(
        name=request_in.name,
        method=request_in.method,
        url=request_in.url,
        collection_id=request_in.collection_id,
        api_id=request_in.api_id,
        params=request_in.params,
        headers=headers_safe_to_persist(request_in.headers),
        auth=auth_safe_to_persist(request_in.auth),
        body=request_in.body,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # For standalone requests (no collection & no api), log tracking entry so user ownership is maintained
    if new_request.collection_id is None and new_request.api_id is None:
        init_history = RequestHistory(
            user_id=current_user.id,
            request_id=new_request.id,
            method=new_request.method,
            url=redact_url_for_history(new_request.url),
            status_code=None,
            response_time=None,
            response_size=None,
        )
        db.add(init_history)
        db.commit()

    return new_request


# List all requests inside a specific collection
@router.get("/collections/{collection_id}/requests", response_model=List[RequestResponse])
def list_collection_requests(
    collection_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    # Ensure collection exists and belongs to the current user
    collection = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    requests = (
        db.query(Request)
        .filter(Request.collection_id == collection_id)
        .order_by(Request.created_at.desc())
        .all()
    )
    return requests


# Get single request details by ID (verifies ownership)
@router.get("/requests/{request_id}", response_model=RequestResponse)
def get_request(
    request_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    return get_user_request(request_id, current_user, db)


# Update a request (verifies ownership and target collection/API ownership)
@router.put("/requests/{request_id}", response_model=RequestResponse)
def update_request(
    request_id: int,
    request_in: RequestUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    req = get_user_request(request_id, current_user, db)

    # If updating collection_id, ensure target collection belongs to current user
    if request_in.collection_id is not None:
        target_collection = (
            db.query(Collection)
            .filter(Collection.id == request_in.collection_id, Collection.user_id == current_user.id)
            .first()
        )
        if not target_collection:
            raise HTTPException(status_code=404, detail="Collection not found")

    # If updating api_id, ensure target API belongs to current user
    if request_in.api_id is not None:
        target_api = (
            db.query(Api)
            .filter(Api.id == request_in.api_id, Api.user_id == current_user.id)
            .first()
        )
        if not target_api:
            raise HTTPException(status_code=404, detail="API not found")

    update_data = request_in.model_dump(exclude_unset=True)
    if "headers" in update_data:
        update_data["headers"] = headers_safe_to_persist(update_data["headers"])
    if "auth" in update_data:
        update_data["auth"] = auth_safe_to_persist(update_data["auth"])
    for field, value in update_data.items():
        setattr(req, field, value)

    db.commit()
    db.refresh(req)
    return req


# Delete a request (verifies ownership)
@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    req = get_user_request(request_id, current_user, db)
    db.delete(req)
    db.commit()
    return None


# =========================================================
# 2. DIRECT TESTING ENDPOINT
# =========================================================

# Execute a live HTTP request from TestSpace
@router.post("/test/request", response_model=TestExecutionResponse)
def execute_test_request(
    test_in: TestExecutionRequest,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    api: Optional[Api] = None
    # Verify collection ownership if provided
    if test_in.collection_id is not None:
        collection = (
            db.query(Collection)
            .filter(Collection.id == test_in.collection_id, Collection.user_id == current_user.id)
            .first()
        )
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

    # Verify API ownership if provided
    if test_in.api_id is not None:
        api = (
            db.query(Api)
            .filter(Api.id == test_in.api_id, Api.user_id == current_user.id)
            .first()
        )
        if not api:
            raise HTTPException(status_code=404, detail="API not found")

    # Verify request ownership if testing an existing request
    if test_in.request_id is not None:
        get_user_request(test_in.request_id, current_user, db)

    # Validate target URL format
    raw_url = test_in.url.strip() if test_in.url else ""
    if not (raw_url.startswith("http://") or raw_url.startswith("https://")):
        return TestExecutionResponse(
            status_code=0,
            headers={},
            body={"error": "Invalid URL: Must start with http:// or https://"},
            time_ms=0,
            size_bytes=0,
            error="Invalid URL: Must start with http:// or https://",
        )

    # Prepare Headers and Auth
    headers = normalize_headers(test_in.headers)
    extra_query_params = []

    auth_type = (test_in.auth_type or "none").lower().strip()
    auth_data = test_in.auth_data

    manual_sensitive_header = any(key.lower() in SENSITIVE_HEADER_NAMES for key in headers)
    manual_auth_present = manual_sensitive_header
    saved_credential_used = False

    if auth_type == "bearer":
        token = ""
        if isinstance(auth_data, dict):
            token = auth_data.get("token") or auth_data.get("value") or ""
        elif isinstance(auth_data, str):
            token = auth_data
        if token:
            headers["Authorization"] = f"Bearer {token}"
            manual_auth_present = True

    elif auth_type == "basic":
        username = ""
        password = ""
        if isinstance(auth_data, dict):
            username = auth_data.get("username", "")
            password = auth_data.get("password", "")
        elif isinstance(auth_data, str) and ":" in auth_data:
            parts = auth_data.split(":", 1)
            username, password = parts[0], parts[1]
        if username or password:
            raw_creds = f"{username}:{password}".encode("utf-8")
            headers["Authorization"] = f"Basic {base64.b64encode(raw_creds).decode('utf-8')}"
            manual_auth_present = True

    elif auth_type == "api_key":
        if isinstance(auth_data, dict):
            key = auth_data.get("key") or auth_data.get("name") or "X-API-Key"
            val = auth_data.get("value") or auth_data.get("apiKey") or ""
            add_to = auth_data.get("add_to") or auth_data.get("addTo") or "header"
            if add_to.lower() == "query":
                extra_query_params.append((key, val))
            else:
                headers[key] = val
            manual_auth_present = bool(val)

    auth_notice: Optional[str] = None
    # Saved credentials are only considered for the selected API, never for an
    # arbitrary target. Manual non-empty auth always wins.
    if api and not manual_auth_present and url_is_within_api_scope(raw_url, api.base_url):
        credential_type = {
            "api_key": "api_key",
            "bearer": "bearer_token",
            "basic": "basic_auth",
        }.get(api.auth_type)
        if credential_type:
            credentials = (
                db.query(ApiCredential)
                .filter(ApiCredential.api_id == api.id, ApiCredential.type == credential_type)
                .all()
            )
            valid_credentials = [credential for credential in credentials if not credential_is_expired(credential)]
            if len(valid_credentials) == 1:
                apply_saved_credential(valid_credentials[0], headers, extra_query_params)
                saved_credential_used = True
                if credential_type == "api_key":
                    auth_notice = "Saved API keys are sent only in the X-API-Key header."
            elif len(valid_credentials) > 1:
                auth_notice = "Multiple saved credentials match this API. Enter authentication manually."
            elif credentials:
                auth_notice = "The saved credential has expired. Enter authentication manually."

    # Merge Query Parameters
    final_url = build_final_url(raw_url, test_in.query_params, extra_query_params)

    # Prepare Body
    method = test_in.method.upper().strip()
    data_payload: Optional[bytes] = None

    if method not in {"GET", "HEAD"} and test_in.body is not None:
        if isinstance(test_in.body, (dict, list)):
            data_payload = json.dumps(test_in.body).encode("utf-8")
            if "Content-Type" not in headers and "content-type" not in headers:
                headers["Content-Type"] = "application/json"
        elif isinstance(test_in.body, str):
            data_payload = test_in.body.encode("utf-8")

    # Use normal TLS verification for outbound HTTPS requests.
    ssl_context = ssl.create_default_context()

    start_time = time.perf_counter()
    status_code = 0
    response_headers: Dict[str, str] = {}
    response_body: Any = None
    response_size = 0
    error_message: Optional[str] = None

    try:
        http_req = urllib.request.Request(
            final_url,
            data=data_payload,
            headers=headers,
            method=method,
        )
        # Authenticated requests do not follow redirects, preventing credentials
        # from being forwarded to a URL outside the selected API's scope.
        if manual_auth_present or saved_credential_used:
            opener = urllib.request.build_opener(
                NoRedirectHandler(), urllib.request.HTTPSHandler(context=ssl_context)
            )
            response = opener.open(http_req, timeout=30)
        else:
            response = urllib.request.urlopen(http_req, context=ssl_context, timeout=30)
        with response:
            status_code = response.getcode()
            response_headers = {k: v for k, v in response.headers.items()}
            raw_body = response.read()
            response_size = len(raw_body)
            response_body = parse_response_content(raw_body)

    except urllib.error.HTTPError as e:
        # Valid HTTP response with 4xx or 5xx status from remote target
        status_code = e.code
        response_headers = {k: v for k, v in e.headers.items()}
        raw_body = e.read()
        response_size = len(raw_body)
        response_body = parse_response_content(raw_body)

    except urllib.error.URLError as e:
        # DNS failure, host unreachable, connection refused
        error_message = f"Connection failed: {e.reason}"
        response_body = {"error": error_message}

    except TimeoutError:
        error_message = "Request timed out after 30 seconds"
        response_body = {"error": error_message}

    except Exception as e:
        error_message = f"Request error: {str(e)}"
        response_body = {"error": error_message}

    duration_ms = int((time.perf_counter() - start_time) * 1000)

    # Save execution details in RequestHistory
    history_entry = RequestHistory(
        user_id=current_user.id,
        request_id=test_in.request_id,
        method=method,
        url=redact_url_for_history(final_url),
        status_code=status_code if status_code > 0 else None,
        response_time=duration_ms,
        response_size=response_size,
    )
    db.add(history_entry)
    db.commit()

    return TestExecutionResponse(
        status_code=status_code,
        headers=response_headers,
        body=response_body,
        time_ms=duration_ms,
        size_bytes=response_size,
        error=error_message,
        auth_notice=auth_notice,
    )


# =========================================================
# 3. REQUEST HISTORY ROUTE
# =========================================================

# Get recent request executions for the authenticated user
@router.get("/history", response_model=List[RequestHistoryResponse])
def get_request_history(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    history_records = (
        db.query(RequestHistory)
        .filter(RequestHistory.user_id == current_user.id)
        .order_by(RequestHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return history_records
