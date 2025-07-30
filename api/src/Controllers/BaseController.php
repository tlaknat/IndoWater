<?php

declare(strict_types=1);

namespace IndoWater\Api\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Container\ContainerInterface;
use PDO;

abstract class BaseController
{
    protected ContainerInterface $container;
    protected PDO $db;

    public function __construct(ContainerInterface $container, PDO $db)
    {
        $this->container = $container;
        $this->db = $db;
    }

    /**
     * Return JSON response
     *
     * @param Response $response
     * @param array $data
     * @param int $statusCode
     * @return Response
     */
    protected function jsonResponse(Response $response, array $data, int $statusCode = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_PRETTY_PRINT));
        
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }

    /**
     * Return success response
     *
     * @param Response $response
     * @param array $data
     * @param int $statusCode
     * @return Response
     */
    protected function successResponse(Response $response, array $data = [], int $statusCode = 200): Response
    {
        $responseData = [
            'status' => 'success',
            'data' => $data
        ];
        
        return $this->jsonResponse($response, $responseData, $statusCode);
    }

    /**
     * Return error response
     *
     * @param Response $response
     * @param string $message
     * @param int $statusCode
     * @return Response
     */
    protected function errorResponse(Response $response, string $message, int $statusCode = 400): Response
    {
        $responseData = [
            'status' => 'error',
            'message' => $message
        ];
        
        return $this->jsonResponse($response, $responseData, $statusCode);
    }

    /**
     * Generate UUID v4
     *
     * @return string
     */
    protected function generateUuid(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );
    }

    /**
     * Get request parameters
     *
     * @param mixed $request
     * @return array
     */
    protected function getParams($request): array
    {
        return $request->getParsedBody() ?? [];
    }

    /**
     * Get query parameters
     *
     * @param mixed $request
     * @return array
     */
    protected function getQueryParams($request): array
    {
        return $request->getQueryParams() ?? [];
    }

    /**
     * Get pagination parameters
     *
     * @param mixed $request
     * @return array
     */
    protected function getPaginationParams($request): array
    {
        $queryParams = $request->getQueryParams();
        $page = isset($queryParams['page']) ? (int) $queryParams['page'] : 1;
        $limit = isset($queryParams['limit']) ? (int) $queryParams['limit'] : 10;
        
        return [
            'page' => $page < 1 ? 1 : $page,
            'limit' => ($limit < 1 || $limit > 100) ? 10 : $limit,
            'offset' => ($page - 1) * $limit
        ];
    }
}