#!/usr/bin/env python3
"""Bounded engineering runner for the version-1 Product Loop contract."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import signal
import subprocess
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ['AGENTS.md', 'PRODUCT.md', 'DECISIONS.md', 'TASKS.md', 'EVALS.md',
           'LOOP.md', 'loop.config.json', 'loop/experiments.json', 'package.json']
TASK_STATUSES = {'pending', 'running', 'passed', 'failed', 'blocked'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(path)


def stamp():
    return datetime.now(timezone.utc).isoformat()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


@contextmanager
def locked():
    (ROOT / '.loop').mkdir(exist_ok=True)
    with (ROOT / '.loop/lock').open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def sections(path, prefix, level):
    content = (ROOT / path).read_text(encoding='utf-8')
    matches = list(re.finditer(rf'^{"#" * level}\s+({prefix}-\d{{3}})\b[^\n]*', content, re.M))
    if len({m[1] for m in matches}) != len(matches):
        raise ValueError(f'Duplicate IDs in {path}')
    return {m[1]: content[m.start():matches[i + 1].start() if i + 1 < len(matches) else len(content)]
            for i, m in enumerate(matches)}


def tasks():
    return {tid: {'id': tid, 'text': body, 'evals': list(dict.fromkeys(re.findall(r'E-\d{3}', body)))}
            for tid, body in sections('TASKS.md', 'T', 3).items()}


def validate(cfg, check_cli=False, *, state=None):
    required = CONTROL + ['evals/cases.json', 'loop/schemas/engineering_result.schema.json',
                          'loop/schemas/critic_result.schema.json']
    if state is None:
        required.append('STATE.json')
    for path in required:
        if not (ROOT / path).is_file():
            raise ValueError(f'Missing {path}')
    if cfg.get('version') != 1:
        raise ValueError('Expected loop.config.json version=1; legacy schema is unsupported')
    safety = cfg['safety']
    if safety['require_git_clean'] is not True or safety['forbid_product_scope_changes'] is not True:
        raise ValueError('Clean-tree and product scope protection must remain enabled')
    cli = cfg['codex']
    if cli['sandbox'] != 'workspace-write' or cli['approval_policy'] != 'never':
        raise ValueError('Builder requires workspace-write and never approval policy')
    if not 30 <= cli['timeout_seconds'] <= 1800:
        raise ValueError('CLI timeout must be 30–1800 seconds')
    loop = cfg['engineering_loop']
    if not 1 <= loop['max_attempts_per_task'] <= 5 or not 1 <= loop['same_failure_limit'] <= 5 or loop['critic_enabled'] is not True:
        raise ValueError('Bounded attempts and an independent Critic are required')
    v = cfg['verification']
    if v['require_at_least_one_project_check'] is not True:
        raise ValueError('A project-specific deterministic check is required')
    for cmd in v['commands'] + [c for values in v['task_commands'].values() for c in values]:
        if not isinstance(cmd, str) or not shlex.split(cmd):
            raise ValueError('Verification commands must be nonempty strings')
    state = read(ROOT / 'STATE.json') if state is None else state
    if state.get('version') != 1:
        raise ValueError('Expected STATE.json version=1')
    if state['product_loop']['status'] not in {'ready', 'engineering', 'awaiting_human', 'approved', 'revise', 'pivoted', 'stopped'}:
        raise ValueError('Invalid Product Loop status')
    if state['engineering_loop']['status'] not in {'idle', 'running', 'failed', 'blocked', 'complete'}:
        raise ValueError('Invalid Engineering Loop status')
    queue = tasks()
    evals = sections('EVALS.md', 'E', 2)
    index = read(ROOT / 'evals/cases.json')['cases']
    indexed = [item['id'] for item in index]
    if len(set(indexed)) != len(indexed) or set(indexed) != set(evals):
        raise ValueError('Eval index must match EVALS.md exactly')
    mapping = read(ROOT / 'loop/experiments.json')
    if mapping['version'] != 1:
        raise ValueError('Invalid experiment mapping version')
    for eid, exp in mapping['experiments'].items():
        if not (ROOT / exp['document']).is_file() or not exp['tasks'] or len(set(exp['tasks'])) != len(exp['tasks']):
            raise ValueError(f'Invalid experiment {eid}')
        for tid in exp['tasks']:
            if tid not in queue or not queue[tid]['evals'] or not set(queue[tid]['evals']) <= set(evals):
                raise ValueError(f'Missing task or relevant Evals: {tid}')
            if state['tasks'].get(tid, {}).get('status') not in TASK_STATUSES:
                raise ValueError(f'Missing/invalid task state: {tid}')
            if not v['task_commands'].get(tid):
                raise ValueError(f'Missing behavioral verification command: {tid}')
    eid = state['product_loop']['active_experiment']
    if eid not in mapping['experiments']:
        raise ValueError('Unknown active experiment')
    if check_cli:
        help_text = subprocess.check_output([cli['command'], 'exec', '--help'], text=True)
        for flag in ['--sandbox', '--output-schema', '--output-last-message', '--json']:
            if flag not in help_text:
                raise ValueError(f'CLI missing {flag}')
    return queue, evals, mapping['experiments'][eid]


def protected_digest():
    paths = set(CONTROL)
    for directory in ['scripts', 'evals', 'loop', 'docs/experiments', 'docs/roles']:
        paths.update(str(p.relative_to(ROOT)) for p in (ROOT / directory).rglob('*')
                     if p.is_file() and '__pycache__' not in p.parts and 'runs' not in p.parts)
    return {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in paths}


def unchanged(baseline):
    return all((ROOT / p).is_file() and hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == value
               for p, value in baseline.items())


def workspace_digest():
    files = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT)
    result = {}
    for raw in set(files.split(b'\0')) - {b''}:
        rel = os.fsdecode(raw)
        if rel == 'STATE.json':
            continue
        p = ROOT / rel
        if p.is_symlink():
            result[rel] = 'symlink:' + os.readlink(p)
        elif p.is_file():
            result[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    return result


def checkpoint(folder):
    """Preserve tracked and nonignored files before permitting a dirty-tree run."""
    folder.mkdir(parents=True, exist_ok=True)
    # Runtime state is ignored by Git but is needed to understand/recover a run.
    (folder / 'state.json').write_bytes((ROOT / 'STATE.json').read_bytes())
    files = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT)
    with tarfile.open(folder / 'workspace.tar.gz', 'w:gz') as archive:
        for raw in sorted(set(files.split(b'\0')) - {b''}):
            rel = os.fsdecode(raw)
            p = ROOT / rel
            if p.is_file() or p.is_symlink():
                archive.add(p, arcname=rel, recursive=False)
    (folder / 'tracked.patch').write_text(git('diff', 'HEAD', '--binary'), encoding='utf-8')
    write(folder / 'manifest.json', {'created_at': stamp(), 'head': git('rev-parse', 'HEAD'),
                                   'status': git('status', '--porcelain', '--untracked-files=all')})


def command(argv, log, timeout, prompt=None):
    log.parent.mkdir(parents=True, exist_ok=True)
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


def agent(cfg, role, prompt, folder):
    cli = cfg['codex']
    mode = 'read-only' if role == 'critic' else cli['sandbox']
    schema = ROOT / f'loop/schemas/{"critic" if role == "critic" else "engineering"}_result.schema.json'
    output = folder / f'{role}.json'
    argv = [cli['command'], '--no-daemon', '-a', cli['approval_policy'], 'exec', '-C', str(ROOT), '--sandbox', mode,
            '--ephemeral', '-c', f'model_reasoning_effort={json.dumps(cli["reasoning_effort"])}',
            '--json', '--output-schema', str(schema), '-o', str(output)]
    if cli.get('model'):
        argv += ['--model', cli['model']]
    argv += ['-']
    write(folder / f'{role}-invocation.json', {'argv': argv, 'sandbox': mode})
    (folder / f'{role}-prompt.txt').write_text(prompt, encoding='utf-8')
    rc = command(argv, folder / f'{role}.jsonl', cli['timeout_seconds'], prompt)
    if rc or not output.exists():
        raise RuntimeError(f'{role}: Codex exit={rc} or missing result; see {folder / (role + ".jsonl")}')
    result = read(output)
    validate_result(result, role)
    return result


def validate_result(result, role):
    schema = read(ROOT / f'loop/schemas/{"critic" if role == "critic" else "engineering"}_result.schema.json')
    if not isinstance(result, dict) or set(result) != set(schema['required']):
        raise ValueError(f'Malformed {role} result')
    for key, prop in schema['properties'].items():
        value = result[key]
        expected = {'string': str, 'boolean': bool, 'array': list}[prop['type']]
        if not isinstance(value, expected) or ('enum' in prop and value not in prop['enum']):
            raise ValueError(f'Malformed {role}.{key}')
        if isinstance(value, list):
            if key == 'evals':
                ids = set()
                for row in value:
                    if not isinstance(row, dict) or set(row) != {'id', 'status', 'evidence'} or not all(isinstance(v, str) for v in row.values()) or row['status'] not in {'pass', 'fail', 'blocked', 'not_run'} or row['id'] in ids:
                        raise ValueError('Malformed/duplicate Critic Eval')
                    ids.add(row['id'])
            elif not all(isinstance(item, str) for item in value):
                raise ValueError(f'Malformed {role}.{key} list')


def verify(cfg, tid, folder):
    from verify import verification_commands
    commands = verification_commands(cfg, tid)
    results = []
    if not commands:
        return {'task': tid, 'passed': False, 'reasons': ['No project checks configured; refusing false-green'], 'results': []}
    for i, cmd in enumerate(commands):
        argv = shlex.split(cmd)
        log = folder / f'verify-{i}.log'
        rc = command(argv, log, cfg['codex']['timeout_seconds'])
        results.append({'command': cmd, 'exit_code': rc, 'log': str(log.relative_to(ROOT))})
        if rc:
            break
    return {'task': tid, 'passed': all(r['exit_code'] == 0 for r in results),
            'reasons': [f"Failed: {r['command']}" for r in results if r['exit_code']], 'results': results}


def save(state, event):
    state['history'].append({'at': stamp(), 'event': event, 'task': state['engineering_loop'].get('current_task')})
    write(ROOT / 'STATE.json', state)
    print(f'{event}: product={state["product_loop"]["status"]}, engineering={state["engineering_loop"]["status"]}', flush=True)


def human_gate(state, experiment):
    state['product_loop']['status'] = 'awaiting_human'
    state['product_loop']['human_gate'] = {'status': 'ready', 'decision': None, 'note': None, 'updated_at': stamp()}
    state['engineering_loop'].update(status='complete', current_task=None)
    lines = ['# Product Human Gate', '', '产品假设尚未验证。请亲自体验后决定 approve / revise / pivot / stop。', '',
             experiment['hypothesis'], '', '## Task evidence', '']
    for tid in experiment['tasks']:
        lines += [f'- {tid}: {state["tasks"][tid]["status"]}; evidence: {state["tasks"][tid].get("last_result")}']
    lines += ['', '## Human path', ''] + [f'{i + 1}. {step}' for i, step in enumerate(experiment['human_path'])]
    lines += ['', '## Unproven', '', '用户是否愿意执行、持续使用和再次打开，仍需要目标用户观察；自动测试与 Critic 不能证明。', '']
    path = ROOT / '.loop/evidence' / f'{state["product_loop"]["active_experiment"]}-gate.md'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(lines), encoding='utf-8')
    save(state, 'All experiment tasks passed; STOP at Product Human Gate')


def failure_fingerprint(verification, critic):
    # Exclude timestamps, evidence paths and prose so recurring failed checks remain stable.
    value = {'commands': [(r['command'], r['exit_code']) for r in verification['results'] if r['exit_code']],
             'evals': sorted((r['id'], r['status']) for r in critic.get('evals', []) if r['status'] != 'pass')}
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def run(cfg, queue, evals, experiment, allow_dirty=False, max_tasks=None):
    state = read(ROOT / 'STATE.json')
    product = state['product_loop']
    engineering = state['engineering_loop']
    if product['status'] not in {'ready', 'engineering', 'revise'} or engineering['status'] in {'blocked', 'failed', 'running'}:
        print('Stopped at recorded gate/blocker; use Product Loop with explicit feedback to resume.')
        return 2
    if allow_dirty and not cfg['safety']['allow_dirty_with_flag']:
        raise ValueError('Dirty-tree override is disabled')
    dirty = bool(git('status', '--porcelain', '--untracked-files=all'))
    if dirty and not allow_dirty:
        engineering.update(status='blocked', blocker='Dirty tree; checkpoint/review or explicitly use --allow-dirty')
        save(state, 'Dirty tree blocked before any agent')
        return 2
    run_dir = ROOT / '.loop/runs' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    run_dir.mkdir(parents=True)
    checkpoint(run_dir / 'baseline')
    engineering['baseline'] = str((run_dir / 'baseline').relative_to(ROOT))
    product['status'] = 'engineering'
    product['human_gate']['status'] = 'not_ready'
    protected = protected_digest()
    runtime_state = (ROOT / 'STATE.json').read_bytes()
    done = 0
    for tid in experiment['tasks']:
        task_state = state['tasks'][tid]
        if task_state['status'] == 'passed':
            continue
        engineering.update(current_task=tid, attempt=0, last_failure_fingerprint=None, same_failure_count=0)
        feedback = state.get('human_feedback', [])[-3:]
        reports = sorted((ROOT / '.loop/product-evals').glob(f'*-{tid}/report.json'))
        if reports:
            feedback.append({'latest_behavioral_report': str(reports[-1].relative_to(ROOT)),
                             'results': read(reports[-1])})
        last_result = task_state.get('last_result')
        if last_result and (ROOT / last_result).is_file():
            feedback.append({'previous_attempt': read(ROOT / last_result)})
        for attempt in range(1, cfg['engineering_loop']['max_attempts_per_task'] + 1):
            folder = run_dir / f'{tid}-attempt-{attempt}'
            folder.mkdir()
            engineering.update(status='running', attempt=attempt)
            task_state.update(status='running', attempts=task_state['attempts'] + 1)
            save(state, f'{tid} attempt {attempt}: builder → verify → independent Critic')
            runtime_state = (ROOT / 'STATE.json').read_bytes()
            context = '\n'.join(f'\n## {p}\n{(ROOT / p).read_text()}' for p in ['AGENTS.md', 'PRODUCT.md', 'DECISIONS.md'])
            base = (f'Project: {ROOT}\nCurrent task:\n{queue[tid]["text"]}\nRelevant Evals:\n' +
                    '\n'.join(evals[eid] for eid in queue[tid]['evals']) + context +
                    '\nDo only this task under the active experiment. Do not change PRODUCT, DECISIONS, TASKS, EVALS, '
                    'Loop controls, existing tests/Eval assertions, runtime STATE, Git history or existing unrelated work. '
                    'New regression tests may be added. Never lower standards or fabricate facts/evidence. '
                    'If product semantics must change, return blocked/needs_human. Use the actual app entry at /en/plan '
                    'and its /api/trip-concierge flow; passing a disconnected planner does not satisfy the task. '
                    'Deterministic checks are necessary but do not replace product interaction or human judgment. '
                    'Use available browser tools for the user flow and save concrete evidence; do not report source '
                    'inspection or mocked fixtures as runtime product evidence. Do not read or print secrets. '
                    'Services already configured in .env.local may be used by the app. '
                    'The external Runner executes live verification with its already authorized service access. '
                    'If your sandbox cannot reach localhost or control a browser, record that limit in known_risks; '
                    'it does not by itself mean implementation is blocked when you can implement and run controlled regressions. '
                    'Do not try unapproved native apps, repeatedly install browser tools, or broaden your sandbox. '
                    'Use saved actual API outputs and parent in-app-browser evidence for review, clearly attributing observations. '
                    'Return implemented only for finished implementation, never as a claim that the task/Evals passed. '
                    f'Evidence folder: {folder}\n')
            try:
                builder = agent(cfg, 'builder', base + '\nPrior failure/human feedback:\n' + json.dumps(feedback, ensure_ascii=False), folder)
                validate_result(builder, 'builder')
                if not unchanged(protected) or (ROOT / 'STATE.json').read_bytes() != runtime_state:
                    raise RuntimeError('Protected control/test/Eval/state changed; review required')
                verification = verify(cfg, tid, folder)
                write(folder / 'verification.json', verification)
                if not unchanged(protected) or (ROOT / 'STATE.json').read_bytes() != runtime_state:
                    raise RuntimeError('Verification changed protected files')
                critic_before = workspace_digest()
                critic = agent(cfg, 'critic', base + '\nYou are an independent read-only Critic. Do not implement. '
                               'Inspect actual implementation, verification logs and saved product evidence. '
                               'Evaluate all relevant Evals; missing evidence is fail/blocked, never pass. '
                               'Runtime and UI claims require actual interaction evidence, not source-only reasoning. '
                               'Deterministic failure cannot be overridden.\nBuilder:\n' + json.dumps(builder, ensure_ascii=False) +
                               '\nVerification:\n' + json.dumps(verification, ensure_ascii=False), folder)
                validate_result(critic, 'critic')
                if critic_before != workspace_digest() or (ROOT / 'STATE.json').read_bytes() != runtime_state:
                    raise RuntimeError('Read-only Critic changed project/state')
                covered = {r['id'] for r in critic['evals'] if r['status'] == 'pass' and r['evidence'].strip()}
                passed = (verification['passed'] and builder['status'] == 'implemented' and not builder['needs_human'] and
                          critic['status'] == 'pass' and not critic['needs_human'] and not critic['blockers'] and
                          set(queue[tid]['evals']) <= covered)
                decision = {'passed': passed, 'task': tid, 'builder': builder, 'verification': verification, 'critic': critic}
                write(folder / 'decision.json', decision)
                task_state['last_result'] = str((folder / 'decision.json').relative_to(ROOT))
                engineering.update(last_verification=str((folder / 'verification.json').relative_to(ROOT)), last_critic=str((folder / 'critic.json').relative_to(ROOT)))
                if passed:
                    task_state['status'] = 'passed'
                    engineering['status'] = 'idle'
                    save(state, f'{tid} passed with deterministic and Critic evidence')
                    break
                fingerprint = failure_fingerprint(verification, critic)
                engineering['same_failure_count'] = engineering['same_failure_count'] + 1 if fingerprint == engineering['last_failure_fingerprint'] else 1
                engineering['last_failure_fingerprint'] = fingerprint
                feedback = [decision]
                blocked = builder['status'] == 'blocked' or builder['needs_human'] or critic['status'] == 'blocked' or critic['needs_human']
                exhausted = attempt == cfg['engineering_loop']['max_attempts_per_task'] or engineering['same_failure_count'] >= cfg['engineering_loop']['same_failure_limit']
                if blocked or exhausted:
                    engineering['status'] = 'blocked' if blocked else 'failed'
                    task_state['status'] = engineering['status']
                    engineering['blocker'] = critic['summary'] if blocked else 'Retry budget or same-failure limit reached'
                    save(state, f'{tid} stopped; review decision.json before resume')
                    return 2
                task_state['status'] = 'failed'
                engineering['status'] = 'idle'
                save(state, f'{tid} failed; retry with recorded evidence')
                protected = protected_digest()
            except Exception as exc:
                engineering.update(status='blocked', blocker=str(exc))
                task_state['status'] = 'blocked'
                # Keep runner state coherent, but never silently revert an agent's other modifications.
                write(folder / 'error.json', {'error': str(exc), 'at': stamp()})
                task_state['last_result'] = str((folder / 'error.json').relative_to(ROOT))
                save(state, f'{tid} blocked: {exc}')
                return 2
        done += 1
        if max_tasks and done >= max_tasks and any(state['tasks'][t]['status'] != 'passed' for t in experiment['tasks']):
            save(state, 'Requested task boundary reached; next run can continue')
            return 0
    human_gate(state, experiment)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--validate', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--allow-dirty', action='store_true')
    ap.add_argument('--max-tasks', type=int)
    args = ap.parse_args()
    if args.max_tasks is not None and args.max_tasks < 1:
        ap.error('--max-tasks must be positive')
    cfg = read(ROOT / 'loop.config.json')
    queue, evals, experiment = validate(cfg, check_cli=True)
    if args.validate or args.dry_run:
        state = read(ROOT / 'STATE.json')
        pending = [t for t in experiment['tasks'] if state['tasks'][t]['status'] != 'passed']
        print(json.dumps({'valid': True, 'experiment': state['product_loop']['active_experiment'], 'pending': pending,
                          'current_state': {'product': state['product_loop']['status'],
                                            'engineering': state['engineering_loop']['status'],
                                            'tasks': {t: state['tasks'][t]['status'] for t in experiment['tasks']}},
                          'relevant_evals': {t: queue[t]['evals'] for t in pending}, 'verification': cfg['verification'],
                          'critic_sandbox': 'read-only', 'gate': 'awaiting_human', 'dirty_tree': bool(git('status', '--porcelain')),
                          'dry_run': args.dry_run}, ensure_ascii=False, indent=2))
        return 0
    with locked():
        return run(cfg, queue, evals, experiment, args.allow_dirty, args.max_tasks)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'Preflight failed: {exc}', file=sys.stderr)
        sys.exit(2)
