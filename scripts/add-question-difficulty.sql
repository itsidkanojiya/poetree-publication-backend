-- Run once against poetree DB (after SSH tunnel if local dev).
-- Fixes: Unknown column 'questions.difficulty' in 'field list'

ALTER TABLE questions
  ADD COLUMN difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium';

UPDATE questions SET difficulty = 'medium' WHERE difficulty IS NULL OR difficulty = '';
