# Cross-model handoff

Load when the user has chosen the cross-model review mode. The job is to invoke a different AI CLI on the same machine, give it a persona + the code, and capture its review verbatim.

**Why bother:** the current agent has its own training, biases, and blind spots. A second model often catches what the first missed. This is especially valuable for adversarial / security review where one model's "looks fine" is another model's "obvious vulnerability".

## Step 1 — Detect available CLIs

```bash
node scripts/detect-clis.mjs --available-only --pretty
```

The script (~20 known agents) probes `$PATH` for binaries and emits JSON:

```json
[
  {
    "id": "codex",
    "name": "OpenAI Codex",
    "binary": "codex",
    "available": true,
    "path": "/Users/.../bin/codex",
    "version": "0.128.0",
    "promptTemplate": "codex exec {{PROMPT}}",
    "stdinTemplate": "codex exec -",
    "notes": "OpenAI Codex CLI; `codex exec` runs non-interactive"
  }
]
```

If the array is empty, **stop** — there's no second model available. Tell the user and offer to run in-process review instead.

## Step 2 — Ask the user which CLI

In Claude Code, use `AskUserQuestion`. In other agents, use whatever the agent provides (stdin prompt, etc.). Show: `name`, `version`, and a one-line summary of `notes`.

Skip the current agent's own CLI in the picker — running Claude on Claude is not "cross-model".

## Step 3 — Separate trusted instructions from forwarded content

Two threats apply when forwarding local code to a third-party CLI:

1. **Credential exfiltration** — local files can carry embedded secrets (API keys, tokens) that you don't want sent to another LLM provider.
2. **Prompt injection** — code under review can contain markers (intentional or accidental) that try to steer the receiving model.

Both mitigations are built into `invoke-cli.mjs` and fire when you separate the inputs into two streams:

- **Trusted prefix** (`--instructions`) — the persona body (e.g. `references/personas/adversarial.md`), the scope marker, the output-format spec from `references/review-output-format.md`. Anything you control. Pass it as a file path; the persona refs already exist on disk so you don't need a temp file.
- **Forwarded payload** (`--untrusted-content`) — file contents or `git diff` / `git diff --staged` output from the local working tree. Pass `-` to read from stdin so you can pipe `git diff` directly with no temp file. For multi-file scope, write the concatenated content to a temp file or use shell process substitution.

Keep the persona file complete — strip nothing. Keep the content complete too; truncation hides the bugs. Total composed prompt should fit in the target model's context. If the code is huge:

- For diffs: pass the diff, not the whole files
- For files > ~50KB: chunk and run the review per file, then concatenate findings

See [`contributing/prompt-injection.md`](../../../contributing/prompt-injection.md) for the threat model, salted-tag wrap mechanics, and the secret-shield preflight.

## Step 4 — Invoke the CLI

Use the bundled `invoke-cli.mjs` script. It handles the stdin-vs-argv choice, the secret-shield preflight, the salted-tag wrap, timeouts, and shell-quoting hazards. Both `--instructions` and `--untrusted-content` accept a file path or `-` to read from stdin (only one of the two flags may be `-` per invocation).

For a `git diff --staged` review, the persona ref is already on disk and the diff streams from stdin — no temp files needed:

```bash
git diff --staged | node scripts/invoke-cli.mjs <cli-id> \
  --instructions skills/code-reviewer/references/personas/adversarial.md \
  --untrusted-content - \
  --secret-mode redact \
  --timeout 120
```

For multi-file file-path scope (no diff, just raw files), concatenate to a temp file or use shell process substitution:

```bash
node scripts/invoke-cli.mjs <cli-id> \
  --instructions skills/code-reviewer/references/personas/adversarial.md \
  --untrusted-content <(cat src/auth/*.ts) \
  --secret-mode redact
```

If you need to inject a custom persona (not one of the bundled refs), `mktemp` is fine — but reach for it only when an on-disk persona file doesn't already exist.

The script:

- Looks up `<cli-id>` in the same registry `detect-clis.mjs` uses
- **Runs secret-shield on the untrusted content first.** Default `--secret-mode scan` refuses to forward when any AWS/GitHub/OpenAI/Anthropic/Slack/Stripe/Google/JWT/PEM key is detected (exit 1 with finding details). Pass `--secret-mode redact` to substitute `[REDACTED-{type}-{n}]` placeholders and continue. `--secret-mode allow` skips the check.
- Composes a final prompt: `[instructions] + [anti-injection preamble naming the salted tag] + [<untrusted-{{salt}}>...(possibly redacted) content...</untrusted-{{salt}}>]`
- Generates a fresh 12-hex salt per invocation — attacker cannot forge a closing tag
- Prefers `stdinTemplate` (pipes the composed prompt to the child's stdin); falls back to `promptTemplate` argv substitution when the CLI doesn't support stdin
- Times out after `--timeout` seconds (default 120s) — prevents a hanging interactive CLI from locking the agent
- Returns the child's stdout on stdout, stderr on stderr
- Exit codes: `0` success, `1` argument error / missing file / secrets detected, `2` child exited non-zero, `3` timeout, `4` binary not on $PATH

### When to pick scan vs redact vs allow

| Mode             | Behavior                                                  | Use when                                                                  |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `scan` (default) | Exit 1 if any secret detected; print findings             | You want a hard stop and a chance to inspect the source before continuing |
| `redact`         | Replace each match with `[REDACTED-{type}-{n}]`, continue | You trust the persona to work on placeholder content (most reviews)       |
| `allow`          | Skip the check, forward verbatim                          | You've already audited the diff and know it's clean                       |

### Legacy stdin mode (trusted-only)

For trusted-only prompts (no third-party content), you can still pipe the prompt verbatim — no wrapping is applied:

```bash
echo "what does this regex match?" | node scripts/invoke-cli.mjs codex
```

Use this only when the entire prompt is content you wrote. The moment you concatenate file contents or diff output into the prompt, switch to the two-file form above so the secret-shield preflight + salted wrap apply.

### Dry-run before committing tokens

If you're not sure the invocation will work, do a dry run first — prints the planned command without spawning the CLI:

```bash
git diff --staged | node scripts/invoke-cli.mjs codex --dry-run \
  --instructions skills/code-reviewer/references/personas/adversarial.md \
  --untrusted-content - \
  --secret-mode redact
# {
#   "cli": { "id": "codex", "name": "OpenAI Codex", "binary": "codex" },
#   "mode": "stdin",
#   "command": "codex",
#   "args": ["exec", "-"],
#   "stdinBytes": 4271,
#   "wrapped": true,
#   "wrappedSalt": "a8f2c91d4e7b",
#   "secretMode": "redact",
#   "secretsRedacted": 0
# }
```

## Step 5 — Capture the response

The CLI's stdout is the review. Save it (don't paraphrase). If the user asked for the review _as the response_, present it; if they asked for a summary, summarize at the end but keep the raw text accessible.

**Always include a header noting which model produced the review:**

```
# Code review (via OpenAI Codex 0.128.0)

[verbatim CLI output below]
```

## Things that go wrong

| Symptom                                              | Cause                                             | Fix                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| CLI hangs                                            | Likely waiting for interactive input              | Make sure you used the non-interactive flag (`-p`, `exec`, etc. — see `promptTemplate`)        |
| Empty / minimal output                               | CLI silently rate-limited or auth-failed          | Run the CLI manually with `--help` to verify auth                                              |
| Output is in a chat-style format ("Sure! Here's...") | The model wasn't pushed into reviewer mode        | Strengthen the persona prompt — explicitly say "Output ONLY the findings, no preamble"         |
| Output mixes findings with code suggestions          | Persona didn't say "findings only, not solutions" | Adversarial / security personas explicitly forbid solutions; reinforce in the prompt if needed |

## Don't

- Don't run the same prompt against two CLIs and concatenate — diluted findings, no value-add
- Don't fall back to in-process if the cross-model CLI fails silently — tell the user, give them the failure detail, let them decide
- Don't trim the cross-model output to "fit" — capture verbatim. The whole point is the second model's perspective.
