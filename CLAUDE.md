# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TYPO3 13.4 LTS extension (`oliverkroener/ok-ai-writer`) that adds AI-powered text generation to CKEditor 5. Provides two toolbar buttons: **AI Text** (conversational HTML generation via Azure OpenAI or OpenAI) and **Lorem Ipsum** (placeholder text insertion). The TYPO3 backend acts as an API proxy to keep credentials server-side.

## Commands

```bash
# Documentation
make docs                # Generate RST docs via Docker (TYPO3 Sphinx theme)
make docs-watch          # Watch and regenerate on file changes

# After code changes affecting TYPO3 registration
ddev exec vendor/bin/typo3 cache:flush
ddev exec vendor/bin/typo3 database:updateschema
```

No build step for JavaScript — CKEditor plugins use native ES modules loaded via TYPO3's `JavaScriptModules.php` import map. No test suite exists.

## Architecture

### Request Flow

```
CKEditor Plugin (ai-text.js)
  │  POST /typo3/ajax/ok-ai-writer/generate
  │  Body: { messages: [{role, content}, ...] }
  ▼
AiTextController (AJAX route)
  │  Reads ext config (mode, apiUrl, apiKey, model)
  │  Prepends SEO system prompt
  │  In devMode: client values can override server config
  ├── mode=azure  → api-key header, no model in body
  └── mode=openai → Bearer token, model in body
  ▼
AI Provider API → JSON response → CKEditor
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| **AiTextController** | `Classes/Controller/AiTextController.php` | AJAX proxy to AI APIs. Validates messages, prepends system prompt, routes to Azure or OpenAI. 60s timeout, temp 0.7, max 2000 tokens. |
| **AddLanguageLabels** | `Classes/Middleware/AddLanguageLabels.php` | Backend middleware (before `output-compression`). Injects XLIFF labels into `window.TYPO3.lang` and blinded config into `window.TYPO3.settings.ok_ai_writer`. |
| **ai-text.js** | `Resources/Public/JavaScript/plugin/ai-text.js` | CKEditor 5 plugin. Chat-style dialog with conversation history, token tracking, settings panel (read-only in prod, editable in devMode). |
| **lorem-ipsum.js** | `Resources/Public/JavaScript/plugin/lorem-ipsum.js` | CKEditor 5 plugin. Inserts 3 hardcoded Lorem Ipsum paragraphs. |

### TYPO3 Registration Points

- **AJAX route**: `Configuration/Backend/AjaxRoutes.php` → `/ok-ai-writer/generate`
- **Middleware**: `Configuration/RequestMiddlewares.php` → backend stack
- **JS imports**: `Configuration/JavaScriptModules.php` → `@oliverkroener/ok-ai-writer/`
- **RTE preset**: `Configuration/RTE/AiWriter.yaml` (imported by consumer preset)
- **Preset registration**: `ext_localconf.php` → `$GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['ok_ai_writer']`
- **DI**: `Configuration/Services.yaml` → autowired `OliverKroener\OkAiWriter\` namespace

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

### Localization

XLIFF files in `Resources/Private/Language/`: `locallang.xlf` (English) and `de.locallang.xlf` (German). Labels are injected into `window.TYPO3.lang` by the middleware and consumed by `ai-text.js`.

## Integration Notes

To use the AI Writer toolbar buttons, a consumer RTE preset must:
1. Import `EXT:ok_ai_writer/Configuration/RTE/AiWriter.yaml`
2. Add `aiText` and/or `loremIpsum` to the toolbar items list
3. Activate the preset via page TSconfig: `RTE.default.preset = <preset_name>`
