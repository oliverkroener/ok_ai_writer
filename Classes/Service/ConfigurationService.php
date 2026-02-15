<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Service;

use OliverKroener\OkAiWriter\Domain\Repository\AiWriterConfigurationRepository;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;

class ConfigurationService
{
    public function __construct(
        private readonly AiWriterConfigurationRepository $configurationRepository,
        private readonly ExtensionConfiguration $extensionConfiguration,
    ) {}

    /**
     * Resolve AI Writer configuration with per-site DB config and global fallback.
     *
     * @return array{devMode: bool, mode: string, apiUrl: string, apiKey: string, model: string}
     */
    public function getConfiguration(int $siteRootPageId = 0): array
    {
        if ($siteRootPageId > 0) {
            $dbConfig = $this->configurationRepository->findBySiteRootPageId($siteRootPageId);
            if ($dbConfig !== null && trim($dbConfig['apiUrl'] ?? '') !== '') {
                return $dbConfig;
            }
        }

        return $this->getGlobalConfiguration();
    }

    /**
     * @return array{devMode: bool, mode: string, apiUrl: string, apiKey: string, model: string}
     */
    private function getGlobalConfiguration(): array
    {
        $extConf = $this->extensionConfiguration->get('ok_ai_writer');

        return [
            'devMode' => (bool)($extConf['devMode'] ?? false),
            'mode' => $extConf['mode'] ?? 'azure',
            'apiUrl' => trim((string)($extConf['apiUrl'] ?? '')),
            'apiKey' => trim((string)($extConf['apiKey'] ?? '')),
            'model' => trim((string)($extConf['model'] ?? 'gpt-4o')),
        ];
    }
}
