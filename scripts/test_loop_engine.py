#!/usr/bin/env python3
"""Behavior tests: blockers, false-green prevention, bounded retries and human gate."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('loop_engine', Path(__file__).with_name('loop_engine.py'))
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)

class LoopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.saved_root = engine.ROOT
        source = Path(__file__).resolve().parents[1]
        for name in engine.CONTROL:
            dest = self.root / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / name, dest)
        (self.root / '.gitignore').write_text('STATE.json\nSTATE.json.tmp\n.loop/\n')
        engine.write(self.root / 'STATE.json', {'schema_version': 1, 'status': 'READY'})
        self.cfg = engine.read(source / 'loop.config.json')
        self.cfg['verification_commands'] = [['python3', '-c', 'print("fixture verifier")']]
        self.queue = {'R001': {'id': 'R001', 'status': 'todo', 'task': 'Read only review', 'evals': 'H1 / FLOW01'}}
        self.suite = {'cases': [{'id': 'FLOW01'}]}
        subprocess.run(['git', 'init', '-q'], cwd=self.root, check=True)
        subprocess.run(['git', 'add', '.'], cwd=self.root, check=True)
        subprocess.run(['git', '-c', 'user.name=Loop test', '-c', 'user.email=loop-test@localhost', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture'], cwd=self.root, check=True)
        engine.ROOT = self.root

    def tearDown(self):
        engine.ROOT = self.saved_root
        self.temp.cleanup()

    def result(self, status='PASS', observed=True):
        return {'status': status, 'summary': 'fixture', 'evidence': ['fixture runtime record'], 'covered_evals': ['FLOW01'], 'runtime_observed': observed, 'blockers': []}

    def run_loop(self, outputs):
        with patch.object(engine, 'agent', side_effect=outputs) as agent, contextlib.redirect_stdout(io.StringIO()):
            code = engine.run(self.cfg, self.queue, self.suite)
        return code, engine.read(self.root / 'STATE.json'), agent

    def test_no_runtime_evidence_never_passes(self):
        code, state, _ = self.run_loop([self.result(observed=False)] * 4)
        self.assertEqual((code, state['status']), (2, 'ESCALATE'))
        self.assertEqual(state['attempt'], 2)

    def test_deterministic_failure_never_passes(self):
        self.cfg['verification_commands'] = [['python3', '-c', 'raise SystemExit(1)']]
        code, state, _ = self.run_loop([self.result()] * 4)
        self.assertEqual((code, state['status']), (2, 'ESCALATE'))

    def test_critic_rejection_never_passes(self):
        code, state, _ = self.run_loop([self.result(), self.result('ESCALATE')])
        self.assertEqual((code, state['status']), (2, 'ESCALATE'))

    def test_success_stops_at_human_gate(self):
        code, state, agent = self.run_loop([self.result(), self.result()])
        self.assertEqual((code, state['status']), (0, 'HUMAN_GATE'))
        self.assertEqual(agent.call_count, 2)

    def test_dirty_tree_stops_before_agent(self):
        (self.root / 'local-work.txt').write_text('preserve')
        code, state, agent = self.run_loop([])
        self.assertEqual((code, state['status']), (2, 'BLOCKED'))
        agent.assert_not_called()

    def test_cli_failure_blocks(self):
        code, state, _ = self.run_loop([RuntimeError('CLI unavailable')])
        self.assertEqual((code, state['status']), (2, 'BLOCKED'))

    def test_retry_receives_failure_evidence(self):
        code, state, agent = self.run_loop([self.result('RETRY'), self.result('RETRY'), self.result(), self.result()])
        self.assertEqual(state['status'], 'HUMAN_GATE')
        self.assertIn('"critic"', agent.call_args_list[2].args[2])
        self.assertIn('"verification"', agent.call_args_list[2].args[2])

    def test_control_mutation_blocks(self):
        def mutate(*args):
            (self.root / 'EVALS.md').write_text('weakened')
            return self.result()
        code, state, _ = self.run_loop(mutate)
        self.assertEqual((code, state['status']), (2, 'BLOCKED'))
        self.assertIn('Protected', state['reason'])

if __name__ == '__main__':
    unittest.main()
