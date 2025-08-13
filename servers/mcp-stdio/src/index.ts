import { config as loadEnv } from "dotenv";
loadEnv();

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import fg from "fast-glob";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  Server,
} from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Utility: constrain paths to allowed roots
const ROOTS = (process.env.ALLOWED_ROOTS || process.cwd())
  .split(":")
  .map((p) => path.resolve(p));

function resolveWithinRoots(p: string) {
  const abs = path.resolve(p);
  for (const root of ROOTS) {
    if (abs === root || abs.startsWith(root + path.sep)) return abs;
  }
  throw new Error(`Path not allowed: ${p}`);
}

// Simple JSON KV store
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), ".data"));
const KV_PATH = path.join(DATA_DIR, "kv.json");
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(KV_PATH); } catch { await fs.writeFile(KV_PATH, "{}", "utf8"); }
}
async function kvRead(): Promise<Record<string, unknown>> {
  await ensureDataDir();
  const raw = await fs.readFile(KV_PATH, "utf8");
  return JSON.parse(raw || "{}");
}
async function kvWrite(obj: Record<string, unknown>) {
  await ensureDataDir();
  await fs.writeFile(KV_PATH, JSON.stringify(obj, null, 2), "utf8");
}

// Tool schemas
const FsReadSchema = z.object({ path: z.string().describe("Absolute or relative path within allowed roots") });
const FsWriteSchema = z.object({ path: z.string(), content: z.string().describe("UTF-8 text") });
const FsListSchema = z.object({ dir: z.string().default("."), pattern: z.string().optional().describe("glob (fast-glob)") });
const FsSearchSchema = z.object({ dir: z.string().default("."), query: z.string(), ignore: z.array(z.string()).optional() });

const HttpFetchSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST"]).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

const KvGetSchema = z.object({ key: z.string() });
const KvSetSchema = z.object({ key: z.string(), value: z.any() });

const Sha256Schema = z.object({ text: z.string() });

// Server definition
const server = new Server(
  {
    name: "mcp-stdio-universal",
    version: "0.1.0",
    tools: [
      {
        name: "fs_read",
        description: "Read UTF-8 text file within allowed roots",
        inputSchema: FsReadSchema,
        handler: async ({ path: p }) => {
          const abs = resolveWithinRoots(p);
          const data = await fs.readFile(abs, "utf8");
          return { content: [{ type: "text", text: data }] };
        },
      },
      {
        name: "fs_write",
        description: "Write UTF-8 text file within allowed roots (creates directories as needed)",
        inputSchema: FsWriteSchema,
        handler: async ({ path: p, content }) => {
          const abs = resolveWithinRoots(p);
          await fs.mkdir(path.dirname(abs), { recursive: true });
          await fs.writeFile(abs, content, "utf8");
          return { content: [{ type: "text", text: `wrote ${abs}` }] };
        },
      },
      {
        name: "fs_list",
        description: "List files using glob from a directory within allowed roots",
        inputSchema: FsListSchema,
        handler: async ({ dir, pattern }) => {
          const absDir = resolveWithinRoots(dir);
          const entries = await fg(pattern || "**/*", { cwd: absDir, dot: true, onlyFiles: false, followSymbolicLinks: false });
          return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
        },
      },
      {
        name: "fs_search",
        description: "Search for a string in text files within a directory",
        inputSchema: FsSearchSchema,
        handler: async ({ dir, query, ignore }) => {
          const absDir = resolveWithinRoots(dir);
          const files = await fg("**/*", {
            cwd: absDir,
            dot: true,
            onlyFiles: true,
            ignore: ignore || ["**/node_modules/**", "**/.git/**", "**/dist/**"],
          });
          const results: Array<{ file: string; matches: number }> = [];
          for (const rel of files) {
            const abs = path.join(absDir, rel);
            try {
              const text = await fs.readFile(abs, "utf8");
              const count = (text.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
              if (count > 0) results.push({ file: rel, matches: count });
            } catch {
              // skip binary or unreadable files
            }
          }
          return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        },
      },
      {
        name: "http_fetch",
        description: "Fetch a URL (GET/POST). Only public URLs; headers optional.",
        inputSchema: HttpFetchSchema,
        handler: async ({ url, method, headers, body }) => {
          const res = await fetch(url, { method, headers, body });
          const text = await res.text();
          return { content: [{ type: "text", text: JSON.stringify({ status: res.status, headers: Object.fromEntries(res.headers.entries()), body: text }, null, 2) }] };
        },
      },
      {
        name: "sys_info",
        description: "Return basic system information",
        inputSchema: z.object({}).optional(),
        handler: async () => {
          const info = {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMem: os.totalmem(),
            freeMem: os.freemem(),
            homedir: os.homedir(),
            cwd: process.cwd(),
            node: process.version,
          };
          return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
        },
      },
      {
        name: "utils_uuid",
        description: "Generate a v4 UUID",
        inputSchema: z.object({}).optional(),
        handler: async () => ({ content: [{ type: "text", text: uuidv4() }] }),
      },
      {
        name: "utils_sha256",
        description: "Compute SHA-256 of input text",
        inputSchema: Sha256Schema,
        handler: async ({ text }) => {
          const h = crypto.createHash("sha256").update(text, "utf8").digest("hex");
          return { content: [{ type: "text", text: h }] };
        },
      },
      {
        name: "kv_get",
        description: "Get a value from local KV store",
        inputSchema: KvGetSchema,
        handler: async ({ key }) => {
          const db = await kvRead();
          return { content: [{ type: "text", text: JSON.stringify(db[key], null, 2) }] };
        },
      },
      {
        name: "kv_set",
        description: "Set a value in local KV store",
        inputSchema: KvSetSchema,
        handler: async ({ key, value }) => {
          const db = await kvRead();
          db[key] = value;
          await kvWrite(db);
          return { content: [{ type: "text", text: `ok` }] };
        },
      },
    ],
  },
  {
    capabilities: { tools: {} },
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
