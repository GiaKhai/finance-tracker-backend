-- Migration: Add EWALLET type to wallets table
-- Date: 2024
-- Description: Update wallet type ENUM to include EWALLET option

USE finance_tracker;

-- Modify the wallets table to add EWALLET to the type ENUM
ALTER TABLE wallets 
MODIFY COLUMN type ENUM('CASH', 'BANK', 'CREDIT', 'EWALLET') NOT NULL DEFAULT 'CASH';

-- Verify the change
SHOW COLUMNS FROM wallets LIKE 'type';
