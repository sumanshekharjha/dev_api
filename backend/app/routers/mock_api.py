from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.mock_api import MockApi
from app.models.mock_endpoint import MockEndpoint
from app.models.user import User
from app.routers.auth import get_current_user_obj, get_db
from app.services.fake_data_generator import generate_fake_data
from app.services.openapi_parser import parse_openapi_document
from app.schemas.mock_api import (
    ManualEndpointCreate,
    MockApiCreate,
    MockApiGenerationResponse,
    MockApiImportPreview,
    MockApiListResponse,
    MockApiResponse,
)

router = APIRouter(tags=["Mock APIs"])


def get_owned_mock_api(mock_api_id: int, current_user: User, db: Session) -> MockApi:
    mock_api = (
        db.query(MockApi)
        .filter(MockApi.id == mock_api_id, MockApi.user_id == current_user.id)
        .first()
    )
    if not mock_api:
        raise HTTPException(status_code=404, detail="Mock API not found")
    return mock_api


@router.post(
    "/mock/import",
    response_model=MockApiImportPreview,
    response_model_exclude_unset=True,
)
async def preview_mock_api_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_obj),
):
    del current_user
    return parse_openapi_document(file.filename or "", await file.read())


@router.post(
    "/mock/generate",
    response_model=MockApiGenerationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_mock_api(
    file: UploadFile = File(...),
    record_count: int = Form(default=20, ge=1, le=1000),
    name: Optional[str] = Form(default=None, max_length=150),
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    preview = parse_openapi_document(file.filename or "", await file.read())
    usable_endpoints = [
        endpoint
        for endpoint in preview.endpoints
        if isinstance(endpoint.response_schema, dict)
    ]
    if not usable_endpoints:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAPI document has no endpoints with a JSON response schema",
        )

    for endpoint in usable_endpoints:
        try:
            generate_fake_data(endpoint.response_schema, record_count=1)
        except (TypeError, ValueError) as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Response schema for {endpoint.method} {endpoint.path} "
                    "cannot be used to generate mock data"
                ),
            ) from error

    mock_api_name = (name or "").strip() or preview.title
    if len(mock_api_name) > 150:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mock API name must not exceed 150 characters",
        )

    mock_api = MockApi(
        user_id=current_user.id,
        name=mock_api_name,
        source_type="openapi",
        status="active",
    )
    endpoints = [
        MockEndpoint(
            path=endpoint.path,
            method=endpoint.method,
            status_code=(
                endpoint.status_code if endpoint.status_code is not None else 200
            ),
            request_body=endpoint.request_body_schema,
            response_body=endpoint.response_schema,
        )
        for endpoint in usable_endpoints
    ]
    mock_api.endpoints.extend(endpoints)
    db.add(mock_api)
    try:
        db.commit()
        db.refresh(mock_api)
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the generated Mock API",
        ) from error

    response = MockApiResponse.model_validate(mock_api)
    return MockApiGenerationResponse(
        **response.model_dump(),
        record_count=record_count,
    )


@router.post("/mock", response_model=MockApiResponse, status_code=status.HTTP_201_CREATED)
def create_mock_api(
    mock_api_in: MockApiCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    api_name = (mock_api_in.name or "").strip()
    if not api_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mock API name is required",
        )
    if len(api_name) > 150:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mock API name must not exceed 150 characters",
        )

    mock_api = MockApi(
        user_id=current_user.id,
        name=api_name,
        source_type=mock_api_in.source_type,
        status="active",
    )

    if mock_api_in.endpoints:
        for ep in mock_api_in.endpoints:
            path = ep.path.strip()
            if not path:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Endpoint path cannot be empty",
                )
            if not path.startswith("/"):
                path = f"/{path}"
            method = ep.method.strip().upper()
            status_code = int(ep.status_code) if ep.status_code else 200

            mock_api.endpoints.append(
                MockEndpoint(
                    path=path,
                    method=method,
                    status_code=status_code,
                    request_body=ep.request_body_schema,
                    response_body=ep.response_schema,
                )
            )

    db.add(mock_api)
    db.commit()
    db.refresh(mock_api)
    return mock_api


@router.post(
    "/mock/{mock_api_id}/endpoints",
    response_model=MockApiResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_mock_endpoint(
    mock_api_id: int,
    endpoint_in: ManualEndpointCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    mock_api = get_owned_mock_api(mock_api_id, current_user, db)
    path = endpoint_in.path.strip()
    if not path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Endpoint path cannot be empty",
        )
    if not path.startswith("/"):
        path = f"/{path}"
    method = endpoint_in.method.strip().upper()
    status_code = int(endpoint_in.status_code) if endpoint_in.status_code else 200

    new_endpoint = MockEndpoint(
        mock_api_id=mock_api.id,
        path=path,
        method=method,
        status_code=status_code,
        request_body=endpoint_in.request_body_schema,
        response_body=endpoint_in.response_schema,
    )
    db.add(new_endpoint)
    db.commit()
    db.refresh(mock_api)
    return mock_api


@router.get("/mock", response_model=List[MockApiListResponse])
def list_mock_apis(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    mock_apis = (
        db.query(MockApi)
        .filter(MockApi.user_id == current_user.id)
        .order_by(MockApi.created_at.desc())
        .all()
    )
    return [
        MockApiListResponse(
            **MockApiResponse.model_validate(mock_api).model_dump(),
            endpoint_count=len(mock_api.endpoints),
            endpoints=[
                {
                    "id": endpoint.id,
                    "path": endpoint.path,
                    "method": endpoint.method,
                    "status_code": endpoint.status_code,
                    "is_array": (
                        isinstance(endpoint.response_body, dict)
                        and endpoint.response_body.get("type") == "array"
                    ),
                }
                for endpoint in mock_api.endpoints
            ],
        )
        for mock_api in mock_apis
    ]


@router.get("/mock/{mock_api_id}", response_model=MockApiResponse)
def get_mock_api(
    mock_api_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    return get_owned_mock_api(mock_api_id, current_user, db)


@router.delete("/mock/{mock_api_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mock_api(
    mock_api_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    mock_api = get_owned_mock_api(mock_api_id, current_user, db)
    db.delete(mock_api)
    db.commit()
    return None


@router.post("/mock/{mock_api_id}/stop", response_model=MockApiResponse)
def stop_mock_api(
    mock_api_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    mock_api = get_owned_mock_api(mock_api_id, current_user, db)
    mock_api.status = "stopped"
    db.commit()
    db.refresh(mock_api)
    return mock_api
