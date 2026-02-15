..  include:: /Includes.rst.txt

..  _configuration:

=============
Configuration
=============

The extension supports two AI providers — **Azure OpenAI** and
**OpenAI (ChatGPT)** — and offers two levels of configuration: a **global**
extension configuration (fallback) and a **per-site** configuration via a
dedicated backend module.


Global extension configuration
==============================

Open **Admin Tools > Settings > Extension Configuration > ok_ai_writer**
to set the global defaults:

.. confval:: devMode

   :type: boolean
   :Default: false

   When enabled, editors can override API credentials in their browser
   (``localStorage``). When disabled, only the server-side credentials
   configured below are used.

.. confval:: mode

   :type: select
   :Default: azure

   The AI provider to use.

   ``azure``
      Azure OpenAI — uses the ``api-key`` header for authentication.

   ``openai``
      OpenAI (ChatGPT) — uses ``Authorization: Bearer`` header and sends
      the ``model`` parameter in the request body.

.. confval:: apiUrl

   :type: string
   :Default: *(empty)*

   The API endpoint URL.

   **Azure** example::

      https://<resource>.openai.azure.com/openai/deployments/<model>/chat/completions?api-version=2024-02-01

   **OpenAI** example::

      https://api.openai.com/v1/chat/completions

.. confval:: apiKey

   :type: string
   :Default: *(empty)*

   The API key for the selected provider. This value is displayed
   **blinded** (masked) to editors in the CKEditor dialog — they can see
   that credentials are configured but cannot read the actual value.

.. confval:: model

   :type: string
   :Default: gpt-4o

   The model to use in **OpenAI mode** (e.g. ``gpt-4o``, ``gpt-4``,
   ``gpt-3.5-turbo``). This setting is ignored in Azure mode, where the
   model is part of the endpoint URL.

..  tip::

    The global extension configuration serves as the **fallback** for sites
    that do not have per-site credentials configured. For simple setups with
    a single site, configuring only the global settings is sufficient.


Per-site configuration (backend module)
=======================================

The extension provides a dedicated backend module at **Web > AI Writer**
that allows administrators to configure different API credentials for each
TYPO3 site. This is useful for multi-site setups where each site may use
a different AI provider or API key.

To configure per-site credentials:

1. Navigate to **Web > AI Writer** in the TYPO3 backend.
2. Select a page from the page tree. The module automatically resolves the
   site root.
3. Fill in the configuration fields (Developer Mode, API Mode, API URL,
   API Key, Model).
4. Click **Save**.

..  note::

    -  The backend module requires **admin access**.
    -  A TYPO3 site configuration must exist for the selected page.
    -  If no per-site configuration is set, the module displays an info
       banner indicating that the global fallback is active.

Configuration resolution order:

1. **Per-site configuration** — if a record exists in
   ``tx_okaiwriter_configuration`` for the current site root page ID and
   has a non-empty ``apiUrl``, it is used.
2. **Global extension configuration** — used as fallback when no per-site
   configuration is found.

Encrypted API key storage
-------------------------

Per-site API keys are stored **encrypted** in the database using Sodium
encryption. The encryption key is derived from TYPO3's
``$GLOBALS['TYPO3_CONF_VARS']['SYS']['encryptionKey']``.

..  warning::

    The TYPO3 encryption key must be set before saving per-site credentials.
    If the encryption key is missing, the backend module displays a warning.


Developer mode
==============

When ``devMode`` is enabled:

-  Editors see a full settings panel in the AI dialog with editable fields
   for mode, endpoint URL, API key, and model.
-  Client-entered credentials are saved in ``localStorage`` and override
   the server-side configuration.
-  Server-configured values are shown as blinded hints below each field
   (e.g. ``http****************2001``).
-  If no client credentials are entered, the server-side config is used
   as fallback.

..  warning::

    In developer mode, API credentials are stored in the user's browser
    ``localStorage`` in plain text. Only enable this for development or
    testing environments.


Step 1: Register the CKEditor plugins
======================================

The extension ships an RTE preset at
:file:`EXT:ok_ai_writer/Configuration/RTE/AiWriter.yaml` that imports both
plugins. You can either use it directly or import it into your own preset.


Option A: Import into your own RTE preset (recommended)
-------------------------------------------------------

Import the AI Writer YAML into your custom RTE preset and add ``aiText``,
``aiTranslate``, and ``loremIpsum`` to your toolbar:

..  code-block:: yaml
    :caption: EXT:site_package/Configuration/RTE/MyPreset.yaml

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

Register your preset in :file:`ext_localconf.php`:

..  code-block:: php

    $GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['my_preset']
        = 'EXT:site_package/Configuration/RTE/MyPreset.yaml';

And activate it via Page TSconfig:

..  code-block:: typoscript

    RTE.default.preset = my_preset


Option B: Use the bundled RTE preset
-------------------------------------

The extension registers an RTE preset called ``ok_ai_writer``. To use it
directly, add to your Page TSconfig:

..  code-block:: typoscript

    RTE.default.preset = ok_ai_writer

..  warning::

    This preset **only loads the plugins**. It does not include a toolbar
    definition, so the ``aiText``, ``aiTranslate``, and ``loremIpsum``
    buttons must be added to the toolbar by another preset or via YAML
    imports.


Toolbar button names
--------------------

================  ============================================
Button name       Description
================  ============================================
``aiText``        AI Text Generator (sparkle icon)
``aiTranslate``   AI Translate (translate icon)
``loremIpsum``    Lorem Ipsum placeholder text (text icon)
================  ============================================


.. _configuration-providers:

Step 2: Set up your AI provider
================================

Azure OpenAI
------------

1. Create an Azure OpenAI resource in the
   `Azure Portal <https://portal.azure.com>`__.
2. Deploy a model (e.g. ``gpt-4``, ``gpt-4o``, ``gpt-35-turbo``).
3. Copy the **Endpoint** and **Key** from the resource's
   "Keys and Endpoint" page.
4. In the extension configuration (global or per-site), set:

   -  ``mode`` = ``azure``
   -  ``apiUrl`` = ``https://<resource>.openai.azure.com/openai/deployments/<model>/chat/completions?api-version=2024-02-01``
   -  ``apiKey`` = your Azure API key

..  note::

    In Azure mode, the model name is part of the endpoint URL. The
    ``model`` setting in extension configuration is ignored.


OpenAI (ChatGPT)
-----------------

1. Create an account at `platform.openai.com <https://platform.openai.com>`__
   and generate an API key.
2. In the extension configuration (global or per-site), set:

   -  ``mode`` = ``openai``
   -  ``apiUrl`` = ``https://api.openai.com/v1/chat/completions``
   -  ``apiKey`` = your ``sk-...`` API key
   -  ``model`` = ``gpt-4o`` (or another available model)

..  attention::

    When using global extension configuration, the API key is stored in
    :file:`config/system/settings.php`. Ensure this file is not committed
    to version control and that your TYPO3 backend is served over HTTPS.
    When using per-site configuration, the API key is stored encrypted in
    the database.
