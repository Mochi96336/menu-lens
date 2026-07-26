# Original snapshot provenance

This file records the frozen original UI builds used by the Menu Lens research archive.

These are not visual recreations. Each snapshot was produced by checking out the pinned historical commit, then running that commit's own installation, typecheck, test, and build commands. The resulting `dist` directory was copied without redesign into `research-history/originals/<slug>/`.

## Frozen milestones

| Archive path | Historical stage | PR | Pinned commit | Boundary |
|---|---|---:|---|---|
| `originals/01-complete-menu/` | Complete menu + inline detail | #3 | `087619c3cac4e7b019d58265b6233b3ff04e28f2` | Merged customer baseline |
| `originals/02-prototype-c/` | Prototype C — Anchor + shared axis | #4 | `b554f8a4784188d414ee2d82a434a0e1515d3579` | Prototype C accepted; Candidate implementation not yet started |
| `originals/03a-candidate-marks/` | CND1 — attached Candidate marks | #4 | `53963f4ad15a145e3d8f8e1e25d0a5a5e4b925c2` | CND1 accepted; Candidate workspace not yet planned |
| `originals/03b-candidate-workspace/` | CND2 — Candidate workspace | #4 | `5251bfcd6eafab132617891ed7bc98d6d3a551ca` | CND2 accepted; comparison implementation not yet started |
| `originals/04-bounded-comparison/` | CMP1 — bounded Candidate comparison | #4 | `923be38046b28baf9ba4687a020290bd6a0afbf4` | Final CMP1 review; before whole-direction rejection |

## Why these boundaries were selected

The archive needs one representative completion point for each interaction stage without silently including controls added by the next stage.

```text
PR #3 baseline
→ Prototype C complete, no Candidate
→ CND1 complete, no workspace
→ CND2 complete, no comparison
→ CMP1 complete, before direction rejection
```

The frozen files therefore preserve the actual progression rather than presenting only PR #4's final cumulative screen.

## Related machine-readable records

- `research-history/originals/manifest.json` — public archive path, PR and exact commit for each snapshot.
- `docs/research-history/original-milestones.tsv` — compact source table generated during archival build.
- `docs/research-history/pr4-commits.tsv` — complete PR #4 commit sequence from merge base to preserved head.
- `docs/research-history/pr4-files-by-commit.txt` — files changed at each historical commit.
- Each frozen directory contains `ORIGIN.txt` with its own exact source record.

## Evidence types

The repository also contains later explanatory prototypes under `research-history/phases/`.

Those files are retained because they are useful for controlled task comparison, but they are **interpretive reconstructions**, not historical originals. In particular:

- `phases/01-complete-menu/` is a simplified explanation of the long-menu baseline;
- `phases/02-relational-reading/` is a simplified explanation of Anchor/axis cost;
- `phases/03-candidate-comparison/` compresses the full Candidate-to-comparison sequence into one teaching prototype;
- `phases/05-ledger-document/` is a later reconstruction because no historical HTML existed;
- `phases/06-multiscale-menu-map/` is a new hypothesis, not a restored historical stage.

Historical originals, interpretive reconstructions, and new hypotheses must remain visibly distinguishable.