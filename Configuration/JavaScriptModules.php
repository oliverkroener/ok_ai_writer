<?php

return [
    'dependencies' => [
        'backend',
        'rte_ckeditor',
    ],
    'tags' => [
        'backend.form',
    ],
    'imports' => [
        '@oliverkroener/ok-ai-writer/' => 'EXT:ok_ai_writer/Resources/Public/JavaScript/',
    ],
];
