from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import me as crud
from app.db.session import get_db
from app.models import User
from app.schemas.auth import UserOut
from app.schemas.me import (
    DisplayNameUpdate,
    MyActivityOut,
    MyCommentOut,
    MyGuestbookOut,
    MyScoreOut,
)

router = APIRouter(prefix="/me", tags=["me"])

# 남의 글을 지우려고 하면 403이 아니라 404를 준다. 403은 "그 글은 있는데 네 것이
# 아니다"를 알려주는 셈이라, 번호를 바꿔가며 어떤 글이 있는지 떠볼 수 있게 된다.
_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="찾을 수 없어요."
)


@router.get("/activity", response_model=MyActivityOut)
def my_activity(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> MyActivityOut:
    return MyActivityOut(
        comments=[
            MyCommentOut(
                id=c.id,
                post_slug=c.post.slug,
                post_title=c.post.title,
                content=c.content,
                approved=c.approved,
                created_at=c.created_at,
            )
            for c in crud.list_my_comments(db, user.id)
        ],
        guestbook=[
            MyGuestbookOut.model_validate(g, from_attributes=True)
            for g in crud.list_my_guestbook(db, user.id)
        ],
        scores=[
            MyScoreOut.model_validate(s, from_attributes=True)
            for s in crud.list_my_scores(db, user.id)
        ],
    )


@router.patch("", response_model=UserOut)
def update_me(
    payload: DisplayNameUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    return crud.rename(db, user, payload.display_name)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_comment(
    comment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    comment = crud.get_my_comment(db, user.id, comment_id)
    if comment is None:
        raise _NOT_FOUND
    db.delete(comment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/guestbook/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_guestbook(
    entry_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    entry = crud.get_my_guestbook(db, user.id, entry_id)
    if entry is None:
        raise _NOT_FOUND
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
