-- Add TRANSFER to ENUM and target_wallet_id column
ALTER TABLE transactions 
MODIFY COLUMN type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL DEFAULT 'EXPENSE';

ALTER TABLE transactions
ADD COLUMN target_wallet_id INT UNSIGNED NULL AFTER wallet_id,
ADD CONSTRAINT fk_transactions_target_wallet
FOREIGN KEY (target_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;

CREATE INDEX idx_target_wallet_id ON transactions(target_wallet_id);
