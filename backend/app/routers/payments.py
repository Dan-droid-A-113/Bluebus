import random
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_user

router = APIRouter(prefix="/payments", tags=["Payment Processing"])

class ProcessPaymentRequest(BaseModel):
    booking_id: int
    payment_method: str # UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING
    amount: float
    card_number: str = ""
    upi_id: str = ""

@router.post("/process", response_model=schemas.PaymentResponse)
def process_payment(
    req: ProcessPaymentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.booking_id == req.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.payment:
        return booking.payment

    txn_id = f"TXN-BB-{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"

    payment = models.Payment(
        booking_id=booking.booking_id,
        transaction_id=txn_id,
        payment_method=req.payment_method.upper(),
        amount=req.amount,
        status="SUCCESS",
        payment_time=datetime.utcnow()
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

@router.get("/{transaction_id}", response_model=schemas.PaymentResponse)
def get_payment_details(transaction_id: str, db: Session = Depends(get_db)):
    payment = db.query(models.Payment).filter(models.Payment.transaction_id == transaction_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    return payment
