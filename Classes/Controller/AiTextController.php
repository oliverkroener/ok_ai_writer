<?php

declare(strict_types=1);

namespace OliverKroener\OkAiWriter\Controller;

use GuzzleHttp\Client;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

class AiTextController
{
    public function generateAction(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $body = json_decode((string)$request->getBody(), true);
            $endpoint = trim($body['endpoint'] ?? '');
            $apiKey = trim($body['apikey'] ?? '');
            $prompt = trim($body['prompt'] ?? '');

            if ($endpoint === '' || $apiKey === '' || $prompt === '') {
                return new JsonResponse(['error' => 'Missing endpoint, apikey, or prompt.'], 400);
            }

            $client = new Client();
            $response = $client->request('POST', $endpoint, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'api-key' => $apiKey,
                ],
                'body' => json_encode([
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a helpful assistant that generates website content. Return only the requested text as clean HTML paragraphs (<p> tags). Do not include markdown formatting, code fences, or explanations.',
                        ],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.7,
                    'max_tokens' => 2000,
                ], JSON_THROW_ON_ERROR),
                'http_errors' => false,
                'timeout' => 60,
            ]);

            $statusCode = $response->getStatusCode();
            $responseBody = (string)$response->getBody();

            if ($statusCode >= 400) {
                return new JsonResponse([
                    'error' => 'Azure API error ' . $statusCode . ': ' . substr($responseBody, 0, 500),
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
