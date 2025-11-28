import { serveDir } from "serve-dir";

// Lightweight static server for local development.
Deno.serve((req) => serveDir(req, { fsRoot: ".", quiet: true }));
