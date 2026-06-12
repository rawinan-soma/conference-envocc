-- Migration: 0006_room_photo_path
-- Story 3.2: Room Photo Upload
--
-- Adds the optional photo_path column to the rooms table.
-- photo_path stores the relative filename of an uploaded room photo,
-- resolved against the UPLOAD_DIR env var at serve time.
-- Nullable — a null value means no photo has been uploaded yet.

ALTER TABLE rooms ADD COLUMN photo_path TEXT;
