import express from "express";
import { Request, Response } from "express";
import path from "path";
import { logResponses } from "./middleware.js";

const PORT = 8080;

const app = express();

app.use(logResponses);

app.get("/healthz", (req, res) => {
  console.log("Server is ready!");
  res.set("Content-Type", "text/plain; charset=utf-8").status(200).send("OK");
});

app.use("/app", express.static(path.join(import.meta.dirname, "..", "src", "app")));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
}).on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
