import express from "express";
import { Request, Response } from "express";
import path from "path";
import { logResponses, userMetrics } from "./middleware.js";
import { config } from "./config.js";

const PORT = 8080;

const app = express();

app.use(express.json());
app.use(logResponses);

app.get("/api/healthz", (req, res) => {
  console.log("Server is ready!");
  res.set("Content-Type", "text/plain; charset=utf-8").status(200).send("OK");
});

app.get("/admin/metrics", (req, res) => {
  console.log(`Hits: ${config.fileserverHits}`);
  res.set("Content-Type", "text/html; charset=utf-8").status(200).send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`);
});

app.post("/admin/reset", (req, res) => {
  console.log(`Resetting user metrics count...`);
  config.fileserverHits = 0;
  res
    .set("Content-Type", "text/plain; charset=utf-8")
    .status(200)
    .send(`Reset user metric count`);
});

app.use(
  "/app",
  userMetrics,
  express.static(path.join(import.meta.dirname, "..", "src", "app")),
);

app.post("/api/validate_chirp", (req, res) => {
  const badWords = ["kerfuffle", "sharbert", "fornax"];

  try {
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
      res.status(400).json({ error: "Chirp is too long" });
    }
  } catch (e) {
    res.status(400).json({ error: "Something went wrong" });
  }
});

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
