<?php

return [
    'ok_ai_writer_generate' => [
        'path' => '/ok-ai-writer/generate',
        'target' => \OliverKroener\OkAiWriter\Controller\AiTextController::class . '::generateAction',
        'access' => 'public',
    ],
    'ok_ai_writer_translate' => [
        'path' => '/ok-ai-writer/translate',
        'target' => \OliverKroener\OkAiWriter\Controller\AiTextController::class . '::translateAction',
        'access' => 'public',
    ],
];
