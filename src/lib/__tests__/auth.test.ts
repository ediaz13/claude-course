// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value !== undefined ? { name, value } : undefined;
      },
      set: (name: string, value: string) => {
        cookieStore.set(name, value);
      },
      delete: (name: string) => {
        cookieStore.delete(name);
      },
    })
  ),
}));

import {
  createSession,
  deleteSession,
  getSession,
  verifySession,
} from "@/lib/auth";
import type { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(
  payload: Record<string, unknown>,
  exp?: number // Unix timestamp in seconds; omit for 7 days from now
) {
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();

  if (exp !== undefined) {
    builder.setExpirationTime(exp);
  } else {
    builder.setExpirationTime("7d");
  }

  return builder.sign(JWT_SECRET);
}

function makeRequest(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        token && name === "auth-token" ? { name, value: token } : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  cookieStore.clear();
  vi.clearAllMocks();
});

// createSession

test("createSession sets the auth-token cookie", async () => {
  await createSession("user-1", "user@example.com");
  expect(cookieStore.has("auth-token")).toBe(true);
});

test("createSession stores a JWT with userId and email in the cookie", async () => {
  await createSession("user-1", "user@example.com");
  const token = cookieStore.get("auth-token")!;
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("user@example.com");
});

test("createSession sets expiresAt approximately 7 days in the future", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const token = cookieStore.get("auth-token")!;
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, JWT_SECRET);

  const expiresAt = new Date(payload.expiresAt as string).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession overwrites an existing cookie", async () => {
  await createSession("user-1", "first@example.com");
  const firstToken = cookieStore.get("auth-token");

  await createSession("user-2", "second@example.com");
  const secondToken = cookieStore.get("auth-token");

  expect(secondToken).not.toBe(firstToken);
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(secondToken!, JWT_SECRET);
  expect(payload.email).toBe("second@example.com");
});

// getSession

test("getSession returns null when no cookie is present", async () => {
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await makeToken({
    userId: "user-1",
    email: "user@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  cookieStore.set("auth-token", token);

  const session = await getSession();
  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-1");
  expect(session!.email).toBe("user@example.com");
});

test("getSession returns null for a malformed token", async () => {
  cookieStore.set("auth-token", "not.a.valid.jwt");
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const pastExp = Math.floor(Date.now() / 1000) - 60;
  const token = await makeToken(
    { userId: "user-1", email: "user@example.com" },
    pastExp
  );
  cookieStore.set("auth-token", token);

  const session = await getSession();
  expect(session).toBeNull();
});

// deleteSession

test("deleteSession removes the auth-token cookie", async () => {
  cookieStore.set("auth-token", "some-token");
  await deleteSession();
  expect(cookieStore.has("auth-token")).toBe(false);
});

// verifySession

test("verifySession returns null when request has no auth-token cookie", async () => {
  const session = await verifySession(makeRequest());
  expect(session).toBeNull();
});

test("verifySession returns session payload for a valid token in the request", async () => {
  const token = await makeToken({
    userId: "user-1",
    email: "user@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const session = await verifySession(makeRequest(token));
  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-1");
  expect(session!.email).toBe("user@example.com");
});

test("verifySession returns null for a malformed token in the request", async () => {
  const session = await verifySession(makeRequest("bad.token.value"));
  expect(session).toBeNull();
});

test("verifySession returns null for an expired token in the request", async () => {
  const pastExp = Math.floor(Date.now() / 1000) - 60;
  const token = await makeToken(
    { userId: "user-1", email: "user@example.com" },
    pastExp
  );

  const session = await verifySession(makeRequest(token));
  expect(session).toBeNull();
});
