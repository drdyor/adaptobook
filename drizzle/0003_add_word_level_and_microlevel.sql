-- Migration: Add wordLevel table for Mind-Reader Slider feature
-- Also adds microLevel column to readingProfiles for persistence

-- Add microLevel to readingProfiles (already exists in schema, but ensure migration)
ALTER TABLE `readingProfiles` ADD COLUMN IF NOT EXISTS `microLevel` double NOT NULL DEFAULT 2;

-- Create wordLevel table for word-level morphing
CREATE TABLE IF NOT EXISTS `wordLevel` (
  `id` int AUTO_INCREMENT NOT NULL,
  `contentId` int NOT NULL,
  `paragraphIndex` int NOT NULL,
  `wordSequence` json NOT NULL,
  `createdAt` timestamp DEFAULT (now()),
  PRIMARY KEY (`id`),
  CONSTRAINT `wordLevel_contentId_contentLibrary_id_fk` FOREIGN KEY (`contentId`) REFERENCES `contentLibrary`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create index for efficient lookups by content and paragraph
CREATE INDEX `idx_wordLevel_content_paragraph` ON `wordLevel` (`contentId`, `paragraphIndex`);

