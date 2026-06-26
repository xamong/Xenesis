import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import type { SecretRef } from "./types.js";

export async function resolveSecretRef(
  ref: SecretRef,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  if (typeof ref === "string") return resolveEnv(ref, env);
  switch (ref.source) {
    case "env":
      return resolveEnv(ref.id, env);
    case "file":
      return (await readFile(ref.id, "utf8")).replace(/^\uFEFF/, "").trim();
    case "exec":
      return await resolveExec(ref.id, env);
  }
}

function resolveEnv(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new Error(`Secret reference env "${name}" is missing or empty.`);
  }
  return value;
}

function parseArgv(id: string): string[] {
  const argv: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < id.length; i += 1) {
    const char = id[i];
    if (char === "\"") {
      inQuote = !inQuote;
    } else if (char === " " && !inQuote) {
      if (current.length > 0) {
        argv.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) argv.push(current);
  return argv;
}

function resolveExec(id: string, env: NodeJS.ProcessEnv): Promise<string> {
  const trimmed = id.trim();
  if (!trimmed) throw new Error("exec SecretRef id must not be empty");

  const [command, ...args] = parseArgv(trimmed);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      reject(new Error(`Secret exec "${id}" failed to spawn: ${error.message}`));
    });
    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
        reject(new Error(`Secret exec "${id}" exited with code ${code}: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}
