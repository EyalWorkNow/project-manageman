import app from "../server.js";

import type { IncomingMessage, ServerResponse } from "http";

type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
};

export default function handler(req: VercelRequest, res: ServerResponse) {
  const routedPath = req.query?.path;
  const path = Array.isArray(routedPath) ? routedPath.join("/") : routedPath;

  if (path) {
    const url = new URL(req.url || "/", "http://localhost");
    url.searchParams.delete("path");
    const query = url.searchParams.toString();
    req.url = `/api/${path}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
}
