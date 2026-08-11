import { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  InternalServerError,
  ForbiddenError,
} from "./classes/errors.js";

type Middleware = (req: Request, res: Response, next: NextFunction) => void;
type ErrorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

export const userMetrics: Middleware = (req, res, next) => {
  config.api.fileserverHits++;
  next();
};

export const logResponses: Middleware = (req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode != 200) {
      console.log(
        `[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`,
      );
    }
  });
  next();
};

export const errorHandler: ErrorMiddleware = (err, req, res, next) => {
  console.log(err);
  if (err instanceof BadRequestError) {
    res.status(400).json({
      error: err.message,
    });
    next();
  } else if (err instanceof UnauthorizedError) {
    res.status(401).json({
      error: err.message,
    });
    next();
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({
      error: err.message,
    });
    next();
  } else if (err instanceof InternalServerError) {
    res.status(500).json({
      error: err.message,
    });
    next();
  } else if (err instanceof NotFoundError) {
    res.status(404).json({
      error: err.message,
    });
    next();
  } else {
    res.status(500).json({ error: "Something went wrong..." });
    next();
  }
};
