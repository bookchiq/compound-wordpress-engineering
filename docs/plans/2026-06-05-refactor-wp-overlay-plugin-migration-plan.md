---
title: "Convert the WordPress fork into a clean overlay plugin"
type: refactor
status: completed
date: 2026-06-05
origin: docs/plans/wp-overlay-migration.md
reviewed: 2026-06-05 (architecture, simplicity, safety)
---

# ♻️ Convert the WordPress fork into a clean overlay plugin

> **Origin:** operationalizes the migration spec at
> [`docs/plans/wp-overlay-migration.md`](./wp-overlay-migration.md). That spec is the
> authoritative *intent*; this plan corrects it against the repo's actual state, sequences
> the destructive work safely, and adds the gates the spec omits. Revised after a three-lens
> technical review (architecture / simplicity / safety) — see "Review outcomes" at the end.

## Overview

`compound-wordpress-engineering` is a fork of Every Inc.'s `compound-engineering-plugin`
that drifted far behind upstream. We are abandoning the fork model for a **three-tier
overlay**:

1. **Tier 1 — Upstream, untouched.** Install Every's `compound-engineering` plugin via its
   marketplace; `claude plugin update` keeps it current. Never edit it.
2. **Tier 2 — A slim WordPress overlay** (this repo): *only* Sarah's genuinely WP-specific
   work.
3. **Tier 3 — Thin glue** in `~/.claude/CLAUDE.md` that invokes the WP reviewers alongside
   the upstream `ce-*` workflow.

Upstream renamed all its skills/agents to a `ce-*` prefix while the fork kept old unprefixed
names, so a clean upstream install and this overlay cannot collide on the `wp-*` keepers — no
renaming required. (The three *generic-named* keepers are a separate question; see Phase 1.)

The net effect: delete the bulk of the repo (forked generic content + the TypeScript build
tooling + the second plugin + the docs site), keep ~18 WP artifacts, re-brand the metadata,
and ship `2.0.0` as a breaking restructure.

The safety model is simple and load-bearing: **work on a branch, delete the complement of a
closed keep-list, then review the diff.** Every deletion is git-recoverable from `main`. The
genuinely irreversible operations are the two *outside* the repo — the `~/.claude/CLAUDE.md`
edit and the upstream plugin install — and that is where the plan concentrates its caution.

## Problem Statement

- **Staleness with no detection.** The fork has no way to know when it falls behind upstream.
  Upstream's `ce-update` skill + `claude plugin update` solve this — but only if we stop
  vendoring upstream's generic workflow.
- **Maintenance cost.** 73 plugin artifacts (30 agents, 21 commands, 22 skills) + a Bun/TS
  multi-target converter + a second `coding-tutor` plugin + a GitHub Pages docs site, almost
  all of it upstream content we no longer want to maintain.

## Decisions locked for this plan

| Decision | Choice | Source |
|---|---|---|
| Docs site (`/docs`, `deploy-docs.yml`, release-docs flow) | **Delete entirely.** README is the only doc. | User, 2026-06-05 |
| TS converter + npm identity (`src/`, `tests/`, `package.json`, `bun.lock`, `tsconfig.json`, `ci.yml`, `publish.yml`, `@every-env/compound-plugin`) | **Delete all of it.** No build step. | User, 2026-06-05 |
| `plugins/coding-tutor/` | Delete (Every's separate plugin). | Spec |
| Version | `2.0.0` (MAJOR), **after** reading `docs/solutions/plugin-versioning-requirements.md` and confirming the marketplace-level `metadata.version` question (M3 below). | Spec + review |
| `mcpServers` block (`context7`, `playwright`) | **Preserve verbatim;** keep "2 MCP servers" accurate. | Spec |
| `AGENTS.md` (root) | **Rewrite** to the overlay model — do not delete or leave stale. (Primary agent-instruction file per global convention.) | Review I1 |
| `rm` vs `trash` | Use **`trash`** for directory deletes (untracked-file safety + global preference). | Review M1 |
| Git history / old repo | Never delete. Branch `overlay-migration`. | Spec |

## Decision update (2026-06-06) — agent reclassification after verification + upstream check

Verification (grep) + a clone of upstream's actual `ce-*` inventory **overturned the spec's
review-agent lists.** Guiding principle (Sarah): *add a thin WP layer on top of upstream;
never keep and maintain a fork of upstream's generic agents.* The test for each generic-named
agent: **does upstream already ship the generic version?**

- **Upstream HAS it → delete the fork** (upstream maintains generic; keep only WP value, and
  only where not already covered by an existing `wp-*` reviewer):
  - `security-sentinel` → **delete.** Its WP security checks are already fully in
    `wp-php-reviewer`. Upstream `ce-security-sentinel` covers generic.
  - `performance-oracle` → **delete the fork**, first **fold its extra WP perf checks into
    `wp-php-reviewer`** (unbounded `WP_Query`/`posts_per_page => -1`, meta-cache, autoload
    bloat, `query_posts`/`wp_reset_query`, AJAX loading WP).
  - `pattern-recognition-specialist` → **delete the fork**, first **fold its WP hook/dead-code
    note into `wp-hooks-reviewer`**.
  - `data-integrity-guardian` → **delete** (zero WP content; upstream `ce-data-integrity-
    guardian` owns it). *Resolves the spec-vs-audit conflict — drop it.*
  - Plus the already-generic deletes: `agent-native-reviewer`, `architecture-strategist`,
    `code-simplicity-reviewer`, `deployment-verification-agent`.
- **Upstream LACKS it + it's real WP IP → keep as an additive `wp-*` agent** (rename for a
  clear additive identity; Sarah confirmed rename):
  - `call-chain-verifier` (100% WP) → **`wp-call-chain-reviewer`**
  - `schema-drift-detector` (100% WP) → **`wp-schema-drift-reviewer`**
  - `data-migration-expert` (WP-CLI/WP-Cron + AACRAO/SAIS/NAHMA IP) → **`wp-data-migration-reviewer`**

**Forked command** `commands/workflows/review.md` → **delete**; upstream `ce-code-review`
owns the workflow. Fold its WP-specific routing into the Tier-3 glue: run the `wp-phpcs` /
`wp-phpstan` / `wp-eslint` skills, and send `dbDelta` / `$wpdb` schema PRs to
`wp-schema-drift-reviewer`.

Net: still ~11 review agents, but every kept agent is genuinely WP — no generic fork is
retained or maintained.

## Target tree (the closed keep-set)

After migration the repo contains **only**:

```
compound-wordpress-engineering/
  .claude-plugin/marketplace.json     (kept; metadata + version updated)
  plugins/compound-wordpress-engineering/
    .claude-plugin/plugin.json        (kept; counts + version updated; mcpServers preserved)
    skills/                           (7)  wp-ai-building-blocks  wp-development-patterns
                                           wp-eslint  wp-phpcs  wp-phpstan  wp-playground  wp-testing
    agents/review/                    (11) wp-ai-building-blocks-reviewer  wp-frontend-races-reviewer
                                           wp-gutenberg-reviewer  wp-hooks-reviewer  wp-javascript-reviewer
                                           wp-php-reviewer  wp-test-reviewer  wp-theme-reviewer
                                           wp-call-chain-reviewer  wp-schema-drift-reviewer  wp-data-migration-reviewer
                                           (last 3 renamed from call-chain-verifier / schema-drift-detector / data-migration-expert)
    README.md                         (rewritten — overlay model)
    CHANGELOG.md                      (2.0.0 breaking-restructure entry added)
  README.md                           (root — trimmed to overlay)
  AGENTS.md                           (root — rewritten to overlay model)
  CLAUDE.md                           (root — docs/count mandates stripped)
  LICENSE  .gitignore                 (retained; verify LICENSE attribution)
```

**Target plugin counts: 7 skills, 11 review agents, 0 commands, 2 MCP servers.** Everything
not reachable from this tree is deleted — *enforced as a closed set* in Phase 1, not as a
blanket assumption.

### Reality corrections enforced over the spec

| Spec assumed | Actual | Plan action |
|---|---|---|
| ~50 artifacts | 22 skills + 30 agents + 21 commands = **73** | Final counts 7 / 11 / 0 |
| 8 generic review agents to delete | `agents/review/` has **11 non-`wp-`** agents; keep 3 named, **delete 8** (incl. `agent-native-reviewer`, `call-chain-verifier`, `deployment-verification-agent` the spec never names) | Re-derive list from `ls \| grep -v wp-` |
| "all of `commands/`" | 16 flat **+ `commands/workflows/` (5 files)** | Per-file verify; `workflows/review.md` decision (Phase 2) |
| Delete `CONCEPTS.md`, `.release-please-*` | Neither exists | Drop no-op steps |
| `docs/`, `plans/` ("review") | top-level `plans/` (Sarah's) + `docs/` (mixed: this plan, spec, `fork-audit.md`, `solutions/`, **`specs/`**) | Phase 0 rescue + closed-set classify |
| One plugin.json / one CLAUDE.md | TWO `CLAUDE.md`, THREE READMEs, **+ root `AGENTS.md`**, `.claude/commands/`; `mcpServers` in the *plugin-level* plugin.json | Edit the right files explicitly |

## Implementation Phases

### Phase 0: Safety gate + decisions to confirm (FIRST — before any deletion)

- [ ] **Create the branch** (hard precondition for any delete). Current branch is `main`.
      ```bash
      git checkout -b overlay-migration
      ```
- [ ] **Rescue planning + governance docs from the deletion path.** This plan, the origin
      spec, `docs/fork-audit.md`, and `docs/solutions/plugin-versioning-requirements.md` all
      live under `docs/`, which Phase 2 deletes. `git commit` them on the branch first (and
      snapshot the audit + versioning doc into the PR description) so they survive.
- [ ] **Read `docs/solutions/plugin-versioning-requirements.md`** before fixing the version.
- [ ] **Confirm with Sarah, up front** (these are the only genuine judgement calls — resolved
      once here rather than mid-run):
      - **The 3 generic-named keepers** (`data-migration-expert`, `data-integrity-guardian`,
        `schema-drift-detector`): the spec keeps all three as her AACRAO/SAIS/NAHMA IP, but
        `fork-audit.md` classifies them A/A/B (generic) and `data-integrity-guardian.md` has
        **zero** WP signal even under a broad grep. Default: keep all three per spec — but
        flag `data-integrity-guardian` as a conscious keep. **Also check upstream's current
        agent list for `ce-*` equivalents** — if upstream now ships these, keeping a stale
        fork reintroduces the exact staleness this migration kills (Review I2).
      - **`security-sentinel` + `performance-oracle`:** the plugin README documents these as
        *WordPress-enhanced* ("nonces/capabilities", "WP_Query/caching"). That is the same
        accumulated-WP-edit signal used to justify the data-* keeps. Decide consciously
        whether they are keepers too, or generic deletes whose README copy is just flavor
        (Review C1). Default: delete, but only after eyeballing the two files.

### Phase 1: Closed-set classification (verification, scoped to what matters)

The keep-set is small and enumerated, so the safety mechanism is **branch + delete-the-
complement + review the diff**, not an upfront grep of every file. Grep is reserved for the
genuinely ambiguous files and for the post-deletion reverse sweep.

- [ ] **Re-derive every list from the filesystem at execution time** (not from the spec's
      prose):
      ```bash
      ls -d plugins/compound-wordpress-engineering/skills/*/          # 22 → keep 7 wp-*
      ls plugins/compound-wordpress-engineering/agents/review/*.md | grep -v '/wp-'   # 11 non-wp → keep 3, delete 8
      find plugins/compound-wordpress-engineering/agents/{design,research,workflow} -name '*.md'
      find plugins/compound-wordpress-engineering/commands -name '*.md'   # 16 flat + 5 workflows/
      ```
- [ ] **Closed-set reconciliation (the key safety gate).** Compute
      `git ls-files` **minus (keep-set ∪ delete-set)`. The result MUST be empty.** Any
      residual file is a STOP — classify it before proceeding. This converts "everything not
      listed is deleted" from an unbounded blanket into a verified closed set, and is what
      catches the files the spec missed:
      - `AGENTS.md` (root) → **rewrite-and-keep** (Phase 3).
      - `CHANGELOG.md` (root + plugin) → **keep, add 2.0.0 entry** (Phase 3).
      - `docs/specs/` (5 converter target specs) → delete with the converter, unless any is
        Sarah's own note (verify).
      - `.claude/commands/` (`release-docs.md`, `triage-prs.md`) → delete with the docs/PR-
        triage flow.
      - `LICENSE`, `.gitignore` → keep (verify LICENSE attribution).
- [ ] **Targeted grep only on the genuinely-ambiguous files** (not the whole tree). Use `-n`
      to capture lines (the report needs them) and an **expanded signal set**:
      ```bash
      grep -rEn -i \
        'wordpress|wp[-_]cli|wp_[a-z]|wp-admin|wp-content|\$wpdb|dbDelta|wp_query|_post_meta|wp_schedule|is_admin|phpcs|phpstan|wpcs|gutenberg|block\.json|register_(block|post_type|rest_route)|add_(action|filter)|wp_enqueue|shortcode|current_user_can|wp_verify_nonce|sanitize_|esc_|get_field|acf|woocommerce|iMIS|NetForum|Fonteva|Protech|MCTrade|Nimble|MemberSuite|Personify' \
        <file>
      ```
      Files that warrant this look: `call-chain-verifier.md`, `commands/workflows/review.md`,
      `commands/workflows/compound.md`, and the two README-flagged agents
      (`security-sentinel.md`, `performance-oracle.md`). **Default on uncertainty: leave it,
      note it in the diff review** (reversible — no need for an irreversible STOP rule).

### Phase 2: Delete (per-named; order is irrelevant for `rm`, but keepers must never be in a blanket target)

Only after Phases 0–1. Use `trash` for directory deletes. **Never** blanket-delete `skills/`,
`agents/review/`, or `commands/` — they interleave keepers and deletes.

- [ ] **Generic skills** (15 verified) — `trash` each named dir under `skills/`.
- [ ] **Generic review agents** — `rm`/`trash` the **8** non-wp, non-data-* agents in
      `agents/review/` (re-derived list from Phase 1, incl. `call-chain-verifier` iff cleared).
- [ ] **Whole agent subdirs** — `agents/design/`, `agents/research/`, `agents/workflow/`.
- [ ] **Commands** — delete verified flat files and `commands/workflows/*`. **Decision:**
      `commands/workflows/review.md` → **DELETE**; the kept data-* agents' orchestration
      migrates to the Tier-3 glue (Phase 4.1), which is their intended replacement entry
      point (Review C2). Remove the empty `commands/` dir.
- [ ] **TS build tooling + npm identity** — `src/`, `tests/`, `package.json`, `bun.lock`,
      `tsconfig.json`. Drops `@every-env/compound-plugin`.
- [ ] **GitHub workflows** — `ci.yml`, `publish.yml`, `deploy-docs.yml`; `ls .github/` and
      remove `.github/` only if nothing else (templates/CODEOWNERS/dependabot) remains.
- [ ] **Second plugin** — `plugins/coding-tutor/`.
- [ ] **Docs site** — `docs/` HTML site + `.claude/commands/{release-docs,triage-prs}.md`
      (preserve the Phase 0 rescued notes first).
- [ ] **Top-level `plans/`** — Sarah's own notes; **keep** unless she says otherwise.

### Phase 3: Rebuild metadata, governance, and references

- [ ] **3.1 Recount from the filesystem** (canonical truth): expect 7 skills / 11 agents /
      0 commands.
- [ ] **3.2 plugin-level `plugin.json`** — update `description` to slimmed counts keeping
      "2 MCP servers" accurate; `version` → `2.0.0`; fix any `components`/`agents`/`commands`
      manifest so it names no deleted artifact; **preserve `mcpServers` verbatim**.
- [ ] **3.3 `marketplace.json`** — update plugin `description` + `version`. **M3:** there are
      *two* version fields — plugin `version` (1.5.1 → 2.0.0) and marketplace-level
      `metadata.version` (1.0.0). Decide explicitly whether the marketplace metadata version
      moves or stays independent. Keep only official spec fields.
- [ ] **3.4 Plugin README** — rewrite intro + component tables to overlay model + real
      counts; **remove the entries documenting deleted agents** (`security-sentinel`,
      `performance-oracle`, `architecture-strategist`, `call-chain-verifier`, and the
      "Enhanced …" changelog lines). State: install upstream first, then this overlay; it no
      longer vendors upstream's generic workflow.
- [ ] **3.5 Root README** — drop the CLI-converter docs (deleted); reframe as overlay landing.
- [ ] **3.6 Root `AGENTS.md`** — rewrite to the overlay model (currently describes the deleted
      Bun/TS converter; it is the primary agent-instruction file per global convention).
- [ ] **3.7 Root `CLAUDE.md`** — strip the `/docs` site + release-docs count-sync-across-4-
      locations mandates (docs site is deleted); keep the still-valid plugin.json /
      marketplace.json / README count-sync rule. No instructions pointing at deleted infra.
- [ ] **3.8 `CHANGELOG.md`** — add a `2.0.0` breaking-restructure entry (Keep a Changelog
      format).
- [ ] **3.9 Reference-integrity reverse sweep.** Grep the *surviving* tree for the **names of
      deleted artifacts**; fix every dangling reference. Sweep targets must include both
      plugin.json manifests, both READMEs, **`AGENTS.md`**, both `CLAUDE.md`, the kept wp-*
      reviewers, and any surviving `commands/`:
      ```bash
      grep -rn '<deleted-name>' plugins/ .claude-plugin/ README.md AGENTS.md CLAUDE.md
      ```
- [ ] **3.10 LICENSE / attribution** — confirm the LICENSE posture for the overlay.

### Phase 4: Glue + upstream install — the genuinely irreversible half (primary caution here)

- [ ] **4.1 Back up the global file first.** `~/.claude/CLAUDE.md` is outside branch
      recoverability. Copy it aside before editing.
- [ ] **4.2 Append the glue via the Edit tool (not `>>`)** — respecting the no-redirect rule.
      Guard with a marker so re-runs don't duplicate; **dedupe against the existing
      `## WordPress Plugin Initialization` / WP-coding-standards sections** already in the
      global file rather than adding a contradictory parallel heading. Show the diff before
      writing. Document the **rollback**: delete everything between the markers.
      ```markdown
      <!-- wp-overlay-glue:start -->
      ## WordPress projects
      In a WordPress codebase, alongside the upstream compound-engineering (`ce-*`) workflow,
      invoke the WordPress overlay reviewers:
      - wp-php-reviewer, wp-hooks-reviewer — always, for PHP changes
      - wp-gutenberg-reviewer — block / block.json / editor work
      - wp-javascript-reviewer, wp-frontend-races-reviewer — JS / front-end
      - wp-theme-reviewer — theme changes
      - wp-test-reviewer + wp-testing skill — test work
      - wp-ai-building-blocks-reviewer + wp-ai-building-blocks skill — Abilities API / MCP work
      - data-migration-expert, data-integrity-guardian, schema-drift-detector — migration / import-export / DB-schema work
      Standards: follow WPCS; run wp-phpcs + wp-phpstan before PHP is "done"; run wp-eslint for JS.
      Anti-lock-in: keep the client platform-independent; opinionated defaults + a developer escape hatch.
      <!-- wp-overlay-glue:end -->
      ```
- [ ] **4.3 Upstream install — separate, presented-not-blindly-run** (re-adding a marketplace
      can error; this trusts third-party code at HEAD — a supply-chain boundary):
      ```bash
      claude plugin marketplace add EveryInc/compound-engineering-plugin
      claude plugin install compound-engineering@compound-engineering-plugin
      claude plugin update compound-engineering@compound-engineering-plugin
      ```
      **Record the installed upstream version/commit** in the final report so a later
      regression is diagnosable. Consider reviewing the upstream tag before first install.

### Phase 5: Verify + final report (definition of done)

- [ ] **5.1** `jq .` parses both JSON files.
- [ ] **5.2** Counts match across plugin.json + marketplace.json + plugin README + filesystem
      (7 / 11 / 0 / 2).
- [ ] **5.3** Closed-set reconciliation re-run: `git ls-files` is exactly the target tree.
- [ ] **5.4** (Optional, if cheap) local install smoke test — add marketplace + install the
      overlay; confirm no missing-reference errors. (5.1+5.2+3.9 already cover dangling refs.)
- [ ] **5.5 Final report** (see Acceptance Criteria).
- [ ] **5.6 Commit on `overlay-migration`** as a reviewable change (staged: delete / rebuild /
      glue); optionally open a PR. Never force-delete history.

## Acceptance Criteria

### Functional
- [ ] Branch `overlay-migration` created before any deletion; `main` + history intact.
- [ ] Repo matches the target tree: 7 skills, 11 review agents (8 wp-* + 3 generic-named),
      0 commands, 2 MCP servers preserved.
- [ ] TS tooling, npm identity, `.github` workflows, `coding-tutor`, and the docs site are gone.
- [ ] `AGENTS.md`, root `CLAUDE.md`, both READMEs, and `CHANGELOG.md` reflect the overlay (no
      references to deleted infrastructure).
- [ ] `mcpServers` block preserved verbatim.
- [ ] `~/.claude/CLAUDE.md` has the marker-guarded WordPress glue (idempotent; deduped against
      existing WP sections; backup taken; rollback documented).

### Non-Functional
- [ ] Both JSON files parse under `jq`.
- [ ] Closed-set reconciliation empty (no unclassified files).
- [ ] No surviving artifact references a deleted artifact name (3.9 sweep clean).

### Quality gates (Sarah's calls — confirmed in Phase 0)
- [ ] Three generic-named keepers reconciled vs `fork-audit.md`; `data-integrity-guardian`
      (zero WP signal) consciously kept-or-cut; upstream checked for `ce-*` equivalents.
- [ ] `security-sentinel` / `performance-oracle` consciously classified (README claims WP
      enhancement).
- [ ] `call-chain-verifier` classified.
- [ ] Version `2.0.0` confirmed against `plugin-versioning-requirements.md`; marketplace
      `metadata.version` decision made.

### Final report
- [ ] Kept vs deleted counts; verification hits with `path + lines`; new tree; `mcpServers`
      preserved confirmation; pinned upstream version; the exact upstream install commands.

## Dependencies & Risks

- **Destructive deletes hitting a keeper** → per-named `trash`, closed keep-set, branch
  isolation, single reviewable commit. Reversible via git.
- **Out-of-repo, non-recoverable ops** (`~/.claude/CLAUDE.md`, install) → backup + Edit-not-
  redirect + diff preview + documented rollback + present-don't-blindly-run.
- **Self-referential / governance-doc deletion** → Phase 0 rescue + closed-set classify
  (catches `AGENTS.md`, `CHANGELOG.md`, `docs/specs/`, `.claude/commands/`).
- **Generic-named keeps may duplicate upstream** → Phase 0 upstream-equivalence check.
- **Supply chain** → record pinned upstream version; review tag before install.
- **Dependency:** read `plugin-versioning-requirements.md` before the version bump; upstream
  marketplace must be reachable.

## Sources & References

### Origin
- **Spec:** [`docs/plans/wp-overlay-migration.md`](./wp-overlay-migration.md). Carried
  forward: three-tier overlay; KEEP 7 skills + 11 review agents; preserve `mcpServers`;
  verify-before-delete; `2.0.0`; glue in `~/.claude/CLAUDE.md`; install upstream.

### Internal
- Fork classification (conflicts on 3 agents): `docs/fork-audit.md`
- Versioning constraints: `docs/solutions/plugin-versioning-requirements.md`
- Count/docs governance: `CLAUDE.md` (root) + `plugins/compound-wordpress-engineering/CLAUDE.md`
- Metadata: `plugins/compound-wordpress-engineering/.claude-plugin/plugin.json` (v1.5.1) +
  `.claude-plugin/marketplace.json` (two version fields)
- Unlisted 9th review agent (WP hit): `agents/review/call-chain-verifier.md`
- Zero-WP-hit keep candidate: `agents/review/data-integrity-guardian.md`
- README-claimed WP-enhanced deletes: `agents/review/{security-sentinel,performance-oracle}.md`
- Spec-invisible: `commands/workflows/` (esp. `review.md`); root `AGENTS.md`; `docs/specs/`;
  `.claude/commands/`
- Sarah's own notes (top-level): `plans/`

### External
- Upstream: `EveryInc/compound-engineering-plugin` (Tier 1)
- [Plugin docs](https://docs.claude.com/en/docs/claude-code/plugins) ·
  [Marketplace docs](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)

## Review outcomes (2026-06-05)

Three reviewers assessed the prior draft. Folded in:
- **Architecture:** approach approved; added `AGENTS.md` to scope (I1); promoted
  `security-sentinel`/`performance-oracle` to a conscious decision (C1); made the
  `workflows/review.md` → glue orchestration migration explicit (C2); added upstream-
  equivalence check for the 3 generic keeps (I2); flagged marketplace's two version fields (M3).
- **Safety:** re-derive the review-agent delete list from the filesystem — 8 deletes, not "~6"
  (C1); added a closed-set reconciliation catching `AGENTS.md`/`CHANGELOG.md`/`docs/specs/`/
  `.claude/commands/` (I1); Edit-not-redirect + backup + rollback for the glue (I2); `trash`
  over `rm` (M1); expanded grep signals (M2); supply-chain/pin note (I3).
- **Simplicity:** dropped the full 30-term hit-table in favor of branch+diff as primary
  verification with targeted grep only on the ~5 ambiguous files; demoted the Phase 1.5
  blocker to Phase-0 confirmations; moved primary caution to Phase 4 (the irreversible ops);
  trimmed spec re-litigation. Kept per-named deletes, the Phase 0 rescue, the reverse sweep,
  and the idempotent glue guard.
