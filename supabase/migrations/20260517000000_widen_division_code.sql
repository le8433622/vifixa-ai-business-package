-- Widen code and parent_code columns to support ward codes (district_code + suffix)
-- Drop dependent FK first, alter both columns, then recreate
ALTER TABLE vietnam_administrative_divisions DROP CONSTRAINT IF EXISTS vietnam_administrative_divisions_parent_code_fkey;

ALTER TABLE vietnam_administrative_divisions ALTER COLUMN code TYPE VARCHAR(20);
ALTER TABLE vietnam_administrative_divisions ALTER COLUMN parent_code TYPE VARCHAR(20);

ALTER TABLE vietnam_administrative_divisions
  ADD CONSTRAINT vietnam_administrative_divisions_parent_code_fkey
  FOREIGN KEY (parent_code) REFERENCES vietnam_administrative_divisions(code);
