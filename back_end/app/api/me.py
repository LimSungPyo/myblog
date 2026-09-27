from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import guestbook as guestbook_crud
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
    WithdrawRequest,
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
    # 사진 파일까지 지우는 경로를 관리자 삭제와 같이 쓴다
    guestbook_crud.delete(db, entry)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# 이 문구를 직접 입력해야 탈퇴된다. 비밀번호 재입력 대신 고른 이유: 구글 로그인만 쓰는
# 사람은 비밀번호가 없어서, 모두에게 똑같이 통하는 확인 방법이 이것뿐이다.
WITHDRAW_CONFIRMATION = "탈퇴합니다"


@router.post("/withdraw", status_code=status.HTTP_204_NO_CONTENT)
def withdraw(
    payload: WithdrawRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """회원 탈퇴.

    `DELETE /me`가 아니라 POST인 이유: 확인 문구를 본문에 담아야 하는데, HTTP 규격에서
    DELETE 요청의 본문은 의미가 정해져 있지 않아 중간 프록시가 버리는 경우가 있다.
    그러면 확인 문구가 사라져 탈퇴가 이유 없이 실패한다.
    """
    if user.is_admin:
        # 관리자가 실수로 사라지면 관리자 페이지에 들어갈 방법이 없다. 복구하려면 DB를
        # 직접 만져야 하니 화면에서는 아예 막는다.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 계정은 탈퇴할 수 없어요.",
        )
    if payload.confirmation.strip() != WITHDRAW_CONFIRMATION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"확인 문구 '{WITHDRAW_CONFIRMATION}'를 정확히 입력해주세요.",
        )
    crud.withdraw(db, user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
