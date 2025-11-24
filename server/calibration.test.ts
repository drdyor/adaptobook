import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("calibration.getPassage", () => {
  it("returns a calibration passage with questions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calibration.getPassage();

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.fleschKincaid).toBeDefined();
    expect(typeof result.fleschKincaid).toBe("number");
    expect(result.questions).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
    expect(result.questions.length).toBeGreaterThan(0);

    // Check question structure
    const firstQuestion = result.questions[0];
    expect(firstQuestion).toBeDefined();
    expect(firstQuestion.question).toBeDefined();
    expect(firstQuestion.options).toBeDefined();
    expect(Array.isArray(firstQuestion.options)).toBe(true);
    expect(firstQuestion.options.length).toBe(4);
    expect(firstQuestion.type).toBeDefined();
  });
});

describe("content.list", () => {
  it("returns list of available content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.content.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const firstItem = result[0];
      expect(firstItem.id).toBeDefined();
      expect(firstItem.title).toBeDefined();
      expect(firstItem.originalText).toBeDefined();
      expect(firstItem.baseDifficulty).toBeDefined();
    }
  });
});

describe("content.get", () => {
  it("returns specific content by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First get the list to find a valid ID
    const list = await caller.content.list();
    
    if (list.length > 0) {
      const firstId = list[0].id;
      const result = await caller.content.get({ id: firstId });

      expect(result).toBeDefined();
      expect(result?.id).toBe(firstId);
      expect(result?.title).toBeDefined();
      expect(result?.originalText).toBeDefined();
    }
  });
});
