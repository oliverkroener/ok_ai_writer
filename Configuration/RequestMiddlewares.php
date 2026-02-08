<?php

return [
    'backend' => [
        'oliverkroener/ok-ai-writer/add-language-labels' => [
            'target' => \OliverKroener\OkAiWriter\Middleware\AddLanguageLabels::class,
            'before' => [
                'typo3/cms-backend/output-compression',
            ],
        ],
    ],
];
