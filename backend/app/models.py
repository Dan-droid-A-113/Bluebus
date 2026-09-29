from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

# 1. User
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    gender = Column(String(10), default="MALE", nullable=False) # MALE, FEMALE, OTHER
    age = Column(Integer, default=25, nullable=False)
    role = Column(String(20), default="PASSENGER", nullable=False) # PASSENGER, ADMIN, OPERATOR
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")


# 2. Operator
class Operator(Base):
    __tablename__ = "operators"

    operator_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), unique=True, nullable=False)
    email = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)
    license_no = Column(String(60), unique=True, nullable=False)
    rating = Column(Float, default=4.5, nullable=False)
    logo_color = Column(String(20), default="#2563eb", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    buses = relationship("Bus", back_populates="operator", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="operator")


# 3. Route
class Route(Base):
    __tablename__ = "routes"

    route_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_city = Column(String(60), nullable=False, index=True)
    destination_city = Column(String(60), nullable=False, index=True)
    distance_km = Column(Float, nullable=False)
    estimated_duration_mins = Column(Integer, nullable=False)
    base_fare = Column(Float, nullable=False)

    trips = relationship("Trip", back_populates="route", cascade="all, delete-orphan")
    stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan")


# 4. RouteStop (Boarding & Dropping Points)
class RouteStop(Base):
    __tablename__ = "route_stops"

    stop_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    route_id = Column(Integer, ForeignKey("routes.route_id", ondelete="CASCADE"), nullable=False)
    stop_name = Column(String(100), nullable=False)
    stop_type = Column(String(20), nullable=False) # BOARDING, DROPPING
    landmark = Column(String(150), nullable=True)
    time_offset_mins = Column(Integer, default=0, nullable=False) # Minutes offset from departure/arrival
    order_index = Column(Integer, default=1, nullable=False)

    route = relationship("Route", back_populates="stops")
    boarding_bookings = relationship("Booking", foreign_keys="[Booking.boarding_point_id]", back_populates="boarding_point")
    dropping_bookings = relationship("Booking", foreign_keys="[Booking.dropping_point_id]", back_populates="dropping_point")


# 5. Bus
class Bus(Base):
    __tablename__ = "buses"

    bus_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    operator_id = Column(Integer, ForeignKey("operators.operator_id", ondelete="CASCADE"), nullable=False)
    bus_number = Column(String(30), unique=True, nullable=False)
    bus_name = Column(String(100), nullable=False)
    bus_type = Column(String(50), nullable=False) # AC Sleeper (2+1), Bharat Benz AC Seater (2+2), Volvo Multi-Axle Sleeper
    has_ac = Column(Boolean, default=True, nullable=False)
    is_sleeper = Column(Boolean, default=True, nullable=False)
    total_seats = Column(Integer, default=30, nullable=False)
    amenities = Column(String(255), default="WiFi,Charging Point,Water Bottle,Blanket,Reading Light,GPS", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    operator = relationship("Operator", back_populates="buses")
    seats = relationship("Seat", back_populates="bus", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="bus", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="bus")


# 6. Seat
class Seat(Base):
    __tablename__ = "seats"

    seat_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bus_id = Column(Integer, ForeignKey("buses.bus_id", ondelete="CASCADE"), nullable=False)
    seat_number = Column(String(10), nullable=False)
    deck = Column(String(10), default="LOWER", nullable=False) # LOWER, UPPER
    row_num = Column(Integer, nullable=False)
    col_num = Column(Integer, nullable=False)
    seat_type = Column(String(20), default="SLEEPER", nullable=False) # SLEEPER, SEATER
    is_ladies = Column(Boolean, default=False, nullable=False)
    price_multiplier = Column(Float, default=1.0, nullable=False)
    is_operable = Column(Boolean, default=True, nullable=False) # True = normal, False = damaged/out of service
    inoperable_reason = Column(String(100), nullable=True) # e.g. "Damaged seat cushion", "Recliner broken"

    bus = relationship("Bus", back_populates="seats")
    passengers = relationship("Passenger", back_populates="seat")

    __table_args__ = (
        UniqueConstraint("bus_id", "seat_number", name="uq_bus_seat_no"),
    )


# 7. Trip
class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bus_id = Column(Integer, ForeignKey("buses.bus_id", ondelete="CASCADE"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.route_id", ondelete="CASCADE"), nullable=False)
    travel_date = Column(String(10), nullable=False, index=True) # YYYY-MM-DD
    departure_time = Column(String(10), nullable=False) # HH:MM
    arrival_time = Column(String(10), nullable=False) # HH:MM
    fare = Column(Float, nullable=False)
    status = Column(String(20), default="SCHEDULED", nullable=False) # SCHEDULED, DEPARTED, COMPLETED, CANCELLED

    bus = relationship("Bus", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    bookings = relationship("Booking", back_populates="trip", cascade="all, delete-orphan")


# 8. Booking
class Booking(Base):
    __tablename__ = "bookings"

    booking_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pnr_number = Column(String(25), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.trip_id", ondelete="CASCADE"), nullable=False)
    boarding_point_id = Column(Integer, ForeignKey("route_stops.stop_id"), nullable=True)
    dropping_point_id = Column(Integer, ForeignKey("route_stops.stop_id"), nullable=True)
    booking_date = Column(DateTime, default=datetime.utcnow)
    total_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    final_amount = Column(Float, nullable=False)
    coupon_code = Column(String(30), nullable=True)
    contact_email = Column(String(120), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    status = Column(String(20), default="CONFIRMED", nullable=False) # CONFIRMED, CANCELLED

    user = relationship("User", back_populates="bookings")
    trip = relationship("Trip", back_populates="bookings")
    boarding_point = relationship("RouteStop", foreign_keys=[boarding_point_id], back_populates="boarding_bookings")
    dropping_point = relationship("RouteStop", foreign_keys=[dropping_point_id], back_populates="dropping_bookings")
    passengers = relationship("Passenger", back_populates="booking", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    cancellation = relationship("Cancellation", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="booking", cascade="all, delete-orphan")


# 9. Passenger (Multi-Passenger per booking)
class Passenger(Base):
    __tablename__ = "passengers"

    passenger_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.seat_id"), nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False) # MALE, FEMALE, OTHER
    seat_number = Column(String(10), nullable=False)
    seat_fare = Column(Float, nullable=False)
    caption = Column(String(200), nullable=True) # e.g. 'Carrying a baby', 'In a wheelchair', 'Sound sleeper', 'Not interested in swaps', etc.

    booking = relationship("Booking", back_populates="passengers")
    seat = relationship("Seat", back_populates="passengers")


# 10. Payment
class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(String(40), unique=True, nullable=False, index=True)
    payment_method = Column(String(30), nullable=False) # UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING
    amount = Column(Float, nullable=False)
    status = Column(String(20), default="SUCCESS", nullable=False) # SUCCESS, FAILED, REFUNDED
    payment_time = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="payment")


# 11. Cancellation & Refunds
class Cancellation(Base):
    __tablename__ = "cancellations"

    cancellation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False)
    cancelled_at = Column(DateTime, default=datetime.utcnow)
    cancellation_reason = Column(String(255), default="User requested cancellation")
    refund_amount = Column(Float, nullable=False)
    cancellation_fee = Column(Float, nullable=False)
    refund_transaction_id = Column(String(40), unique=True, nullable=False)
    refund_status = Column(String(20), default="REFUNDED", nullable=False)

    booking = relationship("Booking", back_populates="cancellation")


# 12. Reviews & Ratings
class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    bus_id = Column(Integer, ForeignKey("buses.bus_id", ondelete="CASCADE"), nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.operator_id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=True)
    rating = Column(Integer, nullable=False) # 1 to 5
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
    bus = relationship("Bus", back_populates="reviews")
    operator = relationship("Operator", back_populates="reviews")
    booking = relationship("Booking", back_populates="reviews")


# 13. Coupons & Offers
class Coupon(Base):
    __tablename__ = "coupons"

    coupon_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    discount_type = Column(String(20), default="PERCENTAGE", nullable=False) # PERCENTAGE, FIXED
    discount_val = Column(Float, nullable=False) # e.g. 20 (20%) or 150 (₹150)
    min_booking_amount = Column(Float, default=500.0, nullable=False)
    max_discount = Column(Float, default=250.0, nullable=False)
    valid_until = Column(String(10), nullable=False) # YYYY-MM-DD
    usage_limit = Column(Integer, default=500, nullable=False)
    used_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


# 14. Peer-to-Peer Seat Swap Requests
class SeatSwapRequest(Base):
    __tablename__ = "seat_swap_requests"

    request_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey("trips.trip_id", ondelete="CASCADE"), nullable=False)

    # Requester (who wants to swap)
    requester_booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False)
    requester_passenger_id = Column(Integer, ForeignKey("passengers.passenger_id", ondelete="CASCADE"), nullable=False)
    requester_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    requester_seat_id = Column(Integer, ForeignKey("seats.seat_id"), nullable=False)
    requester_seat_number = Column(String(10), nullable=False)

    # Target (booked person receiving the swap request)
    target_booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False)
    target_passenger_id = Column(Integer, ForeignKey("passengers.passenger_id", ondelete="CASCADE"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    target_seat_id = Column(Integer, ForeignKey("seats.seat_id"), nullable=False)
    target_seat_number = Column(String(10), nullable=False)

    # PENDING, ACCEPTED, REJECTED, CANCELLED
    status = Column(String(20), default="PENDING", nullable=False)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip = relationship("Trip")
    requester_user = relationship("User", foreign_keys=[requester_user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    requester_passenger = relationship("Passenger", foreign_keys=[requester_passenger_id])
    target_passenger = relationship("Passenger", foreign_keys=[target_passenger_id])
    requester_booking = relationship("Booking", foreign_keys=[requester_booking_id])
    target_booking = relationship("Booking", foreign_keys=[target_booking_id])

