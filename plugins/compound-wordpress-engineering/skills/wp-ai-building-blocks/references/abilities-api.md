# Abilities API Reference

The Abilities API (`wordpress/abilities-api`) provides a unified framework for registering and executing discrete capabilities within WordPress. Available in WordPress core since 6.9.0.

## Core Concept

An **ability** is a self-contained unit of functionality with defined inputs, outputs, permissions, and execution logic. Abilities are registered with JSON Schema validation, permission callbacks, and standardized execution — making them discoverable and executable by both PHP code and external systems (via REST API or MCP).

## Hook Timing

Categories and abilities must be registered on their respective hooks:

```php
// 1. Register categories FIRST
add_action( 'wp_abilities_api_categories_init', 'my_plugin_register_categories' );

// 2. Register abilities SECOND (categories must exist before abilities reference them)
add_action( 'wp_abilities_api_init', 'my_plugin_register_abilities' );
```

Registering outside these hooks triggers `_doing_it_wrong()` and returns `null`.

## Registering Categories

```php
wp_register_ability_category( string $slug, array $args ): ?WP_Ability_Category
```

**Parameters:**
- `$slug` — Lowercase alphanumeric + hyphens only. No underscores, uppercase, or special characters.
- `$args`:
  - `label` (string, **required**) — Human-readable name. Use `__()` for i18n.
  - `description` (string, **required**) — What abilities in this category do. Use `__()` for i18n.
  - `meta` (array, optional) — Arbitrary metadata.

```php
add_action( 'wp_abilities_api_categories_init', function() {
    wp_register_ability_category( 'content-management', array(
        'label'       => __( 'Content Management', 'my-plugin' ),
        'description' => __( 'Abilities for managing content.', 'my-plugin' ),
    ) );
} );
```

### Other category functions

```php
wp_unregister_ability_category( string $slug ): ?WP_Ability_Category
wp_has_ability_category( string $slug ): bool
wp_get_ability_category( string $slug ): ?WP_Ability_Category
wp_get_ability_categories(): array  // keyed by slug
```

## Registering Abilities

```php
wp_register_ability( string $name, array $args ): ?WP_Ability
```

**Parameters:**

- `$name` — Format: `namespace/ability-name`. Lowercase alphanumeric, hyphens, one forward slash. Use plugin slug as namespace.

- `$args`:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `label` | string | **Yes** | Human-readable name |
| `description` | string | **Yes** | What the ability does (crucial for AI agent understanding) |
| `category` | string | **Yes** | Category slug (must be registered first) |
| `execute_callback` | callable | **Yes** | Function to run. Receives input, returns result or `WP_Error` |
| `permission_callback` | callable | **Yes** | Returns `true`/`false`/`WP_Error`. Receives same input as execute |
| `input_schema` | array | No | JSON Schema for input validation |
| `output_schema` | array | No | JSON Schema for output documentation/validation |
| `meta` | array | No | Metadata including `annotations` and `show_in_rest` |
| `ability_class` | string | No | Custom class extending `WP_Ability` |

### Meta and Annotations

```php
'meta' => array(
    'show_in_rest' => true,  // Expose via REST API (default: false)
    'annotations'  => array(
        'instructions' => '',      // Usage guidance (default: '')
        'readonly'     => false,   // Does not modify environment (default: false)
        'destructive'  => true,    // May perform destructive updates (default: true)
        'idempotent'   => false,   // Repeated calls have no additional effect (default: false)
    ),
),
```

### Complete Registration Example

```php
add_action( 'wp_abilities_api_categories_init', function() {
    wp_register_ability_category( 'data-retrieval', array(
        'label'       => __( 'Data Retrieval', 'my-plugin' ),
        'description' => __( 'Abilities that retrieve data.', 'my-plugin' ),
    ) );
} );

add_action( 'wp_abilities_api_init', function() {
    wp_register_ability( 'my-plugin/get-site-info', array(
        'label'               => __( 'Get Site Information', 'my-plugin' ),
        'description'         => __( 'Retrieves basic site information.', 'my-plugin' ),
        'category'            => 'data-retrieval',
        'output_schema'       => array(
            'type'       => 'object',
            'properties' => array(
                'name' => array( 'type' => 'string', 'description' => 'Site name' ),
                'url'  => array( 'type' => 'string', 'format' => 'uri' ),
            ),
        ),
        'execute_callback'    => function() {
            return array(
                'name' => get_bloginfo( 'name' ),
                'url'  => home_url(),
            );
        },
        'permission_callback' => '__return_true',
        'meta'                => array(
            'show_in_rest' => true,
            'annotations'  => array( 'readonly' => true, 'destructive' => false ),
        ),
    ) );
} );
```

## JSON Schema Patterns

### No input required

Omit `input_schema` entirely. The execute callback receives no argument.

### Simple scalar input

```php
'input_schema' => array(
    'type'        => 'string',
    'description' => __( 'The text to process.', 'my-plugin' ),
    'minLength'   => 1,
),
```

### Object with required and optional properties

```php
'input_schema' => array(
    'type'       => 'object',
    'properties' => array(
        'post_id' => array(
            'type'    => 'integer',
            'minimum' => 1,
        ),
        'format' => array(
            'type'    => 'string',
            'enum'    => array( 'json', 'csv' ),
            'default' => 'json',
        ),
    ),
    'required'             => array( 'post_id' ),
    'additionalProperties' => false,
),
```

### Enum-constrained output

```php
'output_schema' => array(
    'type' => 'string',
    'enum' => array( 'positive', 'negative', 'neutral' ),
),
```

WordPress uses JSON Schema Draft 4 subset — see [REST API Schema docs](https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/).

## Retrieving and Executing Abilities

```php
// Check existence
if ( wp_has_ability( 'my-plugin/get-site-info' ) ) {
    $ability = wp_get_ability( 'my-plugin/get-site-info' );

    // Execute (validates input, checks permissions, runs callback)
    $result = $ability->execute();
    if ( is_wp_error( $result ) ) {
        // Handle error
    }

    // Check permissions without executing
    $has_perms = $ability->check_permissions( $input );
    // Returns true, false, or WP_Error

    // Inspect properties
    $ability->get_name();         // 'my-plugin/get-site-info'
    $ability->get_label();        // 'Get Site Information'
    $ability->get_description();  // 'Retrieves basic site information.'
    $ability->get_input_schema();
    $ability->get_output_schema();
    $ability->get_meta();
}

// Get all registered abilities
$all = wp_get_abilities();  // array keyed by name

// Unregister
wp_unregister_ability( 'my-plugin/get-site-info' );
```

## REST API

Abilities with `'show_in_rest' => true` are accessible via REST endpoints under `/wp-abilities/v1`.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wp-abilities/v1/abilities` | List all exposed abilities |
| GET | `/wp-abilities/v1/{namespace}/{ability}` | Get ability details |
| GET/POST/DELETE | `/wp-abilities/v1/{namespace}/{ability}/run` | Execute ability |
| GET | `/wp-abilities/v1/categories` | List categories |
| GET | `/wp-abilities/v1/categories/{slug}` | Get category details |

### Execution HTTP Methods

The required method depends on ability annotations:
- **GET** — readonly abilities (`readonly: true`)
- **POST** — abilities that modify data (`readonly: false`)
- **DELETE** — destructive abilities (`destructive: true`)

### Input Passing

- **GET/DELETE**: `input` as URL-encoded JSON query parameter
- **POST**: `input` in JSON request body

```bash
# Read-only ability (GET)
curl -u 'user:app_password' \
  "https://example.com/wp-json/wp-abilities/v1/my-plugin/get-site-info/run"

# Ability with input (POST)
curl -u 'user:app_password' -X POST \
  -H "Content-Type: application/json" \
  -d '{"input":{"option_name":"blogname","option_value":"New Name"}}' \
  "https://example.com/wp-json/wp-abilities/v1/my-plugin/update-option/run"
```

### Error Codes

| Code | Description |
|------|-------------|
| `ability_missing_input_schema` | Input required but not provided |
| `ability_invalid_input` | Input validation failed |
| `ability_invalid_permissions` | Permission denied |
| `ability_invalid_output` | Output validation failed |
| `rest_ability_not_found` | Ability not registered |
| `rest_ability_invalid_method` | Wrong HTTP method for ability type |

Authentication: Cookie auth (same-origin), Application Passwords (external), or custom auth plugins.

## JavaScript Client

```js
// Enqueue: wp_enqueue_script( 'wp-abilities-api' );

// List abilities
const abilities = await wp.abilitiesApi.getAbilities();

// Get one ability
const ability = await wp.abilitiesApi.getAbility( 'my-plugin/get-site-info' );

// Execute
const result = await wp.abilitiesApi.executeAbility( 'my-plugin/get-site-info' );
const resultWithInput = await wp.abilitiesApi.executeAbility( 'my-plugin/update-option', {
    option_name: 'blogname',
    option_value: 'New Name',
} );
```

## Common Mistakes

### Registering outside the correct hook

```php
// WRONG — triggers _doing_it_wrong(), returns null
add_action( 'init', function() {
    wp_register_ability( 'my-plugin/bad', array( /* ... */ ) );
} );

// CORRECT
add_action( 'wp_abilities_api_init', function() {
    wp_register_ability( 'my-plugin/good', array( /* ... */ ) );
} );
```

### Missing permission_callback

Every ability **must** have a `permission_callback`. Using `'__return_true'` is acceptable for read-only public data, but data-modifying abilities must check capabilities.

### Category not registered before ability

Categories must be registered on `wp_abilities_api_categories_init` which fires **before** `wp_abilities_api_init`. If the category doesn't exist when the ability references it, registration fails.

### Schema mismatch with callback

The `execute_callback` input argument type must match `input_schema`. If the schema defines `type: object`, the callback receives an array. If `type: string`, the callback receives a string.

### Not checking is_wp_error on execute results

```php
// WRONG
$result = $ability->execute( $input );
echo $result['name'];  // May be WP_Error

// CORRECT
$result = $ability->execute( $input );
if ( is_wp_error( $result ) ) {
    return $result;
}
echo $result['name'];
```

## Complete Plugin Example

```php
<?php
/**
 * Plugin Name: Site Tools
 * Description: Exposes site management abilities.
 * Version: 1.0.0
 * Requires at least: 6.9
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_abilities_api_categories_init', function() {
    wp_register_ability_category( 'site-tools', array(
        'label'       => __( 'Site Tools', 'site-tools' ),
        'description' => __( 'Site management abilities.', 'site-tools' ),
    ) );
} );

add_action( 'wp_abilities_api_init', function() {
    // Read-only ability — no input
    wp_register_ability( 'site-tools/get-stats', array(
        'label'               => __( 'Get Site Stats', 'site-tools' ),
        'description'         => __( 'Returns post and user counts.', 'site-tools' ),
        'category'            => 'site-tools',
        'output_schema'       => array(
            'type'       => 'object',
            'properties' => array(
                'posts' => array( 'type' => 'integer' ),
                'users' => array( 'type' => 'integer' ),
            ),
        ),
        'execute_callback'    => function() {
            return array(
                'posts' => (int) wp_count_posts()->publish,
                'users' => (int) count_users()['total_users'],
            );
        },
        'permission_callback' => function() {
            return current_user_can( 'manage_options' );
        },
        'meta' => array(
            'show_in_rest' => true,
            'annotations'  => array( 'readonly' => true, 'destructive' => false ),
        ),
    ) );

    // Write ability — with input
    wp_register_ability( 'site-tools/create-draft', array(
        'label'               => __( 'Create Draft Post', 'site-tools' ),
        'description'         => __( 'Creates a new draft post.', 'site-tools' ),
        'category'            => 'site-tools',
        'input_schema'        => array(
            'type'       => 'object',
            'properties' => array(
                'title'   => array( 'type' => 'string', 'minLength' => 1 ),
                'content' => array( 'type' => 'string' ),
            ),
            'required' => array( 'title' ),
        ),
        'output_schema'       => array(
            'type'       => 'object',
            'properties' => array(
                'post_id' => array( 'type' => 'integer' ),
                'url'     => array( 'type' => 'string', 'format' => 'uri' ),
            ),
        ),
        'execute_callback'    => function( $input ) {
            $post_id = wp_insert_post( array(
                'post_title'   => sanitize_text_field( $input['title'] ),
                'post_content' => wp_kses_post( $input['content'] ?? '' ),
                'post_status'  => 'draft',
            ), true );

            if ( is_wp_error( $post_id ) ) {
                return $post_id;
            }

            return array(
                'post_id' => $post_id,
                'url'     => get_edit_post_link( $post_id, 'raw' ),
            );
        },
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'meta' => array( 'show_in_rest' => true ),
    ) );
} );
```
