<?php

defined('TYPO3') || defined('TYPO3_MODE') || die();

// Register RTE preset with AI Writer button
$GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['ok_ai_writer'] = 'EXT:ok_ai_writer/Configuration/RTE/AiWriter.yaml';
