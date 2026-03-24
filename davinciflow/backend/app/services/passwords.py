from __future__ import annotations

import base64
import hashlib
import secrets
from hmac import compare_digest

SCRYPT_PREFIX = "scrypt"
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_KEY_LEN = 64
SCRYPT_SALT_LEN = 16


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SCRYPT_SALT_LEN)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_KEY_LEN,
    )
    return "$".join(
        [
            SCRYPT_PREFIX,
            str(SCRYPT_N),
            str(SCRYPT_R),
            str(SCRYPT_P),
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(derived).decode("ascii"),
        ]
    )


def is_password_hash(value: str | None) -> bool:
    return bool(value and value.startswith(f"{SCRYPT_PREFIX}$"))


def verify_password(password: str, expected: str) -> bool:
    if not is_password_hash(expected):
        return compare_digest(password, expected)

    try:
        _, n, r, p, encoded_salt, encoded_hash = expected.split("$", maxsplit=5)
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=base64.urlsafe_b64decode(encoded_salt.encode("ascii")),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(base64.urlsafe_b64decode(encoded_hash.encode("ascii"))),
        )
        return compare_digest(
            base64.urlsafe_b64encode(derived).decode("ascii"),
            encoded_hash,
        )
    except (ValueError, TypeError):
        return False
