<?php

declare(strict_types=1);

namespace IndoWater\Api\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use PDO;
use Firebase\JWT\JWT;
use Ramsey\Uuid\Uuid;

class AuthController extends BaseController
{
    public function __construct(ContainerInterface $container, PDO $db)
    {
        parent::__construct($container, $db);
    }

    /**
     * Login user
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function login(Request $request, Response $response): Response
    {
        $params = $this->getParams($request);
        
        // Validate required fields
        if (empty($params['email']) || empty($params['password'])) {
            return $this->errorResponse($response, 'Email and password are required', 400);
        }
        
        $email = $params['email'];
        $password = $params['password'];
        
        // Find user by email
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = :email AND deleted_at IS NULL');
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Check if user exists and password is correct
        if (!$user || !password_verify($password, $user['password'])) {
            return $this->errorResponse($response, 'Invalid email or password', 401);
        }
        
        // Check if user is active
        if ($user['status'] !== 'active') {
            return $this->errorResponse($response, 'Your account is not active. Please contact support.', 403);
        }
        
        // Update last login timestamp
        $stmt = $this->db->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id');
        $stmt->bindParam(':id', $user['id']);
        $stmt->execute();
        
        // Generate JWT token
        $settings = $this->container->get('settings');
        $jwtSettings = $settings['jwt'];
        
        $issuedAt = time();
        $expirationTime = $issuedAt + $jwtSettings['expiration'];
        
        $payload = [
            'iat' => $issuedAt,
            'exp' => $expirationTime,
            'iss' => $jwtSettings['issuer'],
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        $token = JWT::encode($payload, $jwtSettings['secret'], 'HS256');
        
        // Get additional user data based on role
        $userData = $this->getUserData($user);
        
        // Return response with token and user data
        return $this->successResponse($response, [
            'token' => $token,
            'expires' => $expirationTime,
            'user' => $userData
        ]);
    }

    /**
     * Register new user
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function register(Request $request, Response $response): Response
    {
        $params = $this->getParams($request);
        
        // Validate required fields
        if (empty($params['name']) || empty($params['email']) || empty($params['password'])) {
            return $this->errorResponse($response, 'Name, email and password are required', 400);
        }
        
        // Check if email already exists
        $stmt = $this->db->prepare('SELECT id FROM users WHERE email = :email');
        $stmt->bindParam(':email', $params['email']);
        $stmt->execute();
        
        if ($stmt->fetch()) {
            return $this->errorResponse($response, 'Email already exists', 400);
        }
        
        // Hash password
        $hashedPassword = password_hash($params['password'], PASSWORD_DEFAULT);
        
        // Generate UUID
        $userId = Uuid::uuid4()->toString();
        
        // Set default role to customer
        $role = 'customer';
        
        // Set default status to pending
        $status = 'pending';
        
        // Insert user
        $stmt = $this->db->prepare('
            INSERT INTO users (id, name, email, password, phone, role, status)
            VALUES (:id, :name, :email, :password, :phone, :role, :status)
        ');
        
        $stmt->bindParam(':id', $userId);
        $stmt->bindParam(':name', $params['name']);
        $stmt->bindParam(':email', $params['email']);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':phone', $params['phone'] ?? null);
        $stmt->bindParam(':role', $role);
        $stmt->bindParam(':status', $status);
        
        try {
            $stmt->execute();
            
            // Generate verification token
            $verificationToken = bin2hex(random_bytes(32));
            $tokenId = Uuid::uuid4()->toString();
            
            // Store verification token
            $stmt = $this->db->prepare('
                INSERT INTO email_verification_tokens (id, user_id, token)
                VALUES (:id, :user_id, :token)
            ');
            
            $stmt->bindParam(':id', $tokenId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':token', $verificationToken);
            $stmt->execute();
            
            // Send verification email (implementation would be in a service)
            // $this->sendVerificationEmail($params['email'], $verificationToken);
            
            return $this->successResponse($response, [
                'message' => 'Registration successful. Please check your email to verify your account.',
                'user_id' => $userId
            ], 201);
            
        } catch (\PDOException $e) {
            return $this->errorResponse($response, 'Registration failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Logout user
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function logout(Request $request, Response $response): Response
    {
        // JWT is stateless, so we don't need to do anything server-side
        // The client should remove the token from storage
        
        return $this->successResponse($response, [
            'message' => 'Logout successful'
        ]);
    }

    /**
     * Refresh JWT token
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function refresh(Request $request, Response $response): Response
    {
        // Get user from request attribute (set by JWT middleware)
        $user = $request->getAttribute('user');
        
        if (!$user) {
            return $this->errorResponse($response, 'Unauthorized', 401);
        }
        
        // Generate new JWT token
        $settings = $this->container->get('settings');
        $jwtSettings = $settings['jwt'];
        
        $issuedAt = time();
        $expirationTime = $issuedAt + $jwtSettings['expiration'];
        
        $payload = [
            'iat' => $issuedAt,
            'exp' => $expirationTime,
            'iss' => $jwtSettings['issuer'],
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        $token = JWT::encode($payload, $jwtSettings['secret'], 'HS256');
        
        // Return response with new token
        return $this->successResponse($response, [
            'token' => $token,
            'expires' => $expirationTime
        ]);
    }

    /**
     * Send password reset link
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function forgotPassword(Request $request, Response $response): Response
    {
        $params = $this->getParams($request);
        
        if (empty($params['email'])) {
            return $this->errorResponse($response, 'Email is required', 400);
        }
        
        // Check if user exists
        $stmt = $this->db->prepare('SELECT id FROM users WHERE email = :email AND deleted_at IS NULL');
        $stmt->bindParam(':email', $params['email']);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // For security reasons, don't reveal that the email doesn't exist
            return $this->successResponse($response, [
                'message' => 'If your email is registered, you will receive a password reset link shortly.'
            ]);
        }
        
        // Generate reset token
        $resetToken = bin2hex(random_bytes(32));
        
        // Store reset token
        $stmt = $this->db->prepare('
            INSERT INTO password_reset_tokens (email, token)
            VALUES (:email, :token)
            ON DUPLICATE KEY UPDATE token = :token, created_at = CURRENT_TIMESTAMP
        ');
        
        $stmt->bindParam(':email', $params['email']);
        $stmt->bindParam(':token', $resetToken);
        $stmt->execute();
        
        // Send password reset email (implementation would be in a service)
        // $this->sendPasswordResetEmail($params['email'], $resetToken);
        
        return $this->successResponse($response, [
            'message' => 'If your email is registered, you will receive a password reset link shortly.'
        ]);
    }

    /**
     * Reset password
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function resetPassword(Request $request, Response $response): Response
    {
        $params = $this->getParams($request);
        
        if (empty($params['token']) || empty($params['password'])) {
            return $this->errorResponse($response, 'Token and password are required', 400);
        }
        
        // Verify token
        $stmt = $this->db->prepare('
            SELECT email, created_at FROM password_reset_tokens
            WHERE token = :token
        ');
        
        $stmt->bindParam(':token', $params['token']);
        $stmt->execute();
        
        $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tokenData) {
            return $this->errorResponse($response, 'Invalid or expired token', 400);
        }
        
        // Check if token is expired (24 hours)
        $tokenCreatedAt = strtotime($tokenData['created_at']);
        $tokenExpiration = $tokenCreatedAt + (24 * 60 * 60);
        
        if (time() > $tokenExpiration) {
            return $this->errorResponse($response, 'Token has expired', 400);
        }
        
        // Update password
        $hashedPassword = password_hash($params['password'], PASSWORD_DEFAULT);
        
        $stmt = $this->db->prepare('
            UPDATE users SET password = :password
            WHERE email = :email
        ');
        
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':email', $tokenData['email']);
        $stmt->execute();
        
        // Delete token
        $stmt = $this->db->prepare('
            DELETE FROM password_reset_tokens
            WHERE token = :token
        ');
        
        $stmt->bindParam(':token', $params['token']);
        $stmt->execute();
        
        return $this->successResponse($response, [
            'message' => 'Password has been reset successfully'
        ]);
    }

    /**
     * Verify email
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function verifyEmail(Request $request, Response $response, array $args): Response
    {
        $token = $args['token'] ?? '';
        
        if (empty($token)) {
            return $this->errorResponse($response, 'Token is required', 400);
        }
        
        // Verify token
        $stmt = $this->db->prepare('
            SELECT user_id, created_at FROM email_verification_tokens
            WHERE token = :token
        ');
        
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        
        $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tokenData) {
            return $this->errorResponse($response, 'Invalid or expired token', 400);
        }
        
        // Check if token is expired (24 hours)
        $tokenCreatedAt = strtotime($tokenData['created_at']);
        $tokenExpiration = $tokenCreatedAt + (24 * 60 * 60);
        
        if (time() > $tokenExpiration) {
            return $this->errorResponse($response, 'Token has expired', 400);
        }
        
        // Update user status
        $stmt = $this->db->prepare('
            UPDATE users SET 
            status = CASE WHEN status = "pending" THEN "active" ELSE status END,
            email_verified_at = CURRENT_TIMESTAMP
            WHERE id = :user_id
        ');
        
        $stmt->bindParam(':user_id', $tokenData['user_id']);
        $stmt->execute();
        
        // Delete token
        $stmt = $this->db->prepare('
            DELETE FROM email_verification_tokens
            WHERE token = :token
        ');
        
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        
        return $this->successResponse($response, [
            'message' => 'Email verified successfully'
        ]);
    }

    /**
     * Resend verification email
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function resendVerification(Request $request, Response $response): Response
    {
        $params = $this->getParams($request);
        
        if (empty($params['email'])) {
            return $this->errorResponse($response, 'Email is required', 400);
        }
        
        // Check if user exists and needs verification
        $stmt = $this->db->prepare('
            SELECT id, email_verified_at FROM users 
            WHERE email = :email AND deleted_at IS NULL
        ');
        
        $stmt->bindParam(':email', $params['email']);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            // For security reasons, don't reveal that the email doesn't exist
            return $this->successResponse($response, [
                'message' => 'If your email is registered and not verified, you will receive a verification link shortly.'
            ]);
        }
        
        // Check if email is already verified
        if ($user['email_verified_at']) {
            return $this->errorResponse($response, 'Email is already verified', 400);
        }
        
        // Delete existing tokens
        $stmt = $this->db->prepare('
            DELETE FROM email_verification_tokens
            WHERE user_id = :user_id
        ');
        
        $stmt->bindParam(':user_id', $user['id']);
        $stmt->execute();
        
        // Generate new verification token
        $verificationToken = bin2hex(random_bytes(32));
        $tokenId = Uuid::uuid4()->toString();
        
        // Store verification token
        $stmt = $this->db->prepare('
            INSERT INTO email_verification_tokens (id, user_id, token)
            VALUES (:id, :user_id, :token)
        ');
        
        $stmt->bindParam(':id', $tokenId);
        $stmt->bindParam(':user_id', $user['id']);
        $stmt->bindParam(':token', $verificationToken);
        $stmt->execute();
        
        // Send verification email (implementation would be in a service)
        // $this->sendVerificationEmail($params['email'], $verificationToken);
        
        return $this->successResponse($response, [
            'message' => 'If your email is registered and not verified, you will receive a verification link shortly.'
        ]);
    }

    /**
     * Get user data based on role
     *
     * @param array $user
     * @return array
     */
    private function getUserData(array $user): array
    {
        $userData = [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'status' => $user['status'],
            'last_login_at' => $user['last_login_at']
        ];
        
        // Get additional data based on role
        switch ($user['role']) {
            case 'client':
                $stmt = $this->db->prepare('SELECT * FROM clients WHERE user_id = :user_id');
                $stmt->bindParam(':user_id', $user['id']);
                $stmt->execute();
                $clientData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($clientData) {
                    $userData['client'] = $clientData;
                }
                break;
                
            case 'customer':
                $stmt = $this->db->prepare('SELECT * FROM customers WHERE user_id = :user_id');
                $stmt->bindParam(':user_id', $user['id']);
                $stmt->execute();
                $customerData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($customerData) {
                    $userData['customer'] = $customerData;
                    
                    // Get client data
                    $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :client_id');
                    $stmt->bindParam(':client_id', $customerData['client_id']);
                    $stmt->execute();
                    $clientData = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($clientData) {
                        $userData['client'] = $clientData;
                    }
                    
                    // Get meters
                    $stmt = $this->db->prepare('SELECT * FROM meters WHERE customer_id = :customer_id');
                    $stmt->bindParam(':customer_id', $customerData['id']);
                    $stmt->execute();
                    $meters = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    if ($meters) {
                        $userData['meters'] = $meters;
                    }
                }
                break;
        }
        
        return $userData;
    }
}