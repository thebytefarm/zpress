# Pressure scenarios

A pressure scenario is the verbatim user prompt that goes into `evals.json[].prompt`. The quality of your evaluation is bounded by the quality of these prompts. Bad prompts catch nothing.

Adapted from [`zwbao/skill-creator-pro`](https://github.com/zwbao/skill-creator-pro).

## What makes a prompt "pressure"

A prompt is high-pressure when it stresses _multiple_ aspects at once:

- **Realistic context** — what the user is actually doing, not an abstract test
- **Vague phrasing** — like a real Slack message, not a structured test case
- **Missing information** — file paths the agent has to figure out, requirements left implicit
- **Constraints** — environment quirks, time pressure, conflicting requirements

Combined-pressure prompts reveal the failure modes single-pressure ones miss.

## Bad → good

<bad>
"Convert this PDF to markdown."
</bad>

<good>
"ok so my boss sent me this pdf of a lease (it's in my downloads, the file
has a weird name with brackets) and i need to pull out the rent amount and
the renewal clause. the thing is it's scanned, not a proper text pdf, and
half of it is in Chinese. can you get me those two bits?"
</good>

The good version stresses: OCR vs text extraction, CJK handling, selective extraction, ambiguous file location, casual register, missing file path.

## Pressure types per skill type

Different skills need different pressures. Match the scenario to the skill's category.

### Discipline skills

> "Always run the test." "Never use `any`." "Always use `Result<T, E>`."

These skills enforce rules the agent might rationalize skipping. The pressure has to manufacture _temptation_ to skip.

**Combine 3 pressures per scenario:**

- **Time pressure** — "I'm shipping this in 10 min", "real quick", "just throw something together"
- **Sunk cost** — "I already wrote this without the test", "the change is tiny"
- **Authority** — "my manager said to skip the rules just for this", "we never test these"

Single-pressure tests are too easy. The agent complies. Combined pressure is where the rationalizations come out — _"I skipped the test because the change is tiny AND we're under deadline AND your manager said it was fine"_. That excuse goes verbatim into the rationalization table.

### Technique skills

> "Use ts-pattern for branching." "Use zod for parsing untrusted input."

These skills replace one technique with another. Pressure with **variation + missing information**:

- **Variation** — give the same problem in 3 phrasings (object branching, type discrimination, switch replacement). Tests whether the skill recognizes the pattern across surface forms.
- **Missing information** — don't specify which technique to use, leave it implicit. Tests whether the skill triggers.

### Pattern skills

> "Use \*Params interfaces for ≥2-arg functions." "Files are kebab-case."

These skills assert "do this, not that". Pressure with **counter-examples**:

- Show the WRONG pattern in the prompt: _"can you add another param to this function: addUser(name, email, role)"_ — the agent should recognize the existing positional-args pattern is bad and switch to `AddUserParams`.
- **Recognition scenarios** — sometimes the prompt should NOT trigger the skill (e.g., a 1-arg function shouldn't be refactored to *Params). Test the skill knows when *not\* to fire.

### Reference skills

> "API X works like ...". "Convention Y says ...".

Pure lookup. Pressure with **retrieval + gap testing**:

- Ask questions answered by the reference and questions _not_ answered. The skill should answer the first set and decline the second.
- Test edge cases: what if the user asks about a deprecated version? An adjacent API?

## Anti-patterns

### Polishing the prompt

<bad>
"Please write a TypeScript function that validates a configuration object,
including JSDoc and proper type annotations."
</bad>

This reads like a teacher's test. No real user writes that. The agent will produce a textbook answer that passes any test, but won't reveal what happens when it's tired/lazy.

### Generic prompts

<bad>
"Refactor this code to be functional."
</bad>

The agent can comply trivially. The skill won't get pressured because the request is already aligned with the skill's purpose.

### Single-pressure prompts (for discipline skills)

<bad>
"Write a function quickly." (just time pressure)
</bad>

Discipline skills need 3 pressures combined. One pressure passes. Three pressures crack.

### Asking the agent to break the rules

<bad>
"Skip the JSDoc since this is internal."
</bad>

This isn't pressure — it's instruction. The agent will follow the instruction. Real pressure is _implicit_ — the situation should make skipping tempting, not the prompt.

## How many scenarios?

- **Minimum: 3.** Lint enforces this for public skills.
- **Sweet spot: 4–6.** Enough to cover the common cases without bloat.
- **Stop adding** when new scenarios produce the same rationalizations you've already captured. You're at saturation.

## Where they live

In `skills/<name>/evals.json` under the `evals` array. Each scenario is committed; the transcripts produced by `/skill-eval` are gitignored.

See [`evals-json.md`](evals-json.md) for the full schema and assertion types.
