import random
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_user

router = APIRouter(prefix="/cancellations", tags=["Cancellation & Refunds"])

class CancelRequest(BaseModel):
    reason: str = "User requested cancellation"

def calculate_refund(trip_date_str: str, dep_time_str: str, final_amount: float):
    """
    Tiered refund calculation based on time before departure:
    - > 24 hours: 90% refund (10% cancellation charge)
    - 12 to 24 hours: 75% refund (25% cancellation charge)
    - < 12 hours: 50% refund (50% cancellation charge)
    """
    try:
        dep_datetime = datetime.strptime(f"{trip_date_str} {dep_time_str}", "%Y-%m-%d %H:%M")
        now = datetime.utcnow()
        hours_diff = (dep_datetime - now).total_seconds() / 3600.0
    except Exception:
        hours_diff = 25.0 # Fallback

    if hours_diff > 24.0:
        refund_rate = 0.90
        policy_note = "> 24 hours before departure: 90% refund (10% fee)"
    elif hours_diff >= 12.0:
        refund_rate = 0.75
        policy_note = "12 - 24 hours before departure: 75% refund (25% fee)"
    else:
        refund_rate = 0.50
        policy_note = "< 12 hours before departure: 50% refund (50% fee)"

    refund_amt = round(final_amount * refund_rate, 2)
    fee_amt = round(final_amount - refund_amt, 2)
    return refund_amt, fee_amt, policy_note

@router.get("/preview/{pnr}")
def preview_cancellation(pnr: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.pnr_number == pnr.strip().upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="This booking has already been cancelled")

    trip = booking.trip
    refund_amt, fee_amt, policy_note = calculate_refund(trip.travel_date, trip.departure_time, booking.final_amount)

    return {
        "pnr_number": booking.pnr_number,
        "total_paid": booking.final_amount,
        "refund_amount": refund_amt,
        "cancellation_fee": fee_amt,
        "policy_applied": policy_note,
        "passengers_count": len(booking.passengers)
    }

@router.post("/{pnr}", response_model=schemas.CancellationResponse)
def cancel_booking(
    pnr: str,
    req: CancelRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.pnr_number == pnr.strip().upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Ensure user owns this booking or is an admin
    if booking.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if booking.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    trip = booking.trip
    refund_amt, fee_amt, _ = calculate_refund(trip.travel_date, trip.departure_time, booking.final_amount)

    refund_txn_id = f"REF-BB-{''.join(random.choices(string.digits, k=6))}"

    # Update booking status
    booking.status = "CANCELLED"

    cancellation = models.Cancellation(
        booking_id=booking.booking_id,
        cancelled_at=datetime.utcnow(),
        cancellation_reason=req.reason,
        refund_amount=refund_amt,
        cancellation_fee=fee_amt,
        refund_transaction_id=refund_txn_id,
        refund_status="REFUNDED"
    )
    db.add(cancellation)
    db.commit()
    db.refresh(cancellation)

    return cancellation
