from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.routers.auth import get_db
from app.services.mock_runtime import generate_mock_response

router = APIRouter(tags=["Mock Runtime"])


@router.api_route(
    "/mock/{token}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    response_class=JSONResponse,
)
def serve_mock_endpoint(
    request: Request,
    token: str,
    path: str,
    count: int = Query(default=20, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> JSONResponse:
    return generate_mock_response(token, path, request.method, count, db)
