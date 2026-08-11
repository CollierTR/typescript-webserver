import { describe, it, expect, beforeAll } from "vitest";
import { UnauthorizedError } from "./classes/errors.js";
import type { Request } from "express";
import {
  makeJWT,
  validateJWT,
  hashPassword,
  checkPasswordHash,
  getBearerToken,
} from "./auth.js";

describe("Password Hashing", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword456!";
  let hash1: string;
  let hash2: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);

    hash2 = await hashPassword(password2);
  });

  it("should return true for the correct password", async () => {
    const result = await checkPasswordHash(password1, hash1);
    expect(result).toBe(true);
  });
});

describe("JWT Signing", () => {
  const secret = "fkedjfk398usdd9fji3398djfkej03849hjdiofjo";
  const expiresIn = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  it("should sign and match JWT solution", () => {
    const jwt = makeJWT("117", secret);
    const result = validateJWT(jwt, secret);

    expect(result).toBe("117");
  });
});

describe("Bearer Token Retrieval", () => {
  const secret = "fkedjfk398usdd9fji3398djfkej03849hjdiofjo";
  const expiresIn = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  it("should retrieve the bearer token from the Authorization header", () => {
    const jwt = makeJWT("117", secret);

    const req = {
      get: (header: string) => {
        if (header === "authorization") {
          return `Bearer ${jwt}`;
        }
        return undefined;
      },
    } as Request;

    const retrievedToken = getBearerToken(req);

    expect(retrievedToken).toBe(jwt);
  });

  it("should throw if Authorization header is missing", () => {
    const req = {
      get: () => undefined,
    } as unknown as Request;

    expect(() => getBearerToken(req)).toThrow(UnauthorizedError);
  });

  it("should throw if Authorization header is not Bearer", () => {
    const req = {
      get: () => "Basic abc123",
    } as unknown as Request;

    expect(() => getBearerToken(req)).toThrow(UnauthorizedError);
  });

  it("should throw if Bearer token is missing", () => {
    const req = {
      get: () => "Bearer",
    } as unknown as Request;

    expect(() => getBearerToken(req)).toThrow(UnauthorizedError);
  });
});
