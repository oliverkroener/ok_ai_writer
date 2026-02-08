# AI Writer for CKEditor (ok_ai_writer)

TYPO3 extension that adds CKEditor 5 toolbar buttons for AI text generation and Lorem Ipsum insertion. Connects to Azure OpenAI to generate website content directly from the rich text editor.

## Features

### AI Text Generator
- Adds a sparkle icon button to the CKEditor toolbar
- Opens a dialog with prompt input and text preview
- Generates HTML content via Azure OpenAI chat completions API
- Previews the generated text before inserting into the editor
- Persists Azure endpoint and API key in browser localStorage (per-user)
- Proxies API requests through the TYPO3 backend to avoid CORS issues
- Keyboard shortcut: **Ctrl+Enter** to generate, **Escape** to close

### Lorem Ipsum
- Adds a text icon button to the CKEditor toolbar
- Inserts 3 paragraphs of Lorem Ipsum placeholder text at the cursor position

## Requirements

- TYPO3 13.4 LTS
- `typo3/cms-rte-ckeditor` ^13.4
- An Azure OpenAI resource with a deployed model (for AI text generation)

## Installation

### Composer (recommended)

```bash
composer require oliverkroener/ok-ai-writer
```

### Local path repository

Add the package to your `repositories` and `require` sections in `composer.json`:

```json
{
    "repositories": [
        {
            "type": "path",
            "url": "packages/*"
        }
    ],
    "require": {
        "oliverkroener/ok-ai-writer": "@dev"
    }
}
```

Then run:

```bash
composer update
```

### Activate the extension

```bash
vendor/bin/typo3 extension:setup
vendor/bin/typo3 cache:flush
```

## Configuration

### Option A: Use the bundled RTE preset

The extension registers an RTE preset called `ok_ai_writer`. To use it directly, add to your page TSconfig:

```
RTE.default.preset = ok_ai_writer
```

> **Note:** This preset only loads the plugins. It does not include a toolbar definition, so the `aiText` and `loremIpsum` buttons must be added to the toolbar by another preset or via YAML imports.

### Option B: Import into your own RTE preset (recommended)

Import the AI Writer YAML into your custom RTE preset and add `aiText` and `loremIpsum` to your toolbar:

```yaml
# Your custom RTE preset (e.g. EXT:site_package/Configuration/RTE/MyPreset.yaml)
imports:
    - { resource: 'EXT:rte_ckeditor/Configuration/RTE/Default.yaml' }
    - { resource: 'EXT:ok_ai_writer/Configuration/RTE/AiWriter.yaml' }

editor:
  config:
    toolbar:
      items:
        - bold
        - italic
        # ... your other toolbar items ...
        - sourceEditing
        - loremIpsum
        - aiText
```

Register your preset in `ext_localconf.php`:

```php
$GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['my_preset'] = 'EXT:site_package/Configuration/RTE/MyPreset.yaml';
```

And activate it via page TSconfig:

```
RTE.default.preset = my_preset
```

## Usage

### AI Text Generator

1. Open any content element with a rich text field in the TYPO3 backend
2. Click the sparkle icon in the CKEditor toolbar
3. On first use, expand **Azure AI Settings** and enter:
   - **Endpoint URL** - Your Azure OpenAI deployment endpoint, e.g.:
     `https://your-resource.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-02-01`
   - **API Key** - Your Azure OpenAI API key
4. Type a prompt describing the content you want
5. Click **Generate** (or press **Ctrl+Enter**)
6. Review the generated text in the preview area
7. Click **Insert into Editor** to place the text at the cursor position

Endpoint and API key are saved in your browser's localStorage and persist across sessions.

### Lorem Ipsum

1. Place the cursor where you want the text inserted
2. Click the text lines icon in the CKEditor toolbar
3. Three paragraphs of Lorem Ipsum are inserted at the cursor position

## Azure OpenAI Setup

1. Create an Azure OpenAI resource in the [Azure Portal](https://portal.azure.com)
2. Deploy a model (e.g. `gpt-4`, `gpt-4o`, `gpt-35-turbo`)
3. Copy the **Endpoint** and **Key** from the resource's "Keys and Endpoint" page
4. The full endpoint URL format is:
   ```
   https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2024-02-01
   ```

## Architecture

```
Browser (CKEditor plugin)
    │
    │  POST /typo3/ajax/ok-ai-writer/generate
    │  Body: { endpoint, apikey, prompt }
    │
    ▼
TYPO3 Backend (AiTextController)
    │
    │  POST to Azure OpenAI endpoint
    │  Header: api-key
    │
    ▼
Azure OpenAI API
    │
    │  Returns chat completion (HTML paragraphs)
    │
    ▼
Response flows back to CKEditor
```

The TYPO3 backend acts as a proxy to avoid browser CORS restrictions when calling the Azure API.

## File Structure

```
packages/ok_ai_writer/
├── Classes/
│   └── Controller/
│       └── AiTextController.php          # AJAX proxy controller
├── Configuration/
│   ├── Backend/
│   │   └── AjaxRoutes.php               # Registers /ok-ai-writer/generate
│   ├── RTE/
│   │   └── AiWriter.yaml                # CKEditor plugin module imports
│   ├── JavaScriptModules.php             # JS import map registration
│   └── Services.yaml                     # DI autowiring
├── Resources/
│   └── Public/
│       └── JavaScript/
│           └── plugin/
│               ├── ai-text.js            # CKEditor 5 AI text plugin
│               └── lorem-ipsum.js        # CKEditor 5 Lorem Ipsum plugin
├── composer.json
├── ext_emconf.php
└── ext_localconf.php
```

## License

GPL-2.0-or-later
