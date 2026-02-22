# AI Building Blocks Architecture

How the four WordPress AI Building Blocks fit together: Abilities API, AI Client SDK, MCP Adapter, and AI Experiments Plugin.

## Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│  External AI Agents (Claude, GPT, Copilot, etc.)    │
└──────────────────────┬──────────────────────────────┘
                       │ MCP Protocol (JSON-RPC 2.0)
                       ▼
┌─────────────────────────────────────────────────────┐
│  MCP Adapter                                        │
│  - HTTP Transport (/wp-json/{ns}/{route})            │
│  - STDIO Transport (wp mcp-adapter serve)            │
│  - Ability → Tool/Resource/Prompt mapping            │
│  - Multi-server management                           │
└──────────────────────┬──────────────────────────────┘
                       │ wp_get_ability() + ->execute()
                       ▼
┌─────────────────────────────────────────────────────┐
│  Abilities API (WordPress core since 6.9)           │
│  - wp_register_ability() / wp_register_ability_category()
│  - JSON Schema validation (input + output)           │
│  - Permission callbacks                              │
│  - REST API (/wp-abilities/v1/...)                    │
│  - JavaScript client (wp.abilitiesApi)               │
└───────┬────────────────────────────┬────────────────┘
        │                            │
        │ Abilities can use          │ REST API / JS client
        ▼                            ▼
┌────────────────────────┐  ┌─────────────────────────┐
│  AI Client SDK         │  │  WordPress Core APIs    │
│  - WP_AI_Client_       │  │  - WP_Query, get_posts  │
│    Prompt_Builder      │  │  - wp_insert_post        │
│  - Provider-agnostic   │  │  - get_option, etc.      │
│  - Text/image/speech   │  │                          │
│  - Function calling    │  │                          │
└───────┬────────────────┘  └──────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  AI Providers (OpenAI, Anthropic, Google, etc.)     │
└─────────────────────────────────────────────────────┘
```

## Data Flows

### Agent-Driven Flow (MCP → WordPress)

An external AI agent discovers and executes WordPress abilities:

```
AI Agent
  │
  ├── tools/list  ──────────► MCP Adapter ──► Abilities Registry
  │                                           (returns available tools)
  │
  ├── tools/call  ──────────► MCP Adapter ──► wp_get_ability()
  │   { name, args }                          ──► $ability->execute($input)
  │                                               ├── permission_callback()
  │                                               ├── input validation
  │                                               ├── execute_callback()
  │                                               └── output validation
  │
  └── (receives result) ◄── MCP Adapter ◄── (ability result or WP_Error)
```

### User-Driven Flow (WordPress → AI Provider)

A WordPress plugin uses the AI Client SDK to generate content:

```
User action (e.g., clicks "Generate Summary")
  │
  ├── Plugin code creates WP_AI_Client_Prompt_Builder
  │     ->with_text( $content )
  │     ->using_temperature( 0.3 )
  │     ->generate_text()
  │
  ├── PromptBuilder ──► Provider Registry ──► AI Provider API
  │                                           (OpenAI, Anthropic, etc.)
  │
  └── Result ◄── string|WP_Error
```

### Agentic Loop (MCP + AI Client + Abilities)

An AI agent uses WordPress abilities that themselves call AI:

```
AI Agent
  │
  ├── tools/call: "my-plugin/summarize-post" { post_id: 42 }
  │
  ├── MCP Adapter ──► Ability execute_callback()
  │                      │
  │                      ├── get_post( 42 ) → $post
  │                      │
  │                      ├── WP_AI_Client_Prompt_Builder
  │                      │     ->with_text( $post->post_content )
  │                      │     ->generate_text()
  │                      │     │
  │                      │     └── AI Provider → summary text
  │                      │
  │                      └── return $summary
  │
  └── (receives summary) ◄── MCP Adapter
```

## Composer Integration

Both the AI Client SDK and MCP Adapter are installed via Composer:

```json
{
    "require": {
        "wordpress/abilities-api": "^1.0",
        "wordpress/mcp-adapter": "^1.0",
        "wordpress/wp-ai-client": "^1.0",
        "automattic/jetpack-autoloader": "^3.0"
    }
}
```

The Abilities API is in WordPress core since 6.9 but is also available as a standalone package for backward compatibility.

### Jetpack Autoloader

When multiple plugins ship the same Composer packages, use Jetpack Autoloader to prevent version conflicts. It ensures only the latest version of each package is loaded:

```php
// In main plugin file — use autoload_packages.php instead of autoload.php
require_once plugin_dir_path( __FILE__ ) . 'vendor/autoload_packages.php';
```

## Integration Patterns

### Full-Stack (All 4 Blocks)

Use when building a complete AI-powered plugin that both exposes capabilities to AI agents and generates AI content internally.

```php
// 1. Register abilities (Abilities API)
add_action( 'wp_abilities_api_init', function() {
    wp_register_ability( 'my-plugin/analyze-content', array(
        'execute_callback' => function( $input ) {
            // 2. Use AI Client SDK inside the ability
            $builder = new WP_AI_Client_Prompt_Builder( $registry );
            return $builder
                ->with_text( 'Analyze: ' . $input['text'] )
                ->generate_text();
        },
        // ...
    ) );
} );

// 3. Expose via MCP (MCP Adapter)
add_action( 'mcp_adapter_init', function( $adapter ) {
    $adapter->create_server( /* ... */ );
} );
```

### Abilities-Only

Use when building capabilities for other systems to consume (other plugins, REST API clients, AI agents) without needing AI generation.

```php
// Register abilities that use standard WordPress APIs
add_action( 'wp_abilities_api_init', function() {
    wp_register_ability( 'my-plugin/get-recent-posts', array(
        'execute_callback' => function( $input ) {
            return get_posts( array( 'numberposts' => $input['count'] ?? 5 ) );
        },
        // ...
    ) );
} );
```

### AI-Client-Only

Use when a plugin needs AI generation but doesn't need to expose abilities to external systems.

```php
// Use AI Client SDK directly in plugin code
add_action( 'save_post', function( $post_id ) {
    $post    = get_post( $post_id );
    $builder = new WP_AI_Client_Prompt_Builder( $registry );
    $excerpt = $builder
        ->with_text( 'Write a 2-sentence excerpt: ' . $post->post_content )
        ->using_max_tokens( 100 )
        ->generate_text();

    if ( ! is_wp_error( $excerpt ) ) {
        wp_update_post( array(
            'ID'           => $post_id,
            'post_excerpt' => sanitize_text_field( $excerpt ),
        ) );
    }
} );
```

## "Canonical First, Core When Ready" Philosophy

The WordPress AI team follows a progressive adoption strategy:

1. **Canonical packages** ship first as standalone Composer packages (e.g., `wordpress/abilities-api`, `wordpress/mcp-adapter`, `wordpress/wp-ai-client`)
2. **Core adoption** happens when APIs are stable — Abilities API merged into core in WordPress 6.9, AI Client in 7.0
3. Packages remain available for backward compatibility with older WordPress versions

This means:
- Always use Composer packages in plugins (works across WP versions)
- Use `function_exists()` / `class_exists()` guards for core availability
- Test against both the package version and the core version

## Security Architecture

### Layer-by-Layer

| Layer | Security Mechanism |
|-------|-------------------|
| **MCP Adapter** | Authentication (Application Passwords, cookies), transport-level access control, server-specific ability filtering |
| **Abilities API** | `permission_callback` on every ability, JSON Schema input validation, `show_in_rest` gating |
| **AI Client SDK** | `prompt_ai` capability, output sanitization responsibility on the caller |
| **REST API** | Standard WordPress authentication, nonce verification for cookie auth |

### Key Principles

- Every ability must have a `permission_callback` — there is no default
- MCP Adapter does not bypass permission checks
- AI-generated content is untrusted — always sanitize output
- Application Passwords should be scoped and rotated
- Use filtered ability lists on custom MCP servers — never expose all abilities

## Non-AI Uses of the Abilities API

The Abilities API is not exclusively for AI. It provides a general-purpose capability registry:

- **Command Palette** — WordPress admin command palette can surface abilities
- **Workflows** — Automation systems can chain abilities
- **UI Toolbars** — Editors and admin screens can offer ability-powered actions
- **Webhooks** — External systems can trigger abilities via REST API
- **Plugin interop** — Plugins can discover and use abilities registered by other plugins

The schema-validated, permission-checked, discoverable nature of abilities makes them useful anywhere WordPress needs standardized, callable units of functionality.

## Hook Timing Summary

```
wp_abilities_api_categories_init   ← Register categories here
    ↓
wp_abilities_api_init              ← Register abilities here
    ↓
mcp_adapter_init                   ← Create custom MCP servers here
    ↓
rest_api_init                      ← MCP HTTP transport registers routes
    ↓
Ready to serve MCP requests
```

Categories must exist before abilities reference them. Abilities must exist before MCP servers filter them.
