#!/usr/bin/env python3
"""Behavioral regression tests for the current two-loop contract."""
import contextlib
import copy
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import loop_engine as engine
from bootstrap_loop import initialize
from product_loop import transition

SOURCE = engine.ROOT


class LoopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.saved_root = engine.ROOT
        paths = engine.CONTROL + ['STATE.json', 'evals/cases.json', 'docs/experiments/001-core-trip-loop.md',
                                 'loop/schemas/engineering_result.schema.json', 'loop/schemas/critic_result.schema.json',
                                 'loop/state.template.json']
        for name in paths:
            dest = self.root / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(SOURCE / name, dest)
        (self.root / '.gitignore').write_text('STATE.json\nSTATE.json.tmp\n.loop/\n')
        self.cfg = engine.read(self.root / 'loop.config.json')
        self.cfg['verification']['commands'] = ['python3 -c pass']
        self.cfg['verification']['task_commands'] = {'T-001': ['python3 -c pass']}
        self.cfg['verification']['auto_discover_project_tests'] = False
        self.cfg['engineering_loop'].update(max_attempts_per_task=3, same_failure_limit=2)
        self.queue = {'T-001': {'id': 'T-001', 'text': 'Generate Shanghai', 'evals': ['E-001']}}
        self.evals = {'E-001': 'Three practical Shanghai days'}
        self.exp = engine.read(self.root / 'loop/experiments.json')['experiments']['001-core-trip-loop']
        self.exp['tasks'] = ['T-001']
        state = engine.read(self.root / 'STATE.json')
        state['product_loop'].update(status='ready')
        state['engineering_loop'].update(status='idle', current_task=None)
        state['tasks'] = {'T-001': {'status': 'pending', 'attempts': 0, 'last_result': None}}
        state['history'], state['human_feedback'] = [], []
        engine.write(self.root / 'STATE.json', state)
        subprocess.run(['git', 'init', '-q'], cwd=self.root, check=True)
        subprocess.run(['git', 'add', '.'], cwd=self.root, check=True)
        subprocess.run(['git', '-c', 'user.name=Loop test', '-c', 'user.email=loop-test@localhost', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture'], cwd=self.root, check=True)
        engine.ROOT = self.root
        self.builder = {'status': 'implemented', 'summary': 'fixture', 'files_changed': [], 'tests_run': [], 'known_risks': [], 'needs_human': False}
        self.critic = {'status': 'pass', 'summary': 'fixture', 'blockers': [], 'evals': [{'id': 'E-001', 'status': 'pass', 'evidence': 'fixture interaction evidence'}], 'next_fix': '', 'needs_human': False}

    def tearDown(self):
        engine.ROOT = self.saved_root
        self.temp.cleanup()

    def run_loop(self, outputs, verification=None, **kwargs):
        verification = verification or {'task': 'T-001', 'passed': True, 'reasons': [], 'results': [{'command': 'fixture check', 'exit_code': 0}]}
        with patch.object(engine, 'agent', side_effect=outputs) as agent, patch.object(engine, 'verify', return_value=verification), contextlib.redirect_stdout(io.StringIO()):
            code = engine.run(self.cfg, self.queue, self.evals, self.exp, **kwargs)
        return code, engine.read(self.root / 'STATE.json'), agent

    def test_success_stops_at_human_gate(self):
        code, state, agent = self.run_loop([self.builder, self.critic])
        self.assertEqual((code, state['product_loop']['status']), (0, 'awaiting_human'))
        self.assertEqual(state['tasks']['T-001']['status'], 'passed')
        self.assertEqual(agent.call_args_list[1].args[1], 'critic')
        self.assertTrue((self.root / '.loop/evidence/001-core-trip-loop-gate.md').exists())
        code, state, agent = self.run_loop([])
        self.assertEqual(code, 2)
        agent.assert_not_called()

    def test_deterministic_failure_never_passes(self):
        bad = {'task': 'T-001', 'passed': False, 'reasons': ['failed'], 'results': [{'command': 'fixture check', 'exit_code': 1}]}
        code, state, agent = self.run_loop([self.builder, self.critic] * 2, bad)
        self.assertEqual((code, state['engineering_loop']['status']), (2, 'failed'))
        self.assertEqual(agent.call_count, 4)
        self.assertEqual(state['engineering_loop']['same_failure_count'], 2)

    def test_critic_failure_never_passes(self):
        critic = {**self.critic, 'status': 'fail', 'evals': [{'id': 'E-001', 'status': 'fail', 'evidence': 'No usable output'}]}
        _, state, _ = self.run_loop([self.builder, critic] * 2)
        self.assertEqual(state['tasks']['T-001']['status'], 'failed')

    def test_exhausted_run_cannot_silently_restart(self):
        critic = {**self.critic, 'status': 'fail', 'evals': [{'id': 'E-001', 'status': 'fail', 'evidence': 'Bad meal'}]}
        self.run_loop([self.builder, critic] * 2)
        before = (self.root / 'STATE.json').read_bytes()
        code, state, agent = self.run_loop([])
        self.assertEqual((code, state['engineering_loop']['status']), (2, 'failed'))
        agent.assert_not_called()
        self.assertEqual((self.root / 'STATE.json').read_bytes(), before)

    def test_missing_eval_coverage_never_passes(self):
        critic = {**self.critic, 'evals': []}
        code, state, _ = self.run_loop([self.builder, critic] * 2)
        self.assertEqual(code, 2)
        self.assertNotEqual(state['tasks']['T-001']['status'], 'passed')

    def test_empty_eval_evidence_never_passes(self):
        critic = {**self.critic, 'evals': [{'id': 'E-001', 'status': 'pass', 'evidence': ''}]}
        code, state, _ = self.run_loop([self.builder, critic] * 2)
        self.assertEqual(code, 2)
        self.assertNotEqual(state['tasks']['T-001']['status'], 'passed')

    def test_blocked_stops_immediately(self):
        code, state, agent = self.run_loop([self.builder, {**self.critic, 'status': 'blocked', 'blockers': ['service missing']}])
        self.assertEqual((code, state['engineering_loop']['status']), (2, 'blocked'))
        self.assertEqual(agent.call_count, 2)

    def test_needs_human_stops(self):
        _, state, _ = self.run_loop([{**self.builder, 'needs_human': True}, self.critic])
        self.assertEqual(state['engineering_loop']['status'], 'blocked')

    def test_retry_receives_specific_failure(self):
        critic = {**self.critic, 'status': 'fail', 'evals': [{'id': 'E-001', 'status': 'fail', 'evidence': 'Missing meals'}]}
        code, state, agent = self.run_loop([self.builder, critic, self.builder, self.critic])
        self.assertEqual(code, 0)
        self.assertIn('Missing meals', agent.call_args_list[2].args[2])

    def test_max_attempts_limits_changing_failures(self):
        self.cfg['engineering_loop']['max_attempts_per_task'] = 2
        self.cfg['engineering_loop']['same_failure_limit'] = 3
        a = {**self.critic, 'status': 'fail', 'evals': [{'id': 'E-001', 'status': 'fail', 'evidence': 'fail'}]}
        b = {**self.critic, 'status': 'fail', 'evals': [{'id': 'E-001', 'status': 'blocked', 'evidence': 'other fail'}]}
        code, state, _ = self.run_loop([self.builder, a, self.builder, b])
        self.assertEqual((code, state['engineering_loop']['attempt']), (2, 2))

    def test_dirty_tree_stops_before_agent(self):
        (self.root / 'local-work.txt').write_text('preserve')
        code, state, agent = self.run_loop([])
        self.assertEqual((code, state['engineering_loop']['status']), (2, 'blocked'))
        agent.assert_not_called()

    def test_explicit_dirty_run_preserves_snapshot(self):
        original_state = engine.read(self.root / 'STATE.json')
        (self.root / 'local-work.txt').write_text('preserve')
        code, state, _ = self.run_loop([self.builder, self.critic], allow_dirty=True)
        self.assertEqual(code, 0)
        import tarfile
        with tarfile.open(self.root / state['engineering_loop']['baseline'] / 'workspace.tar.gz') as archive:
            self.assertEqual(archive.extractfile('local-work.txt').read(), b'preserve')
        snapshot = engine.read(self.root / state['engineering_loop']['baseline'] / 'state.json')
        self.assertEqual(snapshot, original_state)
        self.assertEqual(snapshot['tasks']['T-001']['status'], 'pending')

    def test_fresh_checkout_initializes_pending_tasks(self):
        (self.root / 'STATE.json').unlink()
        self.assertTrue(initialize())
        state = engine.read(self.root / 'STATE.json')
        self.assertEqual(state['product_loop']['status'], 'ready')
        self.assertTrue(all(task['status'] == 'pending' and task['attempts'] == 0 for task in state['tasks'].values()))
        engine.validate(engine.read(self.root / 'loop.config.json'))

    def test_initializer_preserves_existing_progress_exactly(self):
        state = engine.read(self.root / 'STATE.json')
        state['tasks']['T-001'].update(status='failed', attempts=5, last_result='original-evidence.json')
        engine.write(self.root / 'STATE.json', state)
        before = (self.root / 'STATE.json').read_bytes()
        self.assertFalse(initialize())
        self.assertEqual((self.root / 'STATE.json').read_bytes(), before)

    def test_invalid_template_cannot_create_state(self):
        (self.root / 'STATE.json').unlink()
        state = engine.read(self.root / 'loop/state.template.json')
        state['product_loop']['active_experiment'] = 'unknown'
        engine.write(self.root / 'loop/state.template.json', state)
        with self.assertRaises(ValueError):
            initialize()
        self.assertFalse((self.root / 'STATE.json').exists())

    def test_cli_failure_blocks_with_evidence(self):
        code, state, _ = self.run_loop([RuntimeError('CLI unavailable')])
        self.assertEqual((code, state['engineering_loop']['status']), (2, 'blocked'))
        self.assertIn('CLI unavailable', engine.read(self.root / state['tasks']['T-001']['last_result'])['error'])

    def test_product_control_mutation_blocks(self):
        def mutate(*args):
            (self.root / 'EVALS.md').write_text('weakened')
            return self.builder
        code, state, _ = self.run_loop(mutate)
        self.assertEqual((code, state['engineering_loop']['status']), (2, 'blocked'))
        self.assertIn('Protected', state['engineering_loop']['blocker'])

    def test_malformed_critic_blocks(self):
        _, state, _ = self.run_loop([self.builder, {**self.critic, 'needs_human': 'false'}])
        self.assertEqual(state['engineering_loop']['status'], 'blocked')

    def test_duplicate_eval_result_rejected(self):
        with self.assertRaises(ValueError):
            engine.validate_result({**self.critic, 'evals': self.critic['evals'] * 2}, 'critic')

    def test_fingerprint_ignores_evidence_paths_and_wording(self):
        a = {'results': [{'command': 'check', 'exit_code': 1, 'log': 'attempt1'}]}
        b = {'results': [{'command': 'check', 'exit_code': 1, 'log': 'attempt2'}]}
        self.assertEqual(engine.failure_fingerprint(a, self.critic), engine.failure_fingerprint(b, {**self.critic, 'summary': 'different words'}))

    def test_current_repository_contract_and_task_links(self):
        engine.ROOT = SOURCE
        queue, evals, exp = engine.validate(engine.read(SOURCE / 'loop.config.json'))
        self.assertEqual(queue['T-001']['evals'], ['E-001', 'E-002', 'E-014'])
        self.assertEqual(queue['T-004']['evals'], ['E-007', 'E-008'])
        self.assertEqual(exp['tasks'], ['T-001', 'T-002', 'T-003', 'T-004'])

    def test_validator_rejects_malformed_mapping(self):
        engine.ROOT = SOURCE
        cfg = copy.deepcopy(engine.read(SOURCE / 'loop.config.json'))
        cfg['engineering_loop']['critic_enabled'] = False
        with self.assertRaises(ValueError):
            engine.validate(cfg)

    def test_human_cannot_approve_without_passed_tasks(self):
        state = engine.read(self.root / 'STATE.json')
        with self.assertRaises(ValueError):
            transition(state, {'001-core-trip-loop': self.exp}, 'approve', 'looks fine')

    def test_human_revise_only_reopens_requested_task(self):
        state = engine.read(self.root / 'STATE.json')
        state['tasks']['T-002'] = {'status': 'passed', 'attempts': 1, 'last_result': 'evidence'}
        self.exp['tasks'].append('T-002')
        transition(state, {'001-core-trip-loop': self.exp}, 'revise', 'fix day 1', ['T-001'])
        self.assertEqual(state['tasks']['T-002']['status'], 'passed')
        self.assertEqual(state['product_loop']['status'], 'revise')

    def test_pivot_stops_and_resume_cannot_bypass(self):
        state = engine.read(self.root / 'STATE.json')
        exps = {'001-core-trip-loop': self.exp}
        transition(state, exps, 'pivot', 'rethink the hypothesis')
        with self.assertRaises(ValueError):
            transition(state, exps, 'resume', 'continue anyway')

    def test_resume_keeps_unaffected_task_history(self):
        state = engine.read(self.root / 'STATE.json')
        state['engineering_loop'].update(status='blocked', current_task='T-001')
        state['tasks']['T-001'].update(status='blocked', attempts=2, last_result='saved-error.json')
        transition(state, {'001-core-trip-loop': self.exp}, 'resume', 'runtime is available')
        self.assertEqual(state['tasks']['T-001']['attempts'], 2)
        self.assertEqual(state['tasks']['T-001']['last_result'], 'saved-error.json')
        self.assertEqual(state['engineering_loop']['status'], 'idle')

    def test_no_checks_refuses_false_green(self):
        self.cfg['verification'].update(commands=[], task_commands={}, auto_discover_project_tests=False)
        result = engine.verify(self.cfg, 'T-001', self.root / '.loop/check')
        self.assertFalse(result['passed'])
        self.assertEqual(result['results'], [])


if __name__ == '__main__':
    unittest.main()
