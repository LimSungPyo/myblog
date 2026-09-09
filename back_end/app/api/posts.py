from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.ratelimit import (
    VIEW_DEDUP_TTL,
    WRITE_BY_USER,
    guard,
    mark_first_seen,
    record,
    visitor_id,
)
from app.crud import comments as comments_crud
from app.crud import posts as crud
from app.db.session import get_db
from app.models import User
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
def increment_post_view(slug: str, request: Request, db: Session = Depends(get_db)):
    """실제 방문 카운트용. 클라이언트가 상세 페이지 진입 시 1회 호출.

    인증이 없는 엔드포인트라 예전에는 `curl`을 반복하는 만큼 숫자가 올라갔다.
    여기에 "분당 N회" 식의 제한을 거는 대신 중복 제거를 골랐다. 횟수 제한은
    천천히 부르면 계속 통과하지만, 중복 제거는 같은 방문자를 아예 한 번만 세기
    때문에 속도를 늦춰도 소용이 없다. 조회수를 지키는 목적에는 이쪽이 맞다.

    이미 센 방문이면 429가 아니라 200을 준다. 재방문은 잘못된 요청이 아니라
    정상 동작이고, 클라이언트가 재시도해야 할 일도 없기 때문이다.
    """
    post = crud.get_by_slug(db, slug)
    if post is None or post.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    # 검사와 기록이 한 동작이라 같은 방문자가 동시에 두 번 열어도 하나만 통과한다
    if mark_first_seen(f"view:{visitor_id(request)}:{slug}", VIEW_DEDUP_TTL):
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
def create_comment(
    slug: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 글마다 따로 세지 않는다. 막으려는 건 "이 사람이 쏟아내는 것"이라, 글을
    # 옮겨 다니며 도배하는 걸 계정 하나로 묶어서 봐야 한다.
    key = f"write:comment:{user.id}"
    guard(key, WRITE_BY_USER)
    post = crud.get_by_slug(db, slug)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없습니다."
        )
    comment = comments_crud.create(db, post.id, payload, author=user)
    record(key, WRITE_BY_USER)
    return comment
