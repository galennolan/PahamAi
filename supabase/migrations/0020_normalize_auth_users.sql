-- Migration 0020: normalisasi kolom string auth.users yang NULL
--
-- Penyebab HTTP 500 saat login (POST /token grant_type=password):
--   "error finding user: sql: Scan error on column index 8,
--    name email_change: converting NULL to string is unsupported"
--
-- GoTrue membaca auth.users dan drivernya mengharapkan string kosong,
-- bukan NULL, di kolom-kolom token. Baris yang dibuat sebelum migration
-- 0019 (via Admin API versi lama / SQL manual) masih punya NULL.
-- Normalisasi supaya login jalan untuk semua user lama.

UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
UPDATE auth.users SET phone_change = '' WHERE phone_change IS NULL;
UPDATE auth.users SET phone_change_token = '' WHERE phone_change_token IS NULL;
UPDATE auth.users SET reauthentication_token = '' WHERE reauthentication_token IS NULL;
UPDATE auth.users SET phone = '' WHERE phone IS NULL;
