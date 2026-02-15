# AI Writer for CKEditor (ok_ai_writer)

[![TYPO3 12](https://img.shields.io/badge/TYPO3-12-orange?logo=typo3)](https://get.typo3.org/version/12)
[![TYPO3 13](https://img.shields.io/badge/TYPO3-13-orange?logo=typo3)](https://get.typo3.org/version/13)
[![TYPO3 14](https://img.shields.io/badge/TYPO3-14-orange?logo=typo3)](https://get.typo3.org/version/14)
[![PHP 8.1+](https://img.shields.io/badge/PHP-8.1%2B-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![CKEditor 5](https://img.shields.io/badge/CKEditor-5-0287D0?logo=ckeditor4&logoColor=white)](https://ckeditor.com/ckeditor-5/)
[![License: GPL v2+](https://img.shields.io/badge/License-GPL%20v2%2B-blue)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
[![Version](https://img.shields.io/badge/version-2.0.0-green)](https://github.com/oliverkroener/ok_ai_writer)

TYPO3 extension that adds CKEditor 5 toolbar buttons for AI text generation, AI translation, and Lorem Ipsum insertion. Supports both **Azure OpenAI** and **OpenAI (ChatGPT)** APIs with per-site configuration and encrypted credential storage.

## Features

### AI Text Generator
- Adds a sparkle icon button to the CKEditor toolbar
- Opens a chat-style dialog with prompt input and text preview
- Generates HTML content via Azure OpenAI or OpenAI (ChatGPT) chat completions API
- Supports iterative refinement through conversation history
- Previews the generated text before inserting into the editor
- Token usage tracking per session
- Keyboard shortcuts: **Enter** to generate, **Shift+Enter** for new line, **Escape** to close

### AI Translate
- Adds a globe icon button to the CKEditor toolbar
- Translates the entire editor content into a selected target language
- Supports 7 languages: Deutsch, English (US), English (UK), Espanol, Francais, Italiano, Turkce
- Preserves all HTML structure, tags, and attributes during translation
- Auto-replaces editor content on successful translation
- Shares credential configuration with the AI Text Generator

### Lorem Ipsum
- Adds a text icon button to the CKEditor toolbar
- Opens a dialog to select the number of paragraphs (1-20, default 3)
- Inserts Lorem Ipsum placeholder text at the cursor position

### Per-Site Configuration
- Dedicated **backend module** (Web > AI Writer) with page tree navigation for per-site credential management
- **Encrypted API key storage** — API keys are encrypted at rest using Sodium (derived from TYPO3's `encryptionKey`)
- **Global fallback** — sites without per-site config automatically use the global extension configuration
- **Site-aware middleware** — resolves the current site from page context to load the correct credentials

### Credential Handling
- **Production mode**: API credentials configured server-side, displayed blinded to editors
- **Developer mode**: Optional per-user credential overrides via browser localStorage

## Requirements

- TYPO3 12.4 LTS, 13.x, or 14.x
- PHP 8.1+
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
vendor/bin/typo3 database:updateschema
vendor/bin/typo3 cache:flush
```

The `database:updateschema` step creates the `tx_okaiwriter_configuration` table used for per-site credential storage.

## Configuration

### Global Extension Configuration

Open **Admin Tools > Settings > Extension Configuration > ok_ai_writer** to set the global defaults:

| Setting    | Type    | Default | Description |
|------------|---------|---------|-------------|
| `devMode`  | boolean | `false` | Allow editors to override credentials in localStorage |
| `mode`     | select  | `azure` | AI provider: `azure` or `openai` |
| `apiUrl`   | string  | —       | API endpoint URL |
| `apiKey`   | string  | —       | API key (displayed blinded to editors) |
| `model`    | string  | `gpt-4o`| Model name (OpenAI mode only, ignored for Azure) |

These values serve as the **global fallback** for sites without per-site configuration.

### Per-Site Configuration (Backend Module)

Navigate to **Web > AI Writer** in the TYPO3 backend and select a page from the page tree. The module resolves the site root and lets you configure credentials per site:

- **Developer Mode** — toggle per-user credential overrides
- **API Mode** — Azure OpenAI or OpenAI (ChatGPT)
- **API URL** — endpoint URL for the selected provider
- **API Key** — stored encrypted in the database (Sodium encryption derived from TYPO3's `encryptionKey`)
- **Model** — model name (OpenAI mode only)

If no per-site configuration is set, the global extension configuration is used as fallback. The module displays an info banner when the global fallback is active.

> **Note:** The backend module requires admin access and a configured TYPO3 site for the selected page.

### RTE Preset Setup

Import the AI Writer YAML into your custom RTE preset and add `aiText`, `aiTranslate`, and `loremIpsum` to your toolbar:

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
        - aiTranslate
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
Browser (CKEditor plugin)
    │
    │  POST /typo3/ajax/ok-ai-writer/generate   (AI Text)
    │  POST /typo3/ajax/ok-ai-writer/translate   (AI Translate)
    │  Body: { messages[], siteRootPageId }  (+ optional endpoint/apikey/mode/model in devMode)
    │
    ▼
TYPO3 Backend (AiTextController)
    │  Resolves credentials via ConfigurationService:
    │    1. Per-site DB config (tx_okaiwriter_configuration)
    │    2. Global extension config (fallback)
    │  In devMode: client values override server config
    │
    ├── mode=azure  → POST with api-key header
    └── mode=openai → POST with Bearer token + model in body
    │
    ▼
AI Provider API → Response flows back to CKEditor
```

### Configuration Resolution

```
ConfigurationService.getConfiguration(siteRootPageId)
    │
    ├── siteRootPageId > 0 → AiWriterConfigurationRepository
    │   │                      (tx_okaiwriter_configuration table)
    │   ├── per-site config found with apiUrl → use per-site config
    │   └── no per-site config → fall through to global
    │
    └── Global ExtensionConfiguration (ext_conf_template.txt)
```

## File Structure

```
packages/ok_ai_writer/
├── Classes/
│   ├── Controller/
│   │   ├── AiTextController.php                  # AJAX proxy controller (generate + translate)
│   │   └── Backend/
│   │       └── ConfigurationController.php       # Backend module controller (edit + save)
│   ├── Domain/
│   │   └── Repository/
│   │       └── AiWriterConfigurationRepository.php  # Per-site config DB layer
│   ├── Middleware/
│   │   └── AddLanguageLabels.php                 # Injects labels + site-aware config into backend JS
│   └── Service/
│       ├── ConfigurationService.php              # Config resolution (per-site → global fallback)
│       └── EncryptionService.php                 # Sodium encryption for API keys
├── Configuration/
│   ├── Backend/
│   │   ├── AjaxRoutes.php                        # Registers /ok-ai-writer/generate and /translate
│   │   └── Modules.php                           # Registers Web > AI Writer backend module
│   ├── Icons.php                                 # Extension icon registration
│   ├── JavaScriptModules.php                     # JS import map registration
│   ├── RequestMiddlewares.php                    # Registers AddLanguageLabels middleware
│   ├── RTE/
│   │   └── AiWriter.yaml                        # CKEditor plugin module imports
│   └── Services.yaml                             # DI autowiring
├── Resources/
│   ├── Private/
│   │   ├── Language/
│   │   │   ├── locallang.xlf                    # English labels (CKEditor plugins)
│   │   │   ├── de.locallang.xlf                 # German labels (CKEditor plugins)
│   │   │   ├── locallang_be_module.xlf          # English labels (backend module)
│   │   │   └── de.locallang_be_module.xlf       # German labels (backend module)
│   │   └── Templates/Backend/Configuration/
│   │       └── Edit.html                         # Fluid template for backend module form
│   └── Public/
│       ├── Icons/
│       │   └── Extension.svg                     # Extension icon
│       └── JavaScript/
│           ├── backend/
│           │   └── form-dirty-check.js           # Unsaved changes detection for backend module
│           └── plugin/
│               ├── ai-text.js                    # CKEditor 5 AI text plugin
│               ├── ai-translate.js               # CKEditor 5 AI translate plugin
│               └── lorem-ipsum.js                # CKEditor 5 Lorem Ipsum plugin
├── Documentation/                                # RST documentation
├── composer.json
├── ext_conf_template.txt                         # Global extension configuration
├── ext_emconf.php
├── ext_localconf.php
└── ext_tables.sql                                # Database schema (tx_okaiwriter_configuration)
```

## License

GPL-2.0-or-later

## Author

**Oliver Kroener** — [oliver-kroener.de](https://www.oliver-kroener.de) — [ok@oliver-kroener.de](mailto:ok@oliver-kroener.de)
