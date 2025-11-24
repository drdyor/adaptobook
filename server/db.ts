import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  readingProfiles,
  InsertReadingProfile,
  calibrationTests,
  InsertCalibrationTest,
  contentLibrary,
  InsertContentLibrary,
  readingSessions,
  InsertReadingSession,
  progressTracking,
  InsertProgressTracking,
  paragraphVariants,
  InsertParagraphVariant
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Reading Profile queries
export async function getReadingProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(readingProfiles).where(eq(readingProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createReadingProfile(profile: InsertReadingProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(readingProfiles).values(profile);
  return result;
}

export async function updateReadingProfile(userId: number, updates: Partial<InsertReadingProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(readingProfiles).set(updates).where(eq(readingProfiles.userId, userId));
}

// Calibration Test queries
export async function createCalibrationTest(test: InsertCalibrationTest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calibrationTests).values(test);
  return result;
}

export async function getLatestCalibrationTest(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(calibrationTests)
    .where(eq(calibrationTests.userId, userId))
    .orderBy(calibrationTests.createdAt)
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Content Library queries
export async function getAllContent() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contentLibrary);
}

export async function getContentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentLibrary).where(eq(contentLibrary.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createContent(content: InsertContentLibrary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentLibrary).values(content);
  return result;
}

// Reading Session queries
export async function createReadingSession(session: InsertReadingSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(readingSessions).values(session);
  return result;
}

export async function getActiveSessionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(readingSessions)
    .where(eq(readingSessions.userId, userId))
    .orderBy(readingSessions.lastAccessedAt)
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateReadingSession(sessionId: number, updates: Partial<InsertReadingSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(readingSessions).set(updates).where(eq(readingSessions.id, sessionId));
}

// Progress Tracking queries
export async function createProgressTracking(progress: InsertProgressTracking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(progressTracking).values(progress);
  return result;
}

export async function getSessionProgress(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(progressTracking)
    .where(eq(progressTracking.sessionId, sessionId))
    .orderBy(progressTracking.paragraphIndex);
}

// Paragraph Variants queries
export async function createParagraphVariant(variant: InsertParagraphVariant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paragraphVariants).values(variant);
  return result;
}

export async function getParagraphVariant(
  contentId: number,
  chapterNumber: number,
  paragraphIndex: number,
  level: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(paragraphVariants)
    .where(and(
      eq(paragraphVariants.contentId, contentId),
      eq(paragraphVariants.chapterNumber, chapterNumber),
      eq(paragraphVariants.paragraphIndex, paragraphIndex),
      eq(paragraphVariants.level, level)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getChapterVariants(
  contentId: number,
  chapterNumber: number
) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paragraphVariants)
    .where(and(
      eq(paragraphVariants.contentId, contentId),
      eq(paragraphVariants.chapterNumber, chapterNumber)
    ))
    .orderBy(paragraphVariants.paragraphIndex);
}

export async function getAllVariantsForContent(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paragraphVariants)
    .where(eq(paragraphVariants.contentId, contentId))
    .orderBy(paragraphVariants.chapterNumber, paragraphVariants.paragraphIndex);
}
