# Agent Instructions

This repository is a Claude Code plugin **marketplace** that distributes the
`compound-wordpress-engineering` plugin — a **WordPress overlay** for Every's
[`compound-engineering`](https://github.com/EveryInc/compound-engineering-plugin) plugin.

## The overlay model (read this first)

This is **not** a fork of upstream. It is a thin layer that adds only genuinely
WordPress-specific work and relies on upstream `compound-engineering` (installed separately,
kept current via `claude plugin update`) for the generic workflow and reviewers.

- **Add WordPress on top; never re-vendor upstream's generic agents/skills/commands.** If
  upstream already ships a generic version of something (security, performance, architecture,
  simplicity, data integrity, research, design, workflow, etc.), do **not** copy it here —
  it lives upstream under a `ce-*` name.
- **Keep here only what upstream lacks or what is WordPress-specific.** The `wp-*` reviewers
  and skills, plus a small number of WordPress-native reviewers upstream has no equivalent for
  (`wp-call-chain-reviewer`, `wp-schema-drift-reviewer`, `wp-data-migration-reviewer`).
- **No name collisions:** upstream uses `ce-*`; this overlay uses `wp-*`. The two install side
  by side without renaming.

## Repository structure

```
.claude-plugin/marketplace.json          # Marketplace catalog (lists this plugin)
plugins/compound-wordpress-engineering/
  .claude-plugin/plugin.json             # Plugin metadata + mcpServers (context7, playwright)
  agents/review/                         # 11 WordPress review agents (all wp-*)
  skills/                                # 7 WordPress skills (all wp-*)
  README.md                              # Full component reference
  CHANGELOG.md                           # Keep a Changelog format
docs/                                    # Project notes (fork-audit, solutions, plans) — not a published site
plans/                                   # Working notes
```

## Working agreement

- **Branching:** create a feature branch for any non-trivial change; do not commit directly
  to `main`. Do not create extra worktrees unless asked.
- **Safety:** do not delete or overwrite user data; avoid destructive commands. Prefer the
  Write/Edit tools over shell redirects.
- **WordPress code:** follow WordPress Coding Standards (PHP, JS, CSS).

## Keeping metadata in sync

Whenever review agents or skills are added/removed, update the counts in **all three** places
so they match the filesystem, then bump the version and changelog:

1. `plugins/compound-wordpress-engineering/.claude-plugin/plugin.json` → `description` + `version`
2. `.claude-plugin/marketplace.json` → plugin `description` + `version`
3. `plugins/compound-wordpress-engineering/README.md` → component table
4. `plugins/compound-wordpress-engineering/CHANGELOG.md` → new entry (Keep a Changelog)

Count commands:

```bash
ls -d plugins/compound-wordpress-engineering/skills/*/ | wc -l            # skills
ls plugins/compound-wordpress-engineering/agents/review/*.md | wc -l      # review agents
```

**Version bumping (semver):** MAJOR for breaking restructures, MINOR for new agents/skills,
PATCH for fixes/docs. Validate JSON before committing: `jq . <file>`.
