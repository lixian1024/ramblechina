#!/usr/bin/env python3
"""Create local runtime state on a fresh checkout; never reset existing progress."""
import json
import sys
import loop_engine as engine


def initialize():
    target = engine.ROOT / 'STATE.json'
    if target.exists() or target.is_symlink():
        return False
    state = engine.read(engine.ROOT / 'loop/state.template.json')
    engine.validate(engine.read(engine.ROOT / 'loop.config.json'), state=state)
    payload = json.dumps(state, ensure_ascii=False, indent=2) + '\n'
    try:
        with target.open('x', encoding='utf-8') as handle:
            handle.write(payload)
    except FileExistsError:
        return False
    return True


def main():
    with engine.locked():
        created = initialize()
    print('Created STATE.json from the validated template.' if created
          else 'Kept existing STATE.json unchanged; no progress reset.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Initialization refused: {exc}', file=sys.stderr)
        sys.exit(2)
