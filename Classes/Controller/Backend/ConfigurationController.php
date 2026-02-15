<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Controller\Backend;

use OliverKroener\OkAiWriter\Domain\Repository\AiWriterConfigurationRepository;
use OliverKroener\OkAiWriter\Service\ConfigurationService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Template\Components\ButtonBar;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Http\RedirectResponse;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Messaging\FlashMessage;
use TYPO3\CMS\Core\Messaging\FlashMessageService;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Site\SiteFinder;
use TYPO3\CMS\Core\Type\Bitmask\Permission;
use TYPO3\CMS\Core\Type\ContextualFeedbackSeverity;
use TYPO3\CMS\Core\Utility\GeneralUtility;

#[AsController]
class ConfigurationController
{
    public function __construct(
        private readonly ModuleTemplateFactory $moduleTemplateFactory,
        private readonly AiWriterConfigurationRepository $configurationRepository,
        private readonly ConfigurationService $configurationService,
        private readonly SiteFinder $siteFinder,
        private readonly UriBuilder $uriBuilder,
        private readonly IconFactory $iconFactory,
    ) {}

    public function editAction(ServerRequestInterface $request): ResponseInterface
    {
        $id = (int)($request->getQueryParams()['id'] ?? 0);
        $view = $this->moduleTemplateFactory->create($request);

        $languageService = $this->getLanguageService();
        $moduleTitle = $languageService->sL(
            'LLL:EXT:ok_ai_writer/Resources/Private/Language/locallang_be_module.xlf:module.title'
        );

        $pageInfo = BackendUtility::readPageAccess(
            $id,
            $this->getBackendUser()->getPagePermsClause(Permission::PAGE_SHOW)
        ) ?: [];

        $view->setTitle($moduleTitle, $pageInfo['title'] ?? '');

        if ($pageInfo !== []) {
            $view->getDocHeaderComponent()->setMetaInformation($pageInfo);
        }

        if ($id === 0) {
            $view->assign('noPageSelected', true);
            return $view->renderResponse('Backend/Configuration/Edit');
        }

        try {
            $site = $this->siteFinder->getSiteByPageId($id);
            $siteRootPageId = $site->getRootPageId();
        } catch (\TYPO3\CMS\Core\Exception\SiteNotFoundException) {
            $view->assign('noSiteFound', true);
            return $view->renderResponse('Backend/Configuration/Edit');
        }

        $encryptionKeyMissing = empty($GLOBALS['TYPO3_CONF_VARS']['SYS']['encryptionKey']);

        $dbConfig = $this->configurationRepository->findBySiteRootPageId($siteRootPageId);
        $hasExistingApiKey = false;
        $hasPerSiteConfig = false;
        if ($dbConfig !== null) {
            $hasExistingApiKey = ($dbConfig['apiKey'] ?? '') !== '';
            $hasPerSiteConfig = trim($dbConfig['apiUrl'] ?? '') !== '';
            $dbConfig['apiKey'] = '';
        }

        // Get global fallback config for display
        $globalConfig = $this->configurationService->getConfiguration(0);

        $saveUrl = (string)$this->uriBuilder->buildUriFromRoute(
            'web_okaiwriter.save',
            ['id' => $id]
        );

        $this->configureDocHeader($view);
        $this->loadFormDirtyCheckAssets($languageService);

        $view->assignMultiple([
            'config' => $dbConfig ?? [
                'devMode' => false,
                'mode' => 'azure',
                'apiUrl' => '',
                'apiKey' => '',
                'model' => 'gpt-4o',
            ],
            'siteRootPageId' => $siteRootPageId,
            'siteIdentifier' => $site->getIdentifier(),
            'hasExistingApiKey' => $hasExistingApiKey,
            'hasPerSiteConfig' => $hasPerSiteConfig,
            'globalHasCredentials' => trim($globalConfig['apiUrl']) !== '' && trim($globalConfig['apiKey']) !== '',
            'encryptionKeyMissing' => $encryptionKeyMissing,
            'saveUrl' => $saveUrl,
        ]);

        return $view->renderResponse('Backend/Configuration/Edit');
    }

    public function saveAction(ServerRequestInterface $request): ResponseInterface
    {
        $parsedBody = $request->getParsedBody();
        $id = (int)($request->getQueryParams()['id'] ?? $parsedBody['id'] ?? 0);
        $data = $parsedBody['data'] ?? [];

        $configPageId = 0;
        if ($id > 0) {
            try {
                $site = $this->siteFinder->getSiteByPageId($id);
                $configPageId = $site->getRootPageId();
            } catch (\TYPO3\CMS\Core\Exception\SiteNotFoundException) {
                // no site found
            }
        }

        if ($configPageId > 0) {
            $this->configurationRepository->save($configPageId, [
                'devMode' => (bool)($data['devMode'] ?? false),
                'mode' => trim((string)($data['mode'] ?? 'azure')),
                'apiUrl' => trim((string)($data['apiUrl'] ?? '')),
                'apiKey' => (string)($data['apiKey'] ?? ''),
                'model' => trim((string)($data['model'] ?? 'gpt-4o')),
            ]);

            $this->addFlashMessage('message.saved.title', 'message.saved.body', ContextualFeedbackSeverity::OK);
        }

        return new RedirectResponse(
            (string)$this->uriBuilder->buildUriFromRoute('web_okaiwriter', ['id' => $id])
        );
    }

    private function configureDocHeader($view): void
    {
        $buttonBar = $view->getDocHeaderComponent()->getButtonBar();

        $saveButton = $buttonBar->makeInputButton()
            ->setTitle($this->getLanguageService()->sL('LLL:EXT:core/Resources/Private/Language/locallang_core.xlf:rm.saveDoc'))
            ->setName('_savedok')
            ->setValue('1')
            ->setShowLabelText(true)
            ->setForm('aiWriterConfigForm')
            ->setIcon($this->iconFactory->getIcon(
                'actions-document-save',
                class_exists(\TYPO3\CMS\Core\Imaging\IconSize::class)
                    ? \TYPO3\CMS\Core\Imaging\IconSize::SMALL
                    : \TYPO3\CMS\Core\Imaging\Icon::SIZE_SMALL
            ));

        $buttonBar->addButton($saveButton, ButtonBar::BUTTON_POSITION_LEFT, 2);
    }

    private function loadFormDirtyCheckAssets(LanguageService $languageService): void
    {
        $pageRenderer = GeneralUtility::makeInstance(PageRenderer::class);
        $pageRenderer->loadJavaScriptModule(
            '@oliverkroener/ok-ai-writer/backend/form-dirty-check.js'
        );
        $pageRenderer->addInlineLanguageLabelArray([
            'label.confirm.close_without_save.title' => $languageService->sL(
                'LLL:EXT:backend/Resources/Private/Language/locallang_alt_doc.xlf:label.confirm.close_without_save.title'
            ),
            'label.confirm.close_without_save.content' => $languageService->sL(
                'LLL:EXT:backend/Resources/Private/Language/locallang_alt_doc.xlf:label.confirm.close_without_save.content'
            ),
            'buttons.confirm.close_without_save.yes' => $languageService->sL(
                'LLL:EXT:backend/Resources/Private/Language/locallang_alt_doc.xlf:buttons.confirm.close_without_save.yes'
            ),
            'buttons.confirm.close_without_save.no' => $languageService->sL(
                'LLL:EXT:backend/Resources/Private/Language/locallang_alt_doc.xlf:buttons.confirm.close_without_save.no'
            ),
            'buttons.confirm.save_and_close' => $languageService->sL(
                'LLL:EXT:backend/Resources/Private/Language/locallang_alt_doc.xlf:buttons.confirm.save_and_close'
            ),
        ]);
    }

    private function addFlashMessage(string $titleKey, string $bodyKey, ContextualFeedbackSeverity $severity): void
    {
        $languageService = $this->getLanguageService();
        $flashMessage = GeneralUtility::makeInstance(
            FlashMessage::class,
            $languageService->sL('LLL:EXT:ok_ai_writer/Resources/Private/Language/locallang_be_module.xlf:' . $bodyKey),
            $languageService->sL('LLL:EXT:ok_ai_writer/Resources/Private/Language/locallang_be_module.xlf:' . $titleKey),
            $severity,
            true
        );
        GeneralUtility::makeInstance(FlashMessageService::class)
            ->getMessageQueueByIdentifier()
            ->enqueue($flashMessage);
    }

    private function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }

    private function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }
}
