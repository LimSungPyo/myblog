from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud import comments as comments_crud
from app.crud import posts as crud
from app.db.session import get_db
from app.schemas.comment import CommentCreate, CommentOut
from app.schemas.common import PaginatedPosts
from app.schemas.post import PostOut

router = APIRouter(tags=["posts"])


@router.get("/posts", response_model=PaginatedPosts)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(6, ge=1, le=100, alias="pageSize"),
    category: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    items, total = crud.list_posts(
        db, page=page, page_size=page_size, category=category, tag=tag, q=q
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedPosts(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/posts/slugs", response_model=list[str])
def list_slugs(db: Session = Depends(get_db)):
    """sitemap 등에서 쓰는 발행글 slug 목록 (경량)."""
    return crud.all_published_slugs(db)


@router.get("/posts/{slug}", response_model=PostOut)
def get_post(slug: str, db: Session = Depends(get_db)):
    # 조회수 증가는 여기서 하지 않는다(SSR 캐시로 정확도가 떨어짐).
    # 실제 브라우저 방문은 POST /posts/{slug}/view 로 카운트한다.
    post = crud.get_by_slug(db, slug)
    if post is None or post.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    return post


@router.post("/posts/{slug}/view")
def increment_post_view(slug: str, db: Session = Depends(get_db)):
    """실제 방문 카운트용. 클라이언트가 상세 페이지 진입 시 1회 호출."""
    post = crud.get_by_slug(db, slug)
    if post is None or post.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    crud.increment_view(db, post)
    return {"viewCount": post.view_count}


@router.get("/posts/{slug}/comments", response_model=list[CommentOut])
def get_comments(slug: str, db: Session = Depends(get_db)):
    post = crud.get_by_slug(db, slug)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    return comments_crud.list_for_post(db, post.id)


@router.post(
    "/posts/{slug}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(slug: str, payload: CommentCreate, db: Session = Depends(get_db)):
    post = crud.get_by_slug(db, slug)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    return comments_crud.create(db, post.id, payload)
