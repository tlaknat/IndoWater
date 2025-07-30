-- Create meter_credits table
CREATE TABLE IF NOT EXISTS `meter_credits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `meter_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','cancelled') NOT NULL DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `meter_id` (`meter_id`),
  KEY `payment_id` (`payment_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create meter_readings table
CREATE TABLE IF NOT EXISTS `meter_readings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `meter_id` int(11) NOT NULL,
  `reading` decimal(10,2) NOT NULL,
  `reading_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `meter_id` (`meter_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create payments table if not exists
CREATE TABLE IF NOT EXISTS `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `description` varchar(255) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `meter_id` int(11) DEFAULT NULL,
  `credit_id` int(11) DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `meter_id` (`meter_id`),
  KEY `credit_id` (`credit_id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('read','unread') NOT NULL DEFAULT 'unread',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add meters table if not exists
CREATE TABLE IF NOT EXISTS `meters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `meter_number` varchar(50) NOT NULL,
  `serial_number` varchar(50) NOT NULL,
  `property_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `tariff_id` int(11) NOT NULL,
  `initial_reading` decimal(10,2) NOT NULL DEFAULT 0.00,
  `initial_balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `installation_date` date NOT NULL,
  `status` enum('active','inactive','maintenance') NOT NULL DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meter_number` (`meter_number`),
  KEY `property_id` (`property_id`),
  KEY `customer_id` (`customer_id`),
  KEY `tariff_id` (`tariff_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add tariffs table if not exists
CREATE TABLE IF NOT EXISTS `tariffs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `rate_per_unit` decimal(10,2) NOT NULL,
  `fixed_charge` decimal(10,2) NOT NULL DEFAULT 0.00,
  `client_id` int(11) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;