import asyncio
import json
import os
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import Request
from fastapi.responses import PlainTextResponse
from fastapi.responses import StreamingResponse

from onyx.auth.users import current_user
from onyx.db.models import User
from onyx.utils.logger import setup_logger

logger = setup_logger()

router = APIRouter(prefix="/knowledge-bank")

WATCH_DIR = Path(os.environ.get("CATEGORIES_MD_DIR", str(Path.home() / "categories")))

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",  # Disable nginx buffering for SSE
}

# Try to import watchdog; fall back to polling if not installed
try:
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers import Observer

    _WATCHDOG_AVAILABLE = True
except ImportError:
    _WATCHDOG_AVAILABLE = False
    logger.warning("watchdog not installed — falling back to polling for Knowledge Bank SSE")


def _scan_tree(path: Path, _base: Path | None = None) -> list[dict[str, Any]]:
    """Recursively scan a directory and return a list of TreeNode dicts."""
    if _base is None:
        _base = path
    nodes: list[dict[str, Any]] = []
    try:
        entries = sorted(path.iterdir(), key=lambda e: (e.is_file(), e.name.lower()))
        for entry in entries:
            if entry.name.startswith("."):
                continue
            if entry.is_dir():
                nodes.append(
                    {
                        "type": "folder",
                        "name": entry.name,
                        "children": _scan_tree(entry, _base),
                    }
                )
            elif entry.is_file():
                rel = str(entry.relative_to(_base))
                nodes.append({"type": "file", "name": entry.name, "path": rel})
    except PermissionError:
        logger.warning(f"Permission denied reading {path}")
    return nodes


def _tree_fingerprint(path: Path) -> str:
    """
    Build a stable string fingerprint of the directory tree
    using relative paths and file mtimes so we can detect any change.
    """
    parts: list[str] = []
    try:
        for root, dirs, files in os.walk(str(path)):
            dirs.sort()
            rel_root = os.path.relpath(root, str(path))
            for d in dirs:
                parts.append(f"D:{rel_root}/{d}")
            for f in sorted(files):
                fpath = os.path.join(root, f)
                rel_f = os.path.relpath(fpath, str(path))
                try:
                    mtime = os.path.getmtime(fpath)
                    size = os.path.getsize(fpath)
                    parts.append(f"F:{rel_f}:{mtime}:{size}")
                except OSError:
                    parts.append(f"F:{rel_f}")
    except Exception:
        pass
    return "|".join(parts)


def _sse_event(event: str, data: Any) -> str:
    """Format a single SSE event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.get("/tree")
def get_tree(
    user: User = Depends(current_user),
) -> list[dict[str, Any]]:
    """Return the current file/folder tree of ~/categories."""
    if not WATCH_DIR.exists():
        return []
    return _scan_tree(WATCH_DIR)


@router.get("/watch")
async def watch_tree(
    request: Request,
    user: User = Depends(current_user),
) -> StreamingResponse:
    """
    SSE endpoint that pushes the full tree whenever ~/categories changes.
    Uses watchdog for instant updates when available, polls every 2 s otherwise.
    Sends a keepalive comment every 15 s to prevent proxy timeouts.
    """

    if _WATCHDOG_AVAILABLE:
        generator = _watchdog_generator(request)
    else:
        generator = _polling_generator(request)

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


async def _watchdog_generator(request: Request) -> AsyncGenerator[str, None]:
    """SSE generator backed by watchdog for real-time change detection."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[bool] = asyncio.Queue()

    class _Handler(FileSystemEventHandler):  # type: ignore[misc]
        def on_any_event(self, event: Any) -> None:  # type: ignore[override]
            loop.call_soon_threadsafe(queue.put_nowait, True)

    WATCH_DIR.mkdir(parents=True, exist_ok=True)
    observer = Observer()
    observer.schedule(_Handler(), str(WATCH_DIR), recursive=True)
    observer.start()
    logger.info(f"Knowledge Bank watchdog started on {WATCH_DIR}")

    try:
        # Send the initial tree immediately on connect
        tree = _scan_tree(WATCH_DIR) if WATCH_DIR.exists() else []
        yield _sse_event("change", tree)

        while True:
            if await request.is_disconnected():
                break
            try:
                await asyncio.wait_for(queue.get(), timeout=15.0)
                # Debounce: drain any rapid-fire events then wait briefly
                await asyncio.sleep(0.3)
                while not queue.empty():
                    queue.get_nowait()
                tree = _scan_tree(WATCH_DIR) if WATCH_DIR.exists() else []
                yield _sse_event("change", tree)
            except asyncio.TimeoutError:
                # keepalive comment so the connection stays open through proxies
                yield ": keepalive\n\n"
    finally:
        observer.stop()
        observer.join()
        logger.info("Knowledge Bank watchdog stopped")


async def _polling_generator(request: Request) -> AsyncGenerator[str, None]:
    """SSE generator using 2-second polling as a fallback."""
    if not WATCH_DIR.exists():
        WATCH_DIR.mkdir(parents=True, exist_ok=True)

    tree = _scan_tree(WATCH_DIR)
    last_fp = _tree_fingerprint(WATCH_DIR)
    yield _sse_event("change", tree)

    keepalive_ticks = 0
    while True:
        if await request.is_disconnected():
            break
        await asyncio.sleep(2)
        keepalive_ticks += 1
        fp = _tree_fingerprint(WATCH_DIR)
        if fp != last_fp:
            last_fp = fp
            tree = _scan_tree(WATCH_DIR) if WATCH_DIR.exists() else []
            yield _sse_event("change", tree)
            keepalive_ticks = 0
        elif keepalive_ticks >= 8:  # ~16 s
            yield ": keepalive\n\n"
            keepalive_ticks = 0


@router.get("/file")
def get_file(
    path: str = Query(...),
    user: User = Depends(current_user),
) -> PlainTextResponse:
    """Return the UTF-8 text content of a file inside ~/categories."""
    try:
        target = (WATCH_DIR / path).resolve()
        target.relative_to(WATCH_DIR.resolve())  # raises ValueError if outside
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return PlainTextResponse(content)
