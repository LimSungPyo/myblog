from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Comment, Post


def get_stats(db: Session) -> dict:
    post_count = db.scalar(select(func.count()).select_from(Post)) or 0
    published_count = (
        db.scalar(
            select(func.count()).select_from(Post).where(Post.status == "published")
        )
        or 0
    )
    comment_count = db.scalar(select(func.count()).select_from(Comment)) or 0
    pending_comment_count = (
        db.scalar(
            select(func.count()).select_from(Comment).where(Comment.approved.is_(False))
        )
        or 0
    )
    total_views = db.scalar(select(func.coalesce(func.sum(Post.view_count), 0))) or 0
    top_posts = list(
        db.scalars(select(Post).order_by(Post.view_count.desc()).limit(5)).all()
    )
    return {
        "post_count": post_count,
        "published_count": published_count,
        "draft_count": post_count - published_count,
        "comment_count": comment_count,
        "pending_comment_count": pending_comment_count,
        "total_views": total_views,
        "top_posts": top_posts,
    }
