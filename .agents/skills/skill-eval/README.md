# skill-eval

> Re-run baseline evaluations on existing skills.

A runner skill that takes the `evals.json` test definitions in each skill, dispatches pressure scenarios via the Agent tool (general-purpose subagent), saves transcripts to a gitignored workspace, and grades them deterministically through `skill-tools`.

## Use

```
/skill-eval ts-best-practices    # one skill
/skill-eval --all                # every skill with evals.json
/skill-eval                      # same as --all
```

## Trigger phrases

- "rerun the baselines"
- "re-eval skill X"
- "test all the skills"
- "check for skill drift"
- "run the evals"
- "did skill X still pass"

The skill walks through:

1. Resolve target skill(s)
2. Determine next `iteration-N/` in the workspace
3. Dispatch each eval twice (without skill, with skill) via Agent tool
4. Grade transcripts via `skill-tools eval`
5. Aggregate via `skill-tools benchmark`
6. Report regressions and improvements

After running, navigate transcripts with `pnpm skill-tools view <skill>`.

## License

[MIT](./LICENSE) © Zac Rosenbauer
