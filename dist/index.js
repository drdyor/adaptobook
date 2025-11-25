// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// drizzle/schema.ts
import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var sourceTypeEnum = pgEnum("sourceType", ["pre_generated", "pdf_upload"]);
var statusEnum = pgEnum("status", ["active", "paused", "completed"]);
var users = pgTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var readingProfiles = pgTable("readingProfiles", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var contentLibrary = pgTable("contentLibrary", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var readingSessions = pgTable("readingSessions", {
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
  completedAt: timestamp("completedAt")
});
var progressTracking = pgTable("progressTracking", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var calibrationTests = pgTable("calibrationTests", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var paragraphVariants = pgTable("paragraphVariants", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var wordLevel = pgTable("wordLevel", {
  id: serial("id").primaryKey(),
  contentId: integer("contentId").notNull().references(() => contentLibrary.id),
  paragraphIndex: integer("paragraphIndex").notNull(),
  /** JSON array of word objects with level1-4 variants */
  wordSequence: jsonb("wordSequence").$type().notNull(),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  contentParagraphIdx: index("idx_wordLevel_content_paragraph").on(
    table.contentId,
    table.paragraphIndex
  ),
  contentParagraphUnique: uniqueIndex("uq_wordLevel_content_paragraph").on(
    table.contentId,
    table.paragraphIndex
  )
}));

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getReadingProfileByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(readingProfiles).where(eq(readingProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createReadingProfile(profile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(readingProfiles).values(profile);
  return result;
}
async function updateReadingProfile(userId, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(readingProfiles).set(updates).where(eq(readingProfiles.userId, userId));
}
async function createCalibrationTest(test) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(calibrationTests).values(test);
  return result;
}
async function getAllContent() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contentLibrary);
}
async function getContentById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(contentLibrary).where(eq(contentLibrary.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createContent(content) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentLibrary).values(content).returning({ id: contentLibrary.id });
  return result[0];
}
async function createReadingSession(session) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(readingSessions).values(session).returning({ id: readingSessions.id });
  return result[0];
}
async function getActiveSessionByUserId(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(readingSessions).where(eq(readingSessions.userId, userId)).orderBy(readingSessions.lastAccessedAt).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateReadingSession(sessionId, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(readingSessions).set(updates).where(eq(readingSessions.id, sessionId));
}
async function createProgressTracking(progress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(progressTracking).values(progress);
  return result;
}
async function getSessionProgress(sessionId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(progressTracking).where(eq(progressTracking.sessionId, sessionId)).orderBy(progressTracking.paragraphIndex);
}
async function saveWordLevelSequence(entry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(wordLevel).values(entry).onConflictDoUpdate({
    target: [wordLevel.contentId, wordLevel.paragraphIndex],
    set: {
      wordSequence: entry.wordSequence,
      createdAt: /* @__PURE__ */ new Date()
    }
  });
}
async function getWordLevelSequence(contentId, paragraphIndex) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(wordLevel).where(
    and(
      eq(wordLevel.contentId, contentId),
      eq(wordLevel.paragraphIndex, paragraphIndex)
    )
  ).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateMicroLevel(userId, microLevel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(readingProfiles).set({ microLevel }).where(eq(readingProfiles.userId, userId));
}
async function createParagraphVariant(variant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paragraphVariants).values(variant);
  return result;
}
async function getParagraphVariant(contentId, chapterNumber, paragraphIndex, level) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(paragraphVariants).where(and(
    eq(paragraphVariants.contentId, contentId),
    eq(paragraphVariants.chapterNumber, chapterNumber),
    eq(paragraphVariants.paragraphIndex, paragraphIndex),
    eq(paragraphVariants.level, level)
  )).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getChapterVariants(contentId, chapterNumber) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paragraphVariants).where(and(
    eq(paragraphVariants.contentId, contentId),
    eq(paragraphVariants.chapterNumber, chapterNumber)
  )).orderBy(paragraphVariants.paragraphIndex);
}
async function getAllVariantsForContent(contentId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paragraphVariants).where(eq(paragraphVariants.contentId, contentId)).orderBy(paragraphVariants.chapterNumber, paragraphVariants.paragraphIndex);
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var isOAuthConfigured = Boolean(ENV.oAuthServerUrl?.trim()) && Boolean(ENV.appId?.trim()) && Boolean(ENV.cookieSecret?.trim());
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var DisabledOAuthSdk = class {
  error() {
    console.warn(
      "[OAuth] Attempted to use OAuth SDK, but required environment variables are missing."
    );
    return new Error("OAuth is disabled (missing env vars).");
  }
  async exchangeCodeForToken() {
    throw this.error();
  }
  async getUserInfo() {
    throw this.error();
  }
  async createSessionToken() {
    throw this.error();
  }
  async authenticateRequest() {
    throw ForbiddenError("OAuth is disabled.");
  }
};
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = isOAuthConfigured ? new SDKServer() : new DisabledOAuthSdk();
if (!isOAuthConfigured) {
  console.warn(
    "[OAuth] SDK disabled because required environment variables are missing."
  );
}

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/calibration.ts
var CALIBRATION_PASSAGES = [
  {
    text: `The sun rises in the east and sets in the west. Every morning, people wake up to see the bright yellow sun climbing into the sky. The sun gives us light and warmth. Without the sun, plants could not grow and animals would have no food. The sun is very important for life on Earth. During the day, the sun moves across the sky. At night, we cannot see it because Earth has turned away from the sun.`,
    fleschKincaid: 3,
    questions: [
      {
        question: "Where does the sun rise?",
        options: ["In the west", "In the east", "In the north", "In the south"],
        correctAnswer: 1,
        type: "comprehension"
      },
      {
        question: "What does the sun give us?",
        options: ["Rain and snow", "Light and warmth", "Wind and clouds", "Stars and moon"],
        correctAnswer: 1,
        type: "comprehension"
      },
      {
        question: "Why can't we see the sun at night?",
        options: ["The sun goes away", "Earth has turned away from the sun", "Clouds cover it", "It becomes too small"],
        correctAnswer: 1,
        type: "inference"
      }
    ]
  },
  {
    text: `Climate change represents one of the most significant challenges facing humanity in the twenty-first century. The accumulation of greenhouse gases in the atmosphere, primarily carbon dioxide from fossil fuel combustion, has led to a measurable increase in global average temperatures. This warming trend has cascading effects on weather patterns, ocean currents, and ecosystems worldwide. Scientists have documented melting ice caps, rising sea levels, and increasingly frequent extreme weather events. The scientific consensus is clear: human activities are the dominant cause of observed warming since the mid-twentieth century.`,
    fleschKincaid: 12,
    questions: [
      {
        question: "What is the primary cause of greenhouse gas accumulation mentioned in the passage?",
        options: ["Natural volcanic activity", "Fossil fuel combustion", "Ocean evaporation", "Plant respiration"],
        correctAnswer: 1,
        type: "comprehension"
      },
      {
        question: "What does 'cascading effects' most likely mean in this context?",
        options: ["Waterfall-like movements", "A series of connected consequences", "Rapid improvements", "Circular patterns"],
        correctAnswer: 1,
        type: "vocabulary"
      },
      {
        question: "Based on the passage, what can be inferred about the scientific community's view?",
        options: ["They are uncertain about climate change", "They disagree on the causes", "They largely agree humans are responsible", "They think it's a natural cycle"],
        correctAnswer: 2,
        type: "inference"
      }
    ]
  }
];
function assessReadingLevel(readingTimeSeconds, correctAnswers, totalQuestions, passageDifficulty) {
  const comprehensionRate = correctAnswers / totalQuestions;
  const wordsPerMinute = calculateWPM(readingTimeSeconds, passageDifficulty);
  let level = Math.round(passageDifficulty / 2);
  if (comprehensionRate >= 0.9) {
    level += 1;
  } else if (comprehensionRate < 0.6) {
    level -= 1;
  }
  if (wordsPerMinute > 250) {
    level += 1;
  } else if (wordsPerMinute < 150) {
    level -= 1;
  }
  return Math.max(1, Math.min(7, level));
}
function calculateWPM(readingTimeSeconds, passageDifficulty) {
  const estimatedWords = 100 + passageDifficulty * 20;
  const minutes = readingTimeSeconds / 60;
  return Math.round(estimatedWords / minutes);
}
function analyzePerformance(questions, userAnswers) {
  const performance = {
    comprehension: { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    inference: { correct: 0, total: 0 }
  };
  questions.forEach((q, i) => {
    const type = q.type;
    performance[type].total++;
    if (userAnswers[i] === q.correctAnswer) {
      performance[type].correct++;
    }
  });
  const strengths = [];
  const challenges = [];
  Object.entries(performance).forEach(([type, stats]) => {
    if (stats.total === 0) return;
    const rate = stats.correct / stats.total;
    if (rate >= 0.8) {
      strengths.push(type);
    } else if (rate < 0.6) {
      challenges.push(type);
    }
  });
  return { strengths, challenges };
}

// server/routers.ts
import { z as z3 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var resolveOpenRouterUrl = () => "https://openrouter.ai/api/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.openRouterApiKey && !ENV.forgeApiKey) {
    throw new Error("Either OPENROUTER_API_KEY or BUILT_IN_FORGE_API_KEY must be configured");
  }
};
var shouldUseOpenRouter = () => {
  return !!ENV.openRouterApiKey;
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    maxTokens,
    max_tokens
  } = params;
  const useOpenRouter = shouldUseOpenRouter();
  const apiUrl = useOpenRouter ? resolveOpenRouterUrl() : resolveApiUrl();
  const apiKey = useOpenRouter ? ENV.openRouterApiKey : ENV.forgeApiKey;
  const payload = {
    model: useOpenRouter ? "x-ai/grok-beta" : "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`
  };
  if (useOpenRouter) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERER_URL || "https://adaptobook.com";
    headers["X-Title"] = "AdaptoBook";
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const maxTokensValue = maxTokens || max_tokens;
  if (maxTokensValue) {
    payload.max_tokens = maxTokensValue;
  } else if (!useOpenRouter) {
    payload.max_tokens = 32768;
    payload.thinking = {
      "budget_tokens": 128
    };
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/adaptation.ts
async function adaptTextToLevel(originalText, targetLevel) {
  const levelDescriptions = {
    1: "1st-2nd grade level with very simple sentences (5-8 words), basic vocabulary, and concrete concepts",
    2: "3rd-4th grade level with simple sentences (8-12 words), common vocabulary, and straightforward ideas",
    3: "5th-6th grade level with moderate sentences (12-15 words), age-appropriate vocabulary, and some abstract concepts",
    4: "7th-8th grade level with varied sentences (15-18 words), expanded vocabulary, and more complex ideas",
    5: "9th-10th grade level with sophisticated sentences (18-22 words), academic vocabulary, and nuanced concepts",
    6: "11th-12th grade level with complex sentences (22-25 words), advanced vocabulary, and abstract reasoning",
    7: "college/adult level with intricate sentences (25+ words), specialized vocabulary, and sophisticated analysis"
  };
  const prompt = `You are an expert reading specialist. Rewrite the following text to match a ${levelDescriptions[targetLevel]} reading level.

IMPORTANT RULES:
1. Preserve all key information and main ideas
2. Maintain the same meaning and factual accuracy
3. Adjust vocabulary complexity to match the target level
4. Adjust sentence structure and length appropriately
5. Break complex ideas into simpler steps for lower levels
6. Use more sophisticated language and structure for higher levels
7. Keep the same general length (number of paragraphs)
8. Do NOT add explanations or commentary - just rewrite the text

Original text:
${originalText}

Rewritten text at target level:`;
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert reading specialist who adapts text to different reading levels while preserving meaning." },
      { role: "user", content: prompt }
    ]
  });
  const messageContent = response.choices[0]?.message?.content;
  const adaptedText = typeof messageContent === "string" ? messageContent : originalText;
  const paragraphs = adaptedText.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  return {
    text: adaptedText,
    level: targetLevel,
    paragraphs
  };
}
async function adaptParagraph(paragraph, currentLevel, targetLevel) {
  if (currentLevel === targetLevel) {
    return paragraph;
  }
  const direction = targetLevel > currentLevel ? "increase" : "decrease";
  const levelChange = Math.abs(targetLevel - currentLevel);
  const prompt = `${direction === "increase" ? "Increase" : "Decrease"} the reading difficulty of this paragraph by ${levelChange} grade level(s).

Rules:
- Preserve the exact meaning and information
- ${direction === "increase" ? "Use more sophisticated vocabulary and complex sentence structures" : "Use simpler words and shorter sentences"}
- Keep approximately the same length
- Do NOT add new information or explanations

Original paragraph:
${paragraph}

Rewritten paragraph:`;
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert at adjusting text difficulty while preserving meaning." },
      { role: "user", content: prompt }
    ]
  });
  const messageContent = response.choices[0]?.message?.content;
  return typeof messageContent === "string" ? messageContent : paragraph;
}

// server/_core/pdfExtraction.ts
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
async function extractTextFromPDFBuffer(buffer) {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}
function splitIntoParagraphs(text2) {
  return text2.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 50).filter((p) => !p.match(/^\d+$/));
}
async function extractAndSplitPDF(buffer) {
  const text2 = await extractTextFromPDFBuffer(buffer);
  return splitIntoParagraphs(text2);
}

// server/_core/cefr.ts
function classifyTextCEFR(text2) {
  const words = text2.split(/\s+/).length;
  const sentences = text2.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
  const complexWords = text2.split(/\s+/).filter((word) => {
    const vowels = word.match(/[aeiouAEIOU]/g)?.length || 0;
    return vowels >= 3;
  }).length;
  const complexWordRatio = words > 0 ? complexWords / words : 0;
  if (avgWordsPerSentence < 10 && complexWordRatio < 0.1) {
    return "A1";
  }
  if (avgWordsPerSentence < 15 && complexWordRatio < 0.15) {
    return "A2";
  }
  if (avgWordsPerSentence < 20 && complexWordRatio < 0.25) {
    return "B1";
  }
  if (avgWordsPerSentence < 25 && complexWordRatio < 0.35) {
    return "B2";
  }
  return "C1";
}
var cefrCache = /* @__PURE__ */ new Map();
function classifyTextCEFRCached(text2) {
  const cacheKey = text2.substring(0, 500).trim();
  if (cefrCache.has(cacheKey)) {
    return cefrCache.get(cacheKey);
  }
  const level = classifyTextCEFR(text2);
  cefrCache.set(cacheKey, level);
  if (cefrCache.size > 1e3) {
    const firstKey = cefrCache.keys().next().value;
    cefrCache.delete(firstKey);
  }
  return level;
}

// server/storage.ts
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/_core/rateLimit.ts
var rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count++;
  return true;
}
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}
setInterval(cleanupRateLimitStore, 60 * 60 * 1e3);
function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  const realIP = req.headers["x-real-ip"];
  if (typeof realIP === "string") {
    return realIP;
  }
  return "unknown";
}

// server/adaptWordLevelRouter.ts
import { z as z2 } from "zod";
var paragraphInput = z2.object({
  index: z2.number().nonnegative(),
  text: z2.string().min(1)
});
var adaptWordLevelRouter = router({
  /**
   * Get word sequence for a paragraph (contains all 4 levels in JSON)
   */
  getWordSeq: publicProcedure.input(
    z2.object({
      contentId: z2.number().min(1),
      paragraphIndex: z2.number().nonnegative()
    })
  ).query(async ({ input }) => {
    const row = await getWordLevelSequence(
      input.contentId,
      input.paragraphIndex
    );
    return row?.wordSequence ?? [];
  }),
  /**
   * Save user's microLevel preference (1.0 - 4.0)
   */
  saveMicroLevel: protectedProcedure.input(
    z2.object({
      microLevel: z2.number().min(1).max(4)
    })
  ).mutation(async ({ ctx, input }) => {
    await updateMicroLevel(ctx.user.id, input.microLevel);
    return { success: true };
  }),
  /**
   * Pre-generate word-level variants for paragraphs (one-time batch)
   */
  preGenWordLevels: protectedProcedure.input(
    z2.object({
      contentId: z2.number().min(1),
      paragraphs: z2.array(paragraphInput).min(1)
    })
  ).mutation(async ({ input }) => {
    for (const paragraph of input.paragraphs) {
      const sequence = await generateWordSequence(paragraph.text);
      await saveWordLevelSequence({
        contentId: input.contentId,
        paragraphIndex: paragraph.index,
        wordSequence: sequence
      });
    }
    return { done: true, count: input.paragraphs.length };
  })
});
async function generateWordSequence(paragraph) {
  const prompt = `Split this paragraph into individual words.
For each word give four versions:
- level1 (grade 1\u20132)
- level2 (grade 5\u20136)
- level3 (grade 8\u20139)
- level4 (original wording)

Return strictly valid JSON array in this format (no commentary):
[
  {"word":"quick","level1":"fast","level2":"rapid","level3":"swift","level4":"expeditious"}
]

Paragraph:
${paragraph}`;
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a linguistic expert who rewrites words for different reading levels and always responds with valid JSON arrays."
      },
      { role: "user", content: prompt }
    ]
  });
  const messageContent = response.choices[0]?.message?.content;
  const raw = typeof messageContent === "string" ? messageContent : "";
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const jsonPayload = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonPayload);
    if (Array.isArray(parsed)) {
      return parsed.filter(isWordSequenceEntry);
    }
  } catch (error) {
    console.error("Failed to parse word sequence JSON", error, raw);
  }
  return [];
}
function isWordSequenceEntry(entry) {
  return entry && typeof entry.word === "string" && typeof entry.level1 === "string" && typeof entry.level2 === "string" && typeof entry.level3 === "string" && typeof entry.level4 === "string";
}

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  calibration: router({
    getPassage: publicProcedure.query(() => {
      const passage = CALIBRATION_PASSAGES[Math.floor(Math.random() * CALIBRATION_PASSAGES.length)];
      return {
        text: passage.text,
        fleschKincaid: passage.fleschKincaid,
        questions: passage.questions.map((q) => ({
          question: q.question,
          options: q.options,
          type: q.type
        }))
      };
    }),
    submitTest: protectedProcedure.input((val) => {
      const input = val;
      return input;
    }).mutation(async ({ ctx, input }) => {
      const passage = CALIBRATION_PASSAGES.find((p) => p.text === input.passageText);
      if (!passage) {
        throw new Error("Invalid passage");
      }
      const correctAnswers = input.answers.filter((answer, i) => answer === passage.questions[i].correctAnswer).length;
      const totalQuestions = passage.questions.length;
      const assessedLevel = assessReadingLevel(
        input.readingTime,
        correctAnswers,
        totalQuestions,
        input.passageDifficulty
      );
      const { strengths, challenges } = analyzePerformance(passage.questions, input.answers);
      const words = input.passageText.split(/\s+/).length;
      const readingSpeed = Math.round(words / input.readingTime * 60);
      const comprehensionAccuracy = Math.round(correctAnswers / totalQuestions * 100);
      await createCalibrationTest({
        userId: ctx.user.id,
        passageText: input.passageText,
        passageDifficulty: input.passageDifficulty,
        readingTime: input.readingTime,
        correctAnswers,
        totalQuestions,
        assessedLevel
      });
      const existingProfile = await getReadingProfileByUserId(ctx.user.id);
      const profileData = {
        userId: ctx.user.id,
        level: assessedLevel,
        microLevel: existingProfile?.microLevel ?? 2,
        readingSpeed,
        comprehensionAccuracy,
        strengths: JSON.stringify(strengths),
        challenges: JSON.stringify(challenges),
        lastCalibrated: /* @__PURE__ */ new Date()
      };
      if (existingProfile) {
        await updateReadingProfile(ctx.user.id, profileData);
      } else {
        await createReadingProfile(profileData);
      }
      return {
        level: assessedLevel,
        readingSpeed,
        comprehensionAccuracy,
        strengths,
        challenges,
        correctAnswers,
        totalQuestions
      };
    })
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getReadingProfileByUserId(ctx.user.id);
      if (!profile) return null;
      return {
        ...profile,
        strengths: profile.strengths ? JSON.parse(profile.strengths) : [],
        challenges: profile.challenges ? JSON.parse(profile.challenges) : []
      };
    }),
    updateMicroLevel: protectedProcedure.input((val) => {
      const input = val;
      return input;
    }).mutation(async ({ ctx, input }) => {
      const clamped = Math.min(4, Math.max(1, input.microLevel));
      await updateReadingProfile(ctx.user.id, { microLevel: clamped });
      return { microLevel: clamped };
    })
  }),
  content: router({
    list: publicProcedure.query(async () => {
      return await getAllContent();
    }),
    get: publicProcedure.input((val) => {
      const input = val;
      return input;
    }).query(async ({ input }) => {
      return await getContentById(input.id);
    }),
    // Get a single paragraph variant at a specific difficulty level
    getParagraphVariant: publicProcedure.input((val) => {
      const input = val;
      return input;
    }).query(async ({ input }) => {
      const variant = await getParagraphVariant(
        input.contentId,
        input.chapterNumber,
        input.paragraphIndex,
        input.level
      );
      if (!variant) {
        throw new Error("Paragraph variant not found");
      }
      return variant;
    }),
    // Get all paragraph variants for a chapter (all levels)
    getChapter: publicProcedure.input((val) => {
      const input = val;
      return input;
    }).query(async ({ input }) => {
      const variants = await getChapterVariants(
        input.contentId,
        input.chapterNumber
      );
      const paragraphGroups = {};
      for (const variant of variants) {
        if (!paragraphGroups[variant.paragraphIndex]) {
          paragraphGroups[variant.paragraphIndex] = {
            paragraphIndex: variant.paragraphIndex,
            levels: {}
          };
        }
        paragraphGroups[variant.paragraphIndex].levels[variant.level] = variant.text;
      }
      return {
        chapterNumber: input.chapterNumber,
        paragraphs: Object.values(paragraphGroups)
      };
    }),
    // Get all variants for entire content (useful for preloading)
    getAllVariants: publicProcedure.input((val) => {
      const input = val;
      return input;
    }).query(async ({ input }) => {
      return await getAllVariantsForContent(input.contentId);
    }),
    // Legacy adapt endpoint - kept for backwards compatibility but deprecated
    adapt: protectedProcedure.input((val) => {
      const input = val;
      return input;
    }).mutation(async ({ input }) => {
      const content = await getContentById(input.contentId);
      if (!content) {
        throw new Error("Content not found");
      }
      const adapted = await adaptTextToLevel(content.originalText, input.targetLevel);
      return adapted;
    }),
    // Upload PDF and extract text
    uploadPdf: publicProcedure.input(
      z3.object({
        title: z3.string().min(1),
        author: z3.string().optional(),
        pdfData: z3.string()
        // base64 encoded PDF
      })
    ).mutation(async ({ input, ctx }) => {
      const clientIP = getClientIP({ headers: ctx.req.headers });
      const rateLimitKey = `pdf_upload:${clientIP}`;
      const allowed = checkRateLimit(rateLimitKey, 10, 24 * 60 * 60 * 1e3);
      if (!allowed) {
        throw new Error("Rate limit exceeded: Maximum 10 PDF uploads per day");
      }
      const pdfBuffer = Buffer.from(input.pdfData, "base64");
      const sizeMB = pdfBuffer.length / (1024 * 1024);
      if (sizeMB > 10) {
        throw new Error("PDF file exceeds maximum size limit of 10MB");
      }
      const paragraphs = await extractAndSplitPDF(pdfBuffer);
      if (paragraphs.length === 0) {
        throw new Error("No text could be extracted from PDF");
      }
      const sampleText = paragraphs.slice(0, 3).join(" ");
      const cefrLevel = classifyTextCEFRCached(sampleText);
      let pdfUrl;
      try {
        const { url } = await storagePut(
          `pdfs/${Date.now()}-${input.title.replace(/[^a-z0-9]/gi, "-")}.pdf`,
          pdfBuffer,
          "application/pdf"
        );
        pdfUrl = url;
      } catch (error) {
        console.warn("Failed to store PDF file:", error);
      }
      const fullText = paragraphs.join("\n\n");
      const wordCount = fullText.split(/\s+/).length;
      const contentResult = await createContent({
        title: input.title,
        author: input.author || null,
        originalText: fullText,
        baseDifficulty: 4,
        // Default to level 4 (original)
        wordCount,
        category: "pdf_upload",
        sourceType: "pdf_upload",
        pdfUrl: pdfUrl || null,
        cefrLevel
      });
      const contentId = contentResult.id;
      for (let i = 0; i < paragraphs.length; i++) {
        await createParagraphVariant({
          contentId,
          chapterNumber: 1,
          paragraphIndex: i,
          level: 4,
          text: paragraphs[i],
          originalText: paragraphs[i]
        });
      }
      return {
        contentId,
        title: input.title,
        author: input.author,
        paragraphCount: paragraphs.length,
        cefrLevel
      };
    }),
    // Adapt a paragraph on-the-fly
    adaptParagraph: publicProcedure.input(
      z3.object({
        contentId: z3.number(),
        chapterNumber: z3.number(),
        paragraphIndex: z3.number(),
        currentLevel: z3.number().min(1).max(4),
        targetLevel: z3.number().min(1).max(4)
      })
    ).mutation(async ({ input, ctx }) => {
      const clientIP = getClientIP({ headers: ctx.req.headers });
      const rateLimitKey = `adapt_paragraph:${clientIP}`;
      const allowed = checkRateLimit(rateLimitKey, 50, 24 * 60 * 60 * 1e3);
      if (!allowed) {
        throw new Error("Rate limit exceeded: Maximum 50 paragraph adaptations per day");
      }
      const existing = await getParagraphVariant(
        input.contentId,
        input.chapterNumber,
        input.paragraphIndex,
        input.targetLevel
      );
      if (existing) {
        return { text: existing.text };
      }
      const original = await getParagraphVariant(
        input.contentId,
        input.chapterNumber,
        input.paragraphIndex,
        4
      );
      if (!original) {
        throw new Error("Paragraph not found");
      }
      const adaptedText = await adaptParagraph(
        original.text,
        input.currentLevel,
        input.targetLevel
      );
      await createParagraphVariant({
        contentId: input.contentId,
        chapterNumber: input.chapterNumber,
        paragraphIndex: input.paragraphIndex,
        level: input.targetLevel,
        text: adaptedText,
        originalText: original.text
      });
      return { text: adaptedText };
    }),
    // Upload text file directly (simpler than PDF)
    uploadText: publicProcedure.input(
      z3.object({
        title: z3.string().min(1),
        author: z3.string().optional(),
        textContent: z3.string().min(100)
        // At least 100 characters
      })
    ).mutation(async ({ input, ctx }) => {
      const clientIP = getClientIP({ headers: ctx.req.headers });
      const rateLimitKey = `text_upload:${clientIP}`;
      const allowed = checkRateLimit(rateLimitKey, 10, 24 * 60 * 60 * 1e3);
      if (!allowed) {
        throw new Error("Rate limit exceeded: Maximum 10 uploads per day");
      }
      const paragraphs = input.textContent.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 50).filter((p) => !p.match(/^\d+$/));
      if (paragraphs.length === 0) {
        throw new Error("No valid paragraphs found in text. Please ensure your text has proper paragraph breaks.");
      }
      const sampleText = paragraphs.slice(0, 3).join(" ");
      const cefrLevel = classifyTextCEFRCached(sampleText);
      const wordCount = input.textContent.split(/\s+/).length;
      const contentResult = await createContent({
        title: input.title,
        author: input.author || null,
        originalText: input.textContent,
        baseDifficulty: 4,
        // Default to level 4 (original)
        wordCount,
        category: "text_upload",
        sourceType: "pdf_upload",
        // Reuse same type for simplicity
        pdfUrl: null,
        cefrLevel
      });
      const contentId = contentResult.id;
      for (let i = 0; i < paragraphs.length; i++) {
        await createParagraphVariant({
          contentId,
          chapterNumber: 1,
          paragraphIndex: i,
          level: 4,
          text: paragraphs[i],
          originalText: paragraphs[i]
        });
      }
      return {
        contentId,
        title: input.title,
        author: input.author,
        paragraphCount: paragraphs.length,
        cefrLevel
      };
    })
  }),
  reading: router({
    startSession: protectedProcedure.input((val) => {
      const input = val;
      return input;
    }).mutation(async ({ ctx, input }) => {
      const result = await createReadingSession({
        userId: ctx.user.id,
        contentId: input.contentId,
        difficultyLevel: input.difficultyLevel,
        currentPosition: 0,
        completedParagraphs: 0,
        status: "active"
      });
      return { sessionId: result.id };
    }),
    getActiveSession: protectedProcedure.query(async ({ ctx }) => {
      return await getActiveSessionByUserId(ctx.user.id);
    }),
    updateProgress: protectedProcedure.input((val) => {
      const input = val;
      return input;
    }).mutation(async ({ ctx, input }) => {
      await createProgressTracking({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        paragraphIndex: input.paragraphIndex,
        difficultyLevel: input.difficultyLevel,
        comprehensionScore: input.comprehensionScore,
        timeSpent: input.timeSpent,
        manualAdjustment: input.manualAdjustment || false
      });
      await updateReadingSession(input.sessionId, {
        currentPosition: input.paragraphIndex,
        completedParagraphs: input.paragraphIndex + 1,
        lastAccessedAt: /* @__PURE__ */ new Date()
      });
      return { success: true };
    }),
    getProgress: protectedProcedure.input((val) => {
      const input = val;
      return input;
    }).query(async ({ input }) => {
      return await getSessionProgress(input.sessionId);
    })
  }),
  wordLevel: adaptWordLevelRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins,
    define: {
      "import.meta.env.VITE_ENABLE_AUTH": JSON.stringify(env.VITE_ENABLE_AUTH || "false")
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets")
      }
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true
    },
    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1"
      ],
      fs: {
        strict: true,
        deny: ["**/.*"]
      }
    }
  };
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  if (ENV.oAuthServerUrl) {
    registerOAuthRoutes(app);
  } else {
    console.warn("[OAuth] Skipping OAuth routes; OAUTH_SERVER_URL not set.");
  }
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
