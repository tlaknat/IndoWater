<?php

declare(strict_types=1);

namespace IndoWater\Api\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use PDO;
use Ramsey\Uuid\Uuid;

class ClientController extends BaseController
{
    public function __construct(ContainerInterface $container, PDO $db)
    {
        parent::__construct($container, $db);
    }

    /**
     * Get all clients
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function index(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can list all clients)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        
        // Build query
        $query = 'SELECT c.*, u.name as user_name, u.email as user_email, u.status as user_status
                 FROM clients c
                 JOIN users u ON c.user_id = u.id
                 WHERE c.deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(*) FROM clients c JOIN users u ON c.user_id = u.id WHERE c.deleted_at IS NULL';
        $params = [];
        
        // Add filters
        if ($status) {
            $query .= ' AND c.status = :status';
            $countQuery .= ' AND c.status = :status';
            $params[':status'] = $status;
        }
        
        if ($search) {
            $query .= ' AND (c.company_name LIKE :search OR c.contact_person LIKE :search OR c.contact_email LIKE :search OR c.contact_phone LIKE :search)';
            $countQuery .= ' AND (c.company_name LIKE :search OR c.contact_person LIKE :search OR c.contact_email LIKE :search OR c.contact_phone LIKE :search)';
            $params[':search'] = "%$search%";
        }
        
        // Add pagination
        $query .= ' ORDER BY c.created_at DESC LIMIT :limit OFFSET :offset';
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
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get additional data for each client
        foreach ($clients as &$client) {
            // Get properties count
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM properties WHERE client_id = :client_id');
            $stmt->bindParam(':client_id', $client['id']);
            $stmt->execute();
            $client['properties_count'] = (int) $stmt->fetchColumn();
            
            // Get customers count
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM customers WHERE client_id = :client_id');
            $stmt->bindParam(':client_id', $client['id']);
            $stmt->execute();
            $client['customers_count'] = (int) $stmt->fetchColumn();
            
            // Get meters count
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM meters m
                JOIN customers c ON m.customer_id = c.id
                WHERE c.client_id = :client_id
            ');
            $stmt->bindParam(':client_id', $client['id']);
            $stmt->execute();
            $client['meters_count'] = (int) $stmt->fetchColumn();
        }
        
        // Calculate pagination metadata
        $totalPages = ceil($totalCount / $pagination['limit']);
        
        return $this->successResponse($response, [
            'clients' => $clients,
            'pagination' => [
                'total' => $totalCount,
                'per_page' => $pagination['limit'],
                'current_page' => $pagination['page'],
                'total_pages' => $totalPages
            ]
        ]);
    }

    /**
     * Get client by ID
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any client, client can only view themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get client
        $stmt = $this->db->prepare('
            SELECT c.*, u.name as user_name, u.email as user_email, u.status as user_status
            FROM clients c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = :id AND c.deleted_at IS NULL
        ');
        
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        $client = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$client) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Get properties count
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM properties WHERE client_id = :client_id');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $client['properties_count'] = (int) $stmt->fetchColumn();
        
        // Get customers count
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM customers WHERE client_id = :client_id');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $client['customers_count'] = (int) $stmt->fetchColumn();
        
        // Get meters count
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM meters m
            JOIN customers c ON m.customer_id = c.id
            WHERE c.client_id = :client_id
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $client['meters_count'] = (int) $stmt->fetchColumn();
        
        // Get payment gateway settings
        $stmt = $this->db->prepare('
            SELECT * FROM payment_gateway_settings
            WHERE client_id = :client_id
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $paymentGateways = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($paymentGateways) {
            $client['payment_gateways'] = $paymentGateways;
        }
        
        return $this->successResponse($response, [
            'client' => $client
        ]);
    }

    /**
     * Create new client
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function store(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can create clients)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        $params = $this->getParams($request);
        
        // Validate required fields
        $requiredFields = [
            'company_name', 'address', 'city', 'province', 'postal_code',
            'contact_person', 'contact_email', 'contact_phone'
        ];
        
        foreach ($requiredFields as $field) {
            if (empty($params[$field])) {
                return $this->errorResponse($response, "Field '$field' is required", 400);
            }
        }
        
        // Check if user account should be created
        $createUser = !empty($params['create_user']) && $params['create_user'] === true;
        $userId = null;
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // If creating a user account
            if ($createUser) {
                // Validate user fields
                if (empty($params['user_email']) || empty($params['user_password'])) {
                    return $this->errorResponse($response, 'User email and password are required', 400);
                }
                
                // Check if email already exists
                $stmt = $this->db->prepare('SELECT id FROM users WHERE email = :email');
                $stmt->bindParam(':email', $params['user_email']);
                $stmt->execute();
                
                if ($stmt->fetch()) {
                    return $this->errorResponse($response, 'Email already exists', 400);
                }
                
                // Generate UUID for user
                $userId = Uuid::uuid4()->toString();
                
                // Hash password
                $hashedPassword = password_hash($params['user_password'], PASSWORD_DEFAULT);
                
                // Insert user
                $stmt = $this->db->prepare('
                    INSERT INTO users (id, name, email, password, phone, role, status, email_verified_at)
                    VALUES (:id, :name, :email, :password, :phone, :role, :status, CURRENT_TIMESTAMP)
                ');
                
                $stmt->bindParam(':id', $userId);
                $stmt->bindParam(':name', $params['contact_person']);
                $stmt->bindParam(':email', $params['user_email']);
                $stmt->bindParam(':password', $hashedPassword);
                $stmt->bindParam(':phone', $params['contact_phone']);
                $stmt->bindValue(':role', 'client');
                $stmt->bindValue(':status', 'active');
                $stmt->execute();
            } else {
                // If not creating a user, check if user_id is provided
                if (empty($params['user_id'])) {
                    return $this->errorResponse($response, 'User ID is required', 400);
                }
                
                // Check if user exists and is not already a client
                $stmt = $this->db->prepare('
                    SELECT u.id, u.role FROM users u
                    LEFT JOIN clients c ON u.id = c.user_id
                    WHERE u.id = :user_id AND u.deleted_at IS NULL
                ');
                $stmt->bindParam(':user_id', $params['user_id']);
                $stmt->execute();
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$user) {
                    return $this->errorResponse($response, 'User not found', 404);
                }
                
                if ($user['role'] !== 'client') {
                    // Update user role to client
                    $stmt = $this->db->prepare('UPDATE users SET role = :role WHERE id = :id');
                    $stmt->bindValue(':role', 'client');
                    $stmt->bindParam(':id', $params['user_id']);
                    $stmt->execute();
                }
                
                $userId = $params['user_id'];
            }
            
            // Generate UUID for client
            $clientId = Uuid::uuid4()->toString();
            
            // Set default values
            $serviceFeeType = $params['service_fee_type'] ?? 'percentage';
            $serviceFeeValue = $params['service_fee_value'] ?? 5.00;
            $status = $params['status'] ?? 'active';
            
            // Insert client
            $stmt = $this->db->prepare('
                INSERT INTO clients (
                    id, user_id, company_name, address, city, province, postal_code,
                    contact_person, contact_email, contact_phone, logo, website, tax_id,
                    service_fee_type, service_fee_value, status
                )
                VALUES (
                    :id, :user_id, :company_name, :address, :city, :province, :postal_code,
                    :contact_person, :contact_email, :contact_phone, :logo, :website, :tax_id,
                    :service_fee_type, :service_fee_value, :status
                )
            ');
            
            $stmt->bindParam(':id', $clientId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':company_name', $params['company_name']);
            $stmt->bindParam(':address', $params['address']);
            $stmt->bindParam(':city', $params['city']);
            $stmt->bindParam(':province', $params['province']);
            $stmt->bindParam(':postal_code', $params['postal_code']);
            $stmt->bindParam(':contact_person', $params['contact_person']);
            $stmt->bindParam(':contact_email', $params['contact_email']);
            $stmt->bindParam(':contact_phone', $params['contact_phone']);
            $stmt->bindParam(':logo', $params['logo'] ?? null);
            $stmt->bindParam(':website', $params['website'] ?? null);
            $stmt->bindParam(':tax_id', $params['tax_id'] ?? null);
            $stmt->bindParam(':service_fee_type', $serviceFeeType);
            $stmt->bindParam(':service_fee_value', $serviceFeeValue);
            $stmt->bindParam(':status', $status);
            $stmt->execute();
            
            // Set up payment gateways if provided
            if (!empty($params['payment_gateways'])) {
                foreach ($params['payment_gateways'] as $gateway) {
                    if (empty($gateway['gateway']) || !in_array($gateway['gateway'], ['midtrans', 'doku'])) {
                        continue;
                    }
                    
                    $gatewayId = Uuid::uuid4()->toString();
                    $isActive = $gateway['is_active'] ?? false;
                    $isProduction = $gateway['is_production'] ?? false;
                    $credentials = json_encode($gateway['credentials'] ?? []);
                    
                    $stmt = $this->db->prepare('
                        INSERT INTO payment_gateway_settings (
                            id, client_id, gateway, is_active, is_production, credentials
                        )
                        VALUES (
                            :id, :client_id, :gateway, :is_active, :is_production, :credentials
                        )
                    ');
                    
                    $stmt->bindParam(':id', $gatewayId);
                    $stmt->bindParam(':client_id', $clientId);
                    $stmt->bindParam(':gateway', $gateway['gateway']);
                    $stmt->bindParam(':is_active', $isActive, PDO::PARAM_BOOL);
                    $stmt->bindParam(':is_production', $isProduction, PDO::PARAM_BOOL);
                    $stmt->bindParam(':credentials', $credentials);
                    $stmt->execute();
                }
            }
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'Client created successfully',
                'client_id' => $clientId,
                'user_id' => $userId
            ], 201);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to create client: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update client
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can update any client, client can only update themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        $client = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$client) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        $params = $this->getParams($request);
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Update client fields
            $updateFields = [];
            $updateParams = [':id' => $clientId];
            
            $clientFields = [
                'company_name', 'address', 'city', 'province', 'postal_code',
                'contact_person', 'contact_email', 'contact_phone', 'logo', 'website', 'tax_id'
            ];
            
            foreach ($clientFields as $field) {
                if (isset($params[$field])) {
                    $updateFields[] = "$field = :$field";
                    $updateParams[":$field"] = $params[$field];
                }
            }
            
            // Only superadmin can update service fee and status
            if ($authUser['role'] === 'superadmin') {
                if (isset($params['service_fee_type'])) {
                    $updateFields[] = "service_fee_type = :service_fee_type";
                    $updateParams[":service_fee_type"] = $params['service_fee_type'];
                }
                
                if (isset($params['service_fee_value'])) {
                    $updateFields[] = "service_fee_value = :service_fee_value";
                    $updateParams[":service_fee_value"] = $params['service_fee_value'];
                }
                
                if (isset($params['status'])) {
                    $updateFields[] = "status = :status";
                    $updateParams[":status"] = $params['status'];
                }
            }
            
            // If there are fields to update
            if (!empty($updateFields)) {
                $updateQuery = 'UPDATE clients SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
                
                $stmt = $this->db->prepare($updateQuery);
                foreach ($updateParams as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                $stmt->execute();
            }
            
            // Update payment gateways if provided (only superadmin or client)
            if (!empty($params['payment_gateways'])) {
                foreach ($params['payment_gateways'] as $gateway) {
                    if (empty($gateway['gateway']) || !in_array($gateway['gateway'], ['midtrans', 'doku'])) {
                        continue;
                    }
                    
                    // Check if gateway setting already exists
                    $stmt = $this->db->prepare('
                        SELECT id FROM payment_gateway_settings
                        WHERE client_id = :client_id AND gateway = :gateway
                    ');
                    $stmt->bindParam(':client_id', $clientId);
                    $stmt->bindParam(':gateway', $gateway['gateway']);
                    $stmt->execute();
                    $gatewayId = $stmt->fetchColumn();
                    
                    $isActive = $gateway['is_active'] ?? false;
                    $isProduction = $gateway['is_production'] ?? false;
                    $credentials = json_encode($gateway['credentials'] ?? []);
                    
                    if ($gatewayId) {
                        // Update existing gateway
                        $stmt = $this->db->prepare('
                            UPDATE payment_gateway_settings
                            SET is_active = :is_active, is_production = :is_production, credentials = :credentials
                            WHERE id = :id
                        ');
                        $stmt->bindParam(':id', $gatewayId);
                        $stmt->bindParam(':is_active', $isActive, PDO::PARAM_BOOL);
                        $stmt->bindParam(':is_production', $isProduction, PDO::PARAM_BOOL);
                        $stmt->bindParam(':credentials', $credentials);
                        $stmt->execute();
                    } else {
                        // Create new gateway
                        $gatewayId = Uuid::uuid4()->toString();
                        
                        $stmt = $this->db->prepare('
                            INSERT INTO payment_gateway_settings (
                                id, client_id, gateway, is_active, is_production, credentials
                            )
                            VALUES (
                                :id, :client_id, :gateway, :is_active, :is_production, :credentials
                            )
                        ');
                        
                        $stmt->bindParam(':id', $gatewayId);
                        $stmt->bindParam(':client_id', $clientId);
                        $stmt->bindParam(':gateway', $gateway['gateway']);
                        $stmt->bindParam(':is_active', $isActive, PDO::PARAM_BOOL);
                        $stmt->bindParam(':is_production', $isProduction, PDO::PARAM_BOOL);
                        $stmt->bindParam(':credentials', $credentials);
                        $stmt->execute();
                    }
                }
            }
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'Client updated successfully'
            ]);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to update client: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete client
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can delete clients)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        $client = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$client) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Soft delete client
            $stmt = $this->db->prepare('UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id');
            $stmt->bindParam(':id', $clientId);
            $stmt->execute();
            
            // Soft delete user
            $stmt = $this->db->prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id');
            $stmt->bindParam(':id', $client['user_id']);
            $stmt->execute();
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'Client deleted successfully'
            ]);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to delete client: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Activate client
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function activate(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can activate clients)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        $client = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$client) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Update client status
            $stmt = $this->db->prepare('UPDATE clients SET status = :status WHERE id = :id');
            $stmt->bindValue(':status', 'active');
            $stmt->bindParam(':id', $clientId);
            $stmt->execute();
            
            // Update user status
            $stmt = $this->db->prepare('UPDATE users SET status = :status WHERE id = :id');
            $stmt->bindValue(':status', 'active');
            $stmt->bindParam(':id', $client['user_id']);
            $stmt->execute();
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'Client activated successfully'
            ]);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to activate client: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Deactivate client
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function deactivate(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (only superadmin can deactivate clients)
        if ($authUser['role'] !== 'superadmin') {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        $client = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$client) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Begin transaction
        $this->db->beginTransaction();
        
        try {
            // Update client status
            $stmt = $this->db->prepare('UPDATE clients SET status = :status WHERE id = :id');
            $stmt->bindValue(':status', 'inactive');
            $stmt->bindParam(':id', $clientId);
            $stmt->execute();
            
            // Update user status
            $stmt = $this->db->prepare('UPDATE users SET status = :status WHERE id = :id');
            $stmt->bindValue(':status', 'inactive');
            $stmt->bindParam(':id', $client['user_id']);
            $stmt->execute();
            
            // Commit transaction
            $this->db->commit();
            
            return $this->successResponse($response, [
                'message' => 'Client deactivated successfully'
            ]);
            
        } catch (\PDOException $e) {
            // Rollback transaction
            $this->db->rollBack();
            
            return $this->errorResponse($response, 'Failed to deactivate client: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get client properties
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function properties(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any client, client can only view themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $type = $queryParams['type'] ?? null;
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        
        // Build query
        $query = 'SELECT * FROM properties WHERE client_id = :client_id AND deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(*) FROM properties WHERE client_id = :client_id AND deleted_at IS NULL';
        $params = [':client_id' => $clientId];
        
        // Add filters
        if ($type) {
            $query .= ' AND type = :type';
            $countQuery .= ' AND type = :type';
            $params[':type'] = $type;
        }
        
        if ($status) {
            $query .= ' AND status = :status';
            $countQuery .= ' AND status = :status';
            $params[':status'] = $status;
        }
        
        if ($search) {
            $query .= ' AND (name LIKE :search OR address LIKE :search OR city LIKE :search)';
            $countQuery .= ' AND (name LIKE :search OR address LIKE :search OR city LIKE :search)';
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
        $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get additional data for each property
        foreach ($properties as &$property) {
            // Get customers count
            $stmt = $this->db->prepare('
                SELECT COUNT(*) FROM meters
                WHERE property_id = :property_id
            ');
            $stmt->bindParam(':property_id', $property['id']);
            $stmt->execute();
            $property['meters_count'] = (int) $stmt->fetchColumn();
        }
        
        // Calculate pagination metadata
        $totalPages = ceil($totalCount / $pagination['limit']);
        
        return $this->successResponse($response, [
            'properties' => $properties,
            'pagination' => [
                'total' => $totalCount,
                'per_page' => $pagination['limit'],
                'current_page' => $pagination['page'],
                'total_pages' => $totalPages
            ]
        ]);
    }

    /**
     * Get client customers
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function customers(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any client, client can only view themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        
        // Build query
        $query = 'SELECT c.*, u.name as user_name, u.email as user_email, u.status as user_status
                 FROM customers c
                 JOIN users u ON c.user_id = u.id
                 WHERE c.client_id = :client_id AND c.deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(*) FROM customers c JOIN users u ON c.user_id = u.id WHERE c.client_id = :client_id AND c.deleted_at IS NULL';
        $params = [':client_id' => $clientId];
        
        // Add filters
        if ($status) {
            $query .= ' AND c.status = :status';
            $countQuery .= ' AND c.status = :status';
            $params[':status'] = $status;
        }
        
        if ($search) {
            $query .= ' AND (c.first_name LIKE :search OR c.last_name LIKE :search OR c.customer_number LIKE :search OR c.email LIKE :search OR c.phone LIKE :search)';
            $countQuery .= ' AND (c.first_name LIKE :search OR c.last_name LIKE :search OR c.customer_number LIKE :search OR c.email LIKE :search OR c.phone LIKE :search)';
            $params[':search'] = "%$search%";
        }
        
        // Add pagination
        $query .= ' ORDER BY c.created_at DESC LIMIT :limit OFFSET :offset';
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
        $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get additional data for each customer
        foreach ($customers as &$customer) {
            // Get meters count
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM meters WHERE customer_id = :customer_id');
            $stmt->bindParam(':customer_id', $customer['id']);
            $stmt->execute();
            $customer['meters_count'] = (int) $stmt->fetchColumn();
        }
        
        // Calculate pagination metadata
        $totalPages = ceil($totalCount / $pagination['limit']);
        
        return $this->successResponse($response, [
            'customers' => $customers,
            'pagination' => [
                'total' => $totalCount,
                'per_page' => $pagination['limit'],
                'current_page' => $pagination['page'],
                'total_pages' => $totalPages
            ]
        ]);
    }

    /**
     * Get client meters
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function meters(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any client, client can only view themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        $propertyId = $queryParams['property_id'] ?? null;
        $customerId = $queryParams['customer_id'] ?? null;
        
        // Build query
        $query = 'SELECT m.*, c.first_name, c.last_name, c.customer_number, p.name as property_name
                 FROM meters m
                 JOIN customers c ON m.customer_id = c.id
                 JOIN properties p ON m.property_id = p.id
                 WHERE c.client_id = :client_id AND m.deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(*) FROM meters m JOIN customers c ON m.customer_id = c.id WHERE c.client_id = :client_id AND m.deleted_at IS NULL';
        $params = [':client_id' => $clientId];
        
        // Add filters
        if ($status) {
            $query .= ' AND m.status = :status';
            $countQuery .= ' AND m.status = :status';
            $params[':status'] = $status;
        }
        
        if ($search) {
            $query .= ' AND (m.meter_id LIKE :search OR m.meter_serial LIKE :search OR c.first_name LIKE :search OR c.last_name LIKE :search OR c.customer_number LIKE :search)';
            $countQuery .= ' AND (m.meter_id LIKE :search OR m.meter_serial LIKE :search OR c.first_name LIKE :search OR c.last_name LIKE :search OR c.customer_number LIKE :search)';
            $params[':search'] = "%$search%";
        }
        
        if ($propertyId) {
            $query .= ' AND m.property_id = :property_id';
            $countQuery .= ' AND m.property_id = :property_id';
            $params[':property_id'] = $propertyId;
        }
        
        if ($customerId) {
            $query .= ' AND m.customer_id = :customer_id';
            $countQuery .= ' AND m.customer_id = :customer_id';
            $params[':customer_id'] = $customerId;
        }
        
        // Add pagination
        $query .= ' ORDER BY m.created_at DESC LIMIT :limit OFFSET :offset';
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
        $meters = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate pagination metadata
        $totalPages = ceil($totalCount / $pagination['limit']);
        
        return $this->successResponse($response, [
            'meters' => $meters,
            'pagination' => [
                'total' => $totalCount,
                'per_page' => $pagination['limit'],
                'current_page' => $pagination['page'],
                'total_pages' => $totalPages
            ]
        ]);
    }

    /**
     * Get client payments
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function payments(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any client, client can only view themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $status = $queryParams['status'] ?? null;
        $paymentMethod = $queryParams['payment_method'] ?? null;
        $paymentGateway = $queryParams['payment_gateway'] ?? null;
        $startDate = $queryParams['start_date'] ?? null;
        $endDate = $queryParams['end_date'] ?? null;
        $customerId = $queryParams['customer_id'] ?? null;
        
        // Build query
        $query = 'SELECT p.*, c.first_name, c.last_name, c.customer_number
                 FROM payments p
                 JOIN customers c ON p.customer_id = c.id
                 WHERE c.client_id = :client_id';
        $countQuery = 'SELECT COUNT(*) FROM payments p JOIN customers c ON p.customer_id = c.id WHERE c.client_id = :client_id';
        $params = [':client_id' => $clientId];
        
        // Add filters
        if ($status) {
            $query .= ' AND p.status = :status';
            $countQuery .= ' AND p.status = :status';
            $params[':status'] = $status;
        }
        
        if ($paymentMethod) {
            $query .= ' AND p.payment_method = :payment_method';
            $countQuery .= ' AND p.payment_method = :payment_method';
            $params[':payment_method'] = $paymentMethod;
        }
        
        if ($paymentGateway) {
            $query .= ' AND p.payment_gateway = :payment_gateway';
            $countQuery .= ' AND p.payment_gateway = :payment_gateway';
            $params[':payment_gateway'] = $paymentGateway;
        }
        
        if ($startDate) {
            $query .= ' AND DATE(p.created_at) >= :start_date';
            $countQuery .= ' AND DATE(p.created_at) >= :start_date';
            $params[':start_date'] = $startDate;
        }
        
        if ($endDate) {
            $query .= ' AND DATE(p.created_at) <= :end_date';
            $countQuery .= ' AND DATE(p.created_at) <= :end_date';
            $params[':end_date'] = $endDate;
        }
        
        if ($customerId) {
            $query .= ' AND p.customer_id = :customer_id';
            $countQuery .= ' AND p.customer_id = :customer_id';
            $params[':customer_id'] = $customerId;
        }
        
        // Add pagination
        $query .= ' ORDER BY p.created_at DESC LIMIT :limit OFFSET :offset';
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
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get credit details for each payment
        foreach ($payments as &$payment) {
            if ($payment['credit_id']) {
                $stmt = $this->db->prepare('
                    SELECT cr.*, m.meter_id
                    FROM credits cr
                    JOIN meters m ON cr.meter_id = m.id
                    WHERE cr.id = :credit_id
                ');
                $stmt->bindParam(':credit_id', $payment['credit_id']);
                $stmt->execute();
                $credit = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($credit) {
                    $payment['credit'] = $credit;
                }
            }
        }
        
        // Calculate pagination metadata
        $totalPages = ceil($totalCount / $pagination['limit']);
        
        return $this->successResponse($response, [
            'payments' => $payments,
            'pagination' => [
                'total' => $totalCount,
                'per_page' => $pagination['limit'],
                'current_page' => $pagination['page'],
                'total_pages' => $totalPages
            ]
        ]);
    }

    /**
     * Get client reports
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function reports(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any client, client can only view themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Get query parameters
        $queryParams = $this->getQueryParams($request);
        $startDate = $queryParams['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $queryParams['end_date'] ?? date('Y-m-d');
        
        // Get summary data
        $summary = [
            'total_customers' => 0,
            'total_meters' => 0,
            'total_properties' => 0,
            'total_revenue' => 0,
            'total_consumption' => 0,
            'total_service_fees' => 0
        ];
        
        // Get total customers
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM customers WHERE client_id = :client_id AND deleted_at IS NULL');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $summary['total_customers'] = (int) $stmt->fetchColumn();
        
        // Get total meters
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM meters m
            JOIN customers c ON m.customer_id = c.id
            WHERE c.client_id = :client_id AND m.deleted_at IS NULL
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $summary['total_meters'] = (int) $stmt->fetchColumn();
        
        // Get total properties
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM properties WHERE client_id = :client_id AND deleted_at IS NULL');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $summary['total_properties'] = (int) $stmt->fetchColumn();
        
        // Get total revenue (payments)
        $stmt = $this->db->prepare('
            SELECT SUM(p.amount) FROM payments p
            JOIN customers c ON p.customer_id = c.id
            WHERE c.client_id = :client_id
            AND p.status = "success"
            AND DATE(p.created_at) BETWEEN :start_date AND :end_date
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        $summary['total_revenue'] = (float) $stmt->fetchColumn() ?: 0;
        
        // Get total consumption
        $stmt = $this->db->prepare('
            SELECT SUM(mr.reading - COALESCE(LAG(mr.reading) OVER (PARTITION BY mr.meter_id ORDER BY mr.created_at), 0)) as total_consumption
            FROM meter_readings mr
            JOIN meters m ON mr.meter_id = m.id
            JOIN customers c ON m.customer_id = c.id
            WHERE c.client_id = :client_id
            AND DATE(mr.created_at) BETWEEN :start_date AND :end_date
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        $summary['total_consumption'] = (float) $stmt->fetchColumn() ?: 0;
        
        // Get total service fees
        $stmt = $this->db->prepare('
            SELECT SUM(sf.amount) FROM service_fees sf
            WHERE sf.client_id = :client_id
            AND DATE(sf.created_at) BETWEEN :start_date AND :end_date
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        $summary['total_service_fees'] = (float) $stmt->fetchColumn() ?: 0;
        
        // Get monthly revenue data
        $stmt = $this->db->prepare('
            SELECT 
                DATE_FORMAT(p.created_at, "%Y-%m") as month,
                SUM(p.amount) as revenue
            FROM payments p
            JOIN customers c ON p.customer_id = c.id
            WHERE c.client_id = :client_id
            AND p.status = "success"
            AND DATE(p.created_at) BETWEEN :start_date AND :end_date
            GROUP BY DATE_FORMAT(p.created_at, "%Y-%m")
            ORDER BY month
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        $revenueByMonth = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get monthly consumption data
        $stmt = $this->db->prepare('
            SELECT 
                DATE_FORMAT(mr.created_at, "%Y-%m") as month,
                SUM(mr.reading - COALESCE(LAG(mr.reading) OVER (PARTITION BY mr.meter_id ORDER BY mr.created_at), 0)) as consumption
            FROM meter_readings mr
            JOIN meters m ON mr.meter_id = m.id
            JOIN customers c ON m.customer_id = c.id
            WHERE c.client_id = :client_id
            AND DATE(mr.created_at) BETWEEN :start_date AND :end_date
            GROUP BY DATE_FORMAT(mr.created_at, "%Y-%m")
            ORDER BY month
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        $consumptionByMonth = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get property type distribution
        $stmt = $this->db->prepare('
            SELECT 
                type,
                COUNT(*) as count
            FROM properties
            WHERE client_id = :client_id
            AND deleted_at IS NULL
            GROUP BY type
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->execute();
        $propertyTypeDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get payment method distribution
        $stmt = $this->db->prepare('
            SELECT 
                p.payment_method,
                COUNT(*) as count,
                SUM(p.amount) as total_amount
            FROM payments p
            JOIN customers c ON p.customer_id = c.id
            WHERE c.client_id = :client_id
            AND p.status = "success"
            AND DATE(p.created_at) BETWEEN :start_date AND :end_date
            GROUP BY p.payment_method
        ');
        $stmt->bindParam(':client_id', $clientId);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        $stmt->execute();
        $paymentMethodDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->successResponse($response, [
            'summary' => $summary,
            'revenue_by_month' => $revenueByMonth,
            'consumption_by_month' => $consumptionByMonth,
            'property_type_distribution' => $propertyTypeDistribution,
            'payment_method_distribution' => $paymentMethodDistribution,
            'date_range' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]
        ]);
    }

    /**
     * Get client invoices
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function invoices(Request $request, Response $response, array $args): Response
    {
        $clientId = $args['id'] ?? '';
        
        if (empty($clientId)) {
            return $this->errorResponse($response, 'Client ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission (superadmin can view any client, client can only view themselves)
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $userClientId = $stmt->fetchColumn();
            
            if ($userClientId === $clientId) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if client exists
        $stmt = $this->db->prepare('SELECT * FROM clients WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $clientId);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            return $this->errorResponse($response, 'Client not found', 404);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $status = $queryParams['status'] ?? null;
        $startDate = $queryParams['start_date'] ?? null;
        $endDate = $queryParams['end_date'] ?? null;
        
        // Build query
        $query = 'SELECT * FROM invoices WHERE client_id = :client_id';
        $countQuery = 'SELECT COUNT(*) FROM invoices WHERE client_id = :client_id';
        $params = [':client_id' => $clientId];
        
        // Add filters
        if ($status) {
            $query .= ' AND status = :status';
            $countQuery .= ' AND status = :status';
            $params[':status'] = $status;
        }
        
        if ($startDate) {
            $query .= ' AND issue_date >= :start_date';
            $countQuery .= ' AND issue_date >= :start_date';
            $params[':start_date'] = $startDate;
        }
        
        if ($endDate) {
            $query .= ' AND issue_date <= :end_date';
            $countQuery .= ' AND issue_date <= :end_date';
            $params[':end_date'] = $endDate;
        }
        
        // Add pagination
        $query .= ' ORDER BY issue_date DESC LIMIT :limit OFFSET :offset';
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
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get invoice items for each invoice
        foreach ($invoices as &$invoice) {
            $stmt = $this->db->prepare('SELECT * FROM invoice_items WHERE invoice_id = :invoice_id');
            $stmt->bindParam(':invoice_id', $invoice['id']);
            $stmt->execute();
            $invoice['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Calculate pagination metadata
        $totalPages = ceil($totalCount / $pagination['limit']);
        
        return $this->successResponse($response, [
            'invoices' => $invoices,
            'pagination' => [
                'total' => $totalCount,
                'per_page' => $pagination['limit'],
                'current_page' => $pagination['page'],
                'total_pages' => $totalPages
            ]
        ]);
    }
}