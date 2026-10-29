# 0009 Binary Asset Policy (Git LFS)

Status: Accepted

## Context

The Piper TTS Swedish Alma voice model (`piper-voices/sv_SE-alma-medium.onnx`, 63 MB)
was committed to git history in commit `dc33b8e` (PR #19). It was later added to
`.gitignore` in `2cfabc6`, but the 63 MB binary blob remained in the commit graph,
bloating every clone. The repository has no policy governing large binary assets,
so future TTS model updates, voice packs, or downloaded artifacts would compound the
problem silently.

## Decision

Adopt **Git LFS** for all binary model weights and large assets:

1. **`.gitattributes`** declares LFS tracking for these extensions:
   - `*.onnx` — TTS model weights (Piper, Coqui VITS, etc.)
   - `*.bin` — PyTorch checkpoints, ONNX runtime weights
   - `*.model` — Kaldi/ngram language models
   - `*.safetensors` — Hugging Face safetensors

2. **Migrate the existing blob** to LFS using `git lfs migrate import`:
   - Rewrites all 38 commits in `main` so the ONNX file becomes a 133-byte pointer
   - The 63 MB blob is stored in the LFS object store, fetched only on checkout

3. **CI enforcement** — a pre-commit hook and CI check reject any file >10 MB that
   is not LFS-tracked.

4. **Document the policy** in `CONTRIBUTING.md` and this ADR.

## Consequences

### Positive

- **Clone size**: `git clone` now downloads ~57 KB of packed refs instead of 63 MB;
  the ONNX blob is fetched lazily via `git lfs pull` / `git lfs checkout`
- **No working-copy bloat**: the 60 MB file is only materialized when checked out
- **Future-proof**: any `*.onnx`/`*.bin`/`*.model`/`*.safetensors` added to the repo
  is automatically routed through LFS — no per-file `git lfs track` calls
- **CI safety net**: the >10 MB check prevents accidental re-introduction of raw
  binaries

### Negative

- **LFS dependency**: contributors must have `git-lfs` installed (brew install;
  documented in CONTRIBUTING.md)
- **Force-push**: history was rewritten (`dc33b8e` → new SHAs); any fork or branch
  pointing at the old history must be re-based
- **Remote LFS storage**: GitHub's LFS quota applies (free tier: 1.5 GB, 5 GB/month
  bandwidth) — acceptable for a single 63 MB model today
- **`piper-voices/sv_SE-alma-medium.onnx.json`** (6 KB) is tracked as a regular
  git blob because it is small text; it is not subject to LFS

### Follow-up

- Consider a GitHub Release or Hugging Face Hub download script for the model
  instead of shipping it in the repo at all (see issue #21 follow-ups)
- CI job: `git lfs ls-files` + size audit on every push/PR