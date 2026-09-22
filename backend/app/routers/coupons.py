from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_admin

router = APIRouter(prefix="/coupons", tags=["Coupons & Offers"])

@router.get("", response_model=List[schemas.CouponResponse])
def get_all_coupons(db: Session = Depends(get_db)):
    return db.query(models.Coupon).filter(models.Coupon.is_active == True).all()

@router.post("/apply", response_model=schemas.CouponApplyResponse)
def apply_coupon(req: schemas.CouponApplyRequest, db: Session = Depends(get_db)):
    coupon = (
        db.query(models.Coupon)
        .filter(
            models.Coupon.code == req.code.strip().upper(),
            models.Coupon.is_active == True
        )
        .first()
    )

    if not coupon:
        return schemas.CouponApplyResponse(
            valid=False,
            message="Invalid or expired promo code.",
            code=req.code,
            discount_amount=0.0,
            final_amount=req.total_amount
        )

    if req.total_amount < coupon.min_booking_amount:
        return schemas.CouponApplyResponse(
            valid=False,
            message=f"Minimum booking amount of ₹{coupon.min_booking_amount} required to apply this coupon.",
            code=coupon.code,
            discount_amount=0.0,
            final_amount=req.total_amount
        )

    if coupon.discount_type == "PERCENTAGE":
        calc = (req.total_amount * coupon.discount_val) / 100.0
        discount = min(calc, coupon.max_discount)
    else:
        discount = min(coupon.discount_val, coupon.max_discount)

    final = max(0.0, req.total_amount - discount)

    return schemas.CouponApplyResponse(
        valid=True,
        message=f"Success! '{coupon.code}' applied. You saved ₹{discount:.2f}!",
        code=coupon.code,
        discount_amount=round(discount, 2),
        final_amount=round(final, 2)
    )

@router.post("", response_model=schemas.CouponResponse)
def create_coupon(
    coupon_in: schemas.CouponCreate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(models.Coupon).filter(models.Coupon.code == coupon_in.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A coupon with this code already exists")

    new_coupon = models.Coupon(
        code=coupon_in.code.strip().upper(),
        title=coupon_in.title,
        description=coupon_in.description,
        discount_type=coupon_in.discount_type,
        discount_val=coupon_in.discount_val,
        min_booking_amount=coupon_in.min_booking_amount,
        max_discount=coupon_in.max_discount,
        valid_until=coupon_in.valid_until,
        is_active=True
    )
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)
    return new_coupon
