"""Exception types with an explicit disclosure contract.

RULE: an exception VALUE may never be logged or sent anywhere. Provider/parser exceptions
routinely embed the request body — i.e. the contract text — in their message, so
`logger.error("...: {}", exc)` quietly writes document content into logs that persist.
Logs are the one durable store we have, and the privacy copy says we keep none.

So: log `type(exc).__name__`, never `exc`.

`UserMessageError` is the single exception whose message IS safe to surface, because its
message is authored by us (a fixed RU string), never derived from an exception or payload.
It subclasses ValueError for backward compatibility with existing `except ValueError`
handlers, but callers must catch it EXPLICITLY rather than relying on ValueError — plain
ValueError is not safe to echo: pydantic's ValidationError is a ValueError subclass and its
message contains the offending input (for us: model output derived from the document).
"""

from __future__ import annotations


class UserMessageError(ValueError):
    """An error whose message we authored and may show to the user verbatim (RU)."""
