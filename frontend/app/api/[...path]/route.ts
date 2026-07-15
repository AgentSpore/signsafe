import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8894";
// Outer envelope, NOT the real bound — the backend owns that (a client hanging up does not
// stop server work). Sized to sit just above the backend's own ceiling so this proxy never
// aborts first: an AbortSignal here surfaces an opaque 504 and hides whatever the backend
// was actually about to say.
//
//   core/config.py: max_extraction_seconds (120) + llm_total_seconds (120) = 240s ceiling
//   250s > 240s, and maxDuration (300) > 250s.
//
// These numbers are deliberately related. Change one, change the others.
const FETCH_TIMEOUT_MS = 250_000;

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/api/${path.join("/")}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-expect-error duplex required for streaming body in Node fetch
    init.duplex = "half";
  }

  try {
    const backendResponse = await fetch(targetUrl, init);
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return new Response(JSON.stringify({ error: message }), {
      status: 504,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
