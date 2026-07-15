"""Pre-multipart body-size guard.

Ordering problem this solves: the multipart parser buffers the WHOLE upload before the
route (and therefore before slowapi's rate limit) ever runs. Raising spool_max_size to
keep uploads in memory — which is what makes the "never written to disk" claim true —
means that buffer is RAM. Without a check that runs earlier, an unauthenticated caller
could push large bodies straight into memory.

This middleware rejects an oversized Content-Length at the ASGI layer, before the body is
read or parsed.

HONEST LIMIT — this is NOT a hard bound on its own:
  * A chunked request (Transfer-Encoding: chunked) has NO Content-Length, so this cannot
    pre-empt it; the parser would still buffer it.
  * Content-Length is client-supplied and only advisory until the body is actually read.
A real bound must be enforced at the edge. Caddy directive for signsafe.agentspore.com:

    request_body {
        max_size 10MB
    }

That is deliberately stated rather than implied: without it, the in-app guard covers the
ordinary (Content-Length) case only.
"""

from __future__ import annotations

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class BodySizeLimitMiddleware:
    """Reject requests whose declared Content-Length exceeds the limit, pre-parsing."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = _declared_length(scope)
        if content_length is not None and content_length > self.max_bytes:
            await _reject(send, self.max_bytes)
            return

        # Chunked / undeclared length: enforce while streaming so the parser cannot
        # buffer more than the limit even without a Content-Length header.
        received = 0

        async def guarded_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    # Truncate the stream; the handler's own size check rejects it.
                    return {"type": "http.disconnect"}
            return message

        await self.app(scope, guarded_receive, send)


def _declared_length(scope: Scope) -> int | None:
    for key, value in scope.get("headers", []):
        if key == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None
    return None


async def _reject(send: Send, max_bytes: int) -> None:
    body = (
        b'{"detail":{"code":"file_too_large",'
        b'"message":"\\u0424\\u0430\\u0439\\u043b \\u043f\\u0440\\u0435\\u0432\\u044b'
        b'\\u0448\\u0430\\u0435\\u0442 \\u0434\\u043e\\u043f\\u0443\\u0441\\u0442\\u0438'
        b'\\u043c\\u044b\\u0439 \\u0440\\u0430\\u0437\\u043c\\u0435\\u0440."}}'
    )
    await send({
        "type": "http.response.start",
        "status": 413,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode()),
        ],
    })
    await send({"type": "http.response.body", "body": body})
