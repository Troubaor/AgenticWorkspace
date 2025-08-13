MCP STDIO Universal Server

This is a local Model Context Protocol (MCP) server that exposes a set of powerful but safe-by-default tools over STDIO.

Tools included
- fs_read: read UTF-8 files within allowed roots
- fs_write: write UTF-8 files within allowed roots
- fs_list: glob listing within allowed roots
- fs_search: simple text search within allowed roots
- http_fetch: GET/POST fetch of public URLs
- sys_info: basic system info
- utils_uuid: generate UUID v4
- utils_sha256: SHA-256 of text
- kv_get / kv_set: tiny JSON-backed KV store in .data/kv.json

Configuration
- ALLOWED_ROOTS: colon-separated list of directories the server can access. If unset, defaults to the current working directory where the server starts.
- DATA_DIR: directory for the KV store (default .data)

Install and run
- Install deps:
  npm --prefix servers/mcp-stdio install

- Dev (TS):
  npm --prefix servers/mcp-stdio run dev

- Build and run:
  npm --prefix servers/mcp-stdio run build && npm --prefix servers/mcp-stdio start

Usage (as STDIO)
If your client supports MCP over stdio, point it to run the dev or start command above as the server process. You can also set env vars, e.g.:

  ALLOWED_ROOTS=/Users/you/Projects:/Users/you/Documents npm --prefix servers/mcp-stdio run dev

Notes
- The server sanitizes file access by ensuring all paths are within ALLOWED_ROOTS.
- http_fetch returns response status, headers, and body as text. Use carefully with large responses.
