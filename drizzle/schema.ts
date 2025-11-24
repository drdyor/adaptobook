import { double, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Reading profiles store user's assessed reading level and characteristics
 */
export const readingProfiles = mysqlTable("readingProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  /** Reading level from 1 (beginner) to 7 (advanced) */
  level: int("level").notNull(),
  /** Fine-grained preference captured by the Mind-Reader slider (1.0 - 4.0) */
  microLevel: double("microLevel").default(2).notNull(),
  /** Reading speed in words per minute */
  readingSpeed: int("readingSpeed"),
  /** Comprehension accuracy percentage (0-100) */
  comprehensionAccuracy: int("comprehensionAccuracy"),
  /** JSON array of strengths like ["vocabulary", "pacing"] */
  strengths: text("strengths"),
  /** JSON array of challenges like ["complex syntax", "inference"] */
  challenges: text("challenges"),
  /** Timestamp of last calibration test */
  lastCalibrated: timestamp("lastCalibrated").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReadingProfile = typeof readingProfiles.$inferSelect;
export type InsertReadingProfile = typeof readingProfiles.$inferInsert;

/**
 * Content library stores texts/books available for adaptive reading
 */
export const contentLibrary = mysqlTable("contentLibrary", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  /** Original full text content */
  originalText: text("originalText").notNull(),
  /** Base difficulty level of original text (1-7) */
  baseDifficulty: int("baseDifficulty").notNull(),
  /** Flesch-Kincaid grade level of original */
  fleschKincaid: int("fleschKincaid"),
  /** Word count */
  wordCount: int("wordCount"),
  /** Category like "fiction", "non-fiction", "science" */
  category: varchar("category", { length: 100 }),
  /** Source type: pre_generated (demo books) or pdf_upload */
  sourceType: mysqlEnum("sourceType", ["pre_generated", "pdf_upload"]).default("pre_generated").notNull(),
  /** URL to uploaded PDF file (if sourceType is pdf_upload) */
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  /** CEFR level classification (A1, A2, B1, B2, C1, C2) */
  cefrLevel: varchar("cefrLevel", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentLibrary = typeof contentLibrary.$inferSelect;
export type InsertContentLibrary = typeof contentLibrary.$inferInsert;

/**
 * Reading sessions track user's reading activity
 */
export const readingSessions = mysqlTable("readingSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  contentId: int("contentId").notNull().references(() => contentLibrary.id),
  /** Difficulty level used for this session (1-7) */
  difficultyLevel: int("difficultyLevel").notNull(),
  /** Current paragraph/section index */
  currentPosition: int("currentPosition").default(0).notNull(),
  /** Total paragraphs completed */
  completedParagraphs: int("completedParagraphs").default(0).notNull(),
  /** Average comprehension score for this session (0-100) */
  avgComprehension: int("avgComprehension"),
  /** Session status */
  status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = typeof readingSessions.$inferInsert;

/**
 * Progress tracking for paragraph-level comprehension
 */
export const progressTracking = mysqlTable("progressTracking", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => readingSessions.id),
  userId: int("userId").notNull().references(() => users.id),
  /** Paragraph index in the content */
  paragraphIndex: int("paragraphIndex").notNull(),
  /** Difficulty level for this paragraph (1-7) */
  difficultyLevel: int("difficultyLevel").notNull(),
  /** Comprehension score for this paragraph (0-100) */
  comprehensionScore: int("comprehensionScore"),
  /** Time spent reading this paragraph in seconds */
  timeSpent: int("timeSpent"),
  /** Whether difficulty was manually adjusted */
  manualAdjustment: int("manualAdjustment").default(0).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProgressTracking = typeof progressTracking.$inferSelect;
export type InsertProgressTracking = typeof progressTracking.$inferInsert;

/**
 * Calibration test results
 */
export const calibrationTests = mysqlTable("calibrationTests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  /** Test passage used */
  passageText: text("passageText").notNull(),
  /** Flesch-Kincaid level of passage */
  passageDifficulty: int("passageDifficulty").notNull(),
  /** Reading time in seconds */
  readingTime: int("readingTime").notNull(),
  /** Number of questions answered correctly */
  correctAnswers: int("correctAnswers").notNull(),
  /** Total number of questions */
  totalQuestions: int("totalQuestions").notNull(),
  /** Calculated reading level (1-7) */
  assessedLevel: int("assessedLevel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalibrationTest = typeof calibrationTests.$inferSelect;
export type InsertCalibrationTest = typeof calibrationTests.$inferInsert;

/**
 * Paragraph variants store pre-generated text at different difficulty levels
 * This enables instant level switching without real-time LLM calls
 */
export const paragraphVariants = mysqlTable("paragraphVariants", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to the content/book this paragraph belongs to */
  contentId: int("contentId").notNull().references(() => contentLibrary.id),
  /** Chapter number (e.g., 1-5 for first 5 chapters) */
  chapterNumber: int("chapterNumber").notNull(),
  /** Paragraph index within the chapter (0-based) */
  paragraphIndex: int("paragraphIndex").notNull(),
  /** Difficulty level (1-4 for Elementary to Middle School) */
  level: int("level").notNull(),
  /** Pre-generated paragraph text at this difficulty level */
  text: text("text").notNull(),
  /** Original paragraph text (level 4 baseline) */
  originalText: text("originalText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParagraphVariant = typeof paragraphVariants.$inferSelect;
export type InsertParagraphVariant = typeof paragraphVariants.$inferInsert;

/**
 * Word sequence entry type for Mind-Reader Slider
 */
export type WordSequenceEntry = {
  word: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
};

/**
 * Word-level variants for Mind-Reader Slider feature
 * Stores word sequences with 4 difficulty levels for smooth morphing
 */
export const wordLevel = mysqlTable("wordLevel", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => contentLibrary.id),
  paragraphIndex: int("paragraphIndex").notNull(),
  /** JSON array of word objects with level1-4 variants */
  wordSequence: json("wordSequence").$type<WordSequenceEntry[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, table => ({
  contentParagraphIdx: index("idx_wordLevel_content_paragraph").on(
    table.contentId,
    table.paragraphIndex
  ),
  contentParagraphUnique: uniqueIndex("uq_wordLevel_content_paragraph").on(
    table.contentId,
    table.paragraphIndex
  ),
}));

export type WordLevel = typeof wordLevel.$inferSelect;
export type InsertWordLevel = typeof wordLevel.$inferInsert;