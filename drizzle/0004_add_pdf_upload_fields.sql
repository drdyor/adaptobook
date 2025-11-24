-- Add PDF upload support fields to contentLibrary table
ALTER TABLE `contentLibrary` 
  ADD COLUMN `sourceType` ENUM('pre_generated', 'pdf_upload') NOT NULL DEFAULT 'pre_generated' AFTER `category`,
  ADD COLUMN `pdfUrl` VARCHAR(512) NULL AFTER `sourceType`,
  ADD COLUMN `cefrLevel` VARCHAR(10) NULL AFTER `pdfUrl`;

