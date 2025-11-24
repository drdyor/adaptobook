CREATE TABLE `calibrationTests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`passageText` text NOT NULL,
	`passageDifficulty` int NOT NULL,
	`readingTime` int NOT NULL,
	`correctAnswers` int NOT NULL,
	`totalQuestions` int NOT NULL,
	`assessedLevel` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calibrationTests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`author` varchar(255),
	`originalText` text NOT NULL,
	`baseDifficulty` int NOT NULL,
	`fleschKincaid` int,
	`wordCount` int,
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contentLibrary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progressTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`paragraphIndex` int NOT NULL,
	`difficultyLevel` int NOT NULL,
	`comprehensionScore` int,
	`timeSpent` int,
	`manualAdjustment` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progressTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `readingProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`level` int NOT NULL,
	`readingSpeed` int,
	`comprehensionAccuracy` int,
	`strengths` text,
	`challenges` text,
	`lastCalibrated` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `readingProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `readingSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contentId` int NOT NULL,
	`difficultyLevel` int NOT NULL,
	`currentPosition` int NOT NULL DEFAULT 0,
	`completedParagraphs` int NOT NULL DEFAULT 0,
	`avgComprehension` int,
	`status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastAccessedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `readingSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `calibrationTests` ADD CONSTRAINT `calibrationTests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progressTracking` ADD CONSTRAINT `progressTracking_sessionId_readingSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `readingSessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progressTracking` ADD CONSTRAINT `progressTracking_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readingProfiles` ADD CONSTRAINT `readingProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readingSessions` ADD CONSTRAINT `readingSessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readingSessions` ADD CONSTRAINT `readingSessions_contentId_contentLibrary_id_fk` FOREIGN KEY (`contentId`) REFERENCES `contentLibrary`(`id`) ON DELETE no action ON UPDATE no action;