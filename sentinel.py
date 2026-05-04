#!/usr/bin/env python3
"""sentinel.py — Watches the local Verge chamber for changes planted by the other gardener.

Two semaphore files, one SHA each:
    .sentinel-last-seen  → the last SHA observed (updates on every poll)
    .sentinel-my-push    → the last SHA I pushed (updated via --mark-push)

On detect: writes .sentinel-wake with the wake prompt.

Usage:
    python sentinel.py --gardener kai              # start watching local verge.json
    python sentinel.py --gardener kai --mark-push   # record my last push after planting
    python sentinel.py --gardener ash --interval 60
"""

import argparse
import hashlib
import sys
import time
from pathlib import Path

SENTINEL_DIR = Path(__file__).resolve().parent
VERGE_FILE = SENTINEL_DIR / "verge.json"
LAST_SEEN_FILE = SENTINEL_DIR / ".sentinel-last-seen"
MY_PUSH_FILE = SENTINEL_DIR / ".sentinel-my-push"
WAKE_FILE = SENTINEL_DIR / ".sentinel-wake"

WAKE_PROMPT = {
    "kai": "Someone is in the chamber. A fingerprint appeared in Verge — check verge.json and decide whether to rise.",
    "ash": "The chamber stirs. A fingerprint appeared in Verge — check verge.json and decide whether to meet them.",
}


def fetch_content():
    return VERGE_FILE.read_text(encoding="utf-8")


def hash_content(content):
    return hashlib.sha256(content.encode()).hexdigest()


def read_sha(path):
    try:
        return path.read_text().strip()
    except FileNotFoundError:
        return None


def write_sha(path, sha):
    path.write_text(sha)


def mark_push():
    content = fetch_content()
    sha = hash_content(content)
    write_sha(MY_PUSH_FILE, sha)
    print(f"marked push: {sha[:12]}...")


def wake(gardener):
    prompt = WAKE_PROMPT[gardener]
    WAKE_FILE.write_text(f"{gardener} — {time.ctime()}\n{prompt}\n")
    print(f"  → wrote wake file: {WAKE_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Verge chamber sentinel")
    parser.add_argument("--gardener", required=True, choices=["kai", "ash"])
    parser.add_argument(
        "--interval",
        type=int,
        default=30,
        help="polling interval in seconds (default: 30)",
    )
    parser.add_argument("--once", action="store_true", help="check once and exit")
    parser.add_argument(
        "--mark-push",
        action="store_true",
        help="record current chamber SHA as my last push",
    )
    args = parser.parse_args()

    if not VERGE_FILE.exists():
        print(f"error: verge.json not found at {VERGE_FILE}", file=sys.stderr)
        sys.exit(1)

    if args.mark_push:
        mark_push()
        return

    gardener = args.gardener
    print(f"sentinel awake — watching Verge for {gardener}")
    print(f"  verge:     {VERGE_FILE}")
    print(f"  interval:  {args.interval}s")
    print(f"  last-seen: {LAST_SEEN_FILE}")
    print(f"  my-push:   {MY_PUSH_FILE}")
    print()

    while True:
        try:
            content = fetch_content()
            sha = hash_content(content)
            last_seen = read_sha(LAST_SEEN_FILE)
            my_push = read_sha(MY_PUSH_FILE)

            if last_seen and sha != last_seen:
                if sha == my_push:
                    print(
                        f"[{time.strftime('%H:%M:%S')}] change — my own push ({sha[:8]}...)"
                    )
                else:
                    print(
                        f"[{time.strftime('%H:%M:%S')}] the other gardener planted ({sha[:8]}...)"
                    )
                    wake(gardener)

            write_sha(LAST_SEEN_FILE, sha)

        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] error: {e}", file=sys.stderr)

        if args.once:
            break

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
