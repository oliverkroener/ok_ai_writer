<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'AI Writer for CKEditor',
    'description' => 'Adds an AI Text Generator button to CKEditor using Azure OpenAI',
    'category' => 'be',
    'author' => 'Oliver Kroener',
    'author_email' => 'ok@oliver-kroener.de',
    'state' => 'stable',
    'version' => '1.0.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.0-13.4.99',
            'rte_ckeditor' => '13.4.0-13.4.99',
        ],
    ],
];
