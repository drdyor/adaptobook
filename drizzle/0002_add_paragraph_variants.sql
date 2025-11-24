-- Migration: Add paragraphVariants table for pre-generated content
-- This table stores text variants at different difficulty levels for cost-efficient reading

CREATE TABLE `paragraphVariants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `contentId` int NOT NULL,
  `chapterNumber` int NOT NULL,
  `paragraphIndex` int NOT NULL,
  `level` int NOT NULL,
  `text` text NOT NULL,
  `originalText` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  CONSTRAINT `paragraphVariants_contentId_contentLibrary_id_fk` FOREIGN KEY (`contentId`) REFERENCES `contentLibrary`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create index for efficient lookups by content, chapter, paragraph, and level
CREATE INDEX `idx_paragraph_lookup` ON `paragraphVariants` (`contentId`, `chapterNumber`, `paragraphIndex`, `level`);

