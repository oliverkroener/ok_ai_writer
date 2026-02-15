<?php

use OliverKroener\OkAiWriter\Controller\Backend\ConfigurationController;

return [
    'web_okaiwriter' => [
        'parent' => 'web',
        'position' => ['after' => 'web_info'],
        'access' => 'admin',
        'path' => '/module/web/ai-writer',
        'iconIdentifier' => 'ext-ok-ai-writer',
        'labels' => 'LLL:EXT:ok_ai_writer/Resources/Private/Language/locallang_be_module.xlf',
        'navigationComponent' => '@typo3/backend/page-tree/page-tree-element',
        'routes' => [
            '_default' => [
                'target' => ConfigurationController::class . '::editAction',
            ],
            'save' => [
                'target' => ConfigurationController::class . '::saveAction',
                'methods' => ['POST'],
            ],
        ],
    ],
];
