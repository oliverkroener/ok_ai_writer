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
        Body: { messages[] }              (production mode)
        Body: { endpoint, apikey, mode,   (dev mode — optional overrides)
                model, messages[] }
        │
        ▼
    AiTextController
        │  generateAction() — text generation (max 2000 tokens)
        │  translateAction() — translation (max 4000 tokens)
        │  Reads extension configuration (mode, apiUrl, apiKey, model)
        │  In devMode: client values override server config
        │  Prepends system prompt (SEO writer or translator)
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
    │   └── AiTextController.php         AJAX endpoint — proxies to AI API (generate + translate)
    └── Middleware/
        └── AddLanguageLabels.php        Injects XLIFF labels + config into backend JS

    Configuration/
    ├── Backend/
    │   └── AjaxRoutes.php               Registers /ok-ai-writer/generate and /translate routes
    ├── Icons.php                        Extension icon registration (SvgIconProvider)
    ├── JavaScriptModules.php            ES module import map for CKEditor plugins
    ├── RequestMiddlewares.php           Registers AddLanguageLabels middleware
    ├── RTE/
    │   └── AiWriter.yaml               CKEditor preset importing all three plugins
    └── Services.yaml                    Symfony DI autowiring

    Resources/
    ├── Private/Language/
    │   ├── locallang.xlf                English labels
    │   └── de.locallang.xlf             German labels
    └── Public/
        ├── Icons/
        │   ├── Extension.svg            Extension icon (SVG)
        │   └── Extension.png            Extension icon (PNG fallback)
        └── JavaScript/plugin/
            ├── ai-text.js               CKEditor 5 AI Text plugin
            ├── ai-translate.js          CKEditor 5 AI Translate plugin
            └── lorem-ipsum.js           CKEditor 5 Lorem Ipsum plugin


Component details
=================


AiTextController
----------------

:File: :file:`Classes/Controller/AiTextController.php`
:Routes: ``/ok-ai-writer/generate`` and ``/ok-ai-writer/translate`` (AJAX, POST)

Receives the conversation messages (or content to translate) from the browser.
Reads API credentials from extension configuration (or from the request in
devMode). Prepends the appropriate system prompt, forwards to the configured
AI provider via Guzzle HTTP client, and returns the JSON response.

-  Reads ``devMode``, ``mode``, ``apiUrl``, ``apiKey``, ``model`` from
   extension configuration
-  In devMode: client-sent credentials override server config
-  Supports both Azure (``api-key`` header) and OpenAI (``Bearer`` token)
-  ``generateAction``: accepts ``messages[]`` (conversation) or ``prompt``
   (legacy), ``max_tokens: 2000``
-  ``translateAction``: accepts ``content`` (HTML) and ``language`` (target),
   ``max_tokens: 4000``
-  Uses ``temperature: 0.3`` for both actions
-  Timeout: 120 seconds
-  Returns API errors as HTTP 502 with the first 500 characters of the
   error response


AddLanguageLabels middleware
----------------------------

:File: :file:`Classes/Middleware/AddLanguageLabels.php`
:Stack: Backend middleware

Injects the extension's XLIFF translation labels into the TYPO3 backend
page renderer so they are available via ``TYPO3.lang`` in JavaScript.
Also injects extension configuration as inline settings
(``TYPO3.settings.ok_ai_writer``) with blinded credential values.


CKEditor plugins
-----------------

All three plugins are standard CKEditor 5 plugins registered via
:file:`Configuration/JavaScriptModules.php` and imported through the RTE
preset YAML.

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

The extension ships with two language files:

=================================================  ===========
File                                               Language
=================================================  ===========
``Resources/Private/Language/locallang.xlf``       English
``Resources/Private/Language/de.locallang.xlf``    German
=================================================  ===========

Labels are loaded into the backend via the ``AddLanguageLabels`` middleware
and accessed in JavaScript through ``TYPO3.lang['label.key']``.

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
