from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

RECORD_TYPES = Literal["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]
ZONE_TYPES = Literal["Public", "Private"]


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    account_id: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserResponse
    session_id: str


class HostedZoneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    comment: Optional[str] = None
    type: ZONE_TYPES = "Public"
    private_vpc: Optional[str] = None


class HostedZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    comment: Optional[str] = None
    type: Optional[ZONE_TYPES] = None
    private_vpc: Optional[str] = None


class HostedZoneResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    comment: Optional[str]
    type: str
    record_count: int
    private_vpc: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HostedZoneListResponse(BaseModel):
    items: list[HostedZoneResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DNSRecordCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: RECORD_TYPES
    ttl: int = Field(300, ge=0, le=2147483647)
    value: str = Field(..., min_length=1)
    routing_policy: str = "Simple"
    set_identifier: Optional[str] = None
    weight: Optional[int] = None
    region: Optional[str] = None
    failover: Optional[str] = None
    health_check_id: Optional[str] = None
    alias_target: bool = False


class DNSRecordUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[RECORD_TYPES] = None
    ttl: Optional[int] = Field(None, ge=0, le=2147483647)
    value: Optional[str] = Field(None, min_length=1)
    routing_policy: Optional[str] = None
    set_identifier: Optional[str] = None
    weight: Optional[int] = None
    region: Optional[str] = None
    failover: Optional[str] = None
    health_check_id: Optional[str] = None
    alias_target: Optional[bool] = None


class DNSRecordResponse(BaseModel):
    id: str
    hosted_zone_id: str
    name: str
    type: str
    ttl: int
    value: str
    routing_policy: str
    set_identifier: Optional[str]
    weight: Optional[int]
    region: Optional[str]
    failover: Optional[str]
    health_check_id: Optional[str]
    alias_target: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DNSRecordListResponse(BaseModel):
    items: list[DNSRecordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


class BulkDeleteRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)


class BulkDeleteResponse(BaseModel):
    message: str
    deleted_count: int


class ImportZoneRequest(BaseModel):
    content: str = Field(..., min_length=1)
    format: Literal["bind"] = "bind"


class ImportZoneResponse(BaseModel):
    message: str
    imported_count: int
