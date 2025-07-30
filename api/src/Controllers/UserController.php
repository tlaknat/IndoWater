<?php

declare(strict_types=1);

namespace IndoWater\Api\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use PDO;
use Ramsey\Uuid\Uuid;

class UserController extends BaseController
{
    public function __construct(ContainerInterface $container, PDO $db)
    {
        parent::__construct($container, $db);
    }

    /**
     * Get all users
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function index(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can list all users)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $role = $queryParams['role'] ?? null;
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        
        // Build query
        $query = 'SELECT id, name, email, phone, role, status, email_verified_at, last_login_at, created_at, updated_at 
                 FROM users 
                 WHERE deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';
        $params = [];
        
        // Add filters
        if ($role) {
            $query .= ' AND role = :role';
            $countQuery .= ' AND role = :role';
            $params[':role'] = $role;
        }
        
        if ($status) {
            $query .= ' AND status = :status';
            $countQuery .= ' AND status = :status';
            $params[':status'] = $status;
        }
        
        if ($search) {
            $query .= ' AND (name LIKE :search OR email LIKE :search OR phone LIKE :search)';
            $countQuery .= ' AND (name LIKE :search OR email LIKE :search OR phone LIKE :search)';
            $params[':search'] = "%$search%";
        }
        
        // Add pagination
        $query .= ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
        $params[':limit'] = $pagination['limit'];
        $params[':offset'] = $pagination['offset'];
        
        // Execute count query
        $stmt = $this->db->prepare($countQuery);
        foreach ($params as $key => $value) {
            if ($key !== ':limit' && $key !== ':offset') {
                $stmt->bindValue($key, $value);
            }
        }
        $stmt->execute();
        $totalCount = (int) $stmt->fetchColumn();
        
        // Execute main query
        $stmt = $this->db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate pagination metadata
        $totalPages = ceil($totalCount / $pagination['limit']);
        
        return $this->successResponse($response, [
            'users' => $users,
            'pagination' => [
                'total' => $totalCount,
                'per_page' => $pagination['limit'],
                'current_page' => $pagination['page'],
                'total_pages' => $totalPages
            ]
        ]);
    }

    /**
     * Get user by ID
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $userId = $args['id'] ?? '';
        
        if (empty($userId)) {
            return $this->errorResponse($response, 'User ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any user, others can only view themselves)
        if ($authUser['role'] !== 'superadmin' && $authUser['id'] !== $userId) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get user
        $stmt = $this->db->prepare('
            SELECT id, name, email, phone, role, status, email_verified_at, last_login_at, created_at, updated_at 
            FROM users 
            WHERE id = :id AND deleted_at IS NULL
        ');
        
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return $this->errorResponse($response, 'User not found', 404);
        }
        
        // Get additional data based on role
        $userData = $this->getUserData($user);
        
        return $this->successResponse($response, [
            'user' => $userData
        ]);
    }

    /**
     * Create new user
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function store(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can create users)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        $params = $this->getParams($request);
        
        // Validate required fields
        if (empty($params['name']) || empty($params['email']) || empty($params['password']) || empty($params['role'])) {
            return $this->errorResponse($response, 'Name, email, password and role are required', 400);
        }
        
        // Validate role
        $allowedRoles = ['superadmin', 'client', 'customer'];
        if (!in_array($params['role'], $allowedRoles)) {
            return $this->errorResponse($response, 'Invalid role', 400);
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
        
        // Set default status
        $status = $params['status'] ?? 'active';
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Insert user
            $stmt = $this->db->prepare('
                INSERT INTO users (id, name, email, password, phone, role, status, email_verified_at)
                VALUES (:id, :name, :email, :password, :phone, :role, :status, CURRENT_TIMESTAMP)
            ');
            
            $stmt->bindParam(':id', $userId);
            $stmt->bindParam(':name', $params['name']);
            $stmt->bindParam(':email', $params['email']);
            $stmt->bindParam(':password', $hashedPassword);
            $stmt->bindParam(':phone', $params['phone'] ?? null);
            $stmt->bindParam(':role', $params['role']);
            $stmt->bindParam(':status', $status);
            $stmt->execute();
            
            // If role is client, create client record
            if ($params['role'] === 'client' && !empty($params['client'])) {
                $clientId = Uuid::uuid4()->toString();
                $clientData = $params['client'];
                
                $stmt = $this->db->prepare('
                    INSERT INTO clients (
                        id, user_id, company_name, address, city, province, postal_code,
                        contact_person, contact_email, contact_phone, service_fee_type, service_fee_value, status
                    )
                    VALUES (
                        :id, :user_id, :company_name, :address, :city, :province, :postal_code,
                        :contact_person, :contact_email, :contact_phone, :service_fee_type, :service_fee_value, :status
                    )
                ');
                
                $stmt->bindParam(':id', $clientId);
                $stmt->bindParam(':user_id', $userId);
                $stmt->bindParam(':company_name', $clientData['company_name']);
                $stmt->bindParam(':address', $clientData['address']);
                $stmt->bindParam(':city', $clientData['city']);
                $stmt->bindParam(':province', $clientData['province']);
                $stmt->bindParam(':postal_code', $clientData['postal_code']);
                $stmt->bindParam(':contact_person', $clientData['contact_person']);
                $stmt->bindParam(':contact_email', $clientData['contact_email']);
                $stmt->bindParam(':contact_phone', $clientData['contact_phone']);
                $stmt->bindParam(':service_fee_type', $clientData['service_fee_type'] ?? 'percentage');
                $stmt->bindParam(':service_fee_value', $clientData['service_fee_value'] ?? 5.00);
                $stmt->bindParam(':status', $status);
                $stmt->execute();
            }
            
            // If role is customer, create customer record
            if ($params['role'] === 'customer' && !empty($params['customer'])) {
                $customerId = Uuid::uuid4()->toString();
                $customerData = $params['customer'];
                
                $stmt = $this->db->prepare('
                    INSERT INTO customers (
                        id, user_id, client_id, customer_number, first_name, last_name,
                        address, city, province, postal_code, phone, email, status
                    )
                    VALUES (
                        :id, :user_id, :client_id, :customer_number, :first_name, :last_name,
                        :address, :city, :province, :postal_code, :phone, :email, :status
                    )
                ');
                
                $stmt->bindParam(':id', $customerId);
                $stmt->bindParam(':user_id', $userId);
                $stmt->bindParam(':client_id', $customerData['client_id']);
                $stmt->bindParam(':customer_number', $customerData['customer_number']);
                $stmt->bindParam(':first_name', $customerData['first_name']);
                $stmt->bindParam(':last_name', $customerData['last_name']);
                $stmt->bindParam(':address', $customerData['address']);
                $stmt->bindParam(':city', $customerData['city']);
                $stmt->bindParam(':province', $customerData['province']);
                $stmt->bindParam(':postal_code', $customerData['postal_code']);
                $stmt->bindParam(':phone', $customerData['phone']);
                $stmt->bindParam(':email', $params['email']);
                $stmt->bindParam(':status', $status);
                $stmt->execute();
            }
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'User created successfully',
                'user_id' => $userId
            ], 201);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to create user: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update user
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $userId = $args['id'] ?? '';
        
        if (empty($userId)) {
            return $this->errorResponse($response, 'User ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can update any user, others can only update themselves)
        if ($authUser['role'] !== 'superadmin' && $authUser['id'] !== $userId) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        $params = $this->getParams($request);
        
        // Check if user exists
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return $this->errorResponse($response, 'User not found', 404);
        }
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Update user fields
            $updateFields = [];
            $updateParams = [':id' => $userId];
            
            if (!empty($params['name'])) {
                $updateFields[] = 'name = :name';
                $updateParams[':name'] = $params['name'];
            }
            
            if (!empty($params['phone'])) {
                $updateFields[] = 'phone = :phone';
                $updateParams[':phone'] = $params['phone'];
            }
            
            // Only superadmin can update role and status
            if ($authUser['role'] === 'superadmin') {
                if (!empty($params['role'])) {
                    // Validate role
                    $allowedRoles = ['superadmin', 'client', 'customer'];
                    if (!in_array($params['role'], $allowedRoles)) {
                        return $this->errorResponse($response, 'Invalid role', 400);
                    }
                    
                    $updateFields[] = 'role = :role';
                    $updateParams[':role'] = $params['role'];
                }
                
                if (!empty($params['status'])) {
                    // Validate status
                    $allowedStatuses = ['active', 'inactive', 'pending', 'suspended'];
                    if (!in_array($params['status'], $allowedStatuses)) {
                        return $this->errorResponse($response, 'Invalid status', 400);
                    }
                    
                    $updateFields[] = 'status = :status';
                    $updateParams[':status'] = $params['status'];
                }
            }
            
            // Update password if provided
            if (!empty($params['password'])) {
                $hashedPassword = password_hash($params['password'], PASSWORD_DEFAULT);
                $updateFields[] = 'password = :password';
                $updateParams[':password'] = $hashedPassword;
            }
            
            // Update email if provided and not already taken
            if (!empty($params['email']) && $params['email'] !== $user['email']) {
                // Check if email already exists
                $stmt = $this->db->prepare('SELECT id FROM users WHERE email = :email AND id != :id');
                $stmt->bindParam(':email', $params['email']);
                $stmt->bindParam(':id', $userId);
                $stmt->execute();
                
                if ($stmt->fetch()) {
                    return $this->errorResponse($response, 'Email already exists', 400);
                }
                
                $updateFields[] = 'email = :email';
                $updateParams[':email'] = $params['email'];
                
                // Reset email verification if email is changed
                $updateFields[] = 'email_verified_at = NULL';
            }
            
            // If there are fields to update
            if (!empty($updateFields)) {
                $updateQuery = 'UPDATE users SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
                
                $stmt = $this->db->prepare($updateQuery);
                foreach ($updateParams as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                $stmt->execute();
            }
            
            // Update client data if role is client
            if ($user['role'] === 'client' && !empty($params['client'])) {
                // Get client ID
                $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
                $stmt->bindParam(':user_id', $userId);
                $stmt->execute();
                $clientData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($clientData) {
                    $clientId = $clientData['id'];
                    $clientParams = $params['client'];
                    
                    $updateFields = [];
                    $updateParams = [':id' => $clientId];
                    
                    $clientFields = [
                        'company_name', 'address', 'city', 'province', 'postal_code',
                        'contact_person', 'contact_email', 'contact_phone', 'website', 'tax_id',
                        'service_fee_type', 'service_fee_value'
                    ];
                    
                    foreach ($clientFields as $field) {
                        if (isset($clientParams[$field])) {
                            $updateFields[] = "$field = :$field";
                            $updateParams[":$field"] = $clientParams[$field];
                        }
                    }
                    
                    if (!empty($updateFields)) {
                        $updateQuery = 'UPDATE clients SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
                        
                        $stmt = $this->db->prepare($updateQuery);
                        foreach ($updateParams as $key => $value) {
                            $stmt->bindValue($key, $value);
                        }
                        $stmt->execute();
                    }
                }
            }
            
            // Update customer data if role is customer
            if ($user['role'] === 'customer' && !empty($params['customer'])) {
                // Get customer ID
                $stmt = $this->db->prepare('SELECT id FROM customers WHERE user_id = :user_id');
                $stmt->bindParam(':user_id', $userId);
                $stmt->execute();
                $customerData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($customerData) {
                    $customerId = $customerData['id'];
                    $customerParams = $params['customer'];
                    
                    $updateFields = [];
                    $updateParams = [':id' => $customerId];
                    
                    $customerFields = [
                        'first_name', 'last_name', 'address', 'city', 'province', 'postal_code',
                        'phone', 'id_card_number'
                    ];
                    
                    foreach ($customerFields as $field) {
                        if (isset($customerParams[$field])) {
                            $updateFields[] = "$field = :$field";
                            $updateParams[":$field"] = $customerParams[$field];
                        }
                    }
                    
                    // Update email if user email was updated
                    if (!empty($params['email']) && $params['email'] !== $user['email']) {
                        $updateFields[] = "email = :email";
                        $updateParams[":email"] = $params['email'];
                    }
                    
                    if (!empty($updateFields)) {
                        $updateQuery = 'UPDATE customers SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
                        
                        $stmt = $this->db->prepare($updateQuery);
                        foreach ($updateParams as $key => $value) {
                            $stmt->bindValue($key, $value);
                        }
                        $stmt->execute();
                    }
                }
            }
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'User updated successfully'
            ]);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to update user: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete user
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $userId = $args['id'] ?? '';
        
        if (empty($userId)) {
            return $this->errorResponse($response, 'User ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can delete users)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if user exists
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return $this->errorResponse($response, 'User not found', 404);
        }
        
        // Soft delete user
        $stmt = $this->db->prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id');
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        
        return $this->successResponse($response, [
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Get current user
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function me(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        if (!$authUser) {
            return $this->errorResponse($response, 'Unauthorized', 401);
        }
        
        // Get user data
        $stmt = $this->db->prepare('
            SELECT id, name, email, phone, role, status, email_verified_at, last_login_at, created_at, updated_at 
            FROM users 
            WHERE id = :id AND deleted_at IS NULL
        ');
        
        $stmt->bindParam(':id', $authUser['id']);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return $this->errorResponse($response, 'User not found', 404);
        }
        
        // Get additional data based on role
        $userData = $this->getUserData($user);
        
        return $this->successResponse($response, [
            'user' => $userData
        ]);
    }

    /**
     * Update current user profile
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function updateProfile(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        if (!$authUser) {
            return $this->errorResponse($response, 'Unauthorized', 401);
        }
        
        $params = $this->getParams($request);
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Update user fields
            $updateFields = [];
            $updateParams = [':id' => $authUser['id']];
            
            if (!empty($params['name'])) {
                $updateFields[] = 'name = :name';
                $updateParams[':name'] = $params['name'];
            }
            
            if (!empty($params['phone'])) {
                $updateFields[] = 'phone = :phone';
                $updateParams[':phone'] = $params['phone'];
            }
            
            // Update email if provided and not already taken
            if (!empty($params['email']) && $params['email'] !== $authUser['email']) {
                // Check if email already exists
                $stmt = $this->db->prepare('SELECT id FROM users WHERE email = :email AND id != :id');
                $stmt->bindParam(':email', $params['email']);
                $stmt->bindParam(':id', $authUser['id']);
                $stmt->execute();
                
                if ($stmt->fetch()) {
                    return $this->errorResponse($response, 'Email already exists', 400);
                }
                
                $updateFields[] = 'email = :email';
                $updateParams[':email'] = $params['email'];
                
                // Reset email verification if email is changed
                $updateFields[] = 'email_verified_at = NULL';
            }
            
            // If there are fields to update
            if (!empty($updateFields)) {
                $updateQuery = 'UPDATE users SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
                
                $stmt = $this->db->prepare($updateQuery);
                foreach ($updateParams as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                $stmt->execute();
            }
            
            // Update role-specific data
            switch ($authUser['role']) {
                case 'client':
                    if (!empty($params['client'])) {
                        // Get client ID
                        $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
                        $stmt->bindParam(':user_id', $authUser['id']);
                        $stmt->execute();
                        $clientData = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($clientData) {
                            $clientId = $clientData['id'];
                            $clientParams = $params['client'];
                            
                            $updateFields = [];
                            $updateParams = [':id' => $clientId];
                            
                            $clientFields = [
                                'company_name', 'address', 'city', 'province', 'postal_code',
                                'contact_person', 'contact_email', 'contact_phone', 'website', 'tax_id'
                            ];
                            
                            foreach ($clientFields as $field) {
                                if (isset($clientParams[$field])) {
                                    $updateFields[] = "$field = :$field";
                                    $updateParams[":$field"] = $clientParams[$field];
                                }
                            }
                            
                            if (!empty($updateFields)) {
                                $updateQuery = 'UPDATE clients SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
                                
                                $stmt = $this->db->prepare($updateQuery);
                                foreach ($updateParams as $key => $value) {
                                    $stmt->bindValue($key, $value);
                                }
                                $stmt->execute();
                            }
                        }
                    }
                    break;
                    
                case 'customer':
                    if (!empty($params['customer'])) {
                        // Get customer ID
                        $stmt = $this->db->prepare('SELECT id FROM customers WHERE user_id = :user_id');
                        $stmt->bindParam(':user_id', $authUser['id']);
                        $stmt->execute();
                        $customerData = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($customerData) {
                            $customerId = $customerData['id'];
                            $customerParams = $params['customer'];
                            
                            $updateFields = [];
                            $updateParams = [':id' => $customerId];
                            
                            $customerFields = [
                                'first_name', 'last_name', 'address', 'city', 'province', 'postal_code',
                                'phone', 'id_card_number'
                            ];
                            
                            foreach ($customerFields as $field) {
                                if (isset($customerParams[$field])) {
                                    $updateFields[] = "$field = :$field";
                                    $updateParams[":$field"] = $customerParams[$field];
                                }
                            }
                            
                            // Update email if user email was updated
                            if (!empty($params['email']) && $params['email'] !== $authUser['email']) {
                                $updateFields[] = "email = :email";
                                $updateParams[":email"] = $params['email'];
                            }
                            
                            if (!empty($updateFields)) {
                                $updateQuery = 'UPDATE customers SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
                                
                                $stmt = $this->db->prepare($updateQuery);
                                foreach ($updateParams as $key => $value) {
                                    $stmt->bindValue($key, $value);
                                }
                                $stmt->execute();
                            }
                        }
                    }
                    break;
            }
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'Profile updated successfully'
            ]);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to update profile: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update current user password
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function updatePassword(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        if (!$authUser) {
            return $this->errorResponse($response, 'Unauthorized', 401);
        }
        
        $params = $this->getParams($request);
        
        // Validate required fields
        if (empty($params['current_password']) || empty($params['new_password'])) {
            return $this->errorResponse($response, 'Current password and new password are required', 400);
        }
        
        // Get user with password
        $stmt = $this->db->prepare('SELECT password FROM users WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $authUser['id']);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return $this->errorResponse($response, 'User not found', 404);
        }
        
        // Verify current password
        if (!password_verify($params['current_password'], $user['password'])) {
            return $this->errorResponse($response, 'Current password is incorrect', 400);
        }
        
        // Hash new password
        $hashedPassword = password_hash($params['new_password'], PASSWORD_DEFAULT);
        
        // Update password
        $stmt = $this->db->prepare('UPDATE users SET password = :password WHERE id = :id');
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':id', $authUser['id']);
        $stmt->execute();
        
        return $this->successResponse($response, [
            'message' => 'Password updated successfully'
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
            'phone' => $user['phone'],
            'role' => $user['role'],
            'status' => $user['status'],
            'email_verified_at' => $user['email_verified_at'],
            'last_login_at' => $user['last_login_at'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at']
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
                    
                    // Get properties count
                    $stmt = $this->db->prepare('SELECT COUNT(*) FROM properties WHERE client_id = :client_id');
                    $stmt->bindParam(':client_id', $clientData['id']);
                    $stmt->execute();
                    $userData['client']['properties_count'] = (int) $stmt->fetchColumn();
                    
                    // Get customers count
                    $stmt = $this->db->prepare('SELECT COUNT(*) FROM customers WHERE client_id = :client_id');
                    $stmt->bindParam(':client_id', $clientData['id']);
                    $stmt->execute();
                    $userData['client']['customers_count'] = (int) $stmt->fetchColumn();
                    
                    // Get meters count
                    $stmt = $this->db->prepare('
                        SELECT COUNT(*) FROM meters m
                        JOIN customers c ON m.customer_id = c.id
                        WHERE c.client_id = :client_id
                    ');
                    $stmt->bindParam(':client_id', $clientData['id']);
                    $stmt->execute();
                    $userData['client']['meters_count'] = (int) $stmt->fetchColumn();
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