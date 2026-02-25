-- Animations table: YouTube links with subject, subject title, board, standard.
-- Run only if the app has not created the table via Sequelize sync.
-- Requires: subjects, subject_titles, boards, standards tables to exist.
-- (No sort_order – display uses subject, subject title, board, standard.)

CREATE TABLE IF NOT EXISTS animations (
  animation_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) DEFAULT NULL,
  youtube_url VARCHAR(500) NOT NULL,
  video_id VARCHAR(20) DEFAULT NULL,
  subject_id INT NOT NULL,
  subject_title_id INT NOT NULL,
  board_id INT NOT NULL,
  standard_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (animation_id),
  KEY fk_animations_subject (subject_id),
  KEY fk_animations_subject_title (subject_title_id),
  KEY fk_animations_board (board_id),
  KEY fk_animations_standard (standard_id)
);

-- If you already had an animations table with sort_order and no subject/board/standard columns, run:
-- ALTER TABLE animations ADD COLUMN subject_id INT NULL AFTER video_id;
-- ALTER TABLE animations ADD COLUMN subject_title_id INT NULL AFTER subject_id;
-- ALTER TABLE animations ADD COLUMN board_id INT NULL AFTER subject_title_id;
-- ALTER TABLE animations ADD COLUMN standard_id INT NULL AFTER board_id;
-- UPDATE animations SET subject_id = 1, subject_title_id = 1, board_id = 1, standard_id = 1 WHERE subject_id IS NULL;
-- ALTER TABLE animations MODIFY subject_id INT NOT NULL, MODIFY subject_title_id INT NOT NULL, MODIFY board_id INT NOT NULL, MODIFY standard_id INT NOT NULL;
-- ALTER TABLE animations DROP COLUMN sort_order;
