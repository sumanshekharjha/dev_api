from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.request_history import RequestHistory

REQUEST_HISTORY_RETENTION = timedelta(days=7)


def cleanup_expired_request_history(
    db: Session, now: datetime | None = None
) -> int:
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None or current_time.utcoffset() is None:
        raise ValueError("Cleanup time must be timezone-aware")

    cutoff = current_time.astimezone(timezone.utc) - REQUEST_HISTORY_RETENTION
    result = db.execute(
        delete(RequestHistory).where(RequestHistory.created_at < cutoff)
    )
    db.commit()
    return result.rowcount or 0
