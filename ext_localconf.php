<?php

declare(strict_types=1);

defined('TYPO3') or die();

// Register RTE preset with AI Writer button
$GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['ok_ai_writer'] = 'EXT:ok_ai_writer/Configuration/RTE/AiWriter.yaml';
