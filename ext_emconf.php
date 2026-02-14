<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'AI Writer for CKEditor',
    'description' => 'Adds an AI Text Generator button to CKEditor using Azure OpenAI',
    'category' => 'be',
    'author' => 'Oliver Kroener',
    'author_email' => 'ok@oliver-kroener.de',
    'state' => 'stable',
    'version' => '2.0.0',
    'constraints' => [
        'depends' => [
            'typo3' => '12.4.0-14.99.99',
            'rte_ckeditor' => '12.4.0-14.99.99',
        ],
    ],
];
