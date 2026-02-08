..  include:: /Includes.rst.txt

..  _configuration:

=============
Configuration
=============

The extension supports two AI providers — **Azure OpenAI** and
**OpenAI (ChatGPT)** — and can be configured either centrally by an
administrator or per-user in developer mode.


Extension configuration
=======================

Open **Admin Tools > Settings > Extension Configuration > ok_ai_writer**
to set the following options:

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

    For production environments, configure ``apiUrl`` and ``apiKey`` in the
    extension configuration and leave ``devMode`` disabled. Editors will see
    a green "configured by administrator" badge in the settings panel.


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

Import the AI Writer YAML into your custom RTE preset and add ``aiText``
and ``loremIpsum`` to your toolbar:

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
    definition, so the ``aiText`` and ``loremIpsum`` buttons must be added
    to the toolbar by another preset or via YAML imports.


Toolbar button names
--------------------

==============  ============================================
Button name     Description
==============  ============================================
``aiText``      AI Text Generator (sparkle icon)
``loremIpsum``  Lorem Ipsum placeholder text (text icon)
==============  ============================================


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
4. In the extension configuration, set:

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
2. In the extension configuration, set:

   -  ``mode`` = ``openai``
   -  ``apiUrl`` = ``https://api.openai.com/v1/chat/completions``
   -  ``apiKey`` = your ``sk-...`` API key
   -  ``model`` = ``gpt-4o`` (or another available model)

..  attention::

    The API key is stored in :file:`config/system/settings.php`. Ensure
    this file is not committed to version control and that your TYPO3
    backend is served over HTTPS.
