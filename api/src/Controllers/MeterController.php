<?php

namespace IndoWater\Api\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use PDO;
use PDOException;
use Slim\Exception\HttpNotFoundException;
use Slim\Exception\HttpBadRequestException;
use Slim\Exception\HttpForbiddenException;

class MeterController extends BaseController
{
    /**
     * Get all meters
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Build the base query
        $sql = "SELECT m.*, p.name as property_name, c.name as customer_name, c.unit_number 
                FROM meters m
                LEFT JOIN properties p ON m.property_id = p.id
                LEFT JOIN customers c ON m.customer_id = c.id
                WHERE 1=1";
        
        $queryParams = [];
        
        // Apply filters based on user role
        if ($userRole === 'client') {
            $sql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            $queryParams[':user_id'] = $userId;
        } elseif ($userRole === 'customer') {
            $sql .= " AND c.user_id = :user_id";
            $queryParams[':user_id'] = $userId;
        }
        
        // Apply additional filters from query parameters
        if (isset($params['property_id'])) {
            $sql .= " AND m.property_id = :property_id";
            $queryParams[':property_id'] = $params['property_id'];
        }
        
        if (isset($params['customer_id'])) {
            $sql .= " AND m.customer_id = :customer_id";
            $queryParams[':customer_id'] = $params['customer_id'];
        }
        
        if (isset($params['status'])) {
            $sql .= " AND m.status = :status";
            $queryParams[':status'] = $params['status'];
        }
        
        // Add ordering
        $sql .= " ORDER BY m.created_at DESC";
        
        // Add pagination
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 10;
        $offset = ($page - 1) * $limit;
        
        $sql .= " LIMIT :limit OFFSET :offset";
        $queryParams[':limit'] = $limit;
        $queryParams[':offset'] = $offset;
        
        try {
            $db = $this->container->get(PDO::class);
            $stmt = $db->prepare($sql);
            
            foreach ($queryParams as $param => $value) {
                $paramType = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $stmt->bindValue($param, $value, $paramType);
            }
            
            $stmt->execute();
            $meters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get total count for pagination
            $countSql = str_replace('SELECT m.*, p.name as property_name, c.name as customer_name, c.unit_number', 'SELECT COUNT(*) as total', $sql);
            $countSql = preg_replace('/LIMIT\s+:limit\s+OFFSET\s+:offset/i', '', $countSql);
            
            $countStmt = $db->prepare($countSql);
            foreach ($queryParams as $param => $value) {
                if ($param !== ':limit' && $param !== ':offset') {
                    $paramType = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
                    $countStmt->bindValue($param, $value, $paramType);
                }
            }
            
            $countStmt->execute();
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Enhance meter data with additional information
            foreach ($meters as &$meter) {
                // Get last reading
                $readingSql = "SELECT reading, reading_date FROM meter_readings 
                               WHERE meter_id = :meter_id 
                               ORDER BY reading_date DESC LIMIT 1";
                $readingStmt = $db->prepare($readingSql);
                $readingStmt->bindParam(':meter_id', $meter['id']);
                $readingStmt->execute();
                $lastReading = $readingStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($lastReading) {
                    $meter['last_reading'] = $lastReading['reading'];
                    $meter['last_reading_date'] = $lastReading['reading_date'];
                } else {
                    $meter['last_reading'] = $meter['initial_reading'];
                    $meter['last_reading_date'] = $meter['installation_date'];
                }
                
                // Get current balance
                $balanceSql = "SELECT SUM(amount) as balance FROM meter_credits 
                               WHERE meter_id = :meter_id AND status = 'active'";
                $balanceStmt = $db->prepare($balanceSql);
                $balanceStmt->bindParam(':meter_id', $meter['id']);
                $balanceStmt->execute();
                $balance = $balanceStmt->fetch(PDO::FETCH_ASSOC);
                
                $meter['current_balance'] = $balance['balance'] ?? 0;
                
                // Set low balance threshold
                $meter['low_balance_threshold'] = 50000; // Default value, can be customized
            }
            
            $result = [
                'status' => 'success',
                'data' => $meters,
                'meta' => [
                    'total' => $totalCount,
                    'page' => $page,
                    'limit' => $limit,
                    'total_pages' => ceil($totalCount / $limit)
                ]
            ];
            
            return $this->respondWithJson($response, $result);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Get a specific meter
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $meterId = $args['id'];
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Build the query based on user role
            $sql = "SELECT m.*, p.name as property_name, c.name as customer_name, c.unit_number 
                    FROM meters m
                    LEFT JOIN properties p ON m.property_id = p.id
                    LEFT JOIN customers c ON m.customer_id = c.id
                    WHERE m.id = :meter_id";
            
            // Add role-based restrictions
            if ($userRole === 'client') {
                $sql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            } elseif ($userRole === 'customer') {
                $sql .= " AND c.user_id = :user_id";
            }
            
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':meter_id', $meterId);
            
            if ($userRole === 'client' || $userRole === 'customer') {
                $stmt->bindParam(':user_id', $userId);
            }
            
            $stmt->execute();
            $meter = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$meter) {
                throw new HttpNotFoundException($request, 'Meter not found');
            }
            
            // Get last reading
            $readingSql = "SELECT reading, reading_date FROM meter_readings 
                           WHERE meter_id = :meter_id 
                           ORDER BY reading_date DESC LIMIT 1";
            $readingStmt = $db->prepare($readingSql);
            $readingStmt->bindParam(':meter_id', $meterId);
            $readingStmt->execute();
            $lastReading = $readingStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($lastReading) {
                $meter['last_reading'] = $lastReading['reading'];
                $meter['last_reading_date'] = $lastReading['reading_date'];
            } else {
                $meter['last_reading'] = $meter['initial_reading'];
                $meter['last_reading_date'] = $meter['installation_date'];
            }
            
            // Get current balance
            $balanceSql = "SELECT SUM(amount) as balance FROM meter_credits 
                           WHERE meter_id = :meter_id AND status = 'active'";
            $balanceStmt = $db->prepare($balanceSql);
            $balanceStmt->bindParam(':meter_id', $meterId);
            $balanceStmt->execute();
            $balance = $balanceStmt->fetch(PDO::FETCH_ASSOC);
            
            $meter['current_balance'] = $balance['balance'] ?? 0;
            
            // Set low balance threshold
            $meter['low_balance_threshold'] = 50000; // Default value, can be customized
            
            // Get tariff information
            $tariffSql = "SELECT t.* FROM tariffs t
                          WHERE t.id = :tariff_id";
            $tariffStmt = $db->prepare($tariffSql);
            $tariffStmt->bindParam(':tariff_id', $meter['tariff_id']);
            $tariffStmt->execute();
            $tariff = $tariffStmt->fetch(PDO::FETCH_ASSOC);
            
            $meter['tariff'] = $tariff;
            
            return $this->respondWithJson($response, ['status' => 'success', 'data' => $meter]);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        } catch (HttpNotFoundException $e) {
            return $this->respondWithJson($response, ['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }

    /**
     * Create a new meter
     */
    public function store(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Validate required fields
        $requiredFields = ['meter_number', 'serial_number', 'property_id', 'customer_id', 'tariff_id', 'initial_reading', 'initial_balance', 'installation_date'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => "Field '$field' is required"], 400);
            }
        }
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if meter number already exists
            $checkSql = "SELECT id FROM meters WHERE meter_number = :meter_number";
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_number', $data['meter_number']);
            $checkStmt->execute();
            
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter number already exists'], 400);
            }
            
            // Check if property exists and user has access
            $propertySql = "SELECT p.* FROM properties p 
                            WHERE p.id = :property_id";
            
            if ($userRole === 'client') {
                $propertySql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            }
            
            $propertyStmt = $db->prepare($propertySql);
            $propertyStmt->bindParam(':property_id', $data['property_id']);
            
            if ($userRole === 'client') {
                $propertyStmt->bindParam(':user_id', $userId);
            }
            
            $propertyStmt->execute();
            $property = $propertyStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$property) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Property not found or access denied'], 404);
            }
            
            // Check if customer exists and belongs to the property
            $customerSql = "SELECT c.* FROM customers c 
                            WHERE c.id = :customer_id AND c.property_id = :property_id";
            $customerStmt = $db->prepare($customerSql);
            $customerStmt->bindParam(':customer_id', $data['customer_id']);
            $customerStmt->bindParam(':property_id', $data['property_id']);
            $customerStmt->execute();
            $customer = $customerStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$customer) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Customer not found or does not belong to the property'], 404);
            }
            
            // Check if tariff exists
            $tariffSql = "SELECT id FROM tariffs WHERE id = :tariff_id";
            $tariffStmt = $db->prepare($tariffSql);
            $tariffStmt->bindParam(':tariff_id', $data['tariff_id']);
            $tariffStmt->execute();
            
            if (!$tariffStmt->fetch(PDO::FETCH_ASSOC)) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Tariff not found'], 404);
            }
            
            // Insert the meter
            $insertSql = "INSERT INTO meters (
                            meter_number, serial_number, property_id, customer_id, tariff_id, 
                            initial_reading, initial_balance, installation_date, status, 
                            created_by, created_at, updated_at
                          ) VALUES (
                            :meter_number, :serial_number, :property_id, :customer_id, :tariff_id, 
                            :initial_reading, :initial_balance, :installation_date, :status, 
                            :created_by, NOW(), NOW()
                          )";
            
            $insertStmt = $db->prepare($insertSql);
            $insertStmt->bindParam(':meter_number', $data['meter_number']);
            $insertStmt->bindParam(':serial_number', $data['serial_number']);
            $insertStmt->bindParam(':property_id', $data['property_id']);
            $insertStmt->bindParam(':customer_id', $data['customer_id']);
            $insertStmt->bindParam(':tariff_id', $data['tariff_id']);
            $insertStmt->bindParam(':initial_reading', $data['initial_reading']);
            $insertStmt->bindParam(':initial_balance', $data['initial_balance']);
            $insertStmt->bindParam(':installation_date', $data['installation_date']);
            $status = $data['status'] ?? 'active';
            $insertStmt->bindParam(':status', $status);
            $insertStmt->bindParam(':created_by', $userId);
            
            $insertStmt->execute();
            $meterId = $db->lastInsertId();
            
            // If initial balance is greater than 0, add it as a credit
            if ($data['initial_balance'] > 0) {
                $creditSql = "INSERT INTO meter_credits (
                                meter_id, amount, description, status, created_by, created_at, updated_at
                              ) VALUES (
                                :meter_id, :amount, :description, 'active', :created_by, NOW(), NOW()
                              )";
                
                $creditStmt = $db->prepare($creditSql);
                $creditStmt->bindParam(':meter_id', $meterId);
                $creditStmt->bindParam(':amount', $data['initial_balance']);
                $description = 'Initial balance';
                $creditStmt->bindParam(':description', $description);
                $creditStmt->bindParam(':created_by', $userId);
                $creditStmt->execute();
            }
            
            // Add initial reading as the first meter reading
            $readingSql = "INSERT INTO meter_readings (
                            meter_id, reading, reading_date, notes, created_by, created_at, updated_at
                          ) VALUES (
                            :meter_id, :reading, :reading_date, :notes, :created_by, NOW(), NOW()
                          )";
            
            $readingStmt = $db->prepare($readingSql);
            $readingStmt->bindParam(':meter_id', $meterId);
            $readingStmt->bindParam(':reading', $data['initial_reading']);
            $readingStmt->bindParam(':reading_date', $data['installation_date']);
            $notes = 'Initial reading';
            $readingStmt->bindParam(':notes', $notes);
            $readingStmt->bindParam(':created_by', $userId);
            $readingStmt->execute();
            
            // Get the created meter
            $getSql = "SELECT m.*, p.name as property_name, c.name as customer_name, c.unit_number 
                       FROM meters m
                       LEFT JOIN properties p ON m.property_id = p.id
                       LEFT JOIN customers c ON m.customer_id = c.id
                       WHERE m.id = :meter_id";
            
            $getStmt = $db->prepare($getSql);
            $getStmt->bindParam(':meter_id', $meterId);
            $getStmt->execute();
            $meter = $getStmt->fetch(PDO::FETCH_ASSOC);
            
            return $this->respondWithJson($response, ['status' => 'success', 'data' => $meter], 201);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Update a meter
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $meterId = $args['id'];
        $data = $request->getParsedBody();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if meter exists and user has access
            $checkSql = "SELECT m.* FROM meters m
                         LEFT JOIN properties p ON m.property_id = p.id
                         LEFT JOIN customers c ON m.customer_id = c.id
                         WHERE m.id = :meter_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            } elseif ($userRole === 'customer') {
                $checkSql .= " AND c.user_id = :user_id";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_id', $meterId);
            
            if ($userRole === 'client' || $userRole === 'customer') {
                $checkStmt->bindParam(':user_id', $userId);
            }
            
            $checkStmt->execute();
            $meter = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$meter) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter not found or access denied'], 404);
            }
            
            // Check if meter number is being changed and if it already exists
            if (isset($data['meter_number']) && $data['meter_number'] !== $meter['meter_number']) {
                $checkNumberSql = "SELECT id FROM meters WHERE meter_number = :meter_number AND id != :meter_id";
                $checkNumberStmt = $db->prepare($checkNumberSql);
                $checkNumberStmt->bindParam(':meter_number', $data['meter_number']);
                $checkNumberStmt->bindParam(':meter_id', $meterId);
                $checkNumberStmt->execute();
                
                if ($checkNumberStmt->fetch(PDO::FETCH_ASSOC)) {
                    return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter number already exists'], 400);
                }
            }
            
            // Check if tariff exists if being updated
            if (isset($data['tariff_id'])) {
                $tariffSql = "SELECT id FROM tariffs WHERE id = :tariff_id";
                $tariffStmt = $db->prepare($tariffSql);
                $tariffStmt->bindParam(':tariff_id', $data['tariff_id']);
                $tariffStmt->execute();
                
                if (!$tariffStmt->fetch(PDO::FETCH_ASSOC)) {
                    return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Tariff not found'], 404);
                }
            }
            
            // Build update query
            $updateFields = [];
            $updateParams = [];
            
            $allowedFields = ['meter_number', 'serial_number', 'tariff_id', 'status'];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateFields[] = "$field = :$field";
                    $updateParams[":$field"] = $data[$field];
                }
            }
            
            if (empty($updateFields)) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'No fields to update'], 400);
            }
            
            $updateFields[] = "updated_at = NOW()";
            $updateFields[] = "updated_by = :updated_by";
            $updateParams[':updated_by'] = $userId;
            $updateParams[':meter_id'] = $meterId;
            
            $updateSql = "UPDATE meters SET " . implode(', ', $updateFields) . " WHERE id = :meter_id";
            $updateStmt = $db->prepare($updateSql);
            
            foreach ($updateParams as $param => $value) {
                $updateStmt->bindValue($param, $value);
            }
            
            $updateStmt->execute();
            
            // Get the updated meter
            $getSql = "SELECT m.*, p.name as property_name, c.name as customer_name, c.unit_number 
                       FROM meters m
                       LEFT JOIN properties p ON m.property_id = p.id
                       LEFT JOIN customers c ON m.customer_id = c.id
                       WHERE m.id = :meter_id";
            
            $getStmt = $db->prepare($getSql);
            $getStmt->bindParam(':meter_id', $meterId);
            $getStmt->execute();
            $updatedMeter = $getStmt->fetch(PDO::FETCH_ASSOC);
            
            return $this->respondWithJson($response, ['status' => 'success', 'data' => $updatedMeter]);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Delete a meter
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $meterId = $args['id'];
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Only superadmin and client can delete meters
        if ($userRole === 'customer') {
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Permission denied'], 403);
        }
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if meter exists and user has access
            $checkSql = "SELECT m.* FROM meters m
                         LEFT JOIN properties p ON m.property_id = p.id
                         WHERE m.id = :meter_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_id', $meterId);
            
            if ($userRole === 'client') {
                $checkStmt->bindParam(':user_id', $userId);
            }
            
            $checkStmt->execute();
            $meter = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$meter) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter not found or access denied'], 404);
            }
            
            // Check if meter has any readings or credits
            $checkReadingsSql = "SELECT COUNT(*) as count FROM meter_readings WHERE meter_id = :meter_id";
            $checkReadingsStmt = $db->prepare($checkReadingsSql);
            $checkReadingsStmt->bindParam(':meter_id', $meterId);
            $checkReadingsStmt->execute();
            $readingsCount = $checkReadingsStmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            $checkCreditsSql = "SELECT COUNT(*) as count FROM meter_credits WHERE meter_id = :meter_id";
            $checkCreditsStmt = $db->prepare($checkCreditsSql);
            $checkCreditsStmt->bindParam(':meter_id', $meterId);
            $checkCreditsStmt->execute();
            $creditsCount = $checkCreditsStmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($readingsCount > 1 || $creditsCount > 1) { // Allow initial reading and credit
                return $this->respondWithJson($response, [
                    'status' => 'error', 
                    'message' => 'Cannot delete meter with readings or credits. Deactivate it instead.'
                ], 400);
            }
            
            // Delete the meter and related records
            $db->beginTransaction();
            
            // Delete readings
            $deleteReadingsSql = "DELETE FROM meter_readings WHERE meter_id = :meter_id";
            $deleteReadingsStmt = $db->prepare($deleteReadingsSql);
            $deleteReadingsStmt->bindParam(':meter_id', $meterId);
            $deleteReadingsStmt->execute();
            
            // Delete credits
            $deleteCreditsSql = "DELETE FROM meter_credits WHERE meter_id = :meter_id";
            $deleteCreditsStmt = $db->prepare($deleteCreditsSql);
            $deleteCreditsStmt->bindParam(':meter_id', $meterId);
            $deleteCreditsStmt->execute();
            
            // Delete meter
            $deleteMeterSql = "DELETE FROM meters WHERE id = :meter_id";
            $deleteMeterStmt = $db->prepare($deleteMeterSql);
            $deleteMeterStmt->bindParam(':meter_id', $meterId);
            $deleteMeterStmt->execute();
            
            $db->commit();
            
            return $this->respondWithJson($response, ['status' => 'success', 'message' => 'Meter deleted successfully']);
        } catch (PDOException $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Get meter consumption history
     */
    public function consumption(Request $request, Response $response, array $args): Response
    {
        $meterId = $args['id'];
        $params = $request->getQueryParams();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if meter exists and user has access
            $checkSql = "SELECT m.* FROM meters m
                         LEFT JOIN properties p ON m.property_id = p.id
                         LEFT JOIN customers c ON m.customer_id = c.id
                         WHERE m.id = :meter_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            } elseif ($userRole === 'customer') {
                $checkSql .= " AND c.user_id = :user_id";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_id', $meterId);
            
            if ($userRole === 'client' || $userRole === 'customer') {
                $checkStmt->bindParam(':user_id', $userId);
            }
            
            $checkStmt->execute();
            $meter = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$meter) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter not found or access denied'], 404);
            }
            
            // Get date range from parameters
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-1 month'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            // Get meter readings for the period
            $readingsSql = "SELECT * FROM meter_readings 
                            WHERE meter_id = :meter_id 
                            AND reading_date BETWEEN :start_date AND :end_date
                            ORDER BY reading_date ASC";
            
            $readingsStmt = $db->prepare($readingsSql);
            $readingsStmt->bindParam(':meter_id', $meterId);
            $readingsStmt->bindParam(':start_date', $startDate);
            $readingsStmt->bindParam(':end_date', $endDate);
            $readingsStmt->execute();
            $readings = $readingsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate consumption between readings
            $consumption = [];
            $previousReading = null;
            
            foreach ($readings as $reading) {
                if ($previousReading) {
                    $consumptionValue = $reading['reading'] - $previousReading['reading'];
                    
                    if ($consumptionValue >= 0) { // Ensure positive consumption
                        $consumption[] = [
                            'start_date' => $previousReading['reading_date'],
                            'end_date' => $reading['reading_date'],
                            'start_reading' => $previousReading['reading'],
                            'end_reading' => $reading['reading'],
                            'consumption' => $consumptionValue,
                            'days' => round((strtotime($reading['reading_date']) - strtotime($previousReading['reading_date'])) / 86400),
                            'reading_id' => $reading['id']
                        ];
                    }
                }
                
                $previousReading = $reading;
            }
            
            return $this->respondWithJson($response, [
                'status' => 'success', 
                'data' => [
                    'meter' => $meter,
                    'readings' => $readings,
                    'consumption' => $consumption
                ]
            ]);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Get meter credits history
     */
    public function credits(Request $request, Response $response, array $args): Response
    {
        $meterId = $args['id'];
        $params = $request->getQueryParams();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if meter exists and user has access
            $checkSql = "SELECT m.* FROM meters m
                         LEFT JOIN properties p ON m.property_id = p.id
                         LEFT JOIN customers c ON m.customer_id = c.id
                         WHERE m.id = :meter_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            } elseif ($userRole === 'customer') {
                $checkSql .= " AND c.user_id = :user_id";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_id', $meterId);
            
            if ($userRole === 'client' || $userRole === 'customer') {
                $checkStmt->bindParam(':user_id', $userId);
            }
            
            $checkStmt->execute();
            $meter = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$meter) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter not found or access denied'], 404);
            }
            
            // Get date range from parameters
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-1 month'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            // Get meter credits for the period
            $creditsSql = "SELECT mc.*, p.payment_method, p.transaction_id 
                           FROM meter_credits mc
                           LEFT JOIN payments p ON mc.payment_id = p.id
                           WHERE mc.meter_id = :meter_id 
                           AND mc.created_at BETWEEN :start_date AND :end_date
                           ORDER BY mc.created_at DESC";
            
            $creditsStmt = $db->prepare($creditsSql);
            $creditsStmt->bindParam(':meter_id', $meterId);
            $creditsStmt->bindParam(':start_date', $startDate . ' 00:00:00');
            $creditsStmt->bindParam(':end_date', $endDate . ' 23:59:59');
            $creditsStmt->execute();
            $credits = $creditsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get current balance
            $balanceSql = "SELECT SUM(amount) as balance FROM meter_credits 
                           WHERE meter_id = :meter_id AND status = 'active'";
            $balanceStmt = $db->prepare($balanceSql);
            $balanceStmt->bindParam(':meter_id', $meterId);
            $balanceStmt->execute();
            $balance = $balanceStmt->fetch(PDO::FETCH_ASSOC);
            
            return $this->respondWithJson($response, [
                'status' => 'success', 
                'data' => [
                    'meter' => $meter,
                    'credits' => $credits,
                    'current_balance' => $balance['balance'] ?? 0
                ]
            ]);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Add credit to a meter (topup)
     */
    public function topup(Request $request, Response $response, array $args): Response
    {
        $meterId = $args['id'];
        $data = $request->getParsedBody();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Validate required fields
        $requiredFields = ['amount', 'payment_method'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => "Field '$field' is required"], 400);
            }
        }
        
        // Validate amount
        if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Amount must be a positive number'], 400);
        }
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if meter exists and user has access
            $checkSql = "SELECT m.*, p.name as property_name, c.name as customer_name, c.user_id as customer_user_id 
                         FROM meters m
                         LEFT JOIN properties p ON m.property_id = p.id
                         LEFT JOIN customers c ON m.customer_id = c.id
                         WHERE m.id = :meter_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            } elseif ($userRole === 'customer') {
                $checkSql .= " AND c.user_id = :user_id";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_id', $meterId);
            
            if ($userRole === 'client' || $userRole === 'customer') {
                $checkStmt->bindParam(':user_id', $userId);
            }
            
            $checkStmt->execute();
            $meter = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$meter) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter not found or access denied'], 404);
            }
            
            // Check if meter is active
            if ($meter['status'] !== 'active') {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Cannot add credit to inactive meter'], 400);
            }
            
            // Begin transaction
            $db->beginTransaction();
            
            // Create payment record
            $paymentSql = "INSERT INTO payments (
                            amount, payment_method, status, description, 
                            customer_id, meter_id, created_by, created_at, updated_at
                          ) VALUES (
                            :amount, :payment_method, :status, :description, 
                            :customer_id, :meter_id, :created_by, NOW(), NOW()
                          )";
            
            $paymentStmt = $db->prepare($paymentSql);
            $paymentStmt->bindParam(':amount', $data['amount']);
            $paymentStmt->bindParam(':payment_method', $data['payment_method']);
            $paymentStatus = 'completed'; // Assume payment is completed immediately
            $paymentStmt->bindParam(':status', $paymentStatus);
            $description = $data['description'] ?? 'Meter credit topup';
            $paymentStmt->bindParam(':description', $description);
            $paymentStmt->bindParam(':customer_id', $meter['customer_id']);
            $paymentStmt->bindParam(':meter_id', $meterId);
            $paymentStmt->bindParam(':created_by', $userId);
            $paymentStmt->execute();
            
            $paymentId = $db->lastInsertId();
            
            // Add credit to meter
            $creditSql = "INSERT INTO meter_credits (
                            meter_id, amount, payment_id, description, status, 
                            created_by, created_at, updated_at
                          ) VALUES (
                            :meter_id, :amount, :payment_id, :description, :status, 
                            :created_by, NOW(), NOW()
                          )";
            
            $creditStmt = $db->prepare($creditSql);
            $creditStmt->bindParam(':meter_id', $meterId);
            $creditStmt->bindParam(':amount', $data['amount']);
            $creditStmt->bindParam(':payment_id', $paymentId);
            $creditStmt->bindParam(':description', $description);
            $creditStatus = 'active';
            $creditStmt->bindParam(':status', $creditStatus);
            $creditStmt->bindParam(':created_by', $userId);
            $creditStmt->execute();
            
            $creditId = $db->lastInsertId();
            
            // Update payment with credit ID
            $updatePaymentSql = "UPDATE payments SET credit_id = :credit_id WHERE id = :payment_id";
            $updatePaymentStmt = $db->prepare($updatePaymentSql);
            $updatePaymentStmt->bindParam(':credit_id', $creditId);
            $updatePaymentStmt->bindParam(':payment_id', $paymentId);
            $updatePaymentStmt->execute();
            
            // Create notification for customer
            $notificationSql = "INSERT INTO notifications (
                                user_id, type, title, message, status, created_at, updated_at
                              ) VALUES (
                                :user_id, :type, :title, :message, 'unread', NOW(), NOW()
                              )";
            
            $notificationStmt = $db->prepare($notificationSql);
            $notificationStmt->bindParam(':user_id', $meter['customer_user_id']);
            $notificationType = 'credit';
            $notificationStmt->bindParam(':type', $notificationType);
            $notificationTitle = 'Credit Added';
            $notificationStmt->bindParam(':title', $notificationTitle);
            $notificationMessage = "Credit of " . number_format($data['amount']) . " has been added to your meter " . $meter['meter_number'];
            $notificationStmt->bindParam(':message', $notificationMessage);
            $notificationStmt->execute();
            
            $db->commit();
            
            // Get the updated balance
            $balanceSql = "SELECT SUM(amount) as balance FROM meter_credits 
                           WHERE meter_id = :meter_id AND status = 'active'";
            $balanceStmt = $db->prepare($balanceSql);
            $balanceStmt->bindParam(':meter_id', $meterId);
            $balanceStmt->execute();
            $balance = $balanceStmt->fetch(PDO::FETCH_ASSOC);
            
            // Get the credit record
            $getCreditSql = "SELECT mc.*, p.payment_method, p.transaction_id 
                             FROM meter_credits mc
                             LEFT JOIN payments p ON mc.payment_id = p.id
                             WHERE mc.id = :credit_id";
            $getCreditStmt = $db->prepare($getCreditSql);
            $getCreditStmt->bindParam(':credit_id', $creditId);
            $getCreditStmt->execute();
            $credit = $getCreditStmt->fetch(PDO::FETCH_ASSOC);
            
            return $this->respondWithJson($response, [
                'status' => 'success', 
                'data' => [
                    'credit' => $credit,
                    'current_balance' => $balance['balance'] ?? 0,
                    'payment_id' => $paymentId
                ],
                'message' => 'Credit added successfully'
            ], 201);
        } catch (PDOException $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Get meter status
     */
    public function status(Request $request, Response $response, array $args): Response
    {
        $meterId = $args['id'];
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if meter exists and user has access
            $checkSql = "SELECT m.*, p.name as property_name, c.name as customer_name, c.unit_number 
                         FROM meters m
                         LEFT JOIN properties p ON m.property_id = p.id
                         LEFT JOIN customers c ON m.customer_id = c.id
                         WHERE m.id = :meter_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            } elseif ($userRole === 'customer') {
                $checkSql .= " AND c.user_id = :user_id";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_id', $meterId);
            
            if ($userRole === 'client' || $userRole === 'customer') {
                $checkStmt->bindParam(':user_id', $userId);
            }
            
            $checkStmt->execute();
            $meter = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$meter) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Meter not found or access denied'], 404);
            }
            
            // Get last reading
            $readingSql = "SELECT reading, reading_date FROM meter_readings 
                           WHERE meter_id = :meter_id 
                           ORDER BY reading_date DESC LIMIT 1";
            $readingStmt = $db->prepare($readingSql);
            $readingStmt->bindParam(':meter_id', $meterId);
            $readingStmt->execute();
            $lastReading = $readingStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($lastReading) {
                $meter['last_reading'] = $lastReading['reading'];
                $meter['last_reading_date'] = $lastReading['reading_date'];
            } else {
                $meter['last_reading'] = $meter['initial_reading'];
                $meter['last_reading_date'] = $meter['installation_date'];
            }
            
            // Get current balance
            $balanceSql = "SELECT SUM(amount) as balance FROM meter_credits 
                           WHERE meter_id = :meter_id AND status = 'active'";
            $balanceStmt = $db->prepare($balanceSql);
            $balanceStmt->bindParam(':meter_id', $meterId);
            $balanceStmt->execute();
            $balance = $balanceStmt->fetch(PDO::FETCH_ASSOC);
            
            $meter['current_balance'] = $balance['balance'] ?? 0;
            
            // Get last credit transaction
            $creditSql = "SELECT mc.*, p.payment_method, p.transaction_id 
                          FROM meter_credits mc
                          LEFT JOIN payments p ON mc.payment_id = p.id
                          WHERE mc.meter_id = :meter_id 
                          ORDER BY mc.created_at DESC LIMIT 1";
            $creditStmt = $db->prepare($creditSql);
            $creditStmt->bindParam(':meter_id', $meterId);
            $creditStmt->execute();
            $lastCredit = $creditStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($lastCredit) {
                $meter['last_credit'] = $lastCredit;
            }
            
            // Get tariff information
            $tariffSql = "SELECT t.* FROM tariffs t
                          WHERE t.id = :tariff_id";
            $tariffStmt = $db->prepare($tariffSql);
            $tariffStmt->bindParam(':tariff_id', $meter['tariff_id']);
            $tariffStmt->execute();
            $tariff = $tariffStmt->fetch(PDO::FETCH_ASSOC);
            
            $meter['tariff'] = $tariff;
            
            // Set low balance threshold
            $meter['low_balance_threshold'] = 50000; // Default value, can be customized
            
            return $this->respondWithJson($response, ['status' => 'success', 'data' => $meter]);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }
}