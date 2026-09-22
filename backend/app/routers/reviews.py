from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_user

router = APIRouter(prefix="/reviews", tags=["Ratings & Reviews"])

@router.get("", response_model=List[schemas.ReviewResponse])
def get_reviews(
    bus_id: Optional[int] = None,
    operator_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Review)
    if bus_id:
        query = query.filter(models.Review.bus_id == bus_id)
    if operator_id:
        query = query.filter(models.Review.operator_id == operator_id)

    reviews = query.order_by(models.Review.created_at.desc()).all()
    results = []
    for r in reviews:
        results.append(schemas.ReviewResponse(
            review_id=r.review_id,
            user_id=r.user_id,
            user_name=r.user.full_name,
            bus_id=r.bus_id,
            bus_name=r.bus.bus_name,
            operator_id=r.operator_id,
            operator_name=r.operator.name,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at
        ))
    return results

@router.post("", response_model=schemas.ReviewResponse)
def create_review(
    review_in: schemas.ReviewCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bus = db.query(models.Bus).filter(models.Bus.bus_id == review_in.bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    if not (1 <= review_in.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be an integer between 1 and 5")

    review = models.Review(
        user_id=current_user.user_id,
        bus_id=bus.bus_id,
        operator_id=bus.operator_id,
        booking_id=review_in.booking_id,
        rating=review_in.rating,
        comment=review_in.comment.strip()
    )
    db.add(review)

    # Recalculate operator rating average
    all_op_reviews = db.query(models.Review.rating).filter(models.Review.operator_id == bus.operator_id).all()
    ratings_vals = [r[0] for r in all_op_reviews] + [review_in.rating]
    bus.operator.rating = round(sum(ratings_vals) / len(ratings_vals), 1)

    db.commit()
    db.refresh(review)

    return schemas.ReviewResponse(
        review_id=review.review_id,
        user_id=current_user.user_id,
        user_name=current_user.full_name,
        bus_id=bus.bus_id,
        bus_name=bus.bus_name,
        operator_id=bus.operator_id,
        operator_name=bus.operator.name,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at
    )
