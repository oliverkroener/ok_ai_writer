<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Page\PageRenderer;

class AddLanguageLabels implements MiddlewareInterface
{
    public function __construct(
        private readonly PageRenderer $pageRenderer,
        private readonly ExtensionConfiguration $extensionConfiguration,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $this->pageRenderer->addInlineLanguageLabelFile(
            'EXT:ok_ai_writer/Resources/Private/Language/locallang.xlf'
        );

        $extConf = $this->extensionConfiguration->get('ok_ai_writer');
        $apiUrl = trim((string)($extConf['apiUrl'] ?? ''));
        $apiKey = trim((string)($extConf['apiKey'] ?? ''));

        $this->pageRenderer->addInlineSettingArray('ok_ai_writer', [
            'devMode' => (bool)($extConf['devMode'] ?? false),
            'mode' => $extConf['mode'] ?? 'azure',
            'model' => $extConf['model'] ?? 'gpt-4o',
            'hasCredentials' => $apiUrl !== '' && $apiKey !== '',
            'apiUrlBlinded' => self::blindValue($apiUrl),
            'apiKeyBlinded' => self::blindValue($apiKey),
        ]);

        return $handler->handle($request);
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
