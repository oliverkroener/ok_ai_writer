..  include:: /Includes.rst.txt

..  _installation:

============
Installation
============

Install via Composer
====================

..  code-block:: bash

    composer require oliverkroener/ok-ai-writer

This pulls the extension and its dependencies into your TYPO3 project.


Install from a local path
=========================

If you develop the extension locally (e.g. in a ``packages/`` directory), add
it as a path repository in your project's :file:`composer.json`:

..  code-block:: json

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

Then run:

..  code-block:: bash

    composer update oliverkroener/ok-ai-writer


Activate the extension
======================

After installing, set up and activate the extension:

..  code-block:: bash

    vendor/bin/typo3 extension:setup
    vendor/bin/typo3 database:updateschema
    vendor/bin/typo3 cache:flush

..  note::

    The ``database:updateschema`` step creates the
    ``tx_okaiwriter_configuration`` table used for per-site credential
    storage. This table stores encrypted API keys and per-site settings.
    After the database schema is updated, register the CKEditor plugins in
    your RTE preset (see :ref:`configuration`).


Verify the installation
=======================

After activation, confirm the extension is loaded:

..  code-block:: bash

    vendor/bin/typo3 extension:list | grep ok_ai_writer

You should see ``ok_ai_writer`` in the output. The CKEditor plugins are now
available for :ref:`configuration <configuration>`.
