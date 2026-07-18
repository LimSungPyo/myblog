from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Comment
from app.schemas.comment import CommentCreate


def list_for_post(db: Session, post_id: int) -> list[Comment]:
    return list(
        db.scalars(
            select(Comment)
            .where(Comment.post_id == post_id, Comment.approved.is_(True))
            .order_by(Comment.created_at.asc())
        ).all()
    )


def list_all(db: Session) -> list[Comment]:
    """관리자용: 승인 여부 무관 전체 댓글(글 정보 포함), 최신순."""
    return list(
        db.scalars(
            select(Comment)
            .options(selectinload(Comment.post))
            .order_by(Comment.created_at.desc())
        ).all()
    )


def get_by_id(db: Session, comment_id: int) -> Comment | None:
    return db.get(Comment, comment_id)


def set_approved(db: Session, comment: Comment, approved: bool) -> Comment:
    comment.approved = approved
    db.commit()
    db.refresh(comment)
    return comment


def delete(db: Session, comment: Comment) -> None:
    db.delete(comment)
    db.commit()


def create(db: Session, post_id: int, data: CommentCreate) -> Comment:
    comment = Comment(
        post_id=post_id,
        author_name=data.author_name,
        content=data.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
