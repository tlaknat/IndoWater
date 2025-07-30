<?php

namespace IndoWater\Api\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use PDO;
use PDOException;
use Slim\Exception\HttpNotFoundException;
use Slim\Exception\HttpBadRequestException;
use Slim\Exception\HttpForbiddenException;

class CreditController extends BaseController
{
    /**
     * Get all credits
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Build the base query
        $sql = "SELECT mc.*, m.meter_number, c.name as customer_name, p.name as property_name 
                FROM meter_credits mc
                LEFT JOIN meters m ON mc.meter_id = m.id
                LEFT JOIN customers c ON m.customer_id = c.id
                LEFT JOIN properties p ON m.property_id = p.id
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
        if (isset($params['meter_id'])) {
            $sql .= " AND mc.meter_id = :meter_id";
            $queryParams[':meter_id'] = $params['meter_id'];
        }
        
        if (isset($params['customer_id'])) {
            $sql .= " AND m.customer_id = :customer_id";
            $queryParams[':customer_id'] = $params['customer_id'];
        }
        
        if (isset($params['property_id'])) {
            $sql .= " AND m.property_id = :property_id";
            $queryParams[':property_id'] = $params['property_id'];
        }
        
        if (isset($params['status'])) {
            $sql .= " AND mc.status = :status";
            $queryParams[':status'] = $params['status'];
        }
        
        if (isset($params['start_date']) && isset($params['end_date'])) {
            $sql .= " AND mc.created_at BETWEEN :start_date AND :end_date";
            $queryParams[':start_date'] = $params['start_date'] . ' 00:00:00';
            $queryParams[':end_date'] = $params['end_date'] . ' 23:59:59';
        }
        
        // Add ordering
        $sql .= " ORDER BY mc.created_at DESC";
        
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
            $credits = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get total count for pagination
            $countSql = str_replace('SELECT mc.*, m.meter_number, c.name as customer_name, p.name as property_name', 'SELECT COUNT(*) as total', $sql);
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
            
            // Enhance credit data with payment information
            foreach ($credits as &$credit) {
                if ($credit['payment_id']) {
                    $paymentSql = "SELECT * FROM payments WHERE id = :payment_id";
                    $paymentStmt = $db->prepare($paymentSql);
                    $paymentStmt->bindParam(':payment_id', $credit['payment_id']);
                    $paymentStmt->execute();
                    $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($payment) {
                        $credit['payment'] = $payment;
                    }
                }
            }
            
            $result = [
                'status' => 'success',
                'data' => $credits,
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
     * Get a specific credit
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $creditId = $args['id'];
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Build the query based on user role
            $sql = "SELECT mc.*, m.meter_number, c.name as customer_name, p.name as property_name 
                    FROM meter_credits mc
                    LEFT JOIN meters m ON mc.meter_id = m.id
                    LEFT JOIN customers c ON m.customer_id = c.id
                    LEFT JOIN properties p ON m.property_id = p.id
                    WHERE mc.id = :credit_id";
            
            // Add role-based restrictions
            if ($userRole === 'client') {
                $sql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            } elseif ($userRole === 'customer') {
                $sql .= " AND c.user_id = :user_id";
            }
            
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':credit_id', $creditId);
            
            if ($userRole === 'client' || $userRole === 'customer') {
                $stmt->bindParam(':user_id', $userId);
            }
            
            $stmt->execute();
            $credit = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$credit) {
                throw new HttpNotFoundException($request, 'Credit not found');
            }
            
            // Get payment information if available
            if ($credit['payment_id']) {
                $paymentSql = "SELECT * FROM payments WHERE id = :payment_id";
                $paymentStmt = $db->prepare($paymentSql);
                $paymentStmt->bindParam(':payment_id', $credit['payment_id']);
                $paymentStmt->execute();
                $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($payment) {
                    $credit['payment'] = $payment;
                }
            }
            
            return $this->respondWithJson($response, ['status' => 'success', 'data' => $credit]);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        } catch (HttpNotFoundException $e) {
            return $this->respondWithJson($response, ['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }

    /**
     * Create a new credit
     */
    public function store(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Only superadmin and client can add credits directly
        if ($userRole === 'customer') {
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Permission denied'], 403);
        }
        
        // Validate required fields
        $requiredFields = ['meter_id', 'amount'];
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
            $checkSql = "SELECT m.*, p.client_id, c.user_id as customer_user_id 
                         FROM meters m
                         LEFT JOIN properties p ON m.property_id = p.id
                         LEFT JOIN customers c ON m.customer_id = c.id
                         WHERE m.id = :meter_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':meter_id', $data['meter_id']);
            
            if ($userRole === 'client') {
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
            
            // Create payment record if payment_method is provided
            $paymentId = null;
            if (isset($data['payment_method'])) {
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
                $description = $data['description'] ?? 'Meter credit';
                $paymentStmt->bindParam(':description', $description);
                $paymentStmt->bindParam(':customer_id', $meter['customer_id']);
                $paymentStmt->bindParam(':meter_id', $data['meter_id']);
                $paymentStmt->bindParam(':created_by', $userId);
                $paymentStmt->execute();
                
                $paymentId = $db->lastInsertId();
            }
            
            // Add credit to meter
            $creditSql = "INSERT INTO meter_credits (
                            meter_id, amount, payment_id, description, status, 
                            created_by, created_at, updated_at
                          ) VALUES (
                            :meter_id, :amount, :payment_id, :description, :status, 
                            :created_by, NOW(), NOW()
                          )";
            
            $creditStmt = $db->prepare($creditSql);
            $creditStmt->bindParam(':meter_id', $data['meter_id']);
            $creditStmt->bindParam(':amount', $data['amount']);
            $creditStmt->bindParam(':payment_id', $paymentId);
            $description = $data['description'] ?? 'Meter credit';
            $creditStmt->bindParam(':description', $description);
            $status = $data['status'] ?? 'active';
            $creditStmt->bindParam(':status', $status);
            $creditStmt->bindParam(':created_by', $userId);
            $creditStmt->execute();
            
            $creditId = $db->lastInsertId();
            
            // Update payment with credit ID if payment was created
            if ($paymentId) {
                $updatePaymentSql = "UPDATE payments SET credit_id = :credit_id WHERE id = :payment_id";
                $updatePaymentStmt = $db->prepare($updatePaymentSql);
                $updatePaymentStmt->bindParam(':credit_id', $creditId);
                $updatePaymentStmt->bindParam(':payment_id', $paymentId);
                $updatePaymentStmt->execute();
            }
            
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
            
            // Get the created credit
            $getSql = "SELECT mc.*, m.meter_number, c.name as customer_name, p.name as property_name 
                       FROM meter_credits mc
                       LEFT JOIN meters m ON mc.meter_id = m.id
                       LEFT JOIN customers c ON m.customer_id = c.id
                       LEFT JOIN properties p ON m.property_id = p.id
                       WHERE mc.id = :credit_id";
            
            $getStmt = $db->prepare($getSql);
            $getStmt->bindParam(':credit_id', $creditId);
            $getStmt->execute();
            $credit = $getStmt->fetch(PDO::FETCH_ASSOC);
            
            // Get payment information if available
            if ($credit['payment_id']) {
                $paymentSql = "SELECT * FROM payments WHERE id = :payment_id";
                $paymentStmt = $db->prepare($paymentSql);
                $paymentStmt->bindParam(':payment_id', $credit['payment_id']);
                $paymentStmt->execute();
                $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($payment) {
                    $credit['payment'] = $payment;
                }
            }
            
            return $this->respondWithJson($response, ['status' => 'success', 'data' => $credit], 201);
        } catch (PDOException $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Update a credit
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $creditId = $args['id'];
        $data = $request->getParsedBody();
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Only superadmin and client can update credits
        if ($userRole === 'customer') {
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Permission denied'], 403);
        }
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if credit exists and user has access
            $checkSql = "SELECT mc.*, m.meter_number, m.property_id, p.client_id 
                         FROM meter_credits mc
                         LEFT JOIN meters m ON mc.meter_id = m.id
                         LEFT JOIN properties p ON m.property_id = p.id
                         WHERE mc.id = :credit_id";
            
            if ($userRole === 'client') {
                $checkSql .= " AND p.client_id = (SELECT client_id FROM users WHERE id = :user_id)";
            }
            
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':credit_id', $creditId);
            
            if ($userRole === 'client') {
                $checkStmt->bindParam(':user_id', $userId);
            }
            
            $checkStmt->execute();
            $credit = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$credit) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Credit not found or access denied'], 404);
            }
            
            // Only allow updating status and description
            $updateFields = [];
            $updateParams = [];
            
            if (isset($data['status'])) {
                $updateFields[] = "status = :status";
                $updateParams[':status'] = $data['status'];
            }
            
            if (isset($data['description'])) {
                $updateFields[] = "description = :description";
                $updateParams[':description'] = $data['description'];
            }
            
            if (empty($updateFields)) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'No fields to update'], 400);
            }
            
            $updateFields[] = "updated_at = NOW()";
            $updateFields[] = "updated_by = :updated_by";
            $updateParams[':updated_by'] = $userId;
            $updateParams[':credit_id'] = $creditId;
            
            $updateSql = "UPDATE meter_credits SET " . implode(', ', $updateFields) . " WHERE id = :credit_id";
            $updateStmt = $db->prepare($updateSql);
            
            foreach ($updateParams as $param => $value) {
                $updateStmt->bindValue($param, $value);
            }
            
            $updateStmt->execute();
            
            // Get the updated credit
            $getSql = "SELECT mc.*, m.meter_number, c.name as customer_name, p.name as property_name 
                       FROM meter_credits mc
                       LEFT JOIN meters m ON mc.meter_id = m.id
                       LEFT JOIN customers c ON m.customer_id = c.id
                       LEFT JOIN properties p ON m.property_id = p.id
                       WHERE mc.id = :credit_id";
            
            $getStmt = $db->prepare($getSql);
            $getStmt->bindParam(':credit_id', $creditId);
            $getStmt->execute();
            $updatedCredit = $getStmt->fetch(PDO::FETCH_ASSOC);
            
            // Get payment information if available
            if ($updatedCredit['payment_id']) {
                $paymentSql = "SELECT * FROM payments WHERE id = :payment_id";
                $paymentStmt = $db->prepare($paymentSql);
                $paymentStmt->bindParam(':payment_id', $updatedCredit['payment_id']);
                $paymentStmt->execute();
                $payment = $paymentStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($payment) {
                    $updatedCredit['payment'] = $payment;
                }
            }
            
            return $this->respondWithJson($response, ['status' => 'success', 'data' => $updatedCredit]);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Delete a credit
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $creditId = $args['id'];
        $userId = $this->getUserIdFromToken($request);
        $userRole = $this->getUserRoleFromToken($request);
        
        // Only superadmin can delete credits
        if ($userRole !== 'superadmin') {
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Permission denied'], 403);
        }
        
        try {
            $db = $this->container->get(PDO::class);
            
            // Check if credit exists
            $checkSql = "SELECT * FROM meter_credits WHERE id = :credit_id";
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindParam(':credit_id', $creditId);
            $checkStmt->execute();
            $credit = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$credit) {
                return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Credit not found'], 404);
            }
            
            // Delete the credit
            $deleteSql = "DELETE FROM meter_credits WHERE id = :credit_id";
            $deleteStmt = $db->prepare($deleteSql);
            $deleteStmt->bindParam(':credit_id', $creditId);
            $deleteStmt->execute();
            
            return $this->respondWithJson($response, ['status' => 'success', 'message' => 'Credit deleted successfully']);
        } catch (PDOException $e) {
            $this->logger->error('Database error: ' . $e->getMessage());
            return $this->respondWithJson($response, ['status' => 'error', 'message' => 'Database error'], 500);
        }
    }

    /**
     * Get credit denominations
     */
    public function denominations(Request $request, Response $response): Response
    {
        // Define standard credit denominations
        $denominations = [
            ['value' => 10000, 'label' => 'Rp 10.000'],
            ['value' => 20000, 'label' => 'Rp 20.000'],
            ['value' => 50000, 'label' => 'Rp 50.000'],
            ['value' => 100000, 'label' => 'Rp 100.000'],
            ['value' => 200000, 'label' => 'Rp 200.000'],
            ['value' => 500000, 'label' => 'Rp 500.000'],
            ['value' => 1000000, 'label' => 'Rp 1.000.000']
        ];
        
        return $this->respondWithJson($response, ['status' => 'success', 'data' => $denominations]);
    }
}