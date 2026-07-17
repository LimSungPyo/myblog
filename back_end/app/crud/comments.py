from sqlalchemy import select
from sqlalchemy.orm import Session

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
