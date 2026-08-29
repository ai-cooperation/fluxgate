#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { createManualKey, createManualKeyRecord } from "../src/manual-key.js";

const USAGE = `Usage: node scripts/issue-key.mjs --label <label> [options]

Create a manual FluxGate API key and write it to the remote KV namespace.

Options:
  --label <text>                 Label stored with the key (required, 1-80 chars)
  --tier <member|vip>            Quota tier (default: member)
  --config <path>                Wrangler config to use (default: wrangler.jsonc)
  --help                         Show this help

The generated key is printed once after the remote KV write succeeds. Save it immediately.
`;

function parseCli(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      label: { type: "string" },
      tier: { type: "string", default: "member" },
      config: { type: "string", default: "wrangler.jsonc" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return { help: true };
  if (!values.label) throw new Error("--label is required");
  const key = createManualKey(values.tier);
  const record = createManualKeyRecord(values.tier, values.label);
  return { config: values.config, key, record };
}

function wranglerArgs({ config, key, record }) {
  return [
    "--no-install", "wrangler", "--config", config,
    "kv", "key", "put", `key:${key}`, JSON.stringify(record),
    "--binding", "KV", "--remote",
  ];
}

function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr: stderr.trim() }));
  });
}

export async function main(argv = process.argv.slice(2)) {
  let parsed;
  try { parsed = parseCli(argv); }
  catch (error) { process.stderr.write(`Error: ${error.message}\n\n${USAGE}`); return 2; }
  if (parsed.help) { process.stdout.write(USAGE); return 0; }

  let result;
  try { result = await runWrangler(wranglerArgs(parsed)); }
  catch (error) {
    process.stderr.write(`KV write failed; the key was not displayed.\n${error.message}\n`);
    return 1;
  }
  if (result.code !== 0) {
    process.stderr.write(`KV write failed; the key was not displayed.\n${result.stderr}\n`);
    return result.code || 1;
  }
  process.stdout.write(`API key (shown once; save it now):\n${parsed.key}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; });
}
