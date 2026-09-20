/**
 * Production Node entry: Astro handler + HTTP/WS reverse proxy to the API.
 * Dev uses Vite proxy in astro.config.mjs instead.
 */
import http from "node:http";
import httpProxy from "http-proxy";

process.env.ASTRO_NODE_AUTOSTART = "disabled";

const { handler: astroHandler } = await import("../dist/server/entry.mjs");

const port = Number(process.env.PORT ?? 4321);
const apiInternal = (process.env.API_INTERNAL_URL ?? "http://localhost:28001").replace(
  /\/$/,
  "",
);

const proxy = httpProxy.createProxyServer({
  target: apiInternal,
  changeOrigin: true,
  ws: true,
  xfwd: true,
});

proxy.on("error", (err, _req, res) => {
  console.error("[proxy]", err.message);
  if (res && "writeHead" in res && !res.headersSent) {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad gateway");
  }
});

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/api" || url.startsWith("/api/") || url === "/ws" || url.startsWith("/ws?")) {
    proxy.web(req, res);
    return;
  }
  void astroHandler(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "/";
  if (url === "/ws" || url.startsWith("/ws?")) {
    proxy.ws(req, socket, head);
    return;
  }
  socket.destroy();
});

server.listen(port, () => {
  console.log(`[web] http://localhost:${port} (API proxy → ${apiInternal})`);
});
