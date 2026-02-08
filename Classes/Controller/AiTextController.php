<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Controller;

use GuzzleHttp\Client;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Http\JsonResponse;

class AiTextController
{
    public function __construct(
        private readonly ExtensionConfiguration $extensionConfiguration,
    ) {}

    public function generateAction(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = json_decode((string)$request->getBody(), true);
            $clientMessages = $body['messages'] ?? null;
            $prompt = trim($body['prompt'] ?? '');

            // Load extension configuration
            $extConf = $this->extensionConfiguration->get('ok_ai_writer');
            $devMode = (bool)($extConf['devMode'] ?? false);
            $serverMode = $extConf['mode'] ?? 'azure';
            $serverApiUrl = trim((string)($extConf['apiUrl'] ?? ''));
            $serverApiKey = trim((string)($extConf['apiKey'] ?? ''));
            $serverModel = trim((string)($extConf['model'] ?? 'gpt-4o'));

            if ($devMode) {
                // In dev mode, client credentials override server config
                $endpoint = trim($body['endpoint'] ?? '') ?: $serverApiUrl;
                $apiKey = trim($body['apikey'] ?? '') ?: $serverApiKey;
                $mode = trim($body['mode'] ?? '') ?: $serverMode;
                $model = trim($body['model'] ?? '') ?: $serverModel;
            } else {
                // In production mode, always use server-side config
                $endpoint = $serverApiUrl;
                $apiKey = $serverApiKey;
                $mode = $serverMode;
                $model = $serverModel;
            }

            if ($endpoint === '' || $apiKey === '') {
                return new JsonResponse(['error' => 'API credentials not configured. Please contact your administrator.'], 400);
            }

            $systemMessage = [
                'role' => 'system',
                'content' => 'You are an expert SEO content writer for websites. Generate well-structured, SEO-optimized HTML content. Use semantic heading tags (<h2>, <h3>, <h4>) to organize sections and paragraphs (<p>) for body text. Write content that is comprehensive, engaging, and optimized for search engines: use relevant keywords naturally, write clear and descriptive headings, and ensure sufficient content length for good SEO ranking. Do not include <h1> tags (the page already has one). Do not include markdown formatting, code fences, or explanations — return only clean HTML.',
            ];

            if (is_array($clientMessages) && count($clientMessages) > 0) {
                // Conversation mode: use provided message history
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
                // Legacy single-prompt mode
                $apiMessages = [$systemMessage, ['role' => 'user', 'content' => $prompt]];
            } else {
                return new JsonResponse(['error' => 'Missing messages or prompt.'], 400);
            }

            // Build request based on mode
            if ($mode === 'openai') {
                $headers = [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $apiKey,
                ];
                $requestBody = [
                    'model' => $model,
                    'messages' => $apiMessages,
                    'temperature' => 0.7,
                    'max_tokens' => 2000,
                ];
            } else {
                // Azure mode (default)
                $headers = [
                    'Content-Type' => 'application/json',
                    'api-key' => $apiKey,
                ];
                $requestBody = [
                    'messages' => $apiMessages,
                    'temperature' => 0.7,
                    'max_tokens' => 2000,
                ];
            }

            $client = new Client();
            $response = $client->request('POST', $endpoint, [
                'headers' => $headers,
                'body' => json_encode($requestBody, JSON_THROW_ON_ERROR),
                'http_errors' => false,
                'timeout' => 60,
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
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
