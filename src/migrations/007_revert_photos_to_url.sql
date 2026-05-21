ALTER TABLE transaction_photos 
  DROP COLUMN photo_data,
  DROP COLUMN photo_mime,
  ADD COLUMN photo_url VARCHAR(1000) NOT NULL AFTER transaction_id;
