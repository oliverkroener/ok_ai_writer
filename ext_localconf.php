<?php

defined('TYPO3') || defined('TYPO3_MODE') || die();

// Register RTE preset with AI Writer button
$GLOBALS['TYPO3_CONF_VARS']['RTE']['Presets']['ok_ai_writer'] = 'EXT:ok_ai_writer/Configuration/RTE/Default.yaml';

// TYPO3 10 only: override RTE preset via Page TSconfig
if (\TYPO3\CMS\Core\Utility\GeneralUtility::makeInstance(\TYPO3\CMS\Core\Information\Typo3Version::class)->getMajorVersion() < 11) {
    \TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPageTSConfig(
        'RTE.default.preset = ok_ai_writer'
    );
}
