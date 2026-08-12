import express from "express";
import { Request, Response } from "express";
import path from "path";
import { logResponses, userMetrics } from "./middleware.js";
import { errorHandler } from "./middleware.js";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "./classes/errors.js";
import { config } from "./config.js";
import {
  chirps,
  type NewChirp,
  users,
  type NewUser,
  refreshTokens,
  type NewRefreshToken,
} from "./db/schema.js";
import { db } from "./db/index.js";
import { eq, and } from "drizzle-orm";
import {
  checkPasswordHash,
  hashPassword,
  getBearerToken,
  makeJWT,
  validateJWT,
  makeRefreshToken,
} from "./auth.js";
import { error } from "console";

const PORT = 8080;

const app = express();

app.use(express.json());
app.use(logResponses);

app.post("/api/users", async (req, res) => {
  const body = req.body;
  console.log(req.headers["content-type"]);
  console.log(req.body);

  const { email, password } = body;

  const hash = await hashPassword(password);

  if (!email) {
    return res
      .set("Content-Type", "text/plain; charset=utf-8")
      .status(400)
      .send("email is a required parameter");
  }

  const user: NewUser = {
    email: email,
    hashedPassword: hash,
  };

  //check for user
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return res
      .set("Content-Type", "text/plain; charset=utf-8")
      .status(400)
      .send("User is already registered");
  }

  const [userWithPassword] = await db.insert(users).values(user).returning();
  const { hashedPassword, ...safeUser } = userWithPassword;

  return res
    .set("Content-Type", "text/plain; charset=utf-8")
    .status(201)
    .json(safeUser);
});

app.put("/api/users", async (req, res) => {
  const bearer = getBearerToken(req);
  const { email, password } = req.body;
  if (!email || !password) {
    throw new BadRequestError("Request body must include email and password");
  }
  const userId = validateJWT(bearer, config.api.signingSecret);
  const newPassword = await hashPassword(password);
  const [updatedUser] = await db
    .update(users)
    .set({ hashedPassword: newPassword, email: email })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw new NotFoundError("User not found");
  }

  const { hashedPassword, ...safeUser } = updatedUser;

  res.status(200).json(safeUser);
});

app.post("/api/login", async (req, res, next) => {
  try {
    // check password
    let { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError("Email and Password required!");
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!existingUser) {
      throw new UnauthorizedError("incorrect email or password");
    }

    const passwordMatch = await checkPasswordHash(
      password,
      existingUser.hashedPassword,
    );

    const { hashedPassword, ...safeUser } = existingUser;

    if (!passwordMatch) {
      throw new UnauthorizedError("incorrect email or password");
    } else {
      const refreshTokenExpr =
        Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 60; // 60 days from now
      const refreshTokenValue = makeRefreshToken();

      const refreshToken = {
        token: refreshTokenValue,
        userId: existingUser.id,
        expiresAt: new Date(refreshTokenExpr * 1000), // 60 days from now
      };

      const [confirmation] = await db
        .insert(refreshTokens)
        .values(refreshToken)
        .returning();

      if (!confirmation) {
        throw new InternalServerError(
          "Something went wrong on our end... Try again in a few minutes.",
        );
      }

      // auth here
      const token = makeJWT(safeUser.id, config.api.signingSecret);
      res.status(200).json({
        ...safeUser,
        token: token,
        refreshToken: refreshTokenValue,
      });
    }
  } catch (e) {
    next(e);
  }
});

app.post("/api/refresh", async (req, res) => {
  const bearerToken = getBearerToken(req);

  const existingToken = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.token, bearerToken),
  });
  if (
    !existingToken ||
    existingToken.expiresAt < new Date() ||
    existingToken.revokedAt
  ) {
    throw new UnauthorizedError("Refresh token is invalid");
  }

  const newJwt = makeJWT(existingToken.userId, config.api.signingSecret);

  res.status(200).json({ token: newJwt });
});

app.post("/api/revoke", async (req, res) => {
  const bearerToken = getBearerToken(req);

  if (!bearerToken) {
    throw new UnauthorizedError("User is not logged in");
  }

  const revokedToken = await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(refreshTokens.token, bearerToken))
    .returning();

  res.sendStatus(204);
});

app.get("/api/healthz", (req, res) => {
  console.log("Server is ready!");
  res.set("Content-Type", "text/plain; charset=utf-8").status(200).send("OK");
});

app.get("/admin/metrics", (req, res) => {
  console.log(`Hits: ${config.api.fileserverHits}`);
  res.set("Content-Type", "text/html; charset=utf-8").status(200).send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>`);
});

app.post("/admin/reset", async (req, res) => {
  const PLATFORM = config.db.platform;

  if (PLATFORM !== "dev") {
    res
      .set("Content-Type", "text/plain; charset=utf-8")
      .status(403)
      .send(`This can only be run in the dev environment!`);
  }

  console.log(`Resetting user metrics count...`);
  config.api.fileserverHits = 0;

  try {
    console.log(`Deleting all users from the users table...`);
    await db.delete(users);
    res
      .set("Content-Type", "text/plain; charset=utf-8")
      .status(200)
      .send(`DB reset!`);
  } catch (err) {
    console.log(err);
    res
      .set("Content-Type", "application/json; charset=utf-8")
      .status(500)
      .json({ error: "Something went wrong!" });
  }
});

app.use(
  "/app",
  userMetrics,
  express.static(path.join(import.meta.dirname, "..", "src", "app")),
);

app.get("/api/chirps", async (req, res) => {
  const allChirps = await db.select().from(chirps).orderBy(chirps.createdAt);

  res.status(200).json(allChirps);
});

app.get("/api/chirps/:chirpId", async (req, res) => {
  const { chirpId } = req.params;
  const [chirp] = await db.select().from(chirps).where(eq(chirps.id, chirpId));

  if (!chirp) {
    throw new NotFoundError("Resource not found");
  }

  res.status(200).json(chirp);
});

app.delete("/api/chirps/:chirpId", async (req, res) => {
  const bearer = getBearerToken(req);
  const userId = validateJWT(bearer, config.api.signingSecret);

  const { chirpId } = req.params;

  const [chirp] = await db.select().from(chirps).where(eq(chirps.id, chirpId));
  if (!chirp) {
    throw new NotFoundError("Chirp does not exist");
  }
  if (chirp.userId !== userId) {
    throw new ForbiddenError("Unauthorized to edit another user's chirps!");
  }

  await db.delete(chirps).where(eq(chirps.id, chirpId));
  res.sendStatus(204);
});

app.post("/api/chirps", async (req, res) => {
  const badWords = ["kerfuffle", "sharbert", "fornax"];

  const { body } = req.body;

  if (!body) {
    throw new BadRequestError("Chirp body is required");
  }

  const token = getBearerToken(req);
  const userId = validateJWT(token, config.api.signingSecret);

  if (typeof body !== "string") {
    throw new BadRequestError("Invalid request");
  }

  if (body.length > 140) {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  }
  const dirtyWords = body.split(" ");

  const cleanedWords = dirtyWords.map((word) =>
    badWords.includes(word.toLowerCase()) ? "****" : word,
  );

  const cleanedBody = cleanedWords.join(" ");

  const chirp = { body: cleanedBody, userId };

  const [newChirp] = await db.insert(chirps).values(chirp).returning();

  res.status(201).json(newChirp);
});

app.use(errorHandler);

app
  .listen(PORT, () => {
    console.log(
      `Server running on port ${PORT}...\n and connected to ${config.db.url}`,
    );
  })
  .on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use`);
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });
