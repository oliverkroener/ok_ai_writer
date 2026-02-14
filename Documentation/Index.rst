..  include:: /Includes.rst.txt

..  _start:

==========================
AI Writer for CKEditor
==========================

:Extension key:
   ok_ai_writer

:Package name:
   oliverkroener/ok-ai-writer

:Version:
   |release|

:Language:
   en

:Author:
   `Oliver Kroener <https://www.oliver-kroener.de>`__ <ok@oliver-kroener.de>

:License:
   This document is published under the
   `Open Publication License <https://www.opencontent.org/openpub/>`__.

:Rendered:
   |today|

----

**AI Writer** adds AI-powered text generation directly into CKEditor in the
TYPO3 backend. Editors can generate SEO-optimized HTML content using
**Azure OpenAI** or **OpenAI (ChatGPT)** — without leaving the rich text
editor.

..  tip::

   **Quick start:** Install via ``composer require oliverkroener/ok-ai-writer``,
   import the RTE preset, and configure your API credentials.
   See :ref:`Installation <installation>` and :ref:`Configuration <configuration>`.

..  card-grid::
    :columns: 1
    :columns-md: 2
    :gap: 4
    :class: pb-4
    :card-height: 100

    ..  card:: Introduction

        Learn what AI Writer does, its features, and system requirements.

        ..  card-footer:: :ref:`Learn more <introduction>`
            :button-style: btn btn-primary

    ..  card:: Installation

        Install the extension via Composer and activate it in your TYPO3 instance.

        ..  card-footer:: :ref:`Get started <installation>`
            :button-style: btn btn-primary

    ..  card:: Configuration

        Set up extension settings, register CKEditor toolbar buttons, and
        configure Azure OpenAI or OpenAI API credentials.

        ..  card-footer:: :ref:`Configure <configuration>`
            :button-style: btn btn-primary

    ..  card:: Usage

        Generate and refine AI content with the chat-style dialog. Insert
        Lorem Ipsum placeholder text with one click.

        ..  card-footer:: :ref:`Start writing <usage>`
            :button-style: btn btn-secondary

    ..  card:: Architecture

        Understand the request flow, file structure, provider modes,
        and extension internals.

        ..  card-footer:: :ref:`Explore <architecture>`
            :button-style: btn btn-secondary

..  toctree::
    :maxdepth: 2
    :titlesonly:
    :hidden:

    Introduction/Index
    Installation/Index
    Configuration/Index
    Usage/Index
    Architecture/Index
