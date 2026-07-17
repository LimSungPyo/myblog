from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.crud import posts as crud
from app.db.session import get_db
from app.models import User
from app.schemas.post import PostCreate, PostOut, PostUpdate

router = APIRouter(
    prefix="/admin/posts",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=list[PostOut])
def list_all_posts(db: Session = Depends(get_db)):
    items, _ = crud.list_posts(db, page=1, page_size=1000, include_drafts=True)
    return items


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_by_id(db, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    return post


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    if crud.get_by_slug(db, payload.slug) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 슬러그입니다."
        )
    return crud.create_post(db, payload)


@router.put("/{post_id}", response_model=PostOut)
def update_post(post_id: int, payload: PostUpdate, db: Session = Depends(get_db)):
    post = crud.get_by_id(db, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    existing = crud.get_by_slug(db, payload.slug)
    if existing is not None and existing.id != post_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 슬러그입니다."
        )
    return crud.update_post(db, post, payload)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_by_id(db, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    crud.delete_post(db, post)
