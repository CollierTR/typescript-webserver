import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request } from "express";
import { UnauthorizedError } from "./classes/errors.js";
import { randomBytes } from "crypto";

export type Payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
  console.log("Hashing password...");
  const hashedPassword = await hash(password);
  return hashedPassword;
}

export async function checkPasswordHash(
  password: string,
  hash: string,
): Promise<boolean> {
  console.log("Checking password hash...");
  const verification = await verify(hash, password);
  return verification;
}

export function makeJWT(userID: string, secret: string): string {
  const payload: Payload = {
    iss: "chirpy",
    sub: userID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  const newJwt = jwt.sign(payload, secret);
  return newJwt;
}

export function validateJWT(tokenString: string, secret: string): string {
  try {
    const decodedJwt = jwt.verify(tokenString, secret);

    if (typeof decodedJwt === "string") {
      throw new Error("Invalid JWT payload");
    }

    if (typeof decodedJwt.sub !== "string") {
      throw new Error("JWT subject is missing or invalid");
    }

    return decodedJwt.sub;
  } catch (e) {
    console.log(`Error: ${e}`);
    if (e instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid or malformed token");
    }
    throw e;
  }
}

export function getBearerToken(req: Request): string {
  const bearer = req.get("authorization");
  if (!bearer) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const [scheme, token] = bearer.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Invalid bearer token");
  }

  return token;
}

export function getAPIKey(req: Request): string {
  const bearer = req.get("authorization");
  if (!bearer) {
    throw new UnauthorizedError("Missing API key");
  }

  const [scheme, token] = bearer.split(" ");

  if (scheme !== "ApiKey" || !token) {
    throw new UnauthorizedError("Invalid bearer token");
  }

  return token;
}

export function makeRefreshToken(): string {
  const token = randomBytes(32).toString("hex");
  return token;
}
