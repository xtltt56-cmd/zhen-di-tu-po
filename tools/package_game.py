#!/usr/bin/env python3
"""Build a clean, runnable distribution of the browser game.

The source tree is intentionally kept separate from the distribution staging
directory.  Only files required by the game's relative asset paths are copied;
local caches, test captures, and historical release snapshots are excluded.
"""

from __future__ import annotations

import argparse
import os
import shutil
import zipfile
from pathlib import Path


ROOT_FILES = (
    "index.html",
    "启动阵地突围.bat",
    "menu-vehicles-background.png",
    "阵地突围-军事图标.ico",
    "阵地突围-军事图标.png",
    "README.md",
)
ROOT_DIRS = ("assets", "src")


def resolve_from_root(root: Path, value: str) -> Path:
    candidate = Path(value)
    return candidate if candidate.is_absolute() else root / candidate


def copy_runtime_tree(root: Path, site_dir: Path) -> None:
    site_dir.mkdir(parents=True, exist_ok=True)

    for relative in ROOT_FILES:
        source = root / relative
        if not source.is_file():
            raise FileNotFoundError(f"required distribution file is missing: {source}")
        shutil.copy2(source, site_dir / relative)

    for relative in ROOT_DIRS:
        source = root / relative
        if not source.is_dir():
            raise FileNotFoundError(f"required distribution directory is missing: {source}")
        shutil.copytree(source, site_dir / relative, dirs_exist_ok=True)

    commit = os.environ.get("GITHUB_SHA", "local")
    run = os.environ.get("GITHUB_RUN_NUMBER", "-")
    (site_dir / "BUILD_INFO.txt").write_text(
        f"阵地突围可运行分发包\nsource_commit={commit}\nbuild_number={run}\n",
        encoding="utf-8",
    )


def write_zip(site_dir: Path, archive: Path) -> int:
    archive.parent.mkdir(parents=True, exist_ok=True)
    if archive.exists():
        archive.unlink()

    count = 0
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in sorted(site_dir.rglob("*")):
            if not path.is_file():
                continue
            bundle.write(path, path.relative_to(site_dir).as_posix())
            count += 1
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="build", help="generated files directory")
    parser.add_argument("--site-dir", default=None, help="staging directory for Pages/runtime files")
    parser.add_argument("--zip-path", default=None, help="output ZIP path")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    output_dir = resolve_from_root(root, args.output_dir).resolve()
    site_dir = resolve_from_root(root, args.site_dir or str(Path(args.output_dir) / "site")).resolve()
    archive = resolve_from_root(
        root, args.zip_path or str(Path(args.output_dir) / "zhen-di-tu-po-latest.zip")
    ).resolve()

    # These paths are generated outputs under the requested output directory.
    # Refuse to remove anything outside it to avoid accidental data loss.
    if output_dir not in site_dir.parents and site_dir != output_dir:
        raise ValueError("site directory must be inside output directory")
    if output_dir not in archive.parents:
        raise ValueError("ZIP path must be inside output directory")

    if site_dir.exists():
        shutil.rmtree(site_dir)
    copy_runtime_tree(root, site_dir)
    file_count = write_zip(site_dir, archive)
    print(f"staged {file_count} files in {site_dir}")
    print(f"created {archive} ({archive.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
