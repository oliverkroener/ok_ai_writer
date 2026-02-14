# AI Writer for CKEditor (ok_ai_writer)

[![TYPO3 10](https://img.shields.io/badge/TYPO3-10-orange?logo=typo3)](https://get.typo3.org/version/10)
[![TYPO3 11](https://img.shields.io/badge/TYPO3-11-orange?logo=typo3)](https://get.typo3.org/version/11)
[![PHP 7.4+](https://img.shields.io/badge/PHP-7.4%2B-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![CKEditor 4](https://img.shields.io/badge/CKEditor-4-0287D0?logo=ckeditor4&logoColor=white)](https://ckeditor.com/ckeditor-4/)
[![License: GPL v2+](https://img.shields.io/badge/License-GPL%20v2%2B-blue)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://github.com/oliverkroener/ok-ai-writer)

TYPO3 extension that adds CKEditor 4 toolbar buttons for AI text generation, translation, and Lorem Ipsum insertion. Supports both **Azure OpenAI** and **OpenAI (ChatGPT)** APIs.

## Features

### AI Text Generator
- Adds a sparkle icon button to the CKEditor toolbar
- Opens a chat-style dialog with prompt input and text preview
- Generates HTML content via Azure OpenAI or OpenAI (ChatGPT) chat completions API
- Supports iterative refinement through conversation history
- Previews the generated text before inserting into the editor
- **Centralized credentials**: Admin configures API credentials server-side (displayed blinded to editors)
- **Developer mode**: Optional per-user credentials via browser localStorage
- Token usage tracking per session
- Keyboard shortcut: **Enter** to generate, **Shift+Enter** for new line, **Escape** to close

### AI Translate
- Adds a globe icon button to the CKEditor toolbar
- Opens a language selector dialog to translate the full editor content
- Preserves all HTML tags and formatting during translation

### Lorem Ipsum
- Adds a text icon button to the CKEditor toolbar
- Opens a dialog to choose the number of paragraphs (1-20)
- Inserts Lorem Ipsum placeholder text at the cursor position

## Requirements

- TYPO3 10.4 LTS or 11.5 LTS
- PHP 7.4+
- `typo3/cms-rte-ckeditor`
- An Azure OpenAI resource **or** an OpenAI API key

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
composer update oliverkroener/ok-ai-writer
```

### Activate the extension

```bash
vendor/bin/typo3 extension:setup
vendor/bin/typo3 cache:flush
```

## Configuration

### Extension Configuration

Open **Admin Tools > Settings > Extension Configuration > ok_ai_writer**:

| Setting    | Type    | Default | Description |
|------------|---------|---------|-------------|
| `devMode`  | boolean | `false` | Allow editors to override credentials in localStorage |
| `mode`     | select  | `azure` | AI provider: `azure` or `openai` |
| `apiUrl`   | string  | —       | API endpoint URL |
| `apiKey`   | string  | —       | API key (displayed blinded to editors) |
| `model`    | string  | `gpt-4o`| Model name (OpenAI mode only, ignored for Azure) |

### RTE Preset Setup

Import the AI Writer YAML into your custom RTE preset and add `AiText`, `AiTranslate`, and `LoremIpsum` to your toolbar:

```yaml
# Your custom RTE preset (e.g. EXT:site_package/Configuration/RTE/MyPreset.yaml)
imports:
    - { resource: 'EXT:rte_ckeditor/Configuration/RTE/Default.yaml' }
    - { resource: 'EXT:ok_ai_writer/Configuration/RTE/Default.yaml' }

editor:
  config:
    toolbarGroups:
      - { name: 'ai', groups: ['ai'] }
    toolbar:
      - AiText
      - AiTranslate
      - LoremIpsum
```

Register your preset in `ext_localconf.php`:

```php
$GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['my_preset'] = 'EXT:site_package/Configuration/RTE/MyPreset.yaml';
```

And activate it via page TSconfig:

```
RTE.default.preset = my_preset
```

## Provider Setup

### Azure OpenAI

1. Create an Azure OpenAI resource in the [Azure Portal](https://portal.azure.com)
2. Deploy a model (e.g. `gpt-4`, `gpt-4o`, `gpt-35-turbo`)
3. Set `mode = azure`, `apiUrl` to your deployment endpoint, `apiKey` to your Azure key
4. Endpoint URL format:
   ```
   https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2024-02-01
   ```

### OpenAI (ChatGPT)

1. Create an API key at [platform.openai.com](https://platform.openai.com)
2. Set `mode = openai`, `apiUrl = https://api.openai.com/v1/chat/completions`, `apiKey` to your `sk-...` key
3. Set `model` to the desired model (e.g. `gpt-4o`, `gpt-4`, `gpt-3.5-turbo`)

## Architecture

```
Browser (CKEditor 4 plugin)
    |
    |  POST /typo3/ajax/ok-ai-writer/generate
    |  Body: { messages[] }  (+ optional endpoint/apikey/mode/model in devMode)
    |
    v
TYPO3 Backend (AiTextController)
    |  Reads extension config (mode, apiUrl, apiKey, model)
    |  In devMode: client values override server config
    |
    |-- mode=azure  -> POST with api-key header
    +-- mode=openai -> POST with Bearer token + model in body
    |
    v
AI Provider API -> Response flows back to CKEditor
```

## File Structure

```
packages/ok_ai_writer/
├── Classes/
│   ├── Controller/
│   │   └── AiTextController.php          # AJAX proxy controller
│   └── Middleware/
│       └── AddLanguageLabels.php         # Injects labels + config into backend JS
├── Configuration/
│   ├── Backend/
│   │   └── AjaxRoutes.php               # Registers /ok-ai-writer/generate + /translate
│   ├── RTE/
│   │   └── Default.yaml                 # CKEditor 4 external plugin registration
│   ├── RequestMiddlewares.php            # Registers AddLanguageLabels middleware
│   └── Services.yaml                     # DI autowiring
├── Resources/
│   ├── Private/Language/
│   │   ├── locallang.xlf                # English labels
│   │   └── de.locallang.xlf             # German labels
│   └── Public/CKEditor/Plugins/
│       ├── AiText/plugin.js             # CKEditor 4 AI text plugin
│       ├── AiTranslate/plugin.js        # CKEditor 4 AI translate plugin
│       └── LoremIpsum/plugin.js         # CKEditor 4 Lorem Ipsum plugin
├── composer.json
├── ext_conf_template.txt                 # Extension configuration (devMode, mode, apiUrl, apiKey, model)
├── ext_emconf.php
└── ext_localconf.php
```

## License

GPL-2.0-or-later

## Author

**Oliver Kroener** — [oliver-kroener.de](https://www.oliver-kroener.de) — [ok@oliver-kroener.de](mailto:ok@oliver-kroener.de)
