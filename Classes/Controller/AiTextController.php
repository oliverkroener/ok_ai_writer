<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Controller;

use GuzzleHttp\Client;
use OliverKroener\OkAiWriter\Service\ConfigurationService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

class AiTextController
{
    public function __construct(
        private readonly ConfigurationService $configurationService,
    ) {}

    public function generateAction(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = json_decode((string)$request->getBody(), true);
            $clientMessages = $body['messages'] ?? null;
            $prompt = trim($body['prompt'] ?? '');

            $credentials = $this->resolveCredentials($body);
            if ($credentials instanceof JsonResponse) {
                return $credentials;
            }

            $systemMessage = [
                'role' => 'system',
                'content' => 'You are an expert SEO content writer for websites. Generate well-structured, SEO-optimized HTML content. Use semantic heading tags (<h2>, <h3>, <h4>) to organize sections and paragraphs (<p>) for body text. Write content that is comprehensive, engaging, and optimized for search engines: use relevant keywords naturally, write clear and descriptive headings, and ensure sufficient content length for good SEO ranking. Do not include <h1> tags (the page already has one). Do not include markdown formatting, code fences, or explanations — return only clean HTML.',
            ];

            if (is_array($clientMessages) && count($clientMessages) > 0) {
                $apiMessages = [$systemMessage];
                foreach ($clientMessages as $msg) {
                    if (
                        isset($msg['role'], $msg['content'])
                        && in_array($msg['role'], ['user', 'assistant'], true)
                        && is_string($msg['content'])
                        && trim($msg['content']) !== ''
                    ) {
                        $apiMessages[] = [
                            'role' => $msg['role'],
                            'content' => trim($msg['content']),
                        ];
                    }
                }
                if (count($apiMessages) < 2) {
                    return new JsonResponse(['error' => 'No valid messages provided.'], 400);
                }
            } elseif ($prompt !== '') {
                $apiMessages = [$systemMessage, ['role' => 'user', 'content' => $prompt]];
            } else {
                return new JsonResponse(['error' => 'Missing messages or prompt.'], 400);
            }

            return $this->callApi($credentials, $apiMessages);
        } catch (\Throwable $e) {
            return new JsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    public function translateAction(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = json_decode((string)$request->getBody(), true);
            $content = trim($body['content'] ?? '');
            $language = trim($body['language'] ?? '');

            if ($content === '' || $language === '') {
                return new JsonResponse(['error' => 'Missing content or language.'], 400);
            }

            $credentials = $this->resolveCredentials($body);
            if ($credentials instanceof JsonResponse) {
                return $credentials;
            }

            $apiMessages = [
                [
                    'role' => 'system',
                    'content' => 'You are an expert translator. Translate the provided HTML content to the requested language. Preserve all HTML tags, structure, attributes, and formatting exactly as they are. Only translate the visible text content. Do not add, remove, or modify any HTML tags. Do not include markdown formatting, code fences, or explanations — return only the translated HTML.',
                ],
                [
                    'role' => 'user',
                    'content' => 'Translate the following HTML content to ' . $language . ":\n\n" . $content,
                ],
            ];

            return $this->callApi($credentials, $apiMessages, 4000);
        } catch (\Throwable $e) {
            return new JsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @return array{endpoint: string, apiKey: string, mode: string, model: string}|JsonResponse
     */
    private function resolveCredentials(array $body): array|JsonResponse
    {
        $siteRootPageId = (int)($body['siteRootPageId'] ?? 0);
        $config = $this->configurationService->getConfiguration($siteRootPageId);

        $devMode = $config['devMode'];
        $serverMode = $config['mode'];
        $serverApiUrl = $config['apiUrl'];
        $serverApiKey = $config['apiKey'];
        $serverModel = $config['model'];

        if ($devMode) {
            $endpoint = trim($body['endpoint'] ?? '') ?: $serverApiUrl;
            $apiKey = trim($body['apikey'] ?? '') ?: $serverApiKey;
            $mode = trim($body['mode'] ?? '') ?: $serverMode;
            $model = trim($body['model'] ?? '') ?: $serverModel;
        } else {
            $endpoint = $serverApiUrl;
            $apiKey = $serverApiKey;
            $mode = $serverMode;
            $model = $serverModel;
        }

        if ($endpoint === '' || $apiKey === '') {
            return new JsonResponse(['error' => 'API credentials not configured. Please contact your administrator.'], 400);
        }

        return ['endpoint' => $endpoint, 'apiKey' => $apiKey, 'mode' => $mode, 'model' => $model];
    }

    private function callApi(array $credentials, array $apiMessages, int $maxTokens = 2000): JsonResponse
    {
        ['endpoint' => $endpoint, 'apiKey' => $apiKey, 'mode' => $mode, 'model' => $model] = $credentials;

        if ($mode === 'openai') {
            $headers = [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $apiKey,
            ];
            $requestBody = [
                'model' => $model,
                'messages' => $apiMessages,
                'temperature' => 0.3,
                'max_tokens' => $maxTokens,
            ];
        } else {
            $headers = [
                'Content-Type' => 'application/json',
                'api-key' => $apiKey,
            ];
            $requestBody = [
                'messages' => $apiMessages,
                'temperature' => 0.3,
                'max_tokens' => $maxTokens,
            ];
        }

        $client = new Client();
        $response = $client->request('POST', $endpoint, [
            'headers' => $headers,
            'body' => json_encode($requestBody, JSON_THROW_ON_ERROR),
            'http_errors' => false,
            'timeout' => 120,
        ]);

        $statusCode = $response->getStatusCode();
        $responseBody = (string)$response->getBody();

        if ($statusCode >= 400) {
            return new JsonResponse([
                'error' => 'API error ' . $statusCode . ': ' . substr($responseBody, 0, 500),
            ], 502);
        }

        $data = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
        return new JsonResponse($data);
    }
}
