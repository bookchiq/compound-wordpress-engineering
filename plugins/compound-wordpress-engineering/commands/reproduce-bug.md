---
name: reproduce-bug
description: Reproduce and investigate a bug using WordPress debug logs, WP-CLI, and browser screenshots
argument-hint: "[GitHub issue number]"
disable-model-invocation: true
---

# Reproduce Bug Command

Look at github issue #$ARGUMENTS and read the issue description and comments.

## Phase 1: Log Investigation

Investigate the bug using WordPress debugging tools:

1. **Check if WP_DEBUG logging is enabled:**
   ```bash
   grep -E "WP_DEBUG|WP_DEBUG_LOG|WP_DEBUG_DISPLAY" wp-config.php 2>/dev/null || echo "wp-config.php not found in current directory"
   ```

2. **Review the WordPress debug log:**
   ```bash
   # Check common debug log locations
   cat wp-content/debug.log 2>/dev/null | tail -100 || echo "No debug.log found"
   ```

3. **Check PHP error logs:**
   ```bash
   # Check server error log
   cat /var/log/php-errors.log 2>/dev/null | tail -50 || echo "Check your server's PHP error log location"
   ```

4. **Use WP-CLI to inspect state (if available):**
   ```bash
   # Check active plugins
   wp plugin list --status=active 2>/dev/null
   # Check active theme
   wp theme list --status=active 2>/dev/null
   # Check option values relevant to the bug
   wp option get [relevant_option] 2>/dev/null
   ```

Think about the places it could go wrong looking at the codebase. Look for logging output, hook execution paths, and database queries that could help reproduce the bug.

Keep investigating until you have a good idea of what is going on.

## Phase 2: Visual Reproduction with Browser

If the bug is UI-related or involves user flows, use agent-browser to visually reproduce it:

### Step 1: Verify Dev Server is Running

```bash
agent-browser open "http://localhost:8888/wp-admin/"
agent-browser wait 2000
agent-browser snapshot -i
```

If site is not accessible, inform user to start their local development environment (e.g., `wp-env start`, `Local`, or their preferred setup).

### Step 2: Navigate to Affected Area

Based on the issue description, navigate to the relevant page:

```bash
agent-browser open "http://localhost:8888/[affected_route]"
agent-browser wait 2000
agent-browser snapshot -i
```

### Step 3: Capture Screenshots

Take screenshots at each step of reproducing the bug:

```bash
mkdir -p tmp/screenshots
agent-browser screenshot tmp/screenshots/bug-$ARGUMENTS-step-1.png
```

### Step 4: Follow User Flow

Reproduce the exact steps from the issue:

1. **Read the issue's reproduction steps**
2. **Execute each step using agent-browser:**
   - `agent-browser click @ref` for clicking elements
   - `agent-browser type @ref "text"` for filling forms
   - `agent-browser snapshot -i` to see the current state with element refs
   - `agent-browser screenshot tmp/screenshots/bug-$ARGUMENTS-step-N.png` to capture evidence

3. **Check for JavaScript errors:**
   Open browser DevTools Network/Console if needed via agent-browser interactions.

### Step 5: Capture Bug State

When you reproduce the bug:

1. Take a screenshot of the bug state
2. Capture any visible errors
3. Document the exact steps that triggered it

```bash
agent-browser screenshot tmp/screenshots/bug-$ARGUMENTS-reproduced.png
```

## Phase 3: Document Findings

**Reference Collection:**

- [ ] Document all research findings with specific file paths (e.g., `wp-content/plugins/my-plugin/includes/class-handler.php:42`)
- [ ] Include screenshots showing the bug reproduction
- [ ] List JavaScript console errors if any
- [ ] List PHP errors from debug.log
- [ ] Document the exact reproduction steps
- [ ] Note relevant hook execution paths

## Phase 4: Report Back

Add a comment to the issue with:

1. **Findings** - What you discovered about the cause
2. **Reproduction Steps** - Exact steps to reproduce (verified)
3. **Screenshots** - Visual evidence of the bug (upload captured screenshots)
4. **Relevant Code** - File paths and line numbers
5. **Debug Log Output** - Relevant entries from debug.log
6. **Suggested Fix** - If you have one
