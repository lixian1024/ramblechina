#!/usr/bin/env python3
"""Explicit human decisions for the Product Loop; never automatically approve."""
import argparse
import sys
from loop_engine import ROOT, locked, read, save, stamp, validate


def transition(state, experiments, action, note=None, task_ids=None, experiment_id=None):
    product = state['product_loop']
    engineering = state['engineering_loop']
    if engineering['status'] == 'running':
        raise ValueError('Engineering is running; stop/recover it before changing product state')
    if not note or not note.strip():
        raise ValueError(f'{action} requires a nonempty --note')
    if action == 'start':
        if experiment_id not in experiments:
            raise ValueError('Unknown experiment')
        if product['status'] not in {'ready', 'approved', 'pivoted', 'stopped'}:
            raise ValueError('Current experiment still active; use revise/resume or make a human decision')
        if product['status'] == 'approved' and experiment_id == product['active_experiment']:
            raise ValueError('Already approved experiment; use revise to reopen specific tasks')
        product.update(active_experiment=experiment_id, status='engineering')
        for tid in experiments[experiment_id]['tasks']:
            state['tasks'][tid] = {'status': 'pending', 'attempts': 0, 'last_result': None}
    elif action == 'approve':
        exp = experiments[product['active_experiment']]
        if product['status'] != 'awaiting_human' or engineering['status'] != 'complete' or any(state['tasks'][t]['status'] != 'passed' for t in exp['tasks']):
            raise ValueError('Approve requires all tasks passed and an awaiting_human gate')
        product['status'] = 'approved'
    elif action == 'revise':
        allowed = experiments[product['active_experiment']]['tasks']
        if not task_ids or not set(task_ids) <= set(allowed):
            raise ValueError('Revise requires --task from the active experiment')
        if product['status'] in {'pivoted', 'stopped'}:
            raise ValueError('Start an approved experiment scope before revising')
        product['status'] = 'revise'
        for tid in task_ids:
            state['tasks'][tid]['status'] = 'pending'
    elif action == 'resume':
        if engineering['status'] not in {'blocked', 'failed'} or product['status'] not in {'ready', 'engineering', 'revise'}:
            raise ValueError('Resume requires a resolved engineering blocker, not a Product Human Gate')
        product['status'] = 'engineering'
        tid = engineering.get('current_task')
        if tid:
            state['tasks'][tid]['status'] = 'pending'
    elif action in {'pivot', 'stop'}:
        product['status'] = 'pivoted' if action == 'pivot' else 'stopped'
    product['human_gate'] = {'status': 'decided' if action in {'approve', 'pivot', 'stop'} else 'not_ready',
                             'decision': action if action != 'resume' else None, 'note': note, 'updated_at': stamp()}
    engineering.update(status='complete' if action == 'approve' else 'idle', current_task=None, attempt=0,
                       last_failure_fingerprint=None, same_failure_count=0)
    engineering.pop('blocker', None)
    state['human_feedback'].append({'action': action, 'note': note, 'tasks': task_ids or [], 'at': stamp()})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('action', choices=['status', 'start', 'resume', 'approve', 'revise', 'pivot', 'stop'])
    ap.add_argument('experiment', nargs='?')
    ap.add_argument('--note')
    ap.add_argument('--task', action='append')
    args = ap.parse_args()
    if args.action == 'status':
        import json
        print(json.dumps(read(ROOT / 'STATE.json'), ensure_ascii=False, indent=2))
        return
    with locked():
        validate(read(ROOT / 'loop.config.json'))
        state = read(ROOT / 'STATE.json')
        transition(state, read(ROOT / 'loop/experiments.json')['experiments'], args.action,
                   args.note or ('Start the documented experiment scope' if args.action == 'start' else None),
                   args.task, args.experiment)
        save(state, f'Human {args.action}: {args.note or args.experiment}')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Product Loop refused: {exc}', file=sys.stderr)
        sys.exit(2)
