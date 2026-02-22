# MCP Adapter Reference

The MCP Adapter (`wordpress/mcp-adapter`) bridges the WordPress Abilities API with the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/specification/2025-06-18/), exposing WordPress abilities as MCP tools, resources, and prompts for AI agents.

## Installation

```bash
composer require wordpress/abilities-api wordpress/mcp-adapter
```

Recommended: Use [Jetpack Autoloader](https://github.com/Automattic/jetpack-autoloader) to prevent version conflicts when multiple plugins use the adapter:

```bash
composer require automattic/jetpack-autoloader
```

Then in the main plugin file:

```php
<?php
// Use Jetpack autoloader instead of vendor/autoload.php
require_once plugin_dir_path( __FILE__ ) . 'vendor/autoload_packages.php';

use WP\MCP\Core\McpAdapter;

// Check availability and initialize
if ( class_exists( McpAdapter::class ) ) {
    McpAdapter::instance();
}
```

### Requirements

- PHP >= 7.4
- WordPress >= 6.8
- WordPress Abilities API

## Default Server

When the MCP Adapter is active, it automatically creates a default server (`mcp-adapter-default-server`) that exposes all REST-visible abilities.

- **HTTP endpoint**: `/wp-json/mcp/mcp-adapter-default-server`
- **STDIO**: `wp mcp-adapter serve --server=mcp-adapter-default-server`

All abilities registered with `'show_in_rest' => true` (in their meta) are automatically available as MCP tools.

### Built-in Meta-Abilities

The default server includes 3 built-in abilities for system introspection:

| Ability | Description |
|---------|-------------|
| `mcp-adapter/discover-abilities` | List all registered abilities |
| `mcp-adapter/execute-ability` | Execute an ability by name |
| `mcp-adapter/get-ability-info` | Get details about a specific ability |

## Ability-to-MCP Mapping

WordPress abilities are converted to MCP components:

| MCP Component | WordPress Source | Description |
|---|---|---|
| **Tools** | Abilities with `execute_callback` | Executable functions the AI agent can call |
| **Resources** | Abilities with `readonly: true` annotation | Data the AI agent can read |
| **Prompts** | Abilities configured as prompts | Structured templates for AI guidance |

The adapter automatically maps:
- Ability `input_schema` → MCP tool `inputSchema`
- Ability `description` → MCP tool description
- Ability `meta.annotations` → MCP tool annotations

## Creating a Custom Server

Use the `mcp_adapter_init` hook to create servers with filtered ability sets:

```php
use WP\MCP\Core\McpAdapter;
use WP\MCP\Transport\HttpTransport;
use WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler;

add_action( 'mcp_adapter_init', function( McpAdapter $adapter ) {
    $adapter->create_server(
        'my-plugin-server',                    // Server ID
        'my-plugin',                           // Namespace
        'mcp',                                 // Route
        'My Plugin MCP Server',                // Name
        'Custom server for my plugin',         // Description
        '1.0.0',                               // Version
        array( HttpTransport::class ),         // Transports
        ErrorLogMcpErrorHandler::class,        // Error handler
        array(                                 // Allowed abilities (filter list)
            'my-plugin/get-posts',
            'my-plugin/create-draft',
        )
    );
} );
```

The custom server is accessible at `/wp-json/my-plugin/mcp`.

### class_exists Guard

Always check that the adapter is available before using it:

```php
use WP\MCP\Core\McpAdapter;

add_action( 'plugins_loaded', function() {
    if ( ! class_exists( McpAdapter::class ) ) {
        add_action( 'admin_notices', function() {
            echo '<div class="notice notice-error"><p>';
            esc_html_e( 'My Plugin requires the MCP Adapter.', 'my-plugin' );
            echo '</p></div>';
        } );
        return;
    }

    // Safe to use MCP Adapter
} );
```

## Transports

### HTTP Transport

MCP 2025-06-18 compliant HTTP transport. Registered automatically for servers.

- Endpoint: `/wp-json/{namespace}/{route}`
- Protocol: JSON-RPC 2.0
- Authentication: WordPress REST API auth (cookies, Application Passwords)

```bash
# Example: List available tools
curl -X POST \
  -u 'user:app_password' \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  "https://example.com/wp-json/mcp/mcp-adapter-default-server"
```

### STDIO Transport

For local development and CLI integration. Communicates via standard input/output.

```bash
# Start STDIO server
wp mcp-adapter serve --server=mcp-adapter-default-server

# List available servers
wp mcp-adapter list
```

## Client Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "my-wordpress-site": {
      "url": "https://example.com/wp-json/mcp/mcp-adapter-default-server",
      "headers": {
        "Authorization": "Basic BASE64_ENCODED_USER:APP_PASSWORD"
      }
    }
  }
}
```

### Claude Code

```json
{
  "mcpServers": {
    "my-wordpress-site": {
      "type": "http",
      "url": "https://example.com/wp-json/mcp/mcp-adapter-default-server",
      "headers": {
        "Authorization": "Basic BASE64_ENCODED_USER:APP_PASSWORD"
      }
    }
  }
}
```

### VS Code / Cursor (STDIO)

```json
{
  "mcpServers": {
    "my-wordpress-site": {
      "command": "wp",
      "args": ["mcp-adapter", "serve", "--server=mcp-adapter-default-server", "--path=/path/to/wordpress"]
    }
  }
}
```

### Remote Proxy

For accessing a remote WordPress site via STDIO (useful for Claude Desktop without HTTP support):

```bash
npx @automattic/mcp-wordpress-remote \
  --url=https://example.com \
  --username=user \
  --password=app_password
```

## Application Password Setup

MCP clients authenticating over HTTP need Application Passwords:

1. Go to **Users → Profile** in wp-admin
2. Scroll to **Application Passwords**
3. Enter a name (e.g., "Claude MCP") and click **Add New Application Password**
4. Copy the generated password
5. Base64-encode `username:password` for the Authorization header

```bash
echo -n 'username:xxxx xxxx xxxx xxxx' | base64
```

## Testing

### WP-CLI Commands

```bash
# List all MCP servers
wp mcp-adapter list

# Start STDIO server for testing
wp mcp-adapter serve --server=mcp-adapter-default-server
```

### MCP Inspector

Use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to test the server interactively:

```bash
npx @modelcontextprotocol/inspector \
  --url https://example.com/wp-json/mcp/mcp-adapter-default-server
```

### Quick verification

```bash
# Test HTTP endpoint
curl -X POST \
  -u 'user:app_password' \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  "https://example.com/wp-json/mcp/mcp-adapter-default-server"

# Check if adapter is loaded
wp eval "echo class_exists('WP\MCP\Core\McpAdapter') ? 'yes' : 'no';"
```

## Security

### Filter abilities per server

Never expose all abilities to all servers. Use the ability filter list in `create_server()` to restrict access:

```php
$adapter->create_server(
    'public-server',
    'my-plugin', 'mcp',
    'Public Server', 'Read-only abilities for public access', '1.0.0',
    array( HttpTransport::class ),
    ErrorLogMcpErrorHandler::class,
    array( 'my-plugin/get-posts', 'my-plugin/get-stats' )  // Only these abilities
);
```

### Permission callbacks

Every ability's `permission_callback` is enforced when executing via MCP. The MCP Adapter does not bypass permission checks.

### Network exposure

- Use HTTPS for all HTTP transport endpoints
- Application Passwords should be treated as secrets
- Consider IP allowlisting for production MCP servers
- STDIO transport is local-only and inherits the WP-CLI user's permissions

## Common Mistakes

### Exposing all abilities without filtering

```php
// RISKY — exposes every ability to this server
$adapter->create_server( 'server', 'ns', 'mcp', 'Server', '', '1.0.0',
    array( HttpTransport::class ),
    ErrorLogMcpErrorHandler::class,
    array()  // Empty = no filter = all abilities
);

// BETTER — explicitly list allowed abilities
$adapter->create_server( 'server', 'ns', 'mcp', 'Server', '', '1.0.0',
    array( HttpTransport::class ),
    ErrorLogMcpErrorHandler::class,
    array( 'my-plugin/safe-read-ability' )
);
```

### Missing class_exists guard

```php
// WRONG — fatal error if MCP Adapter isn't installed
use WP\MCP\Core\McpAdapter;
McpAdapter::instance();

// CORRECT — check first
if ( class_exists( 'WP\MCP\Core\McpAdapter' ) ) {
    McpAdapter::instance();
}
```

### Using wrong hook for server creation

```php
// WRONG — adapter may not be initialized yet
add_action( 'init', function() {
    $adapter = McpAdapter::instance();
    $adapter->create_server( /* ... */ );
} );

// CORRECT — use mcp_adapter_init which provides the adapter instance
add_action( 'mcp_adapter_init', function( McpAdapter $adapter ) {
    $adapter->create_server( /* ... */ );
} );
```

### Forgetting show_in_rest on abilities

Abilities are NOT exposed via REST (or MCP default server) unless `'show_in_rest' => true` is set in their meta:

```php
wp_register_ability( 'my-plugin/hidden', array(
    // ... no meta.show_in_rest ...
    // This ability is PHP-only, invisible to MCP default server
) );

wp_register_ability( 'my-plugin/visible', array(
    // ...
    'meta' => array( 'show_in_rest' => true ),
    // This ability is exposed via REST and MCP default server
) );
```

## Complete Plugin Example

```php
<?php
/**
 * Plugin Name: My MCP Plugin
 * Description: Exposes post management to AI agents via MCP.
 * Version: 1.0.0
 * Requires at least: 6.9
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

// Load Jetpack autoloader
if ( file_exists( __DIR__ . '/vendor/autoload_packages.php' ) ) {
    require_once __DIR__ . '/vendor/autoload_packages.php';
}

use WP\MCP\Core\McpAdapter;
use WP\MCP\Transport\HttpTransport;
use WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler;

// Check dependencies
add_action( 'plugins_loaded', function() {
    if ( ! class_exists( McpAdapter::class ) ) {
        add_action( 'admin_notices', function() {
            echo '<div class="notice notice-error"><p>';
            esc_html_e( 'My MCP Plugin requires the MCP Adapter.', 'my-mcp-plugin' );
            echo '</p></div>';
        } );
        return;
    }

    if ( ! function_exists( 'wp_register_ability' ) ) {
        return;
    }

    McpAdapter::instance();
} );

// Register category
add_action( 'wp_abilities_api_categories_init', function() {
    wp_register_ability_category( 'post-management', array(
        'label'       => __( 'Post Management', 'my-mcp-plugin' ),
        'description' => __( 'Abilities for managing posts.', 'my-mcp-plugin' ),
    ) );
} );

// Register abilities
add_action( 'wp_abilities_api_init', function() {
    wp_register_ability( 'my-mcp-plugin/list-posts', array(
        'label'               => __( 'List Posts', 'my-mcp-plugin' ),
        'description'         => __( 'Lists recent published posts.', 'my-mcp-plugin' ),
        'category'            => 'post-management',
        'input_schema'        => array(
            'type'       => 'object',
            'properties' => array(
                'count' => array(
                    'type'    => 'integer',
                    'minimum' => 1,
                    'maximum' => 50,
                    'default' => 10,
                ),
            ),
        ),
        'output_schema'       => array(
            'type'  => 'array',
            'items' => array(
                'type'       => 'object',
                'properties' => array(
                    'id'    => array( 'type' => 'integer' ),
                    'title' => array( 'type' => 'string' ),
                    'url'   => array( 'type' => 'string', 'format' => 'uri' ),
                ),
            ),
        ),
        'execute_callback'    => function( $input ) {
            $posts = get_posts( array(
                'numberposts' => $input['count'] ?? 10,
                'post_status' => 'publish',
            ) );
            return array_map( function( $post ) {
                return array(
                    'id'    => $post->ID,
                    'title' => $post->post_title,
                    'url'   => get_permalink( $post ),
                );
            }, $posts );
        },
        'permission_callback' => function() {
            return current_user_can( 'read' );
        },
        'meta' => array(
            'show_in_rest' => true,
            'annotations'  => array( 'readonly' => true, 'destructive' => false ),
        ),
    ) );
} );

// Create a filtered MCP server
add_action( 'mcp_adapter_init', function( McpAdapter $adapter ) {
    $adapter->create_server(
        'my-mcp-plugin-server',
        'my-mcp-plugin',
        'mcp',
        'My MCP Plugin Server',
        'Post management for AI agents',
        '1.0.0',
        array( HttpTransport::class ),
        ErrorLogMcpErrorHandler::class,
        array( 'my-mcp-plugin/list-posts' )
    );
} );
```
