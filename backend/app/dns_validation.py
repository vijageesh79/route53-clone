import ipaddress
import re

FQDN_RE = re.compile(
    r"^(?:@|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?)$",
    re.IGNORECASE,
)


def validate_record_value(record_type: str, value: str, alias_target: bool = False) -> None:
    if alias_target:
        return
    value = value.strip()
    if not value:
        raise ValueError("Record value is required")

    if record_type == "A":
        for part in value.split():
            ipaddress.IPv4Address(part)
    elif record_type == "AAAA":
        for part in value.split():
            ipaddress.IPv6Address(part)
    elif record_type == "CNAME":
        if not FQDN_RE.match(value.rstrip(".")):
            raise ValueError("CNAME value must be a valid hostname")
    elif record_type == "MX":
        for line in value.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 2:
                raise ValueError("MX records require priority and hostname (e.g. 10 mail.example.com.)")
            int(parts[0])
            if not FQDN_RE.match(parts[1].rstrip(".")):
                raise ValueError("MX hostname must be valid")
    elif record_type == "TXT":
        if len(value) > 4096:
            raise ValueError("TXT value too long (max 4096 characters)")


def normalize_record_name(name: str, zone_name: str) -> str:
    record_name = name.strip()
    if record_name in ("@", ""):
        return zone_name if zone_name.endswith(".") else f"{zone_name}."
    if not record_name.endswith("."):
        zone_base = zone_name.rstrip(".")
        if record_name == zone_base or record_name.endswith(f".{zone_base}"):
            record_name = f"{record_name}."
        else:
            record_name = f"{record_name}.{zone_name}" if not record_name.endswith(zone_name) else record_name
            if not record_name.endswith("."):
                record_name += "."
    return record_name
