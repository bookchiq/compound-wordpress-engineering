# AI Client SDK Reference

The WordPress AI Client SDK provides provider-agnostic AI generation capabilities. It has two layers: a platform-agnostic PHP package (`wordpress/php-ai-client`) and a WordPress wrapper (`WP_AI_Client_Prompt_Builder`) that adds `WP_Error` handling and snake_case methods.

## Architecture

```
WP_AI_Client_Prompt_Builder  (WordPress core, since 7.0.0)
    │   - snake_case methods
    │   - WP_Error instead of exceptions
    │   - Abilities API integration via using_abilities()
    ▼
PromptBuilder  (wordpress/php-ai-client)
    │   - camelCase methods
    │   - Provider registry
    │   - Model preference resolution
    ▼
AI Providers  (OpenAI, Anthropic, Google, etc.)
```

## Installation

The PHP AI Client SDK is a Composer package:

```bash
composer require wordpress/wp-ai-client
```

The `WP_AI_Client_Prompt_Builder` class is included in WordPress core since 7.0.0 and wraps the SDK with WordPress conventions.

## WordPress API — WP_AI_Client_Prompt_Builder

This is the primary class to use in WordPress plugins. Located in `wp-includes/ai-client/class-wp-ai-client-prompt-builder.php`.

### Creating a prompt builder

```php
use WordPress\AiClient\Providers\ProviderRegistry;

$registry = new ProviderRegistry();
$builder  = new WP_AI_Client_Prompt_Builder( $registry, 'Initial prompt text' );
```

The constructor accepts an optional second argument for the initial prompt — a string, `MessagePart`, `Message`, array, or list of parts/messages for multi-turn conversations.

### Fluent interface

All builder methods return `$this` for chaining. Errors are deferred — if any method in the chain throws internally, the builder enters an error state and subsequent calls become no-ops. The `WP_Error` is only returned when a generating method is called.

### Content methods

```php
$builder
    ->with_text( string $text )                              // Add text to current message
    ->with_file( $file, ?string $mimeType = null )           // Add a file
    ->with_function_response( FunctionResponse $resp )       // Add function call response
    ->with_message_parts( MessagePart ...$parts )            // Add message parts
    ->with_history( Message ...$messages );                  // Add conversation history
```

### Configuration methods

```php
$builder
    ->using_model( ModelInterface $model )                   // Set specific model
    ->using_model_preference( ...$preferredModels )          // Set preferred models (evaluated in order)
    ->using_model_config( ModelConfig $config )              // Set model configuration
    ->using_provider( string $providerIdOrClassName )        // Set provider
    ->using_system_instruction( string $instruction )        // Set system prompt
    ->using_max_tokens( int $maxTokens )                     // Max tokens to generate
    ->using_temperature( float $temperature )                // Temperature (0.0–2.0)
    ->using_top_p( float $topP )                             // Top-p sampling
    ->using_top_k( int $topK )                               // Top-k sampling
    ->using_stop_sequences( string ...$sequences )           // Stop sequences
    ->using_candidate_count( int $count )                    // Number of candidates
    ->using_function_declarations( FunctionDeclaration ...$decls )  // Function calling
    ->using_presence_penalty( float $penalty )               // Presence penalty
    ->using_frequency_penalty( float $penalty )              // Frequency penalty
    ->using_web_search( WebSearch $search )                  // Web search config
    ->using_request_options( RequestOptions $options )        // HTTP request options
    ->using_top_logprobs( ?int $topLogprobs = null );        // Log probabilities
```

### Output format methods

```php
$builder
    ->as_output_mime_type( string $mimeType )                // Set output MIME type
    ->as_output_schema( array $schema )                      // Set output JSON schema
    ->as_output_modalities( ModalityEnum ...$modalities )    // Set output modalities
    ->as_output_file_type( FileTypeEnum $fileType )          // Set output file type
    ->as_json_response( ?array $schema = null );             // JSON response mode
```

### Abilities integration

```php
$builder->using_abilities( WP_Ability|string ...$abilities );
```

Converts WordPress abilities into `FunctionDeclaration` objects using the `wpab__` prefix convention. The AI model can then call these abilities as functions.

### Generation methods (terminal — return result or WP_Error)

```php
// Text
$text   = $builder->generate_text();                // string|WP_Error
$texts  = $builder->generate_texts( ?int $count );  // list<string>|WP_Error

// Image
$image  = $builder->generate_image();               // File|WP_Error
$images = $builder->generate_images( ?int $count );  // list<File>|WP_Error

// Speech
$speech = $builder->generate_speech();               // File|WP_Error
$tts    = $builder->convert_text_to_speech();        // File|WP_Error

// Generic result (contains full response metadata)
$result = $builder->generate_result( ?CapabilityEnum $cap );       // GenerativeAiResult|WP_Error
$result = $builder->generate_text_result();                        // GenerativeAiResult|WP_Error
$result = $builder->generate_image_result();                       // GenerativeAiResult|WP_Error
$result = $builder->generate_speech_result();                      // GenerativeAiResult|WP_Error
$result = $builder->convert_text_to_speech_result();               // GenerativeAiResult|WP_Error
```

### Feature detection (terminal — return bool or WP_Error)

```php
$builder->is_supported( ?CapabilityEnum $cap );                    // bool|WP_Error
$builder->is_supported_for_text_generation();                      // bool
$builder->is_supported_for_image_generation();                     // bool
$builder->is_supported_for_text_to_speech_conversion();            // bool
$builder->is_supported_for_video_generation();                     // bool
$builder->is_supported_for_speech_generation();                    // bool
$builder->is_supported_for_music_generation();                     // bool
$builder->is_supported_for_embedding_generation();                 // bool
```

## Filters

```php
// Adjust default HTTP timeout for AI requests (default: 30 seconds)
add_filter( 'wp_ai_client_default_request_timeout', function( int $timeout ): int {
    return 60; // seconds
} );
```

## Ability Function Resolver

`WP_AI_Client_Ability_Function_Resolver` bridges AI model function calls back to WordPress abilities. Used when the AI model returns function call requests (tool use).

```php
use WP_AI_Client_Ability_Function_Resolver;

// Check if a function call is an ability call
WP_AI_Client_Ability_Function_Resolver::is_ability_call( $functionCall );  // bool

// Execute a single ability from a function call
$response = WP_AI_Client_Ability_Function_Resolver::execute_ability( $functionCall );

// Check if a message contains ability calls
WP_AI_Client_Ability_Function_Resolver::has_ability_calls( $message );  // bool

// Execute all ability calls in a message
$responseMessage = WP_AI_Client_Ability_Function_Resolver::execute_abilities( $message );

// Name conversion
WP_AI_Client_Ability_Function_Resolver::ability_name_to_function_name( 'my-plugin/get-posts' );
// Returns: 'wpab__my-plugin__get-posts'

WP_AI_Client_Ability_Function_Resolver::function_name_to_ability_name( 'wpab__my-plugin__get-posts' );
// Returns: 'my-plugin/get-posts'
```

## Usage Examples

### Simple text generation

```php
$builder = new WP_AI_Client_Prompt_Builder( $registry );
$summary = $builder
    ->with_text( 'Summarize this article: ' . $content )
    ->using_temperature( 0.3 )
    ->using_max_tokens( 200 )
    ->generate_text();

if ( is_wp_error( $summary ) ) {
    error_log( 'AI generation failed: ' . $summary->get_error_message() );
    return $summary;
}
echo esc_html( $summary );
```

### JSON structured output

```php
$result = $builder
    ->with_text( 'Extract entities from: ' . $text )
    ->as_json_response( array(
        'type'       => 'object',
        'properties' => array(
            'people'  => array( 'type' => 'array', 'items' => array( 'type' => 'string' ) ),
            'places'  => array( 'type' => 'array', 'items' => array( 'type' => 'string' ) ),
        ),
    ) )
    ->generate_text();

if ( ! is_wp_error( $result ) ) {
    $entities = json_decode( $result, true );
}
```

### Image generation

```php
$image = $builder
    ->with_text( 'A serene mountain landscape at sunset' )
    ->generate_image();

if ( ! is_wp_error( $image ) ) {
    // $image is a File DTO with content and MIME type
    $upload = wp_upload_bits( 'landscape.png', null, $image->getContent() );
}
```

### With abilities (agentic loop)

```php
$builder = new WP_AI_Client_Prompt_Builder( $registry );
$result  = $builder
    ->with_text( 'Create a draft post about WordPress 7.0 features' )
    ->using_abilities( 'site-tools/create-draft', 'site-tools/get-stats' )
    ->using_system_instruction( 'You are a WordPress content assistant.' )
    ->generate_result();

if ( ! is_wp_error( $result ) ) {
    // Check for function calls in the response
    foreach ( $result->getMessages() as $message ) {
        if ( WP_AI_Client_Ability_Function_Resolver::has_ability_calls( $message ) ) {
            $response = WP_AI_Client_Ability_Function_Resolver::execute_abilities( $message );
            // Continue conversation with function responses...
        }
    }
}
```

### Feature detection before generation

```php
$builder = new WP_AI_Client_Prompt_Builder( $registry );
$builder->with_text( 'Generate an image of a cat' );

if ( $builder->is_supported_for_image_generation() ) {
    $image = $builder->generate_image();
} else {
    // Fall back to text description
    $builder2 = new WP_AI_Client_Prompt_Builder( $registry );
    $text = $builder2
        ->with_text( 'Describe a cat in detail' )
        ->generate_text();
}
```

## Security

### Capabilities

The AI Client SDK respects WordPress capabilities. The `prompt_ai` capability controls who can use AI features.

### Output sanitization

AI-generated content is untrusted input. Always sanitize before display or storage:

```php
$text = $builder->generate_text();
if ( ! is_wp_error( $text ) ) {
    // For display in HTML
    echo esc_html( $text );

    // For storing as post content
    $sanitized = wp_kses_post( $text );

    // For use in attributes
    echo esc_attr( $text );
}
```

## Common Mistakes

### Hardcoding a provider

```php
// WRONG — breaks when provider isn't configured
$builder->using_provider( 'openai' );

// BETTER — use model preferences, let the registry find a suitable provider
$builder->using_model_preference( $preferred_model_1, $preferred_model_2 );
```

### No error handling

```php
// WRONG — generate_text() may return WP_Error
$text = $builder->generate_text();
echo $text;

// CORRECT
$text = $builder->generate_text();
if ( is_wp_error( $text ) ) {
    // Handle gracefully
    return;
}
echo esc_html( $text );
```

### Displaying unsanitized AI output

```php
// WRONG — AI output is untrusted
echo $builder->generate_text();

// CORRECT
$text = $builder->generate_text();
if ( ! is_wp_error( $text ) ) {
    echo esc_html( $text );
}
```

### Not checking feature support

```php
// WRONG — may fail if provider doesn't support images
$image = $builder->generate_image();

// CORRECT — check first
if ( $builder->is_supported_for_image_generation() ) {
    $image = $builder->generate_image();
}
```

### Ignoring the error state chain

The builder accumulates errors silently through the chain. If `using_model()` fails, every subsequent call is a no-op. The error only surfaces when a generating method is called:

```php
$result = $builder
    ->using_model( $invalid_model )  // This fails silently
    ->with_text( 'Hello' )            // No-op — builder is in error state
    ->generate_text();                // Returns WP_Error from the model failure

// Always check the final result
if ( is_wp_error( $result ) ) {
    // May be from ANY method in the chain
}
```
