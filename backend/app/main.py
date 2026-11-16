import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.routers.auth import router as auth_router
from app.routers.vault import router as vault_router
from app.routers.collection import router as collection_router
from app.routers.request import router as request_router
from app.routers.mock_api import router as mock_api_router
from app.routers.mock_runtime import router as mock_runtime_router
from app.services.request_history_cleanup import cleanup_expired_request_history

logger = logging.getLogger(__name__)
REQUEST_HISTORY_CLEANUP_INTERVAL_SECONDS = 24 * 60 * 60


def _cleanup_request_history_once() -> None:
    with SessionLocal() as db:
        deleted_count = cleanup_expired_request_history(db)
    logger.info("Deleted %s expired TestSpace history records", deleted_count)


async def _run_cleanup_without_abandoning_thread() -> None:
    cleanup_work = asyncio.create_task(asyncio.to_thread(_cleanup_request_history_once))
    try:
        await asyncio.shield(cleanup_work)
    except asyncio.CancelledError:
        try:
            await cleanup_work
        except Exception:
            logger.exception("Could not finish TestSpace history cleanup on shutdown")
        raise


async def _request_history_cleanup_loop() -> None:
    while True:
        try:
            await _run_cleanup_without_abandoning_thread()
        except Exception:
            logger.exception("Could not clean up expired TestSpace history")
        await asyncio.sleep(REQUEST_HISTORY_CLEANUP_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(_: FastAPI):
    cleanup_task = asyncio.create_task(_request_history_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task


app = FastAPI(title="dev404 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(auth_router)
app.include_router(vault_router)
app.include_router(collection_router)
app.include_router(request_router)
app.include_router(mock_api_router)
app.include_router(mock_runtime_router)
