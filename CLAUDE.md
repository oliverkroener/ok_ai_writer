# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TYPO3 extension (`oliverkroener/ok-ai-writer`) compatible with TYPO3 10.4 and 11.5 that adds AI-powered text generation to CKEditor 4. Provides toolbar buttons: **AI Text** (conversational HTML generation via Azure OpenAI or OpenAI), **AI Translate**, and **Lorem Ipsum** (placeholder text insertion). The TYPO3 backend acts as an API proxy to keep credentials server-side.

## Commands

```bash
# Documentation
make docs                # Generate RST docs via Docker (TYPO3 Sphinx theme)
make docs-watch          # Watch and regenerate on file changes

# After code changes affecting TYPO3 registration
ddev exec vendor/bin/typo3 cache:flush
ddev exec vendor/bin/typo3 database:updateschema
```

No build step for JavaScript — CKEditor 4 plugins are self-contained IIFEs loaded via TYPO3's `externalPlugins` RTE YAML configuration. No test suite exists.

## Architecture

### Request Flow

```
CKEditor Plugin (AiText/plugin.js)
  |  POST /typo3/ajax/ok-ai-writer/generate
  |  Body: { messages: [{role, content}, ...] }
  v
AiTextController (AJAX route)
  |  Reads ext config (mode, apiUrl, apiKey, model)
  |  Prepends SEO system prompt
  |  In devMode: client values can override server config
  |-- mode=azure  -> api-key header, no model in body
  +-- mode=openai -> Bearer token, model in body
  v
AI Provider API -> JSON response -> CKEditor
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| **AiTextController** | `Classes/Controller/AiTextController.php` | AJAX proxy to AI APIs. Validates messages, prepends system prompt, routes to Azure or OpenAI. 120s timeout, temp 0.3, max 2000 tokens (4000 for translate). |
| **AddLanguageLabels** | `Classes/Middleware/AddLanguageLabels.php` | Backend middleware. Injects XLIFF labels into `window.TYPO3.lang` and blinded config into `window.TYPO3.settings.ok_ai_writer`. |
| **AiText plugin.js** | `Resources/Public/CKEditor/Plugins/AiText/plugin.js` | CKEditor 4 plugin. Chat-style dialog with conversation history, token tracking, settings panel (read-only in prod, editable in devMode). |
| **AiTranslate plugin.js** | `Resources/Public/CKEditor/Plugins/AiTranslate/plugin.js` | CKEditor 4 plugin. Language selector dialog, translates full editor content. |
| **LoremIpsum plugin.js** | `Resources/Public/CKEditor/Plugins/LoremIpsum/plugin.js` | CKEditor 4 plugin. Paragraph count dialog, inserts lorem ipsum text. |

### TYPO3 Registration Points

- **AJAX route**: `Configuration/Backend/AjaxRoutes.php` -> `/ok-ai-writer/generate` and `/ok-ai-writer/translate`
- **Middleware**: `Configuration/RequestMiddlewares.php` -> backend stack
- **CKEditor plugins**: `Configuration/RTE/Default.yaml` -> `externalPlugins` (CKEditor 4)
- **RTE preset**: `ext_localconf.php` -> `$GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['ok_ai_writer']`
- **DI**: `Configuration/Services.yaml` -> autowired `OliverKroener\OkAiWriter\` namespace

### Extension Configuration

Configured via **Admin Tools > Settings > Extension Configuration > ok_ai_writer** (defined in `ext_conf_template.txt`):

| Setting | Default | Notes |
|---------|---------|-------|
| `devMode` | `false` | Allows editors to override credentials via localStorage |
| `mode` | `azure` | Provider: `azure` or `openai` |
| `apiUrl` | — | Full endpoint URL (Azure includes deployment name) |
| `apiKey` | — | Blinded in frontend (first 4 + last 4 chars shown) |
| `model` | `gpt-4o` | OpenAI mode only; Azure determines model via URL |

### Credential Handling

- **Production mode**: Server-side config only. Middleware blinds credentials before exposing to JS (values >8 chars show first 4 + asterisks + last 4).
- **Developer mode**: Client-sent credentials in request body override server config. Settings stored in `localStorage` keys: `typo3_ai_text_endpoint`, `typo3_ai_text_apikey`, `typo3_ai_text_mode`, `typo3_ai_text_model`.

### CKEditor 4 Plugin Pattern

Each plugin is a self-contained IIFE using `CKEDITOR.plugins.add()`:
- Registered via `externalPlugins` in `Default.yaml`
- Uses `editor.addCommand()` + `editor.ui.addButton()` for toolbar integration
- Uses `editor.insertHtml()` to insert content
- Uses `editor.getSelection().createBookmarks2()` to save/restore cursor position
- Icons are inline SVG data URIs (no separate image files)
- XHR used for AJAX calls (no ES module imports, no fetch/async/await for broader compatibility)
- Labels accessed via `window.TYPO3.lang` (injected by middleware)

### Localization

XLIFF files in `Resources/Private/Language/`: `locallang.xlf` (English) and `de.locallang.xlf` (German). Labels are injected into `window.TYPO3.lang` by the middleware and consumed by the CKEditor 4 plugins.

## Integration Notes

To use the AI Writer toolbar buttons, a consumer RTE preset must:
1. Import `EXT:ok_ai_writer/Configuration/RTE/Default.yaml`
2. Add `AiText`, `AiTranslate`, and/or `LoremIpsum` to the toolbar items list
3. Activate the preset via page TSconfig: `RTE.default.preset = <preset_name>`
