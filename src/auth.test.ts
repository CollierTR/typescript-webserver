import { describe, it, expect, beforeAll } from "vitest";
import { makeJWT, validateJWT, hashPassword, checkPasswordHash } from "./auth";

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

  it("", () => {
    const jwt = makeJWT("117", expiresIn, secret);
    const result = validateJWT(jwt, secret);

    expect(result).toBe("117");
  });
});
