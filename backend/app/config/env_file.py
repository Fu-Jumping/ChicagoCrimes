"""Merge key/value pairs into the repository-root .env file."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def repo_root() -> Path:
    """
    Returns the directory where .env and logs/ should be stored.

    - Development: 4 levels up from this file (the git repo root).
    - PyInstaller bundle: CHICAGO_CRIME_DATA_DIR env var, or
      %APPDATA%/ChicagoCrimeViz as fallback (always writable).
    """
    if getattr(sys, "frozen", False):
        data_dir = os.environ.get("CHICAGO_CRIME_DATA_DIR")
        if data_dir:
            p = Path(data_dir)
        else:
            appdata = Path(os.environ.get("APPDATA", "")) or Path.home()
            p = appdata / "ChicagoCrimeViz"
        p.mkdir(parents=True, exist_ok=True)
        return p
    return Path(__file__).resolve().parents[3]


def merge_env_file(updates: dict[str, str], *, root: Path | None = None) -> Path:
    """
    Update or append keys in ``.env`` at repo root.
    Preserves unrelated lines and comments where possible.
    """
    base = root or repo_root()
    env_path = base / ".env"
    lines: list[str] = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    keys = set(updates.keys())
    seen: set[str] = set()
    new_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            new_lines.append(line)
            continue
        key, _, _val = line.partition("=")
        key = key.strip()
        if key in keys:
            new_lines.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            new_lines.append(line)

    for key, value in updates.items():
        if key not in seen:
            new_lines.append(f"{key}={value}")

    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    return env_path
