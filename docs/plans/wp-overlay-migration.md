# Migration: Convert the WordPress fork into a clean overlay plugin

## Context for you (Claude Code)

The user (`bookchiq` / Sarah) forked Every Inc.'s `compound-engineering-plugin` a
while ago and made it WordPress-centric. That fork — `compound-wordpress-engineering`
— has drifted badly behind upstream, and cherry-picking upstream improvements has
become unsustainable.

**The new strategy is to stop forking entirely and switch to an overlay model:**

1. **Tier 1 — Upstream, untouched.** Install Every's `compound-engineering` plugin
   via its marketplace and let `claude plugin update` keep it current. Never edit it.
2. **Tier 2 — A slim WordPress overlay plugin** containing *only* Sarah's genuinely
   WP-specific work. This is the repo you are transforming.
3. **Tier 3 — Thin glue** in the user's systemwide `~/.claude/CLAUDE.md` that tells
   Claude to invoke the WP reviewers alongside the upstream workflow.

The fork currently carries ~50 artifacts. Only ~18 are genuinely Sarah's WP work.
The other ~32 are stale duplicates of upstream that you will **delete**, because
upstream's current versions are better and maintained. Critically, upstream renamed
all its skills/agents to a `ce-*` prefix; the fork uses the old unprefixed names.
That means a clean upstream install and this overlay **cannot collide on names** —
no renaming is required.

Your job is to slim this repo down to the overlay, preserving everything that is
real WP IP and discarding the forked generic content — but **verifying before each
deletion**, because some "generic-named" artifacts may have accumulated WP-specific
edits over time.

---

## KEEP — these are Sarah's real WP differentiation (do not delete)

### Skills (under `plugins/compound-wordpress-engineering/skills/`)
- `wp-ai-building-blocks`
- `wp-development-patterns`
- `wp-eslint`
- `wp-phpcs`
- `wp-phpstan`
- `wp-playground`
- `wp-testing`

### Review agents (under `plugins/compound-wordpress-engineering/agents/review/`)
- `wp-ai-building-blocks-reviewer.md`
- `wp-frontend-races-reviewer.md`
- `wp-gutenberg-reviewer.md`
- `wp-hooks-reviewer.md`
- `wp-javascript-reviewer.md`
- `wp-php-reviewer.md`
- `wp-test-reviewer.md`
- `wp-theme-reviewer.md`
- `data-migration-expert.md`     ← generic name, but maps to Sarah's AACRAO/SAIS/NAHMA migration work; no upstream equivalent
- `data-integrity-guardian.md`   ← same rationale
- `schema-drift-detector.md`     ← same rationale

### Config to preserve
- `plugins/compound-wordpress-engineering/.claude-plugin/plugin.json` — **keep its
  `mcpServers` block** (`context7` and `playwright`). These are real config the
  overlay needs. You will edit metadata (version/description) but must not drop the
  MCP servers.
- `plugins/compound-wordpress-engineering/.claude-plugin/marketplace.json` — keep;
  it already points to Sarah's marketplace (`compound-wordpress-marketplace`).

---

## DELETE — these are forked-and-drifted upstream content

**Before deleting any item in this section, run the verification step below.** If an
item contains WP-specific content, STOP and surface it to the user instead of deleting.

### Skills to delete (after verification)
- `agent-browser`
- `agent-native-architecture`
- `brainstorming`
- `compound-docs`
- `create-agent-skills`
- `document-review`
- `file-todos`
- `frontend-design`
- `gemini-imagegen`
- `git-worktree`
- `orchestrating-swarms`
- `rclone`
- `resolve-pr-parallel`
- `setup`
- `skill-creator`

### Review agents to delete (after verification)
- `agent-native-reviewer.md`
- `architecture-strategist.md`
- `call-chain-verifier.md`
- `code-simplicity-reviewer.md`
- `deployment-verification-agent.md`
- `pattern-recognition-specialist.md`
- `performance-oracle.md`
- `security-sentinel.md`

### Other agent directories — review and likely delete
- `agents/design/` (all) — forked upstream design agents
- `agents/research/` (all) — forked upstream research agents
- `agents/workflow/` (all) — forked upstream workflow agents
  - Exception check: verify none of these contain WP-specific logic before deleting.

### Commands — review and likely delete all
All files under `commands/` are forked upstream workflow commands. Upstream now ships
better `ce-*` equivalents. Delete after verification. Note that a grep already found
WP-term mentions in `deepen-plan.md`, `deploy-docs.md`, `generate_command.md`,
`report-bug.md`, `reproduce-bug.md`, `test-browser.md`, and `triage.md` — these are
**most likely just incidental examples**, but confirm before deleting (see below).

### Top-level fork scaffolding to delete
- `src/` (the multi-target converter system — pure upstream build tooling)
- `tests/` (upstream's test suite for tooling you're not keeping)
- `scripts/` (upstream release tooling)
- `.github/` workflows tied to upstream release-please
- `docs/`, `plans/` — review; keep anything that is Sarah's own notes, delete
  upstream-derived docs
- `plugins/coding-tutor/` — this is Every's separate plugin, not Sarah's. Delete.

---

## VERIFICATION STEP (run before each deletion)

For every file/dir slated for deletion, grep for WP-specific signal first:

```bash
grep -rEil 'wordpress|wp[-_]cli|wp_[a-z]|phpcs|phpstan|gutenberg|block\.json|register_block|add_(action|filter)|wpcs|iMIS|NetForum|Fonteva|Protech' <path>
```

Decision rule:
- **Zero hits** → safe to delete.
- **Hits that are clearly incidental** (a one-line example, a stray mention in prose)
  → safe to delete, but note it in your summary.
- **Hits that represent real WP logic** (a reviewer rule, a WP-aware step, accumulated
  domain knowledge) → **do NOT delete.** Extract that content and surface it to the
  user with the file path and the matching lines, so she can decide whether to fold it
  into a KEEP artifact.

Known ambiguous cases flagged in advance — handle with extra care:
- `skills/compound-docs/` — has 1 file with a WP reference
- `skills/orchestrating-swarms/` — has 1 file with a WP reference
- The seven commands listed above with WP-term hits

---

## REBUILD — produce the slim overlay

After deletions, the repo should contain only:

```
compound-wordpress-engineering/
  .claude-plugin/
    marketplace.json          (kept, metadata updated)
    plugin.json               (kept, metadata updated, mcpServers preserved)
  plugins/compound-wordpress-engineering/
    .claude-plugin/plugin.json
    skills/
      wp-ai-building-blocks/  wp-development-patterns/
      wp-eslint/  wp-phpcs/  wp-phpstan/
      wp-playground/  wp-testing/
    agents/review/
      wp-*.md  (the 8 WP reviewers)
      data-migration-expert.md
      data-integrity-guardian.md
      schema-drift-detector.md
  README.md                   (rewrite — see below)
  CLAUDE.md                   (overlay's own, if useful; otherwise remove)
```

Then:

1. **Update `plugin.json` metadata** — fix the `description` and counts to reflect the
   slimmed reality (it currently claims "30 agents, 21 commands, 22 skills"; correct to
   the actual KEEP counts: ~11 review agents, 0 commands unless any survive verification,
   7 skills). Bump `version` (e.g. `2.0.0` — this is a breaking restructure). Preserve
   the `mcpServers` block verbatim.

2. **Update `marketplace.json` metadata** similarly (description + version).

3. **Rewrite `README.md`** to describe the new model in a few sentences: this is a
   WordPress *overlay* for Every's `compound-engineering` plugin; install upstream
   first, then this; the overlay adds WP reviewers, PHPCS/PHPStan/ESLint skills,
   WP testing/playground, AI building blocks, and migration/data-integrity reviewers.
   State explicitly that it no longer vendors upstream's generic workflow — that comes
   from upstream directly and stays current via `claude plugin update`.

4. **Delete the old fork-tracking cruft** so nothing implies this still mirrors
   upstream: remove `CONCEPTS.md` / release manifests / `.release-please-*` if present.

---

## GLUE — append to `~/.claude/CLAUDE.md` (Tier 3)

Add a short WordPress section. Keep it thin — anything structured belongs in a skill,
not here. Suggested content (adapt wording to the user's voice):

```markdown
## WordPress projects

When working in a WordPress codebase (theme, plugin, or mu-plugin), in addition to
the upstream compound-engineering (`ce-*`) workflow, invoke the WordPress overlay
reviewers as relevant:

- `wp-php-reviewer`, `wp-hooks-reviewer` — always, for PHP changes
- `wp-gutenberg-reviewer` — for block / block.json / editor work
- `wp-javascript-reviewer`, `wp-frontend-races-reviewer` — for JS/front-end work
- `wp-theme-reviewer` — for theme changes
- `wp-test-reviewer`, and the `wp-testing` skill — for test work
- `wp-ai-building-blocks-reviewer` + `wp-ai-building-blocks` skill — for Abilities
  API / MCP adapter work
- `data-migration-expert`, `data-integrity-guardian`, `schema-drift-detector` — for
  any migration, import/export, or DB-schema work

Coding standards: follow WPCS; run the `wp-phpcs` and `wp-phpstan` skills before
considering PHP work done; run `wp-eslint` for JS.

Anti-lock-in: prefer solutions that keep the client independent of any single
platform; favor opinionated defaults with a developer-layer escape hatch.
```

---

## INSTALL UPSTREAM (do this, or hand the user the command)

```bash
# Add Every's marketplace and install the canonical plugin
claude plugin marketplace add EveryInc/compound-engineering-plugin
claude plugin install compound-engineering@compound-engineering-plugin

# Keep it current going forward
claude plugin update compound-engineering@compound-engineering-plugin
```

After this, upstream's own `ce-update` skill + `claude plugin update` provide the
staleness detection the fork never had — which is the root cause of falling behind.

---

## FINAL REPORT (what to tell the user when done)

Produce a short summary containing:
1. Count of artifacts kept vs. deleted.
2. **Any verification hits where WP-specific content was found in a to-delete file** —
   list path + lines, since these are decisions only Sarah should make.
3. The new artifact tree.
4. Confirmation that `mcpServers` config was preserved.
5. The exact upstream install commands (above) if you didn't run them yourself.

Do not delete the original fork repo or its git history. If working in-place, do this
on a new branch (e.g. `overlay-migration`) so the old state is recoverable.
