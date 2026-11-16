from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.routers.auth import get_db, get_current_user_obj
from app.models.user import User
from app.models.collection import Collection
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionResponse

router = APIRouter(tags=["TestSpace Collections"])

# 1. Create a new collection for the authenticated user
@router.post("/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    collection_in: CollectionCreate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    # Ensure collection is tied directly to the logged-in user
    new_collection = Collection(
        user_id=current_user.id,
        name=collection_in.name,
        description=collection_in.description,
    )
    db.add(new_collection)
    db.commit()
    db.refresh(new_collection)
    return new_collection


# 2. List all collections belonging to the current user
@router.get("/collections", response_model=List[CollectionResponse])
def list_collections(
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    # Only return collections owned by current_user
    collections = (
        db.query(Collection)
        .filter(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc())
        .all()
    )
    return collections


# 3. Get single collection by ID (verifies ownership)
@router.get("/collections/{collection_id}", response_model=CollectionResponse)
def get_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    # Verify collection exists and belongs to current user
    collection = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


# 4. Update an existing collection (verifies ownership)
@router.put("/collections/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: int,
    collection_in: CollectionUpdate,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    collection = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Update only provided fields
    update_data = collection_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(collection, field, value)

    db.commit()
    db.refresh(collection)
    return collection


# 5. Delete a collection (verifies ownership, cascades to requests)
@router.delete("/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user_obj),
    db: Session = Depends(get_db),
):
    collection = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.user_id == current_user.id)
        .first()
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    db.delete(collection)
    db.commit()
    return None
