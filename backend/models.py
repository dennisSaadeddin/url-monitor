from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from database import Base
from datetime import datetime

class URL(Base):
    """URL model for storing URL monitoring information."""
    __tablename__ = "urls"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    check_frequency = Column(Integer, default=60)  # in seconds
    is_one_time = Column(Boolean, default=False)  # New field for one-time checks
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Alert-related fields
    alert_enabled = Column(Boolean, default=False)  # Whether alerts are enabled for this URL
    consecutive_failures = Column(Integer, default=0)  # Count of consecutive failures
    last_alerted_at = Column(DateTime, nullable=True)  # When the last alert was sent
    alert_recovery = Column(Boolean, default=True)  # Whether to send recovery alerts

class URLStatus(Base):
    """URLStatus model for storing URL monitoring results."""
    __tablename__ = "url_statuses"

    id = Column(Integer, primary_key=True, index=True)
    url_id = Column(Integer)
    status_code = Column(Integer)
    response_time = Column(Float)  # in seconds
    is_up = Column(Boolean)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    error_message = Column(String, nullable=True)

class SubsequentRequest(Base):
    """Model for storing subsequent requests made after accessing a URL."""
    __tablename__ = "subsequent_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    url_id = Column(Integer, index=True)  # Parent URL being monitored
    target_url = Column(String)  # The subsequent URL that was requested
    ip_address = Column(String)  # IP address of the server
    resource_type = Column(String)  # Type of resource (JS, CSS, image, etc)
    state_type = Column(String)  # Stateful or stateless
    protocol = Column(String)  # TCP or UDP
    timestamp = Column(DateTime(timezone=True), server_default=func.now())