from __future__ import annotations

import ipaddress
import socket
import tempfile
from pathlib import Path
from urllib.parse import urlparse

_IDENTIFIER_SEGMENTS = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_")
_BLOCKED_HOSTS = {
    "localhost",
    "metadata.google.internal",
    "metadata",
    "169.254.169.254",
    "100.100.100.200",
}


def _candidate_roots() -> list[Path]:
    backend_root = Path(__file__).resolve().parents[2]
    project_root = backend_root.parent
    roots = [
        backend_root.resolve(),
        project_root.resolve(),
        Path(tempfile.gettempdir()).resolve(),
    ]
    if Path("/app").exists():
        roots.append(Path("/app").resolve())
    if Path("/tmp").exists():
        roots.append(Path("/tmp").resolve())
    return roots


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def resolve_safe_path(path_value: str, *, purpose: str, allow_directory: bool = False) -> Path:
    candidate = Path(path_value).expanduser()
    resolved = (candidate if candidate.is_absolute() else (Path.cwd() / candidate)).resolve(strict=False)

    roots = _candidate_roots()
    allowed = any(_is_relative_to(resolved, root) for root in roots)
    if purpose == "write":
        allowed = allowed or any(_is_relative_to(resolved.parent, root) for root in roots)

    if not allowed:
        raise ValueError(f"Path '{path_value}' is outside the allowed runtime directories")

    if purpose == "read":
        if not resolved.exists():
            raise FileNotFoundError(f"Path not found: {resolved}")
        if resolved.is_dir() and not allow_directory:
            raise IsADirectoryError(f"Expected a file path, got directory: {resolved}")
    elif purpose == "write":
        resolved.parent.mkdir(parents=True, exist_ok=True)
    else:
        raise ValueError(f"Unknown path purpose '{purpose}'")

    return resolved


def validate_identifier_path(value: str) -> list[str]:
    segments = [segment.strip() for segment in value.split(".") if segment.strip()]
    if not segments:
        raise ValueError("Identifier cannot be empty")

    for segment in segments:
        if segment[0] not in "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz":
            raise ValueError(f"Invalid identifier '{value}'")
        if any(character not in _IDENTIFIER_SEGMENTS for character in segment):
            raise ValueError(f"Invalid identifier '{value}'")

    return segments


def quote_identifier_path(value: str) -> str:
    return ".".join(f'"{segment}"' for segment in validate_identifier_path(value))


def validate_outbound_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http and https URLs are allowed")
    if not parsed.hostname:
        raise ValueError("URL must include a hostname")

    hostname = parsed.hostname.lower()
    if hostname in _BLOCKED_HOSTS:
        raise ValueError(f"Outbound access to '{hostname}' is blocked")

    addresses = []
    try:
        addresses = [info[4][0] for info in socket.getaddrinfo(hostname, parsed.port or None, type=socket.SOCK_STREAM)]
    except socket.gaierror:
        try:
            ipaddress.ip_address(hostname)
            addresses = [hostname]
        except ValueError as exc:
            raise ValueError(f"Unable to resolve hostname '{hostname}'") from exc

    for address in addresses:
        ip = ipaddress.ip_address(address)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ValueError(f"Outbound access to '{hostname}' is blocked")

    return url
