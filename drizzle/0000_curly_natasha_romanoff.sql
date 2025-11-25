CREATE TYPE "role" AS ENUM ('user', 'admin');
--> statement-breakpoint
CREATE TYPE "sourceType" AS ENUM ('pre_generated', 'pdf_upload');
--> statement-breakpoint
CREATE TYPE "status" AS ENUM ('active', 'paused', 'completed');
--> statement-breakpoint
CREATE TABLE "calibrationTests" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"passageText" text NOT NULL,
	"passageDifficulty" integer NOT NULL,
	"readingTime" integer NOT NULL,
	"correctAnswers" integer NOT NULL,
	"totalQuestions" integer NOT NULL,
	"assessedLevel" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contentLibrary" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255),
	"originalText" text NOT NULL,
	"baseDifficulty" integer NOT NULL,
	"fleschKincaid" integer,
	"wordCount" integer,
	"category" varchar(100),
	"sourceType" "sourceType" DEFAULT 'pre_generated' NOT NULL,
	"pdfUrl" varchar(512),
	"cefrLevel" varchar(10),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paragraphVariants" (
	"id" serial PRIMARY KEY NOT NULL,
	"contentId" integer NOT NULL,
	"chapterNumber" integer NOT NULL,
	"paragraphIndex" integer NOT NULL,
	"level" integer NOT NULL,
	"text" text NOT NULL,
	"originalText" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progressTracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"userId" integer NOT NULL,
	"paragraphIndex" integer NOT NULL,
	"difficultyLevel" integer NOT NULL,
	"comprehensionScore" integer,
	"timeSpent" integer,
	"manualAdjustment" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readingProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"level" integer NOT NULL,
	"microLevel" double precision DEFAULT 2 NOT NULL,
	"readingSpeed" integer,
	"comprehensionAccuracy" integer,
	"strengths" text,
	"challenges" text,
	"lastCalibrated" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readingSessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"contentId" integer NOT NULL,
	"difficultyLevel" integer NOT NULL,
	"currentPosition" integer DEFAULT 0 NOT NULL,
	"completedParagraphs" integer DEFAULT 0 NOT NULL,
	"avgComprehension" integer,
	"status" "status" DEFAULT 'active' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"lastAccessedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "wordLevel" (
	"id" serial PRIMARY KEY NOT NULL,
	"contentId" integer NOT NULL,
	"paragraphIndex" integer NOT NULL,
	"wordSequence" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "calibrationTests" ADD CONSTRAINT "calibrationTests_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paragraphVariants" ADD CONSTRAINT "paragraphVariants_contentId_contentLibrary_id_fk" FOREIGN KEY ("contentId") REFERENCES "public"."contentLibrary"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progressTracking" ADD CONSTRAINT "progressTracking_sessionId_readingSessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."readingSessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progressTracking" ADD CONSTRAINT "progressTracking_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readingProfiles" ADD CONSTRAINT "readingProfiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readingSessions" ADD CONSTRAINT "readingSessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readingSessions" ADD CONSTRAINT "readingSessions_contentId_contentLibrary_id_fk" FOREIGN KEY ("contentId") REFERENCES "public"."contentLibrary"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wordLevel" ADD CONSTRAINT "wordLevel_contentId_contentLibrary_id_fk" FOREIGN KEY ("contentId") REFERENCES "public"."contentLibrary"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_wordLevel_content_paragraph" ON "wordLevel" USING btree ("contentId","paragraphIndex");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_wordLevel_content_paragraph" ON "wordLevel" USING btree ("contentId","paragraphIndex");