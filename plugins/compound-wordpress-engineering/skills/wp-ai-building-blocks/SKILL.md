---
name: wp-ai-building-blocks
description: WordPress AI Building Blocks — Abilities API, AI Client SDK, MCP Adapter, and AI Experiments. Use when building AI-powered WordPress plugins or exposing WordPress functionality to AI agents.
---

# WordPress AI Building Blocks

Reference documentation for the four official WordPress AI Building Blocks. Use this skill when planning, implementing, or reviewing WordPress plugins that register abilities, generate AI content, or expose functionality to AI agents via MCP.

## References

- [abilities-api.md](./references/abilities-api.md) — Abilities API: register, retrieve, and execute abilities with JSON Schema validation
- [ai-client-sdk.md](./references/ai-client-sdk.md) — AI Client SDK: provider-agnostic text, image, and speech generation
- [mcp-adapter.md](./references/mcp-adapter.md) — MCP Adapter: expose WordPress abilities as MCP tools, resources, and prompts
- [building-blocks-architecture.md](./references/building-blocks-architecture.md) — How the four building blocks fit together

## How the Blocks Relate

```
AI Agents (Claude, GPT, etc.)
    │
    ▼
MCP Adapter ──── exposes abilities as MCP tools/resources/prompts
    │
    ▼
Abilities API ── standardized registry of capabilities with schemas
    │
    ▼
AI Client SDK ── provider-agnostic AI generation (text, image, speech)
    │
    ▼
AI Providers (OpenAI, Anthropic, Google, etc.)
```

The **Abilities API** is the foundation — a registry of discrete, schema-validated capabilities. The **MCP Adapter** bridges those abilities to external AI agents. The **AI Client SDK** provides generation capabilities that abilities can use internally. The **AI Experiments Plugin** is a sandbox for experimental AI features built on top of these blocks.

## Quick Start

### 1. Register an ability

```php
add_action( 'wp_abilities_api_categories_init', function() {
    wp_register_ability_category( 'content', array(
        'label'       => __( 'Content', 'my-plugin' ),
        'description' => __( 'Content management abilities.', 'my-plugin' ),
    ) );
} );

add_action( 'wp_abilities_api_init', function() {
    wp_register_ability( 'my-plugin/summarize-post', array(
        'label'               => __( 'Summarize Post', 'my-plugin' ),
        'description'         => __( 'Generate a summary of a post.', 'my-plugin' ),
        'category'            => 'content',
        'input_schema'        => array(
            'type'       => 'object',
            'properties' => array(
                'post_id' => array( 'type' => 'integer', 'minimum' => 1 ),
            ),
            'required' => array( 'post_id' ),
        ),
        'output_schema'       => array(
            'type' => 'string',
            'description' => 'The post summary.',
        ),
        'execute_callback'    => 'my_plugin_summarize_post',
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'meta' => array( 'show_in_rest' => true ),
    ) );
} );
```

### 2. Generate text with the AI Client SDK

```php
$result = ( new WP_AI_Client_Prompt_Builder( $registry ) )
    ->with_text( 'Summarize: ' . $post->post_content )
    ->using_temperature( 0.3 )
    ->using_max_tokens( 200 )
    ->generate_text();

if ( is_wp_error( $result ) ) {
    return $result;
}
```

### 3. Expose via MCP

With `'meta' => array( 'show_in_rest' => true )` on the ability and the MCP Adapter active, the ability is automatically available as an MCP tool at `/wp-json/mcp/mcp-adapter-default-server`.

## Decision Table

| I want to... | Use |
|---|---|
| Register a capability other code can call | Abilities API |
| Generate text, images, or speech from AI | AI Client SDK |
| Let AI agents (Claude, GPT) call WordPress functions | MCP Adapter |
| Experiment with AI features in wp-admin | AI Experiments Plugin |
| Build a full AI-powered plugin | All four together |

## Requirements

- **WordPress 6.9+** (Abilities API is in core since 6.9)
- **PHP 7.4+**
- **Composer** for AI Client SDK and MCP Adapter packages
- AI Client SDK requires a configured AI provider (OpenAI, Anthropic, Google, etc.)
