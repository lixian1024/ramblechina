#!/usr/bin/env python3
"""Validate the same contract consumed by the runner, without model calls."""
import sys
from loop_engine import ROOT, read, validate

try:
    cfg = read(ROOT / 'loop.config.json')
    queue, evals, experiment = validate(cfg)
    print(f'OK: {len(queue)} tasks, {len(evals)} evals; active tasks: {", ".join(experiment["tasks"])}')
    v = cfg['verification']
    if not v['commands'] and not any(v['task_commands'].values()):
        print('WARN: no explicit project checks; no behavioral product verification established')
except Exception as exc:
    print(f'ERROR: {exc}', file=sys.stderr)
    sys.exit(1)
