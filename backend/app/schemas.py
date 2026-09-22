from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    gender: Optional[str] = "MALE"
    age: Optional[int] = 25
    role: Optional[str] = "PASSENGER"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    gender: Optional[str] = "MALE"
    age: Optional[int] = 25
    role: str

class UserResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    phone: str
    gender: str
    age: int
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None

# --- Route & Stops Schemas ---
class RouteStopResponse(BaseModel):
    stop_id: int
    stop_name: str
    stop_type: str
    landmark: Optional[str] = None
    time_offset_mins: int
    order_index: int

    class Config:
        from_attributes = True

class RouteResponse(BaseModel):
    route_id: int
    source_city: str
    destination_city: str
    distance_km: float
    estimated_duration_mins: int
    base_fare: float
    stops: List[RouteStopResponse] = []

    class Config:
        from_attributes = True

class RouteCreate(BaseModel):
    source_city: str
    destination_city: str
    distance_km: float
    estimated_duration_mins: int
    base_fare: float

# --- Operator Schemas ---
class OperatorResponse(BaseModel):
    operator_id: int
    name: str
    email: str
    phone: str
    license_no: str
    rating: float
    logo_color: str

    class Config:
        from_attributes = True

class OperatorCreate(BaseModel):
    name: str
    email: str
    phone: str
    license_no: str
    logo_color: Optional[str] = "#2563eb"

# --- Bus Schemas ---
class BusResponse(BaseModel):
    bus_id: int
    operator_id: int
    bus_number: str
    bus_name: str
    bus_type: str
    has_ac: bool
    is_sleeper: bool
    total_seats: int
    amenities: str
    is_active: bool
    operator: Optional[OperatorResponse] = None

    class Config:
        from_attributes = True

class BusCreate(BaseModel):
    operator_id: int
    bus_number: str
    bus_name: str
    bus_type: str
    has_ac: bool = True
    is_sleeper: bool = True
    total_seats: int = 30
    amenities: str = "WiFi,Charging Point,Water Bottle,Blanket,Reading Light,GPS"

# --- Seat Layout Schemas ---
class SeatItem(BaseModel):
    seat_id: int
    seat_number: str
    deck: str # LOWER or UPPER
    row_num: int
    col_num: int
    seat_type: str # SLEEPER or SEATER
    is_ladies: bool
    price: float
    status: str # AVAILABLE, BOOKED, LADIES_BOOKED
    passenger_gender: Optional[str] = None
    passenger_age: Optional[int] = None

class SeatSwapRequest(BaseModel):
    passenger_id: int
    new_seat_id: int
    reason: Optional[str] = "Passenger requested seat swap"

class SeatSwapResponse(BaseModel):
    success: bool
    message: str
    old_seat_number: str
    new_seat_number: str
    passenger_name: str

class SeatLayoutResponse(BaseModel):
    trip_id: int
    bus_id: int
    bus_name: str
    bus_type: str
    has_ac: bool
    is_sleeper: bool
    base_fare: float
    total_seats: int
    available_seats_count: int
    lower_deck: List[SeatItem]
    upper_deck: List[SeatItem]
    boarding_points: List[RouteStopResponse]
    dropping_points: List[RouteStopResponse]

# --- Trip Schemas ---
class TripResponse(BaseModel):
    trip_id: int
    bus_id: int
    route_id: int
    travel_date: str
    departure_time: str
    arrival_time: str
    fare: float
    status: str
    bus_name: str
    bus_number: str
    bus_type: str
    has_ac: bool
    is_sleeper: bool
    operator_name: str
    operator_rating: float
    amenities: List[str]
    source_city: str
    destination_city: str
    duration_mins: int
    available_seats: int
    total_seats: int
    boarding_points: List[RouteStopResponse] = []
    dropping_points: List[RouteStopResponse] = []

    class Config:
        from_attributes = True

class TripCreate(BaseModel):
    bus_id: int
    route_id: int
    travel_date: str
    departure_time: str
    arrival_time: str
    fare: float

# --- Passenger & Booking Schemas ---
class PassengerInput(BaseModel):
    seat_id: int
    name: str
    age: int = 25
    gender: str = "MALE" # MALE, FEMALE, OTHER

class BookingCreate(BaseModel):
    trip_id: int
    boarding_point_id: Optional[int] = None
    dropping_point_id: Optional[int] = None
    coupon_code: Optional[str] = None
    contact_email: str
    contact_phone: str
    passengers: List[PassengerInput]
    payment_method: str = "UPI" # UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING

class PassengerResponse(BaseModel):
    passenger_id: int
    seat_id: int
    name: str
    age: int
    gender: str
    seat_number: str
    seat_fare: float

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    payment_id: int
    transaction_id: str
    payment_method: str
    amount: float
    status: str
    payment_time: datetime

    class Config:
        from_attributes = True

class CancellationResponse(BaseModel):
    cancellation_id: int
    cancelled_at: datetime
    cancellation_reason: str
    refund_amount: float
    cancellation_fee: float
    refund_transaction_id: str
    refund_status: str

    class Config:
        from_attributes = True

class BookingResponse(BaseModel):
    booking_id: int
    pnr_number: str
    user_id: int
    trip_id: int
    booking_date: datetime
    total_amount: float
    discount_amount: float
    final_amount: float
    coupon_code: Optional[str] = None
    contact_email: str
    contact_phone: str
    status: str
    source_city: str
    destination_city: str
    travel_date: str
    departure_time: str
    arrival_time: str
    bus_name: str
    bus_type: str
    operator_name: str
    boarding_point: Optional[str] = None
    dropping_point: Optional[str] = None
    passengers: List[PassengerResponse] = []
    payment: Optional[PaymentResponse] = None
    cancellation: Optional[CancellationResponse] = None

# --- Review Schemas ---
class ReviewCreate(BaseModel):
    trip_id: Optional[int] = None
    bus_id: int
    booking_id: Optional[int] = None
    rating: int # 1 to 5
    comment: str

class ReviewResponse(BaseModel):
    review_id: int
    user_id: int
    user_name: str
    bus_id: int
    bus_name: str
    operator_id: int
    operator_name: str
    rating: int
    comment: str
    created_at: datetime

# --- Coupon Schemas ---
class CouponResponse(BaseModel):
    coupon_id: int
    code: str
    title: str
    description: str
    discount_type: str
    discount_val: float
    min_booking_amount: float
    max_discount: float
    valid_until: str
    is_active: bool

    class Config:
        from_attributes = True

class CouponCreate(BaseModel):
    code: str
    title: str
    description: str
    discount_type: str = "PERCENTAGE"
    discount_val: float
    min_booking_amount: float = 500.0
    max_discount: float = 250.0
    valid_until: str

class CouponApplyRequest(BaseModel):
    code: str
    total_amount: float

class CouponApplyResponse(BaseModel):
    valid: bool
    message: str
    code: Optional[str] = None
    discount_amount: float = 0.0
    final_amount: float = 0.0

# --- Admin Analytics Schemas ---
class AdminAnalyticsResponse(BaseModel):
    total_revenue: float
    total_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    total_refunded: float
    active_buses: int
    total_trips: int
    occupancy_rate_percent: float
    popular_routes: List[dict]
    operator_performance: List[dict]
    recent_bookings: List[dict]
