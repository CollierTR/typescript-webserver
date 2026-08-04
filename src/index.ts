import express from "express";
import { Request, Response } from "express";
import path from "path";
import { logResponses, userMetrics } from "./middleware.js";
import { errorHandler } from "./middleware.js";
import { BadRequestError } from "./classes/errors.js";
import { config } from "./config.js";
import { users, type NewUser } from "./db/schema.js";
import { db } from "./db/index.js";
import { eq } from "drizzle-orm";

const PORT = 8080;

const app = express();

app.use(express.json());
app.use(logResponses);

app.post("/api/users", async (req, res) => {
  const body = req.body;
  const { email } = body;
  if (!email) {
    return res
      .set("Content-Type", "text/plain; charset=utf-8")
      .status(400)
      .send("email is a required parameter");
  }

  const user: NewUser = {
    email: email,
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

  const [newUser] = await db.insert(users).values(user).returning();

  return res
    .set("Content-Type", "text/plain; charset=utf-8")
    .status(201)
    .json(newUser);
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

app.post("/api/validate_chirp", (req, res) => {
  const badWords = ["kerfuffle", "sharbert", "fornax"];

  console.log(req.body);
  const chirp: string = req.body?.body;
  if (chirp.length <= 140) {
    const dirtyWords = chirp.split(" ");
    const cleanedWords = dirtyWords.map((word) => {
      if (badWords.includes(word.toLowerCase())) {
        return "****";
      } else {
        return word;
      }
    });
    res.status(200).json({
      valid: true,
      dirtyBody: chirp,
      cleanedBody: cleanedWords.join(" "),
    });
  } else {
    throw new BadRequestError("Chirp is too long. Max length is 140");
  }
});

app.use(errorHandler);

app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}...`);
  })
  .on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use`);
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });
