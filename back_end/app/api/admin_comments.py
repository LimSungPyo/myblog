from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.crud import comments as crud
from app.db.session import get_db
from app.models import Comment
from app.schemas.comment import CommentAdminOut, CommentModerate

router = APIRouter(
    prefix="/admin/comments",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


def _to_admin_out(c: Comment) -> CommentAdminOut:
    return CommentAdminOut(
        id=c.id,
        post_id=c.post_id,
        post_title=c.post.title,
        post_slug=c.post.slug,
        author_name=c.author_name,
        content=c.content,
        approved=c.approved,
        created_at=c.created_at,
    )


@router.get("", response_model=list[CommentAdminOut])
def list_comments(db: Session = Depends(get_db)):
    return [_to_admin_out(c) for c in crud.list_all(db)]


@router.patch("/{comment_id}", response_model=CommentAdminOut)
def moderate_comment(
    comment_id: int, payload: CommentModerate, db: Session = Depends(get_db)
):
    comment = crud.get_by_id(db, comment_id)
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없습니다."
        )
    crud.set_approved(db, comment, payload.approved)
    return _to_admin_out(comment)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = crud.get_by_id(db, comment_id)
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없습니다."
        )
    crud.delete(db, comment)
