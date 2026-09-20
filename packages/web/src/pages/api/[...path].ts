import type { APIRoute } from "astro";
import { getApiInternalUrl } from "@/lib/api-upstream";

export const prerender = false;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxyApi(request: Request, pathSegments: string[] | undefined): Promise<Response> {
  const upstreamBase = getApiInternalUrl().replace(/\/$/, "");
  const suffix = (pathSegments ?? []).join("/");
  const incoming = new URL(request.url);
  const target = new URL(`${upstreamBase}/api/${suffix}${incoming.search}`);

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers.set(key, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-expect-error duplex required for streaming request bodies in Node fetch
    init.duplex = "half";
  }

  const upstream = await fetch(target, init);
  const outHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    outHeaders.append(key, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

export const ALL: APIRoute = async ({ request, params }) => {
  const path = params.path;
  const segments = typeof path === "string" ? path.split("/") : path;
  return proxyApi(request, segments);
};
