import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
const roleEnum = pgEnum("role", ["user", "admin"]);
const sourceTypeEnum = pgEnum("sourceType", ["pre_generated", "pdf_upload"]);
const statusEnum = pgEnum("status", ["active", "paused", "completed"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Reading profiles store user's assessed reading level and characteristics
 */
export const readingProfiles = pgTable("readingProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  /** Reading level from 1 (beginner) to 7 (advanced) */
  level: integer("level").notNull(),
  /** Fine-grained preference captured by the Mind-Reader slider (1.0 - 4.0) */
  microLevel: doublePrecision("microLevel").default(2).notNull(),
  /** Reading speed in words per minute */
  readingSpeed: integer("readingSpeed"),
  /** Comprehension accuracy percentage (0-100) */
  comprehensionAccuracy: integer("comprehensionAccuracy"),
  /** JSON array of strengths like ["vocabulary", "pacing"] */
  strengths: text("strengths"),
  /** JSON array of challenges like ["complex syntax", "inference"] */
  challenges: text("challenges"),
  /** Timestamp of last calibration test */
  lastCalibrated: timestamp("lastCalibrated").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ReadingProfile = typeof readingProfiles.$inferSelect;
export type InsertReadingProfile = typeof readingProfiles.$inferInsert;

/**
 * Content library stores texts/books available for adaptive reading
 */
export const contentLibrary = pgTable("contentLibrary", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  /** Original full text content */
  originalText: text("originalText").notNull(),
  /** Base difficulty level of original text (1-7) */
  baseDifficulty: integer("baseDifficulty").notNull(),
  /** Flesch-Kincaid grade level of original */
  fleschKincaid: integer("fleschKincaid"),
  /** Word count */
  wordCount: integer("wordCount"),
  /** Category like "fiction", "non-fiction", "science" */
  category: varchar("category", { length: 100 }),
  /** Source type: pre_generated (demo books) or pdf_upload */
  sourceType: sourceTypeEnum("sourceType").default("pre_generated").notNull(),
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
export const readingSessions = pgTable("readingSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  contentId: integer("contentId").notNull().references(() => contentLibrary.id),
  /** Difficulty level used for this session (1-7) */
  difficultyLevel: integer("difficultyLevel").notNull(),
  /** Current paragraph/section index */
  currentPosition: integer("currentPosition").default(0).notNull(),
  /** Total paragraphs completed */
  completedParagraphs: integer("completedParagraphs").default(0).notNull(),
  /** Average comprehension score for this session (0-100) */
  avgComprehension: integer("avgComprehension"),
  /** Session status */
  status: statusEnum("status").default("active").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = typeof readingSessions.$inferInsert;

/**
 * Progress tracking for paragraph-level comprehension
 */
export const progressTracking = pgTable("progressTracking", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull().references(() => readingSessions.id),
  userId: integer("userId").notNull().references(() => users.id),
  /** Paragraph index in the content */
  paragraphIndex: integer("paragraphIndex").notNull(),
  /** Difficulty level for this paragraph (1-7) */
  difficultyLevel: integer("difficultyLevel").notNull(),
  /** Comprehension score for this paragraph (0-100) */
  comprehensionScore: integer("comprehensionScore"),
  /** Time spent reading this paragraph in seconds */
  timeSpent: integer("timeSpent"),
  /** Whether difficulty was manually adjusted */
  manualAdjustment: boolean("manualAdjustment").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProgressTracking = typeof progressTracking.$inferSelect;
export type InsertProgressTracking = typeof progressTracking.$inferInsert;

/**
 * Calibration test results
 */
export const calibrationTests = pgTable("calibrationTests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  /** Test passage used */
  passageText: text("passageText").notNull(),
  /** Flesch-Kincaid level of passage */
  passageDifficulty: integer("passageDifficulty").notNull(),
  /** Reading time in seconds */
  readingTime: integer("readingTime").notNull(),
  /** Number of questions answered correctly */
  correctAnswers: integer("correctAnswers").notNull(),
  /** Total number of questions */
  totalQuestions: integer("totalQuestions").notNull(),
  /** Calculated reading level (1-7) */
  assessedLevel: integer("assessedLevel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalibrationTest = typeof calibrationTests.$inferSelect;
export type InsertCalibrationTest = typeof calibrationTests.$inferInsert;

/**
 * Paragraph variants store pre-generated text at different difficulty levels
 * This enables instant level switching without real-time LLM calls
 */
export const paragraphVariants = pgTable("paragraphVariants", {
  id: serial("id").primaryKey(),
  /** Reference to the content/book this paragraph belongs to */
  contentId: integer("contentId").notNull().references(() => contentLibrary.id),
  /** Chapter number (e.g., 1-5 for first 5 chapters) */
  chapterNumber: integer("chapterNumber").notNull(),
  /** Paragraph index within the chapter (0-based) */
  paragraphIndex: integer("paragraphIndex").notNull(),
  /** Difficulty level (1-4 for Elementary to Middle School) */
  level: integer("level").notNull(),
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
export const wordLevel = pgTable("wordLevel", {
  id: serial("id").primaryKey(),
  contentId: integer("contentId").notNull().references(() => contentLibrary.id),
  paragraphIndex: integer("paragraphIndex").notNull(),
  /** JSON array of word objects with level1-4 variants */
  wordSequence: jsonb("wordSequence").$type<WordSequenceEntry[]>().notNull(),
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