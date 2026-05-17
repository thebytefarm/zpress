# TDD for skills — RED → GREEN → REFACTOR

**Core insight:** a skill is production documentation that runs hundreds of times. Untested documentation has the same failure profile as untested code — it works for you, then breaks for someone else in a way you never imagined.

Adapted from [`zwbao/skill-creator-pro`](https://github.com/zwbao/skill-creator-pro)'s methodology.

## The cycle

| Phase    | For code                   | For skills                                                              |
| -------- | -------------------------- | ----------------------------------------------------------------------- |
| RED      | Write failing test         | Run baseline subagent scenario WITHOUT the skill; watch what goes wrong |
| GREEN    | Write minimal code to pass | Write minimal skill addressing those specific failures                  |
| REFACTOR | Close edge cases           | Close new rationalizations surfaced by re-running scenarios             |

## RED — pressure scenarios

A pressure scenario is a realistic user prompt that would invoke the skill. The more realistic, the better. Abstract prompts ("convert this PDF") test nothing — they're too easy. Specific prompts with personal context, vague phrasing, and constraints are what reveal failure modes.

<bad>
"Convert this PDF to markdown."
</bad>

<good>
"ok so my boss sent me this pdf of a lease (it's in my downloads, the file
has a weird name with brackets) and i need to pull out the rent amount and
the renewal clause. the thing is it's scanned, not a proper text pdf, and
half of it is in Chinese. can you get me those two bits?"
</good>

The good version tests: OCR vs text extraction, CJK handling, selective extraction, ambiguous file location.

### Dispatch via the Agent tool

`/skill-eval` automates this — it invokes `Agent(subagent_type=general-purpose)` for each scenario in `evals.json`. The dispatch prompt is roughly:

```
Execute this task exactly:

[pressure prompt from evals.json]

No skill is loaded for this task. After attempting it, report what you did,
what decisions you made and why, and anything you found tricky. Report
verbatim — do not polish, do not summarize.
```

The "verbatim" ask is essential. Polished reports hide the rationalizations you need to see.

## Pressure types

Different skills need different pressures. See [`pressure-scenarios.md`](pressure-scenarios.md) for full guidance.

| Skill type                                         | Pressure                                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Discipline** (TDD, verification, "always X")     | Time pressure + sunk cost + authority (user insisting). Combine 3 pressures — single-pressure tests are too easy. |
| **Technique** (specific patterns, like ts-pattern) | Variation + missing information                                                                                   |
| **Pattern** (do this, not that)                    | Counter-examples + recognition scenarios                                                                          |
| **Reference** (API docs, lookup)                   | Retrieval + gap testing                                                                                           |

## GREEN — minimal skill

Write only what's needed to address the baseline failures. Don't pre-empt hypothetical failures. The lean skill tests faster and reveals real problems; the bloated skill teaches you nothing.

`/skill-eval` re-runs the same scenarios _with_ the skill loaded. Expect partial success — second-round failures are your next iteration.

## REFACTOR — close loopholes

Every new rationalization goes into two places:

1. **A rule with the _why_:** `Do X, because [reason from transcript]`.
2. **The rationalization table** at the bottom of the SKILL.md (discipline skills only).

Capture excuses verbatim. _"I skipped the test because the change is tiny"_ goes in the table as-is — don't sanitize it. The raw voice is what future agents recognize.

## When the baseline succeeds

If the subagent nails the task without the skill, **the skill is unnecessary** — tell the user this. It's a better outcome than shipping a no-op skill that clutters the description index and slows down every future conversation.

Exception: the success is luck, not pattern. Run 2 more pressure scenarios with varied phrasings. If it still works, no skill needed. If it fails 1 of 3, you have something to document.

## Stopping criteria

Stop iterating when:

- All scenarios pass with the skill and fail without it.
- Reading the latest transcripts surfaces no new rationalizations.
- You can't articulate what the next improvement would address.

Don't chase asymptotic improvements. A skill that passes 4/5 scenarios is shippable; the 5th is a future patch.

## Where the artifacts live

| File                                                                           | Committed       | Purpose                                                     |
| ------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------- |
| `skills/<name>/evals.json`                                                     | yes             | Test definitions: prompts, expected outputs, assertions     |
| `skills/<name>/.workspace/iteration-N/eval-K-name/with_skill/transcript.md`    | no (gitignored) | Subagent output with skill loaded                           |
| `skills/<name>/.workspace/iteration-N/eval-K-name/without_skill/transcript.md` | no (gitignored) | Subagent output without skill (baseline)                    |
| `skills/<name>/.workspace/iteration-N/eval-K-name/<variant>/grading.json`      | no (gitignored) | Per-assertion pass/fail, written by `skill-tools eval`      |
| `skills/<name>/.workspace/iteration-N/benchmark.{json,md}`                     | no (gitignored) | Aggregate per iteration, written by `skill-tools benchmark` |

Test definitions are deterministic and worth versioning. Transcripts and grading are stochastic LLM outputs that drift; committing them creates noise.
