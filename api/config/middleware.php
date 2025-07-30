<?php

declare(strict_types=1);

use Slim\App;
use Slim\Views\TwigMiddleware;
use Slim\Middleware\ContentLengthMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use IndoWater\Api\Middleware\CorsMiddleware;
use IndoWater\Api\Middleware\JsonBodyParserMiddleware;
use IndoWater\Api\Middleware\SessionMiddleware;
use IndoWater\Api\Middleware\RateLimitMiddleware;
use IndoWater\Api\Middleware\LoggerMiddleware;
use IndoWater\Api\Middleware\SecurityHeadersMiddleware;
use IndoWater\Api\Middleware\JwtAuthMiddleware;

return function (App $app) {
    $container = $app->getContainer();
    $settings = $container->get('settings');
    $db = $container->get(PDO::class);

    // Parse json, form data and xml
    $app->addBodyParsingMiddleware();

    // Add Content-Length header to response
    $app->add(new ContentLengthMiddleware());

    // Add CORS middleware
    $app->add(CorsMiddleware::class);

    // Add JSON body parser middleware
    $app->add(JsonBodyParserMiddleware::class);

    // Add session middleware
    $app->add(SessionMiddleware::class);

    // Add rate limiting middleware
    $app->add(RateLimitMiddleware::class);

    // Add logger middleware
    $app->add(LoggerMiddleware::class);

    // Add security headers middleware
    $app->add(SecurityHeadersMiddleware::class);

    // Add Twig middleware
    $app->add(TwigMiddleware::class);

    // Add JWT authentication middleware
    $app->add(new JwtAuthMiddleware($container, $db, [
        'path' => '/api',
        'ignore' => [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/forgot-password',
            '/api/auth/reset-password',
            '/api/auth/verify-email',
            '/health',
            '/webhooks',
        ],
        'secure' => $settings['app']['env'] !== 'development',
        'relaxed' => ['localhost', '127.0.0.1'],
    ]));
};