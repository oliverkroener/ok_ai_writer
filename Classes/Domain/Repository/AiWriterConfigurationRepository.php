<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Domain\Repository;

use OliverKroener\OkAiWriter\Service\EncryptionService;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;

class AiWriterConfigurationRepository
{
    private const TABLE = 'tx_okaiwriter_configuration';

    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly EncryptionService $encryptionService,
    ) {}

    public function findBySiteRootPageId(int $siteRootPageId): ?array
    {
        $qb = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $qb->getRestrictions()->removeAll();
        $row = $qb->select('*')
            ->from(self::TABLE)
            ->where($qb->expr()->eq(
                'site_root_page_id',
                $qb->createNamedParameter($siteRootPageId, Connection::PARAM_INT)
            ))
            ->executeQuery()
            ->fetchAssociative();

        if ($row === false) {
            return null;
        }

        return $this->mapRowToConfig($row);
    }

    /**
     * Upsert by site_root_page_id.
     */
    public function save(int $siteRootPageId, array $data): void
    {
        $existing = $this->findRaw($siteRootPageId);

        $fields = [
            'site_root_page_id' => $siteRootPageId,
            'dev_mode' => (int)($data['devMode'] ?? false),
            'mode' => $data['mode'] ?? 'azure',
            'api_url' => $data['apiUrl'] ?? '',
            'model' => $data['model'] ?? 'gpt-4o',
        ];

        $apiKey = $data['apiKey'] ?? '';
        if ($apiKey !== '') {
            $fields['api_key_encrypted'] = $this->encryptionService->encrypt($apiKey);
        }

        $connection = $this->connectionPool->getConnectionForTable(self::TABLE);

        if ($existing === null) {
            if ($apiKey === '') {
                $fields['api_key_encrypted'] = '';
            }
            $connection->insert(self::TABLE, $fields);
        } else {
            $connection->update(self::TABLE, $fields, ['site_root_page_id' => $siteRootPageId]);
        }
    }

    private function findRaw(int $siteRootPageId): ?array
    {
        $qb = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $qb->getRestrictions()->removeAll();
        $row = $qb->select('*')
            ->from(self::TABLE)
            ->where($qb->expr()->eq(
                'site_root_page_id',
                $qb->createNamedParameter($siteRootPageId, Connection::PARAM_INT)
            ))
            ->executeQuery()
            ->fetchAssociative();

        return $row === false ? null : $row;
    }

    private function mapRowToConfig(array $row): array
    {
        $apiKey = '';
        if (!empty($row['api_key_encrypted'])) {
            $apiKey = $this->encryptionService->decrypt($row['api_key_encrypted']);
        }

        return [
            'devMode' => (bool)($row['dev_mode'] ?? false),
            'mode' => $row['mode'] ?? 'azure',
            'apiUrl' => $row['api_url'] ?? '',
            'apiKey' => $apiKey,
            'model' => $row['model'] ?? 'gpt-4o',
        ];
    }
}
