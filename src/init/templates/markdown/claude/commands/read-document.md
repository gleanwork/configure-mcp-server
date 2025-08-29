---
description: Read a specific document (URL or ID) to quote or analyze precisely.
argument-hint: <doc-url-or-id> [optional section/heading]
---

## Plan

Target: "$ARGUMENTS"

1. Resolve to a Glean doc (URL or ID).
2. Pull full text; extract only the sections needed to answer.
3. Return a short summary AND exact quotes (with headings/anchors if available).

### TOOL CALL

mcp**glean_default**read_document id_or_url:"$ARGUMENTS"
