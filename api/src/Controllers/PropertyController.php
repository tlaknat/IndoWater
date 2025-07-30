<?php

declare(strict_types=1);

namespace IndoWater\Api\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use PDO;
use Ramsey\Uuid\Uuid;

class PropertyController extends BaseController
{
    public function __construct(ContainerInterface $container, PDO $db)
    {
        parent::__construct($container, $db);
    }

    /**
     * Get all properties
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function index(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Check if user has permission
        $clientId = null;
        
        if ($authUser['role'] === 'superadmin') {
            // Superadmin can view all properties
        } elseif ($authUser['role'] === 'client') {
            // Client can only view their own properties
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $clientId = $stmt->fetchColumn();
            
            if (!$clientId) {
                return $this->errorResponse($response, 'Unauthorized', 403);
            }
        } else {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $type = $queryParams['type'] ?? null;
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        $clientIdParam = $queryParams['client_id'] ?? null;
        
        // If client_id is provided in query and user is superadmin, use it
        if ($authUser['role'] === 'superadmin' && $clientIdParam) {
            $clientId = $clientIdParam;
        }
        
        // Build query
        $query = 'SELECT p.*, c.company_name as client_name
                 FROM properties p
                 JOIN clients c ON p.client_id = c.id
                 WHERE p.deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(*) FROM properties p JOIN clients c ON p.client_id = c.id WHERE p.deleted_at IS NULL';
        $params = [];
        
        // Add client filter if needed
        if ($clientId) {
            $query .= ' AND p.client_id = :client_id';
            $countQuery .= ' AND p.client_id = :client_id';
            $params[':client_id'] = $clientId;
        }
        
        // Add filters
        if ($type) {
            $query .= ' AND p.type = :type';
            $countQuery .= ' AND p.type = :type';
            $params[':type'] = $type;
        }
        
        if ($status) {
            $query .= ' AND p.status = :status';
            $countQuery .= ' AND p.status = :status';
            $params[':status'] = $status;
        }
        
        if ($search) {
            $query .= ' AND (p.name LIKE :search OR p.address LIKE :search OR p.city LIKE :search)';
            $countQuery .= ' AND (p.name LIKE :search OR p.address LIKE :search OR p.city LIKE :search)';
            $params[':search'] = "%$search%";
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
        $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get additional data for each property
        foreach ($properties as &$property) {
            // Get meters count
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
     * Get property by ID
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $propertyId = $args['id'] ?? '';
        
        if (empty($propertyId)) {
            return $this->errorResponse($response, 'Property ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Get property
        $stmt = $this->db->prepare('
            SELECT p.*, c.company_name as client_name
            FROM properties p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = :id AND p.deleted_at IS NULL
        ');
        
        $stmt->bindParam(':id', $propertyId);
        $stmt->execute();
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$property) {
            return $this->errorResponse($response, 'Property not found', 404);
        }
        
        // Check if user has permission
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Client can only view their own properties
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $clientId = $stmt->fetchColumn();
            
            if ($clientId === $property['client_id']) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get meters count
        $stmt = $this->db->prepare('
            SELECT COUNT(*) FROM meters
            WHERE property_id = :property_id
        ');
        $stmt->bindParam(':property_id', $propertyId);
        $stmt->execute();
        $property['meters_count'] = (int) $stmt->fetchColumn();
        
        return $this->successResponse($response, [
            'property' => $property
        ]);
    }

    /**
     * Create new property
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function store(Request $request, Response $response): Response
    {
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        $params = $this->getParams($request);
        
        // Validate required fields
        $requiredFields = [
            'name', 'type', 'address', 'city', 'province', 'postal_code'
        ];
        
        foreach ($requiredFields as $field) {
            if (empty($params[$field])) {
                return $this->errorResponse($response, "Field '$field' is required", 400);
            }
        }
        
        // Determine client_id based on user role
        $clientId = null;
        
        if ($authUser['role'] === 'superadmin') {
            // Superadmin must provide client_id
            if (empty($params['client_id'])) {
                return $this->errorResponse($response, 'Client ID is required', 400);
            }
            
            // Check if client exists
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE id = :id AND deleted_at IS NULL');
            $stmt->bindParam(':id', $params['client_id']);
            $stmt->execute();
            
            if (!$stmt->fetch()) {
                return $this->errorResponse($response, 'Client not found', 404);
            }
            
            $clientId = $params['client_id'];
        } elseif ($authUser['role'] === 'client') {
            // Get client ID for the authenticated user
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $clientId = $stmt->fetchColumn();
            
            if (!$clientId) {
                return $this->errorResponse($response, 'Client not found for this user', 404);
            }
        } else {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Generate UUID
        $propertyId = Uuid::uuid4()->toString();
        
        // Set default values
        $status = $params['status'] ?? 'active';
        
        // Insert property
        $stmt = $this->db->prepare('
            INSERT INTO properties (
                id, client_id, name, type, address, city, province, postal_code,
                latitude, longitude, status
            )
            VALUES (
                :id, :client_id, :name, :type, :address, :city, :province, :postal_code,
                :latitude, :longitude, :status
            )
        ');
        
        $stmt->bindParam(':id', $propertyId);
        $stmt->bindParam(':client_id', $clientId);
        $stmt->bindParam(':name', $params['name']);
        $stmt->bindParam(':type', $params['type']);
        $stmt->bindParam(':address', $params['address']);
        $stmt->bindParam(':city', $params['city']);
        $stmt->bindParam(':province', $params['province']);
        $stmt->bindParam(':postal_code', $params['postal_code']);
        $stmt->bindParam(':latitude', $params['latitude'] ?? null);
        $stmt->bindParam(':longitude', $params['longitude'] ?? null);
        $stmt->bindParam(':status', $status);
        
        try {
            $stmt->execute();
            
            return $this->successResponse($response, [
                'message' => 'Property created successfully',
                'property_id' => $propertyId
            ], 201);
            
        } catch (\PDOException $e) {
            return $this->errorResponse($response, 'Failed to create property: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update property
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $propertyId = $args['id'] ?? '';
        
        if (empty($propertyId)) {
            return $this->errorResponse($response, 'Property ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Get property
        $stmt = $this->db->prepare('SELECT * FROM properties WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $propertyId);
        $stmt->execute();
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$property) {
            return $this->errorResponse($response, 'Property not found', 404);
        }
        
        // Check if user has permission
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Client can only update their own properties
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $clientId = $stmt->fetchColumn();
            
            if ($clientId === $property['client_id']) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        $params = $this->getParams($request);
        
        // Update property fields
        $updateFields = [];
        $updateParams = [':id' => $propertyId];
        
        $propertyFields = [
            'name', 'type', 'address', 'city', 'province', 'postal_code',
            'latitude', 'longitude', 'status'
        ];
        
        foreach ($propertyFields as $field) {
            if (isset($params[$field])) {
                $updateFields[] = "$field = :$field";
                $updateParams[":$field"] = $params[$field];
            }
        }
        
        // If there are fields to update
        if (!empty($updateFields)) {
            $updateQuery = 'UPDATE properties SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
            
            $stmt = $this->db->prepare($updateQuery);
            foreach ($updateParams as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            try {
                $stmt->execute();
                
                return $this->successResponse($response, [
                    'message' => 'Property updated successfully'
                ]);
                
            } catch (\PDOException $e) {
                return $this->errorResponse($response, 'Failed to update property: ' . $e->getMessage(), 500);
            }
        }
        
        return $this->successResponse($response, [
            'message' => 'No changes to update'
        ]);
    }

    /**
     * Delete property
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $propertyId = $args['id'] ?? '';
        
        if (empty($propertyId)) {
            return $this->errorResponse($response, 'Property ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Get property
        $stmt = $this->db->prepare('SELECT * FROM properties WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $propertyId);
        $stmt->execute();
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$property) {
            return $this->errorResponse($response, 'Property not found', 404);
        }
        
        // Check if user has permission
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Client can only delete their own properties
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $clientId = $stmt->fetchColumn();
            
            if ($clientId === $property['client_id']) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Check if property has meters
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM meters WHERE property_id = :property_id');
        $stmt->bindParam(':property_id', $propertyId);
        $stmt->execute();
        $metersCount = (int) $stmt->fetchColumn();
        
        if ($metersCount > 0) {
            return $this->errorResponse($response, 'Cannot delete property with associated meters', 400);
        }
        
        // Soft delete property
        $stmt = $this->db->prepare('UPDATE properties SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id');
        $stmt->bindParam(':id', $propertyId);
        
        try {
            $stmt->execute();
            
            return $this->successResponse($response, [
                'message' => 'Property deleted successfully'
            ]);
            
        } catch (\PDOException $e) {
            return $this->errorResponse($response, 'Failed to delete property: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get property meters
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function meters(Request $request, Response $response, array $args): Response
    {
        $propertyId = $args['id'] ?? '';
        
        if (empty($propertyId)) {
            return $this->errorResponse($response, 'Property ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Get property
        $stmt = $this->db->prepare('SELECT * FROM properties WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $propertyId);
        $stmt->execute();
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$property) {
            return $this->errorResponse($response, 'Property not found', 404);
        }
        
        // Check if user has permission
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Client can only view their own properties
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $clientId = $stmt->fetchColumn();
            
            if ($clientId === $property['client_id']) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        
        // Build query
        $query = 'SELECT m.*, c.first_name, c.last_name, c.customer_number
                 FROM meters m
                 JOIN customers c ON m.customer_id = c.id
                 WHERE m.property_id = :property_id AND m.deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(*) FROM meters m WHERE m.property_id = :property_id AND m.deleted_at IS NULL';
        $params = [':property_id' => $propertyId];
        
        // Add filters
        if ($status) {
            $query .= ' AND m.status = :status';
            $countQuery .= ' AND m.status = :status';
            $params[':status'] = $status;
        }
        
        if ($search) {
            $query .= ' AND (m.meter_id LIKE :search OR m.meter_serial LIKE :search)';
            $countQuery .= ' AND (m.meter_id LIKE :search OR m.meter_serial LIKE :search)';
            $params[':search'] = "%$search%";
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
     * Get property customers
     *
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     */
    public function customers(Request $request, Response $response, array $args): Response
    {
        $propertyId = $args['id'] ?? '';
        
        if (empty($propertyId)) {
            return $this->errorResponse($response, 'Property ID is required', 400);
        }
        
        // Get authenticated user
        $authUser = $request->getAttribute('user');
        
        // Get property
        $stmt = $this->db->prepare('SELECT * FROM properties WHERE id = :id AND deleted_at IS NULL');
        $stmt->bindParam(':id', $propertyId);
        $stmt->execute();
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$property) {
            return $this->errorResponse($response, 'Property not found', 404);
        }
        
        // Check if user has permission
        $hasAccess = false;
        
        if ($authUser['role'] === 'superadmin') {
            $hasAccess = true;
        } elseif ($authUser['role'] === 'client') {
            // Client can only view their own properties
            $stmt = $this->db->prepare('SELECT id FROM clients WHERE user_id = :user_id');
            $stmt->bindParam(':user_id', $authUser['id']);
            $stmt->execute();
            $clientId = $stmt->fetchColumn();
            
            if ($clientId === $property['client_id']) {
                $hasAccess = true;
            }
        }
        
        if (!$hasAccess) {
            return $this->errorResponse($response, 'Unauthorized', 403);
        }
        
        // Get pagination parameters
        $pagination = $this->getPaginationParams($request);
        
        // Get query parameters for filtering
        $queryParams = $this->getQueryParams($request);
        $status = $queryParams['status'] ?? null;
        $search = $queryParams['search'] ?? null;
        
        // Build query
        $query = 'SELECT DISTINCT c.*, u.name as user_name, u.email as user_email
                 FROM customers c
                 JOIN users u ON c.user_id = u.id
                 JOIN meters m ON c.id = m.customer_id
                 WHERE m.property_id = :property_id AND c.deleted_at IS NULL';
        $countQuery = 'SELECT COUNT(DISTINCT c.id) FROM customers c JOIN meters m ON c.id = m.customer_id WHERE m.property_id = :property_id AND c.deleted_at IS NULL';
        $params = [':property_id' => $propertyId];
        
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
        
        // Get meters for each customer in this property
        foreach ($customers as &$customer) {
            $stmt = $this->db->prepare('
                SELECT * FROM meters
                WHERE customer_id = :customer_id AND property_id = :property_id
            ');
            $stmt->bindParam(':customer_id', $customer['id']);
            $stmt->bindParam(':property_id', $propertyId);
            $stmt->execute();
            $customer['meters'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
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
}