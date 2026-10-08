#!/usr/bin/env python3
"""Bounded Engineering Loop. Product evidence and independent Critic are gates."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ['AGENTS.md', 'PRODUCT.md', 'DECISIONS.md', 'TASKS.md', 'EVALS.md',
           'loop.config.json', 'scripts/loop_engine.py', 'scripts/product_loop.py',
           'scripts/run-loop', 'scripts/product-evals.mjs', 'evals/ramble-china/cases.json', 'package.json']

def read(path):
    return json.loads(path.read_text())

def write(path, obj):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(path)

def stamp():
    return datetime.now(timezone.utc).isoformat()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def tasks():
    rows = []
    for line in (ROOT / 'TASKS.md').read_text().splitlines():
        cells = [x.strip() for x in line.strip('|').split('|')]
        if len(cells) == 4 and re.fullmatch(r'R\d+', cells[0]):
            rows.append(dict(zip(['id', 'status', 'task', 'evals'], cells)))
    return rows

def digest():
    protected = set(CONTROL)
    protected.update(str(p.relative_to(ROOT)) for p in (ROOT / 'scripts').glob('*') if p.is_file())
    protected.update(str(p.relative_to(ROOT)) for p in (ROOT / 'evals').rglob('*') if p.is_file() and 'runs' not in p.parts)
    return {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in protected}

def validate(cfg):
    assert cfg['schema_version'] == 1
    assert cfg['require_clean_tree'] is True
    assert cfg['max_attempts'] in range(1, 6)
    assert 30 <= cfg['timeout_seconds'] <= 1800
    commands = cfg['verification_commands']
    assert commands and all(isinstance(c, list) and c and all(isinstance(x, str) for x in c) for c in commands), 'Deterministic checks required'
    scripts = read(ROOT / 'package.json')['scripts']
    for c in commands:
        if c[:2] == ['npm', 'run']:
            assert len(c) >= 3 and c[2] in scripts, f'Unknown npm script: {c}'
    assert cfg['group_tasks'] and len(set(cfg['group_tasks'])) == len(cfg['group_tasks'])
    queue = {t['id']: t for t in tasks()}
    suite = read(ROOT / 'evals/ramble-china/cases.json')
    ids = {c['id'] for c in suite['cases']}
    for tid in cfg['group_tasks']:
        assert tid in queue and queue[tid]['status'] in ['todo', 'doing', 'blocked', 'done']
        relevant = [x for x in re.findall(r'[A-Z]+\d+', queue[tid]['evals']) if not re.fullmatch(r'H\d+', x)]
        assert relevant and set(relevant) <= ids, f'Unknown or missing EVALS for {tid}'
        assert cfg['task_modes'][tid] in ['read-only', 'workspace-write']
    for p in CONTROL:
        assert (ROOT / p).is_file(), f'Missing {p}'
    assert git('rev-parse', '--show-toplevel') == str(ROOT), 'Expected project Git root'
    help_text = subprocess.check_output(['codex', 'exec', '--help'], text=True)
    for flag in ['--sandbox', '--output-schema', '--output-last-message', '--json']:
        assert flag in help_text, f'CLI missing {flag}'
    state = read(ROOT / 'STATE.json')
    assert state['schema_version'] == 1 and state['status'] in ['READY', 'RUNNING', 'PASS', 'ESCALATE', 'BLOCKED', 'HUMAN_GATE']
    return queue, suite

def command(argv, log, timeout, prompt=None):
    with log.open('w') as out:
        proc = subprocess.Popen(argv, cwd=ROOT, stdin=subprocess.PIPE if prompt else subprocess.DEVNULL,
                                stdout=out, stderr=subprocess.STDOUT, text=True, start_new_session=True)
        try:
            proc.communicate(prompt, timeout=timeout)
        except (subprocess.TimeoutExpired, KeyboardInterrupt):
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
            raise RuntimeError(f'Timeout/interruption: {argv[0]}; see {log}')
    return proc.returncode

def agent(role, mode, prompt, attempt_dir, timeout):
    output = attempt_dir / f'{role}.json'
    schema = attempt_dir / 'schema.json'
    fields = {'status': {'type': 'string', 'enum': ['PASS', 'RETRY', 'ESCALATE']},
              'summary': {'type': 'string'}, 'evidence': {'type': 'array', 'items': {'type': 'string'}},
              'covered_evals': {'type': 'array', 'items': {'type': 'string'}},
              'runtime_observed': {'type': 'boolean'}, 'blockers': {'type': 'array', 'items': {'type': 'string'}}}
    write(schema, {'type': 'object', 'properties': fields, 'required': list(fields), 'additionalProperties': False})
    argv = ['codex', '-a', 'never', 'exec', '-C', str(ROOT), '--sandbox', mode,
            '--ephemeral', '--json', '--output-schema', str(schema), '-o', str(output), '-']
    write(attempt_dir / f'{role}-invocation.json', {'argv': argv, 'sandbox': mode})
    (attempt_dir / f'{role}-prompt.txt').write_text(prompt)
    rc = command(argv, attempt_dir / f'{role}.jsonl', timeout, prompt)
    if rc != 0 or not output.exists():
        raise RuntimeError(f'{role}: Codex exited {rc} or missing result; see {attempt_dir / (role + ".jsonl")}')
    result = read(output)
    assert set(result) == set(fields) and result['status'] in ['PASS', 'RETRY', 'ESCALATE']
    assert isinstance(result['runtime_observed'], bool)
    for key in ['evidence', 'covered_evals', 'blockers']:
        assert isinstance(result[key], list) and all(isinstance(x, str) for x in result[key])
    return result

def save(state, status, reason, **more):
    state.update(status=status, reason=reason, updated_at=stamp(), **more)
    write(ROOT / 'STATE.json', state)
    print(json.dumps(state, ensure_ascii=False), flush=True)

def run(cfg, queue, suite):
    state = read(ROOT / 'STATE.json')
    if state['status'] in ['ESCALATE', 'BLOCKED', 'HUMAN_GATE', 'RUNNING']:
        print(f"Stopped: {state['status']}. Read STATE.json; use product_loop.py resume after resolving/reviewing.")
        return 2
    pending = [queue[t] for t in cfg['group_tasks'] if queue[t]['status'] != 'done']
    if not pending:
        save(state, 'HUMAN_GATE', 'Task group complete; human must decide/reorder next group', current_task=None, next_action='Human review; no automatic product decision')
        return 0
    if git('status', '--porcelain', '--untracked-files=all'):
        save(state, 'BLOCKED', 'Dirty tree: preserve and review existing changes before starting', next_action='Review Git changes; resume explicitly')
        return 2
    state['baseline_commit'] = git('rev-parse', 'HEAD')
    run_dir = ROOT / '.loop' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    run_dir.mkdir(parents=True)
    state['evidence_dir'] = str(run_dir.relative_to(ROOT))
    for task in pending:
        tid = task['id']
        ids = [x for x in re.findall(r'[A-Z]+\d+', task['evals']) if not re.fullmatch(r'H\d+', x)]
        relevant = [c for c in suite['cases'] if c['id'] in ids]
        feedback = ''
        mode = cfg['task_modes'][tid]
        for attempt in range(1, cfg['max_attempts'] + 1):
            folder = run_dir / f'{tid}-attempt-{attempt}'
            folder.mkdir()
            save(state, 'RUNNING', 'Executing bounded task', current_task=tid, attempt=attempt, next_action='Builder → deterministic checks → independent read-only Critic')
            protected = digest()
            before = git('diff', 'HEAD', '--', '.', ':!STATE.json')
            context = '\n'.join(f'\n## {p}\n{(ROOT / p).read_text()}' for p in ['AGENTS.md', 'PRODUCT.md', 'DECISIONS.md', 'TASKS.md', 'EVALS.md'])
            base = (f'Project root: {ROOT}. Task: {json.dumps(task, ensure_ascii=False)}\n'
                    f'Relevant EVALS: {json.dumps(relevant, ensure_ascii=False)}\n'
                    'Do only this task. Never change control files, tests, eval definitions, STATE, or Git history. Never read or print secrets. '
                    'Never mark source inspection or mocked deterministic tests as real product interaction. '
                    'Use existing configured services only. Missing runtime, tools, user evidence, or configured services must be explicit blockers. '
                    'For R001 perform read-only evaluation, severity ranking, and the 30% keep/delete tradeoff. '
                    'Return the review/evidence in your JSON result; do not edit business code or project documents. '
                    'runtime_observed means actual browser interactions were observed, not HTTP/source inspection. '
                    'PASS requires task acceptance and relevant EVALS with concrete evidence; otherwise RETRY or ESCALATE.\n' + context)
            try:
                builder = agent('builder', mode, base + '\nPrior failure evidence:\n' + feedback, folder, cfg['timeout_seconds'])
                if digest() != protected:
                    raise RuntimeError('Protected control/test configuration changed; human review required')
                if mode == 'read-only' and git('diff', 'HEAD', '--', '.', ':!STATE.json') != before:
                    raise RuntimeError('Read-only task changed tracked project content')
                results = []
                for i, argv in enumerate(cfg['verification_commands']):
                    rc = command(argv, folder / f'verify-{i}.log', cfg['timeout_seconds'])
                    results.append({'argv': argv, 'exit_code': rc, 'log': str(folder / f'verify-{i}.log')})
                if mode == 'workspace-write':
                    report = ROOT / cfg['product_report']
                    rc = command(['npm', 'run', 'eval:gate', '--', str(report)], folder / 'product-gate.log', cfg['timeout_seconds'])
                    results.append({'argv': ['npm', 'run', 'eval:gate', '--', str(report)], 'exit_code': rc})
                write(folder / 'verification.json', results)
                critic_prompt = (base + '\nYou are a fresh independent Critic. Read-only inspection only. Do not implement. '
                    'Inspect the actual repository and evidence logs. Evaluate task acceptance, findings severity, 30% tradeoff, '
                    'and every relevant EVAL. Missing real browser evidence cannot pass R001. Missing deterministic verification cannot pass. '
                    'For business changes require full product-eval report gate plus independent review of the evidence authenticity. '
                    f'Builder result: {json.dumps(builder, ensure_ascii=False)}\nVerification: {json.dumps(results)}\nEvidence folder: {folder}')
                critic_before = digest(), git('diff', 'HEAD', '--', '.', ':!STATE.json')
                critic = agent('critic', 'read-only', critic_prompt, folder, cfg['timeout_seconds'])
                if critic_before != (digest(), git('diff', 'HEAD', '--', '.', ':!STATE.json')):
                    raise RuntimeError('Critic changed project files')
                verified = results and all(r['exit_code'] == 0 for r in results)
                passed = verified and all(r['status'] == 'PASS' and r['evidence'] and not r['blockers'] and set(ids) <= set(r['covered_evals']) and r['runtime_observed'] for r in [builder, critic])
                feedback = json.dumps({'builder': builder, 'verification': results, 'critic': critic}, ensure_ascii=False)
                write(folder / 'decision.json', {'pass': bool(passed), 'evidence': json.loads(feedback)})
                if passed:
                    path = ROOT / 'TASKS.md'
                    path.write_text(re.sub(rf'(\|\s*{tid}\s*\|)\s*(todo|doing|blocked)\s*\|', rf'\1 done |', path.read_text()))
                    save(state, 'PASS', 'Deterministic checks and independent Critic passed', next_action='Next authorized task or Human Gate')
                    break
                if any(r['status'] == 'ESCALATE' for r in [builder, critic]) or attempt == cfg['max_attempts']:
                    save(state, 'ESCALATE', 'Task evidence incomplete or attempt budget exhausted', next_action='Read decision.json; resolve blockers and explicitly resume')
                    return 2
            except Exception as exc:
                save(state, 'BLOCKED', str(exc), next_action='Resolve recorded blocker; explicitly resume')
                return 2
    save(state, 'HUMAN_GATE', 'Authorized task group complete; review evidence and select next group', current_task=None, next_action='Human product decision; no automatic continuation')
    return 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    cfg = read(ROOT / 'loop.config.json')
    queue, suite = validate(cfg)
    if args.validate or args.dry_run:
        print(json.dumps({'valid': True, 'group': cfg['group_tasks'], 'pending': [t for t in cfg['group_tasks'] if queue[t]['status'] != 'done'], 'verification': cfg['verification_commands'], 'critic_sandbox': 'read-only', 'gate': 'HUMAN_GATE', 'dirty_tree': bool(git('status', '--porcelain', '--untracked-files=all')), 'dry_run': args.dry_run}, ensure_ascii=False, indent=2))
        return 0
    (ROOT / '.loop').mkdir(exist_ok=True)
    with (ROOT / '.loop' / 'lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Another loop is running', file=sys.stderr)
            return 2
        return run(cfg, queue, suite)

if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'Preflight failed: {exc}', file=sys.stderr)
        sys.exit(2)
