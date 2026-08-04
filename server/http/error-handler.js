
import { z } from "zod";

export function notFound(_req, res) {
  res.status(404).json({ error: "Route not found." });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || (error instanceof z.ZodError ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 ? "The server could not complete this request." : error.message,
    ...(error.details ? { details: error.details } : {}),
  });
}
