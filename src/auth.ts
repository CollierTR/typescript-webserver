import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

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

export function makeJWT(
  userID: string,
  expiresIn: number,
  secret: string,
): string {
  const payload: Payload = {
    iss: "chirpy",
    sub: userID,
    iat: Math.floor(Date.now() / 1000),
    exp: expiresIn,
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
    throw e;
  }
}
