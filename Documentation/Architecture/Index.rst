..  include:: /Includes.rst.txt

..  _architecture:

============
Architecture
============

This section describes the internal architecture of the AI Writer extension
for developers who want to understand, extend, or debug the extension.


Request flow
============

..  code-block:: text

    Browser (CKEditor Plugin)
        │
        │  User triggers AI Text or AI Translate
        │
        ▼
    TYPO3 AJAX Routes
        POST /typo3/ajax/ok-ai-writer/generate    (AI Text)
        POST /typo3/ajax/ok-ai-writer/translate    (AI Translate)
        Body: { messages[], siteRootPageId }         (production mode)
        Body: { endpoint, apikey, mode,              (dev mode — optional overrides)
                model, messages[], siteRootPageId }
        │
        ▼
    AiTextController
        │  resolveCredentials() via ConfigurationService:
        │    1. Per-site DB config (tx_okaiwriter_configuration)
        │    2. Global extension config (fallback)
        │  In devMode: client values override resolved config
        │  Prepends system prompt (SEO writer or translator)
        │
        │  generateAction() — text generation (max 2000 tokens)
        │  translateAction() — translation (max 4000 tokens)
        │
        ├── mode=azure ──▶  Azure OpenAI API  (api-key header)
        │
        └── mode=openai ──▶  OpenAI API  (Bearer token + model in body)
        │
        │  Returns: choices[].message.content (HTML)
        │           usage.prompt_tokens / completion_tokens
        │
        ▼
    Response flows back to CKEditor
        │  AI Text: displayed in preview, added to conversation history
        │  AI Translate: replaces editor content directly
        ▼
    Editor clicks "Insert into Editor" (AI Text)
        Content inserted at cursor position

..  note::

    The TYPO3 backend acts as a **proxy** between the browser and the AI
    API. This avoids CORS restrictions. In production mode (``devMode``
    disabled), API credentials never leave the server.


Configuration resolution
========================

..  code-block:: text

    ConfigurationService.getConfiguration(siteRootPageId)
        │
        ├── siteRootPageId > 0
        │   └── AiWriterConfigurationRepository.findBySiteRootPageId()
        │       │  (tx_okaiwriter_configuration table)
        │       ├── row found with non-empty apiUrl → return per-site config
        │       └── no row or empty apiUrl → fall through
        │
        └── Global ExtensionConfiguration('ok_ai_writer')
            (ext_conf_template.txt values from settings.php)

The ``AddLanguageLabels`` middleware resolves the current site root page ID
from the request context (page module ``id`` parameter or form editing
``edit[table][uid]`` parameter) and passes it to the ``ConfigurationService``
to load the correct credentials for injection into the frontend JavaScript.


System prompts
==============

The controller prepends a system message (identical for both providers) that
instructs the AI. Each action uses a tailored prompt:

**AI Text generation:**

-  Generate well-structured, SEO-optimized HTML content
-  Use semantic headings (``<h2>``, ``<h3>``, ``<h4>``) and paragraphs
-  **Not** include ``<h1>`` tags (the page already has one)
-  **Not** include markdown formatting, code fences, or explanations
-  Return only clean HTML

**AI Translation:**

-  Translate the provided HTML content to the requested language
-  Preserve all HTML tags, structure, attributes, and formatting exactly
-  Only translate the visible text content
-  Return only the translated HTML

..  important::

    The system prompts are defined in
    :php:`AiTextController::generateAction()` and
    :php:`AiTextController::translateAction()`. If you need to customize
    the AI's behavior, modify the ``$systemMessage`` array in those methods.


Provider modes
==============

The controller supports two AI providers, selected via the ``mode``
extension configuration:

**Azure OpenAI** (``mode = azure``)
   Authenticates via ``api-key`` HTTP header. The model is determined by
   the deployment name in the endpoint URL. No ``model`` parameter is sent
   in the request body.

**OpenAI / ChatGPT** (``mode = openai``)
   Authenticates via ``Authorization: Bearer <key>`` header. The ``model``
   parameter (e.g. ``gpt-4o``) is included in the JSON request body.


Conversation mode
=================

The plugin supports two message modes:

**Conversation mode** (default)
   The browser sends the full ``messages[]`` array (user + assistant turns).
   The controller prepends the system prompt and forwards the entire history
   to the AI API. This enables iterative refinement.

**Legacy single-prompt mode**
   If no ``messages[]`` array is sent, the controller falls back to using
   a single ``prompt`` string. This mode exists for backwards compatibility.


Key files
=========

..  code-block:: text

    Classes/
    ├── Controller/
    │   ├── AiTextController.php                  AJAX endpoint — proxies to AI API (generate + translate)
    │   └── Backend/
    │       └── ConfigurationController.php       Backend module — per-site config management
    ├── Domain/
    │   └── Repository/
    │       └── AiWriterConfigurationRepository.php  Per-site config DB layer (encrypted API keys)
    ├── Middleware/
    │   └── AddLanguageLabels.php                 Injects XLIFF labels + site-aware config into backend JS
    └── Service/
        ├── ConfigurationService.php              Config resolution (per-site → global fallback)
        └── EncryptionService.php                 Sodium encryption for API keys

    Configuration/
    ├── Backend/
    │   ├── AjaxRoutes.php                        Registers /ok-ai-writer/generate and /translate routes
    │   └── Modules.php                           Registers Web > AI Writer backend module
    ├── Icons.php                                 Extension icon registration (SvgIconProvider)
    ├── JavaScriptModules.php                     ES module import map for CKEditor plugins
    ├── RequestMiddlewares.php                    Registers AddLanguageLabels middleware
    ├── RTE/
    │   └── AiWriter.yaml                        CKEditor preset importing all three plugins
    └── Services.yaml                             Symfony DI autowiring

    Resources/
    ├── Private/
    │   ├── Language/
    │   │   ├── locallang.xlf                    English labels (CKEditor plugins)
    │   │   ├── de.locallang.xlf                 German labels (CKEditor plugins)
    │   │   ├── locallang_be_module.xlf          English labels (backend module)
    │   │   └── de.locallang_be_module.xlf       German labels (backend module)
    │   └── Templates/Backend/Configuration/
    │       └── Edit.html                         Fluid template for backend module form
    └── Public/
        ├── Icons/
        │   └── Extension.svg                    Extension icon
        └── JavaScript/
            ├── backend/
            │   └── form-dirty-check.js          Unsaved changes detection for backend module
            └── plugin/
                ├── ai-text.js                   CKEditor 5 AI Text plugin
                ├── ai-translate.js              CKEditor 5 AI Translate plugin
                └── lorem-ipsum.js               CKEditor 5 Lorem Ipsum plugin


Component details
=================


AiTextController
----------------

:File: :file:`Classes/Controller/AiTextController.php`
:Routes: ``/ok-ai-writer/generate`` and ``/ok-ai-writer/translate`` (AJAX, POST)

Receives the conversation messages (or content to translate) from the browser.
Resolves API credentials via ``ConfigurationService`` using the
``siteRootPageId`` from the request body. Prepends the appropriate system
prompt, forwards to the configured AI provider via Guzzle HTTP client, and
returns the JSON response.

-  Resolves credentials via ``ConfigurationService.getConfiguration()``
   (per-site → global fallback)
-  In devMode: client-sent credentials override resolved config
-  Supports both Azure (``api-key`` header) and OpenAI (``Bearer`` token)
-  ``generateAction``: accepts ``messages[]`` (conversation) or ``prompt``
   (legacy), ``max_tokens: 2000``
-  ``translateAction``: accepts ``content`` (HTML) and ``language`` (target),
   ``max_tokens: 4000``
-  Uses ``temperature: 0.3`` for both actions
-  Timeout: 120 seconds
-  Returns API errors as HTTP 502 with the first 500 characters of the
   error response


ConfigurationController (backend module)
-----------------------------------------

:File: :file:`Classes/Controller/Backend/ConfigurationController.php`
:Module: ``web_okaiwriter`` (Web > AI Writer)
:Access: Admin only

Provides the per-site configuration management UI. Resolves the site root
from the selected page, loads existing per-site configuration (if any), and
renders a Fluid form for editing. On save, upserts the configuration record
in the ``tx_okaiwriter_configuration`` table.

-  ``editAction``: renders the configuration form with current values
-  ``saveAction``: validates and saves per-site config, redirects back to edit
-  Uses page tree navigation component for page selection
-  Shows global fallback status when no per-site config exists
-  Warns when TYPO3 encryption key is missing


ConfigurationService
--------------------

:File: :file:`Classes/Service/ConfigurationService.php`

Resolves the effective AI Writer configuration by checking per-site DB
config first, then falling back to global extension configuration.


EncryptionService
-----------------

:File: :file:`Classes/Service/EncryptionService.php`

Encrypts and decrypts API keys using Sodium (``sodium_crypto_secretbox``).
Derives the encryption key from TYPO3's ``encryptionKey`` via
``sodium_crypto_generichash``.


AiWriterConfigurationRepository
--------------------------------

:File: :file:`Classes/Domain/Repository/AiWriterConfigurationRepository.php`
:Table: ``tx_okaiwriter_configuration``

Database layer for per-site configuration. Supports find-by-site-root and
upsert operations. API keys are encrypted before storage and decrypted on
retrieval via ``EncryptionService``.


AddLanguageLabels middleware
----------------------------

:File: :file:`Classes/Middleware/AddLanguageLabels.php`
:Stack: Backend middleware

Injects the extension's XLIFF translation labels into the TYPO3 backend
page renderer so they are available via ``TYPO3.lang`` in JavaScript.
Also injects site-aware extension configuration as inline settings
(``TYPO3.settings.ok_ai_writer``) with blinded credential values.

Resolves the current site root page ID from the request context by checking
the page module ``id`` parameter or form editing ``edit[table][uid]``
parameter, then looks up the ``pid`` for non-page records.


CKEditor plugins
-----------------

All three plugins are standard CKEditor 5 plugins registered via
:file:`Configuration/JavaScriptModules.php` and imported through the RTE
preset YAML.

All three plugins detect the TYPO3 backend's dark mode setting via
the ``data-color-scheme`` attribute on ``<html>`` (``dark``, ``light``, or
``auto``). For the ``auto`` value, they fall back to the browser's
``prefers-color-scheme`` media query. A shared ``getTheme()`` function
returns the full color palette (backgrounds, text, borders, inputs, buttons,
status indicators) used to style each dialog.

**ai-text.js**
   Registers the ``aiText`` toolbar button. On click, creates a maximizable
   modal dialog with a chat-style interface. Handles conversation state, API
   calls via ``fetch()``, token tracking, and content insertion into the editor.

**ai-translate.js**
   Registers the ``aiTranslate`` toolbar button. On click, opens a compact
   dialog with a language selection grid (7 languages). Translates the full
   editor content via the ``/ok-ai-writer/translate`` route and replaces the
   editor content on success.

**lorem-ipsum.js**
   Registers the ``loremIpsum`` toolbar button. On click, opens a dialog
   where the editor selects the number of paragraphs (1–20) to insert at the
   cursor position.


Localization
============

The extension ships with two sets of language files:

**CKEditor plugin labels:**

=================================================  ===========
File                                               Language
=================================================  ===========
``Resources/Private/Language/locallang.xlf``       English
``Resources/Private/Language/de.locallang.xlf``    German
=================================================  ===========

**Backend module labels:**

==========================================================  ===========
File                                                        Language
==========================================================  ===========
``Resources/Private/Language/locallang_be_module.xlf``      English
``Resources/Private/Language/de.locallang_be_module.xlf``   German
==========================================================  ===========

CKEditor plugin labels are loaded into the backend via the
``AddLanguageLabels`` middleware and accessed in JavaScript through
``TYPO3.lang['label.key']``.

To add a new translation, create a file named
``<language-code>.locallang.xlf`` (e.g. ``fr.locallang.xlf``) following
the XLIFF 1.2 format.


License
=======

This extension is licensed under the
`GNU General Public License v2.0 or later <https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html>`__.

:Author: Oliver Kroener
:Email: ok@oliver-kroener.de
:Website: `oliver-kroener.de <https://www.oliver-kroener.de>`__
