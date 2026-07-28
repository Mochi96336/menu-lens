# Archive v2 intake sequence

This file records the planned intake order after the foundation PR passes. It is coordination only; it does not authorize another prototype.

```text
archive/v2-foundation
→ archive/intake-document
→ archive/intake-horizontal-matrix
→ archive/intake-landscape-core
→ archive/intake-landscape-ablations
→ archive/intake-multiscale
→ archive/intake-depth
→ archive/synthesis
```

## Source-PR handling

- Source PRs retain their original implementation, evidence, and commit history.
- Family intake PRs consolidate shared archive integration instead of merging every source PR directly.
- Each archived object records its source PR and source commit.
- Studies, corrections, and negative evidence remain distinct object types or dispositions.
- No new prototype should be opened during archive migration unless an existing evidence gate explicitly authorizes it.

## Immediate cleanup before intake

1. Correct PR #13 metadata so it describes 15A Pair-local Elastic rather than 22C.
2. Consolidate PR #34 and PR #35 into one canonical 25P reader study object.
3. Treat PR #4 as rejected historical source and PR #5 as a superseded planning record.
4. Preserve all current public prototype URLs during intake.
