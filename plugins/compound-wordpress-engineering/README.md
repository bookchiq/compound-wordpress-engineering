# Compound WordPress Engineering Plugin

A **WordPress overlay** for Every's [`compound-engineering`](https://github.com/EveryInc/compound-engineering-plugin) plugin. It layers WordPress expertise *on top of* upstream's generic engineering workflow rather than replacing or forking it.

- **Upstream (`ce-*`) stays untouched** and current via `claude plugin update` — it provides the four-stage compounding loop (Plan, Work, Review, Compound) and all the generic reviewers.
- **This overlay adds only genuinely WordPress-specific work**: WP review agents and WP tooling skills. It no longer vendors upstream's generic agents, commands, or skills — so it can't drift behind upstream the way the old fork did.

> **Install upstream first.** This overlay is designed to run alongside `compound-engineering`, not instead of it. See [Installation](#installation).

## Components

| Component | Count |
|-----------|-------|
| Review agents | 11 |
| Skills | 7 |
| Commands | 0 (use upstream `ce-*`) |
| MCP Servers | 2 |

## Review Agents (11)

All review agents are WordPress-specific. The generic reviewers (security, performance, architecture, simplicity, etc.) come from upstream `compound-engineering` under `ce-*` names.

| Agent | Description |
|-------|-------------|
| `wp-php-reviewer` | WordPress PHP coding standards, security (nonces, capabilities, sanitization, escaping, `$wpdb->prepare`), WP-specific performance, and WPCS compliance. Runs PHPCS + PHPStan if available. |
| `wp-javascript-reviewer` | WordPress JS, block editor, Interactivity API, `@wordpress/*` packages. Runs ESLint if available. |
| `wp-hooks-reviewer` | WordPress hook system — timing, priorities, removal, custom hooks, orphaned/dead-hook detection |
| `wp-gutenberg-reviewer` | Block editor — deprecations, block.json, SSR, InnerBlocks |
| `wp-theme-reviewer` | Theme architecture — theme.json, template hierarchy, FSE patterns |
| `wp-frontend-races-reviewer` | Race conditions in Interactivity API, block editor, AJAX/REST |
| `wp-test-reviewer` | Test suite quality — isolation, assertions, security paths, coverage |
| `wp-ai-building-blocks-reviewer` | Review code using the Abilities API, AI Client SDK, and MCP Adapter |
| `wp-call-chain-reviewer` | Trace UI actions through all WordPress layers (AJAX, REST, hooks), verify signatures at each boundary |
| `wp-schema-drift-reviewer` | Detect unrelated `dbDelta`/schema changes in WordPress PRs, verify version tracking and `$wpdb->prefix` usage |
| `wp-data-migration-reviewer` | Validate WordPress data migrations/backfills — ID mappings, WP-CLI idempotency, orphaned associations |

## Skills (7)

| Skill | Description |
|-------|-------------|
| `wp-development-patterns` | WordPress patterns, coding standards, and best practices (7 reference files) |
| `wp-ai-building-blocks` | Abilities API, AI Client SDK, MCP Adapter, and AI Experiments reference |
| `wp-testing` | Scaffold and run WordPress test suites (PHPUnit, wp-browser, Playwright) |
| `wp-playground` | Start and manage WordPress Playground instances for local testing |
| `wp-phpcs` | Run PHP_CodeSniffer with WordPress Coding Standards |
| `wp-phpstan` | Run PHPStan static analysis with WordPress extensions |
| `wp-eslint` | Run ESLint with `@wordpress/eslint-plugin` |

## MCP Servers (2)

| Server | Description |
|--------|-------------|
| `context7` | Framework documentation lookup (100+ frameworks) |
| `playwright` | Browser automation for end-to-end testing via Playwright |

## Installation

```bash
# Step 1: Install upstream compound-engineering (the generic workflow)
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering@compound-engineering-plugin

# Step 2: Add this WordPress overlay
/plugin marketplace add https://github.com/bookchiq/compound-wordpress-engineering
/plugin install compound-wordpress-engineering@compound-wordpress-marketplace
```

Keep upstream current with `/plugin update compound-engineering@compound-engineering-plugin`.

### Wiring the overlay into your workflow

Add a short WordPress section to your `~/.claude/CLAUDE.md` so Claude invokes the WP reviewers alongside the upstream `ce-*` workflow. The overlay's migration adds a marker-guarded block automatically; see the repository's migration plan for the exact text.

## Recommended Companion Skills

This overlay includes built-in testing (wp-testing, wp-playground), static analysis (wp-phpcs, wp-phpstan, wp-eslint), and browser testing (Playwright MCP). For deep WordPress API reference, install these community skills alongside it:

### Official WordPress Collection

The [`wordpress/agent-skills`](https://github.com/wordpress/agent-skills) collection covers areas this overlay intentionally doesn't duplicate:

```bash
# Interactivity API — directives, stores, server-side rendering
npx skills add https://github.com/wordpress/agent-skills --skill wp-interactivity-api

# REST API — custom endpoints, validation, authentication, schemas
npx skills add https://github.com/wordpress/agent-skills --skill wp-rest-api

# WP-CLI & Ops — migrations, search-replace, multisite, cron
npx skills add https://github.com/wordpress/agent-skills --skill wp-wpcli-and-ops

# Block development — scaffolding, block.json, dynamic blocks, deprecations
npx skills add https://github.com/wordpress/agent-skills --skill wp-block-development

# Block themes — theme.json, templates, patterns, style variations
npx skills add https://github.com/wordpress/agent-skills --skill wp-block-themes

# Performance — backend profiling, WP-CLI doctor, Query Monitor
npx skills add https://github.com/wordpress/agent-skills --skill wp-performance

# Plugin development — architecture, lifecycle, admin UI, security
npx skills add https://github.com/wordpress/agent-skills --skill wp-plugin-development
```

### WordPress.org Compliance

```bash
# Plugin directory guidelines — free vs premium, review rules
npx skills add https://github.com/bonny/wordpress-simple-history --skill wordpress-org-compliance
```

## Credits

Builds on [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) by Kieran Klaassen. This overlay is maintained independently and installs upstream as a dependency rather than forking it.

## License

MIT
