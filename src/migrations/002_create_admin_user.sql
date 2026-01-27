INSERT INTO users (name, email, password, role) 
VALUES ('System Admin', 'admin@example.com', '$2a$10$sdH.Kxjm2K7LmHqLZxn2wulfG0SPIg02CfoNE4GHGTuDbCFAakXVi', 'admin')
ON DUPLICATE KEY UPDATE role='admin';
