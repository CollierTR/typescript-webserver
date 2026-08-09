import express from "express";
import { Request, Response } from "express";
import path from "path";
import { logResponses, userMetrics } from "./middleware.js";
import { errorHandler } from "./middleware.js";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "./classes/errors.js";
import { config } from "./config.js";
import { chirps, type NewChirp, users, type NewUser } from "./db/schema.js";
import { db } from "./db/index.js";
import { eq } from "drizzle-orm";
import { checkPasswordHash, hashPassword } from "./auth.js";

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

app.post("/api/login", async (req, res, next) => {
  try {
    // check password
    const { email, password } = req.body;
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
      res.status(200).json(safeUser);
    }
  } catch (e) {
    next(e);
  }
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

app.post("/api/chirps", async (req, res) => {
  const badWords = ["kerfuffle", "sharbert", "fornax"];

  // extract and validate the body (userId, body) (userId, body)
  const { userId, body } = req.body;

  if (!userId || !body) {
    throw new BadRequestError(
      "Require both userId and body in request payload",
    );
  }

  if (typeof userId !== "string" || typeof body !== "string") {
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
