<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Middleware;

use OliverKroener\OkAiWriter\Service\ConfigurationService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Site\SiteFinder;

class AddLanguageLabels implements MiddlewareInterface
{
    public function __construct(
        private readonly PageRenderer $pageRenderer,
        private readonly ConfigurationService $configurationService,
        private readonly SiteFinder $siteFinder,
        private readonly ConnectionPool $connectionPool,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $this->pageRenderer->addInlineLanguageLabelFile(
            'EXT:ok_ai_writer/Resources/Private/Language/locallang.xlf'
        );

        $siteRootPageId = $this->resolveSiteRootPageId($request);
        $config = $this->configurationService->getConfiguration($siteRootPageId);

        $apiUrl = $config['apiUrl'];
        $apiKey = $config['apiKey'];

        $this->pageRenderer->addInlineSettingArray('ok_ai_writer', [
            'devMode' => $config['devMode'],
            'mode' => $config['mode'],
            'model' => $config['model'],
            'hasCredentials' => $apiUrl !== '' && $apiKey !== '',
            'apiUrlBlinded' => self::blindValue($apiUrl),
            'apiKeyBlinded' => self::blindValue($apiKey),
            'siteRootPageId' => $siteRootPageId,
        ]);

        return $handler->handle($request);
    }

    private function resolveSiteRootPageId(ServerRequestInterface $request): int
    {
        $pageId = $this->resolvePageId($request);
        if ($pageId <= 0) {
            return 0;
        }

        try {
            $site = $this->siteFinder->getSiteByPageId($pageId);
            return $site->getRootPageId();
        } catch (\TYPO3\CMS\Core\Exception\SiteNotFoundException) {
            return 0;
        }
    }

    private function resolvePageId(ServerRequestInterface $request): int
    {
        $queryParams = $request->getQueryParams();

        // Page module context: ?id=123
        $id = (int)($queryParams['id'] ?? 0);
        if ($id > 0) {
            return $id;
        }

        // Form editing context: ?edit[tt_content][123]=edit
        $edit = $queryParams['edit'] ?? [];
        if (is_array($edit)) {
            foreach ($edit as $table => $uidActions) {
                if (is_array($uidActions)) {
                    foreach ($uidActions as $uid => $action) {
                        $uid = (int)$uid;
                        if ($uid > 0) {
                            return $this->lookupPid($table, $uid);
                        }
                    }
                }
            }
        }

        return 0;
    }

    private function lookupPid(string $table, int $uid): int
    {
        if ($table === 'pages') {
            return $uid;
        }

        $qb = $this->connectionPool->getQueryBuilderForTable($table);
        $qb->getRestrictions()->removeAll();
        $pid = $qb->select('pid')
            ->from($table)
            ->where($qb->expr()->eq('uid', $qb->createNamedParameter($uid, \TYPO3\CMS\Core\Database\Connection::PARAM_INT)))
            ->executeQuery()
            ->fetchOne();

        return $pid !== false ? (int)$pid : 0;
    }

    private static function blindValue(string $value): string
    {
        if ($value === '') {
            return '';
        }
        $length = strlen($value);
        if ($length <= 8) {
            return str_repeat('*', $length);
        }
        return substr($value, 0, 4) . str_repeat('*', min($length - 8, 16)) . substr($value, -4);
    }
}
