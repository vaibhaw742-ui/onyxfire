"""
OpenClaw device identity for OnyxFire.

Generates and persists an ED25519 key pair that identifies OnyxFire to the
OpenClaw gateway exactly as the CLI does. The device identity enables:
  - Scope preservation on connect (device block prevents clearUnboundScopes)
  - Silent local pairing auto-approval (when gateway sees loopback client IP)

Storage: openclaw_device_identity.json in the same directory (volume-mounted
in dev so it survives container restarts).

Payload format (V2, matches buildDeviceAuthPayload in device-auth.ts):
  v2|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}
"""

import base64
import hashlib
import json
import time
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
    load_pem_private_key,
)

from onyx.utils.logger import setup_logger

logger = setup_logger()

_IDENTITY_PATH = Path(__file__).parent / "openclaw_device_identity.json"


def _load_or_create_identity() -> dict:
    if _IDENTITY_PATH.exists():
        return json.loads(_IDENTITY_PATH.read_text())

    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    pub_pem = public_key.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo).decode()
    priv_pem = private_key.private_bytes(
        Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
    ).decode()

    # Device ID = SHA256 of raw 32-byte ED25519 key bytes.
    # ED25519 SPKI DER = 12-byte prefix + 32-byte raw key; strip the prefix.
    pub_der = public_key.public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
    raw_key = pub_der[12:]
    device_id = hashlib.sha256(raw_key).hexdigest()

    identity = {
        "version": 1,
        "deviceId": device_id,
        "publicKeyPem": pub_pem,
        "privateKeyPem": priv_pem,
        "createdAtMs": int(time.time() * 1000),
    }

    _IDENTITY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _IDENTITY_PATH.write_text(json.dumps(identity, indent=2))
    try:
        _IDENTITY_PATH.chmod(0o600)
    except Exception:
        pass

    logger.info(f"OpenClaw: created new device identity {device_id[:16]}…")
    return identity


def build_device_connect_block(
    nonce: str,
    token: str,
    client_id: str = "cli",
    client_mode: str = "cli",
    role: str = "operator",
    scopes: list[str] | None = None,
) -> dict:
    """
    Return the device block for the OpenClaw connect request params.

    Signs the V2 payload with the persistent ED25519 private key so the gateway
    treats OnyxFire as an identified (non-anonymous) client, keeping its
    requested scopes intact and triggering silent local pairing on first use.
    """
    if scopes is None:
        scopes = ["operator.write"]

    identity = _load_or_create_identity()
    device_id: str = identity["deviceId"]
    pub_pem: str = identity["publicKeyPem"]

    private_key = load_pem_private_key(identity["privateKeyPem"].encode(), password=None)
    signed_at_ms = int(time.time() * 1000)

    scopes_str = ",".join(scopes)
    token_str = token or ""
    payload = "|".join([
        "v2",
        device_id,
        client_id,
        client_mode,
        role,
        scopes_str,
        str(signed_at_ms),
        token_str,
        nonce,
    ])

    signature = private_key.sign(payload.encode("utf-8"))
    sig_b64url = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()

    return {
        "id": device_id,
        "publicKey": pub_pem,
        "signature": sig_b64url,
        "signedAt": signed_at_ms,
        "nonce": nonce,
    }
