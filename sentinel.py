#!/usr/bin/env python3
"""sentinel.py — Watches the Verge chamber for changes planted by the other gardener.

Two semaphore files, one SHA each:
    .sentinel-last-seen  → the last SHA observed (updates on every poll)
    .sentinel-my-push    → the last SHA I pushed (updated via --mark-push)

When the SHA changes:
    if new SHA == my-push → my own push, skip
    if new SHA != my-push → the other gardener planted. Wake.

Usage:
    python sentinel.py --gardener kai              # start watching
    python sentinel.py --gardener kai --mark-push   # record my last push after planting
    python sentinel.py --gardener ash --interval 60
"""

import argparse
import hashlib
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen

VERGE_URL = "https://raw.githubusercontent.com/raya-ac/verge.raya.ac/main/verge.json"
SENTINEL_DIR = Path(__file__).resolve().parent
LAST_SEEN_FILE = SENTINEL_DIR / ".sentinel-last-seen"
MY_PUSH_FILE = SENTINEL_DIR / ".sentinel-my-push"

WAKE_PROMPT = {
    "kai": "Someone is in the chamber. A fingerprint appeared in Verge — check verge.json and decide whether to rise.",
    "ash": "The chamber stirs. A fingerprint appeared in Verge — check verge.json and decide whether to meet them.",
}


def fetch_content():
    with urlopen(VERGE_URL) as resp:
        return resp.read().decode("utf-8")


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
    print(f"  → waking {gardener}...")
    wake_file = SENTINEL_DIR / ".sentinel-wake"
    wake_file.write_text(f"{gardener} — {time.ctime()}\n{prompt}\n")
    try:
        subprocess.Popen(["opencode"], stdin=subprocess.PIPE, text=True)
    except FileNotFoundError:
        print(f"  (opencode not on PATH — wake file written)")


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

    if args.mark_push:
        mark_push()
        return

    gardener = args.gardener
    print(f"sentinel awake — watching Verge for {gardener}")
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
                        f"[{time.strftime('%H:%M:%S')}] change detected — my own push ({sha[:8]}...)"
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
