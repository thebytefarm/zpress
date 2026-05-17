# Description rules

The `description` field is a **gatekeeper**, not an instruction set. It tells the dispatcher _when_ to invoke the skill — not _what_ the skill does internally. Get this wrong and the skill never fires (or fires on the wrong things).

## Hard rules

| Rule                                                                 | Why                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 80–1024 characters                                                   | Below 80, not enough triggering context. Above 1024, eats context budget for every dispatch. |
| Contains `"Use when"` or `"This skill should be used when"`          | Anchors the dispatcher to triggering, not behavior.                                          |
| Lists ≥ 3 verbatim trigger phrases in double quotes                  | Gives the dispatcher concrete strings to match against.                                      |
| No anti-shortcut words: `then`, `next`, `step 1`, `process`, `first` | These read as procedural instructions the agent executes immediately — not as triggers.      |
| Includes a `Skip when` clause                                        | Names anti-triggers so the skill doesn't over-fire.                                          |

## Why anti-shortcut words matter

The dispatcher reads the description during routing. If it contains "First, do X. Then do Y", the agent treats it as a procedure to follow _now_, not a trigger to remember. The skill body is where procedural instructions live; the description is purely for routing. This applies to most LLM-based dispatchers — the more imperative the language, the more the agent will follow it instead of using it as a trigger.

## Canonical structure

```
This skill should be used when [trigger condition].
Common triggers include "phrase 1", "phrase 2", and "phrase 3".
[1–2 sentences on what it bakes in / what's distinctive].
Skip when [anti-trigger].
```

## Good vs bad

<good>
This skill should be used when the user wants to refactor TypeScript to
functional patterns. Common triggers include "make this functional",
"remove the class", and "use Result instead of throw". Bakes in factory
functions over classes and Result<T,E> over exceptions. Skip when working
with framework-required classes.
</good>

<bad>
This skill helps with TypeScript. First it analyzes the code, then it
refactors it. The process involves several steps to convert classes to
functions and exceptions to Result types.
</bad>

The bad example fails:

- No "Use when" phrase
- No verbatim trigger phrases in quotes
- Contains anti-shortcut words `first`, `then`, `process`
- No `Skip when` clause
- Describes behavior, not triggering

## Trigger phrase quality

Good trigger phrases are:

- **Verbatim** — what the user would actually type, including casual/imperative tone
- **Specific** — `"refactor to functional"` is better than `"do TypeScript stuff"`
- **Diverse** — cover different ways to phrase the same intent

Bad trigger phrases:

- `"help me with code"` — too generic, will over-fire
- `"do the typescript thing"` — too vague to match reliably
- `"refactor this"` — too general (don't include unless the skill handles all refactors)
