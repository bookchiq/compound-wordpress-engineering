# Compound WordPress Engineering

A Claude Code plugin marketplace featuring the **Compound WordPress Engineering Plugin** — a WordPress *overlay* for Every's [`compound-engineering`](https://github.com/EveryInc/compound-engineering-plugin) plugin.

Rather than forking upstream and drifting behind it, this overlay layers WordPress-specific reviewers and tooling *on top of* the upstream workflow. Install `compound-engineering` for the generic four-stage compounding loop (Plan, Work, Review, Compound), then add this overlay for WordPress expertise. Upstream stays current via `claude plugin update`; the overlay only carries genuinely WordPress-specific work.

## Install

```bash
# 1. Upstream — the generic compounding workflow (keep it current with `plugin update`)
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering@compound-engineering-plugin

# 2. This WordPress overlay
/plugin marketplace add https://github.com/bookchiq/compound-wordpress-engineering
/plugin install compound-wordpress-engineering@compound-wordpress-marketplace
```

## What the overlay adds

- **11 WordPress review agents** — PHP/WPCS, JavaScript, hooks, Gutenberg, themes, front-end races, tests, AI building blocks, call-chain tracing, schema-drift detection, and data migration.
- **7 skills** — `wp-development-patterns`, `wp-ai-building-blocks`, `wp-testing`, `wp-playground`, `wp-phpcs`, `wp-phpstan`, `wp-eslint`.
- **2 MCP servers** — `context7` (framework docs) and `playwright` (browser automation).

The generic reviewers (security, performance, architecture, simplicity, data integrity, …) come from upstream `compound-engineering` under `ce-*` names — this overlay deliberately does not re-vendor them.

See the [full component reference](plugins/compound-wordpress-engineering/README.md) for details.

## Philosophy

**Each unit of engineering work should make subsequent units easier — not harder.**

Compound engineering puts ~80% of effort into planning and review and ~20% into execution: plan thoroughly, review to catch issues and capture learnings, codify knowledge so it's reusable. The overlay model extends this to the toolchain itself — by depending on upstream instead of forking it, improvements compound automatically instead of requiring manual cherry-picks.

## Learn More

- [Full component reference](plugins/compound-wordpress-engineering/README.md)
- [Upstream: EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)
- [Compound engineering: how Every codes with agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)
