<?php

declare(strict_types=1);

namespace IndoWater\Api\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Container\ContainerInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use PDO;

class JwtAuthMiddleware implements MiddlewareInterface
{
    private ContainerInterface $container;
    private PDO $db;
    private array $options;

    public function __construct(ContainerInterface $container, PDO $db, array $options = [])
    {
        $this->container = $container;
        $this->db = $db;
        $this->options = array_merge([
            'secure' => true,
            'relaxed' => ['localhost', '127.0.0.1'],
            'algorithm' => 'HS256',
            'header' => 'Authorization',
            'regexp' => '/Bearer\s+(.*)$/i',
            'cookie' => 'token',
            'attribute' => 'user',
            'path' => '/',
            'ignore' => [],
            'error' => function ($response, $arguments) {
                $data = [
                    'status' => 'error',
                    'message' => $arguments['message']
                ];
                
                $response->getBody()->write(json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
                
                return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($arguments['status']);
            }
        ], $options);
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $uri = $request->getUri()->getPath();
        
        // Skip middleware if path is in ignore list
        foreach ($this->options['ignore'] as $path) {
            if (strpos($uri, $path) === 0) {
                return $handler->handle($request);
            }
        }
        
        $token = $this->fetchToken($request);
        
        if (!$token) {
            return $this->error($handler->handle($request), [
                'message' => 'Token not found',
                'status' => 401
            ]);
        }
        
        try {
            // Decode token
            $settings = $this->container->get('settings');
            $jwtSettings = $settings['jwt'];
            
            $decoded = JWT::decode($token, new Key($jwtSettings['secret'], $this->options['algorithm']));
            
            // Check if user exists and is active
            $stmt = $this->db->prepare('
                SELECT id, name, email, role, status
                FROM users
                WHERE id = :id AND deleted_at IS NULL
            ');
            $stmt->bindParam(':id', $decoded->user_id);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                return $this->error($handler->handle($request), [
                    'message' => 'User not found',
                    'status' => 401
                ]);
            }
            
            if ($user['status'] !== 'active') {
                return $this->error($handler->handle($request), [
                    'message' => 'User account is not active',
                    'status' => 403
                ]);
            }
            
            // Add user to request attributes
            $request = $request->withAttribute($this->options['attribute'], $user);
            
            // Handle request
            return $handler->handle($request);
            
        } catch (ExpiredException $e) {
            return $this->error($handler->handle($request), [
                'message' => 'Token has expired',
                'status' => 401
            ]);
        } catch (\Exception $e) {
            return $this->error($handler->handle($request), [
                'message' => 'Invalid token: ' . $e->getMessage(),
                'status' => 401
            ]);
        }
    }

    /**
     * Fetch token from header or cookie
     *
     * @param Request $request
     * @return string|null
     */
    protected function fetchToken(Request $request): ?string
    {
        // Check header
        $header = $request->getHeaderLine($this->options['header']);
        
        if ($header && preg_match($this->options['regexp'], $header, $matches)) {
            return $matches[1];
        }
        
        // Check cookie
        $cookies = $request->getCookieParams();
        
        if (isset($cookies[$this->options['cookie']])) {
            return $cookies[$this->options['cookie']];
        }
        
        return null;
    }

    /**
     * Error handler
     *
     * @param Response $response
     * @param array $arguments
     * @return Response
     */
    protected function error(Response $response, array $arguments): Response
    {
        return ($this->options['error'])($response, $arguments);
    }
}