..  include:: /Includes.rst.txt

..  _introduction:

============
Introduction
============

What is AI Writer?
==================

**AI Writer** (``ok_ai_writer``) is a TYPO3 extension that brings AI-powered
text generation directly into CKEditor. Editors can generate, preview, and
iteratively refine SEO-optimized HTML content using **Azure OpenAI** or
**OpenAI (ChatGPT)** — all without leaving the rich text editor.

The extension provides two CKEditor 5 plugins:

AI Text Generator
   Opens a chat-style dialog where editors describe the content they need. The
   AI generates well-structured HTML that can be refined through follow-up
   prompts before inserting it into the editor.

Lorem Ipsum
   Inserts three paragraphs of placeholder text with a single click — useful
   during development and layout prototyping.


Features
========

..  tip::

    AI Writer is designed for **editorial workflows**. Content editors can
    produce draft copy in seconds, then refine it iteratively before
    publishing — no copy-paste from external tools needed.

-  **Conversational AI dialog** — Chat-style interface with full conversation
   history for iterative content refinement.
-  **SEO-optimized output** — The AI generates well-structured HTML with
   semantic headings (``<h2>`` – ``<h4>``) and paragraphs.
-  **Dual provider support** — Works with both Azure OpenAI and
   OpenAI (ChatGPT) APIs. Switch between providers via extension
   configuration.
-  **Centralized or per-user credentials** — API credentials can be
   configured server-side by an administrator (displayed blinded to editors)
   or per-user in the browser's ``localStorage`` when developer mode is
   enabled.
-  **Token usage tracking** — Displays cumulative input/output token counts
   per session so editors stay aware of API consumption.
-  **Localized UI** — Ships with English and German translations.
-  **Lorem Ipsum helper** — Additional CKEditor plugin for quick placeholder
   text insertion during development.
-  **Backend proxy** — API requests are routed through the TYPO3 backend,
   avoiding browser CORS restrictions.


Requirements
============

..  container:: table-row

    ====================  ===========================
    Component             Version
    ====================  ===========================
    TYPO3                 13.4 LTS
    PHP                   8.3+
    CKEditor              ``typo3/cms-rte-ckeditor`` ^13.4
    AI Provider           Azure OpenAI **or** OpenAI (ChatGPT)
    ====================  ===========================

..  important::

    You need either an **Azure OpenAI** resource with a deployed model or
    an **OpenAI** API key (``sk-...``). See :ref:`configuration-providers`
    for setup instructions for each provider.
