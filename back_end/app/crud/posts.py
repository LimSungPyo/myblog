from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Category, Post, Tag
from app.schemas.post import PostCreate, PostUpdate


def _base_query():
    return select(Post).options(selectinload(Post.category), selectinload(Post.tags))


def list_posts(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 6,
    category: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    include_drafts: bool = False,
) -> tuple[list[Post], int]:
    stmt = _base_query()

    if not include_drafts:
        stmt = stmt.where(Post.status == "published")
    if category:
        stmt = stmt.join(Post.category).where(Category.slug == category)
    if tag:
        stmt = stmt.join(Post.tags).where(Tag.slug == tag)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Post.title.ilike(like), Post.content.ilike(like)))

    # 정렬: 발행일(없으면 생성일) 최신순
    stmt = stmt.order_by(Post.published_at.desc().nullslast(), Post.created_at.desc())

    # 전체 개수 (distinct: tag 조인 시 중복 방지)
    count_stmt = select(func.count()).select_from(stmt.distinct().subquery())
    total = db.scalar(count_stmt) or 0

    items = (
        db.scalars(stmt.distinct().offset((page - 1) * page_size).limit(page_size))
        .unique()
        .all()
    )
    return list(items), total


def get_by_slug(db: Session, slug: str) -> Post | None:
    return db.scalars(_base_query().where(Post.slug == slug)).unique().one_or_none()


def get_by_id(db: Session, post_id: int) -> Post | None:
    return db.scalars(_base_query().where(Post.id == post_id)).unique().one_or_none()


def increment_view(db: Session, post: Post) -> None:
    post.view_count += 1
    db.commit()


def all_published_slugs(db: Session) -> list[str]:
    return list(db.scalars(select(Post.slug).where(Post.status == "published")).all())


def _apply_tags(db: Session, post: Post, tag_ids: list[int]) -> None:
    post.tags = (
        list(db.scalars(select(Tag).where(Tag.id.in_(tag_ids))).all())
        if tag_ids
        else []
    )


def create_post(db: Session, data: PostCreate) -> Post:
    post = Post(
        title=data.title,
        slug=data.slug,
        excerpt=data.excerpt,
        content=data.content,
        cover_image=data.cover_image,
        category_id=data.category_id,
        status=data.status,
    )
    _apply_tags(db, post, data.tag_ids)
    post.mark_published()
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def update_post(db: Session, post: Post, data: PostUpdate) -> Post:
    post.title = data.title
    post.slug = data.slug
    post.excerpt = data.excerpt
    post.content = data.content
    post.cover_image = data.cover_image
    post.category_id = data.category_id
    post.status = data.status
    _apply_tags(db, post, data.tag_ids)
    post.mark_published()
    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post: Post) -> None:
    db.delete(post)
    db.commit()
