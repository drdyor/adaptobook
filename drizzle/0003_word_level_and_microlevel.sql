-- Add microLevel column to readingProfiles
ALTER TABLE `readingProfiles`
  ADD COLUMN `microLevel` double NOT NULL DEFAULT 2 AFTER `level`;

-- Create wordLevel table for word-by-word difficulty morphing
CREATE TABLE `wordLevel` (
  `id` int AUTO_INCREMENT NOT NULL,
  `contentId` int NOT NULL,
  `paragraphIndex` int NOT NULL,
  `level` int NOT NULL,
  `wordSequence` json NOT NULL,
  `createdAt` timestamp DEFAULT (now()),
  CONSTRAINT `wordLevel_id` PRIMARY KEY (`id`),
  CONSTRAINT `wordLevel_contentId_contentLibrary_id_fk` FOREIGN KEY (`contentId`) REFERENCES `contentLibrary`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX `idx_wordLevel_content_paragraph_level`
  ON `wordLevel` (`contentId`, `paragraphIndex`, `level`);

