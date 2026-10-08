#!/usr/bin/env python3
"""Explicit human resume; does not approve product direction or change the queue."""
import argparse
import fcntl
import json
from pathlib import Path
import subprocess
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['status', 'resume'])
parser.add_argument('--note')
args = parser.parse_args()
state = json.loads((root / 'STATE.json').read_text())
if args.action == 'status':
    print(json.dumps(state, ensure_ascii=False, indent=2))
else:
    if not args.note:
        parser.error('resume requires --note describing resolved blocker or human group decision')
    (root / '.loop').mkdir(exist_ok=True)
    with (root / '.loop/lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        dirty = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=all'], cwd=root, text=True).strip()
        if dirty:
            parser.error('Review and checkpoint existing changes before resuming; no automatic commit')
        state.update(status='READY', reason=args.note, updated_at=datetime.now(timezone.utc).isoformat(), next_action='scripts/run-loop')
        tmp = root / 'STATE.json.tmp'
        tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
        tmp.replace(root / 'STATE.json')
        print('READY. Start scripts/run-loop explicitly.')
