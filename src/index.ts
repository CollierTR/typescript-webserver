import express from "express";
import { Request, Response } from "express";
import path from "path";
import { logResponses, userMetrics } from "./middleware.js";
import { config } from "./config.js";

const PORT = 8080;

const app = express();

app.use(logResponses);

app.get("/api/healthz", (req, res) => {
  console.log("Server is ready!");
  res.set("Content-Type", "text/plain; charset=utf-8").status(200).send("OK");
});

app.get("/api/metrics", (req, res) => {
  console.log(`Hits: ${config.fileserverHits}`);
  res
    .set("Content-Type", "text/plain; charset=utf-8")
    .status(200)
    .send(`Hits: ${config.fileserverHits}`);
});

app.get("/api/reset", (req, res) => {
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
