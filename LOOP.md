# Ramble China Loop

Product Loop: human selects the bounded task group, reviews evidence, then chooses approve / revise / pivot / stop. Engineering Loop never makes that product decision.

Engineering Loop: TASKS table → relevant machine-readable EVALS → Codex exec → existing deterministic verification → fresh independent Codex Critic in read-only sandbox → evidence-based PASS / retry / ESCALATE. Missing tests, service access, browser observations, evidence, or malformed output cannot pass. Failed attempt evidence feeds the next attempt. CLI failure or timeout yields BLOCKED; no background process is left running.

Current group is R001 only. This task is read-only: first-user review of the Beijing four-module path and a severity ranking plus the 30% keep/delete tradeoff. R002–R007 are candidates, not an approved automatic sequence. Completing R001 stops at HUMAN_GATE so the human can select the next slice.

Validation: `scripts/run-loop --validate`

Preview without agents, tests, or state changes: `scripts/run-loop --dry-run`

Real execution: `scripts/run-loop`

State: `python3 scripts/product_loop.py status`

After resolving a blocker and reviewing/checkpointing local changes: `python3 scripts/product_loop.py resume --note "what was resolved"`, then `scripts/run-loop`. Resume does not run automatically. Never force a dirty tree clean or delete existing work. If execution was interrupted with RUNNING state, verify no process still runs before explicit resume.

STATE.json is local runtime state, deliberately Git-ignored and written atomically. `.loop/` holds prompts, CLI invocations, JSONL logs, exact test commands/results, builder/Critic outputs, and decisions; also ignored. Commit or preserve evidence deliberately only after checking for private material. Do not publish secrets.

For later business-code tasks, add only the human-approved IDs and sandbox modes to loop.config.json, preserve tests, add appropriate lint/type/build checks, and provide the full recorded product report at product_report. Existing eval:gate remains mandatory; Critic must inspect evidence authenticity. Deterministic local mocks do not prove real model, map, browser, PDF, language review, or user value. R001 is an observation task; its relevant FLOW01 evidence is reviewed by Critic, not falsely substituted for full product release acceptance.
