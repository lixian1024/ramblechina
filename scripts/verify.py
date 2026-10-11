#!/usr/bin/env python3
"""Deterministic project verification. No configured checks means no pass."""
import argparse
import json
from pathlib import Path
import sys
from loop_engine import ROOT, read, verify


def verification_commands(cfg, task):
    v = cfg['verification']
    commands = list(v['commands']) + list(v['task_commands'].get(task, []))
    if v.get('auto_discover_project_tests'):
        package = ROOT / 'package.json'
        if package.exists():
            scripts = read(package).get('scripts', {})
            commands += [f'npm run {name}' for name in ['typecheck', 'test', 'lint'] if name in scripts]
    return list(dict.fromkeys(commands))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--task', required=True)
    ap.add_argument('--output')
    args = ap.parse_args()
    # Run as an imported module so verify() shares the same project root.
    cfg = read(ROOT / 'loop.config.json')
    folder = ROOT / '.loop/manual-verification' / args.task
    result = verify(cfg, args.task, folder)
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(payload + '\n')
    print(payload)
    sys.exit(0 if result['passed'] else 1)


if __name__ == '__main__':
    main()
