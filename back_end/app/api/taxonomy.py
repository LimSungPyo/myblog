from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import taxonomy as crud
from app.db.session import get_db
from app.schemas.taxonomy import CategoryOut, TagOut

router = APIRouter(tags=["taxonomy"])


@router.get("/categories", response_model=list[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return crud.list_categories(db)


@router.get("/tags", response_model=list[TagOut])
def get_tags(db: Session = Depends(get_db)):
    return crud.list_tags(db)
