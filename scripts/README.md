# Loop commands

```bash
python3 scripts/bootstrap_loop.py
python3 scripts/validate_loop.py
python3 scripts/product_loop.py status
./scripts/run-loop --dry-run
./scripts/run-loop
```

## Before real autonomous runs

1. Install and authenticate Codex CLI.
2. Initialize local STATE without overwriting existing progress, then validate `loop.config.json` and run a dry-run.
3. The engine defaults to a clean-tree requirement. An explicitly authorized `--allow-dirty` run preserves a baseline of tracked/nonignored files and original runtime state; it never commits or stashes automatically.
4. Start the real app on port 3001 and run `./scripts/run-loop --max-tasks 1` for a bounded first task. Inspect the recorded failure before an explicit resume; all tasks passed stops at the Product Human Gate.

See `docs/workflows/loop-integration.md` for the actual first run, evidence paths and remaining T-001 defect.

Calendar regression: `npm run test:trip-calendar` runs controlled production POST cases for exact duration, consecutive dates, transfer/rest day restoration, one repair and failure without replacing the previous plan. It is part of `check:product` and deterministic Loop verification. `node --import tsx scripts/verify-ten-day-calendar.ts` replays the reported ten-day request against the running app and incurs live provider calls; its evidence only verifies the calendar/coverage contract, not travel feasibility.

The implementation agent uses non-interactive `codex exec` with `workspace-write`; the independent Critic uses `read-only`. Both use `never` approval policy inside their sandbox. The engine does **not** use a bypass/full-access mode.

For CI or temporary automation, authentication can follow your Codex CLI setup. Keep secrets out of the repo and logs.
