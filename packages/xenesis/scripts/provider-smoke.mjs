#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const entry = resolve(repoRoot, "dist", "cli", "main.js");
const provider = process.env.XENESIS_PROVIDER || "openai";
const model = process.env.XENESIS_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini";
const reportId = `provider-live-${new Date().toISOString().replace(/[-:]/g, "").replace(".", "")}`;
const xenesisHomeInput = process.env.XENESIS_HOME || resolve(homedir(), ".xenesis");
const xenesisHome = isAbsolute(xenesisHomeInput) ? resolve(xenesisHomeInput) : resolve(repoRoot, xenesisHomeInput);
const reportPath = resolve(xenesisHome, "reports", `${reportId}.json`);
const checks = [];

function appendCheck(name, passed, details = {}) {
  checks.push({
    name,
    status: passed ? "passed" : "failed",
    ...details
  });
  console.log(`provider-smoke: ${name} ${passed ? "ok" : "failed"}`);
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [entry, ...args], {
    cwd: options.cwd ?? repoRoot,
    env: {
      ...process.env,
      ...(options.env ?? {})
    },
    encoding: "utf8",
    timeout: options.timeoutMs ?? 120000
  });
}

function requireOutput(result, name, expected) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`${name} exited with ${result.status}:\n${output.trim()}`);
  }
  if (!output.includes(expected)) {
    throw new Error(`${name} did not include expected text "${expected}":\n${output.trim()}`);
  }
  return output;
}

function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function waitForGateway(child, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let stdout = "";
  let stderr = "";
  let exited = false;
  let exitCode = null;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("exit", (code) => {
    exited = true;
    exitCode = code;
  });

  while (Date.now() < deadline) {
    const url = stdout.match(/gateway: listening (http:\/\/[^\s]+)/)?.[1];
    if (url) return { url, stdout, stderr };
    if (exited) {
      throw new Error(`gateway exited with ${exitCode}:\n${stdout}\n${stderr}`.trim());
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw new Error(`gateway did not become ready:\n${stdout}\n${stderr}`.trim());
}

async function runGatewayChecks() {
  const child = spawn(process.execPath, [
    entry,
    "--provider",
    provider,
    "--model",
    model,
    "gateway",
    "--host",
    "127.0.0.1",
    "--port",
    "0"
  ], {
    cwd: repoRoot,
    env: process.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    const { url } = await waitForGateway(child);
    const run = await fetch(`${url}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Reply exactly: xenesis-provider-gateway-ok" })
    });
    const runBody = await run.json();
    if (!run.ok || runBody.exitCode !== 0 || !String(runBody.output ?? "").includes("xenesis-provider-gateway-ok")) {
      throw new Error(`gateway /run failed: ${JSON.stringify(runBody)}`);
    }
    appendCheck("gateway-run", true, { url });

    const stream = await fetch(`${url}/run/stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Reply exactly: xenesis-provider-gateway-stream-ok" })
    });
    const streamText = await stream.text();
    if (!stream.ok || !streamText.includes("event: gateway_done") || !streamText.includes("xenesis-provider-gateway-stream-ok")) {
      throw new Error(`gateway /run/stream failed: ${streamText}`);
    }
    appendCheck("gateway-stream", true, { url });
  } finally {
    if (!child.killed) child.kill("SIGTERM");
  }
}

async function main() {
  if (provider === "openai" && !hasOpenAiKey()) {
    throw new Error("OPENAI_API_KEY is required for provider:smoke when provider=openai.");
  }

  console.log(`provider-smoke: provider=${provider}`);
  console.log(`provider-smoke: model=${model}`);

  try {
    requireOutput(runCli(["--provider", provider, "--model", model, "connect", "check", "--probe"]), "connect check", "connect: passed");
    appendCheck("connect-probe", true, { provider, model });

    requireOutput(runCli(["--provider", provider, "--model", model, "--print", "Reply exactly: xenesis-provider-live-ok"]), "prompt", "xenesis-provider-live-ok");
    appendCheck("prompt", true);

    requireOutput(runCli(["--provider", provider, "--model", model, "Reply exactly: xenesis-provider-stream-ok"]), "stream", "xenesis-provider-stream-ok");
    appendCheck("stream", true);

    if (provider === "openai") {
      const fallbackOutput = requireOutput(runCli([
        "--provider",
        "openai-compatible",
        "--base-url",
        "http://127.0.0.1:9/v1",
        "--api-key-env",
        "OPENAI_API_KEY",
        "--provider-retries",
        "0",
        "--fallback-provider",
        "openai",
        "--json",
        "--print",
        "Reply exactly: xenesis-provider-fallback-ok"
      ]), "fallback", "xenesis-provider-fallback-ok");
      if (!fallbackOutput.includes("\"type\":\"provider_fallback\"")) {
        throw new Error(`fallback output did not include provider_fallback event:\n${fallbackOutput}`);
      }
      appendCheck("fallback", true);
    } else {
      appendCheck("fallback", true, { skipped: true, reason: "fallback smoke is currently openai-only" });
    }

    await runGatewayChecks();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendCheck("error", false, { message });
    process.exitCode = 1;
  } finally {
    const summary = {
      total: checks.length,
      passed: checks.filter((check) => check.status === "passed").length,
      failed: checks.filter((check) => check.status === "failed").length
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify({
      id: reportId,
      createdAt: new Date().toISOString(),
      provider,
      model,
      workspace: repoRoot,
      summary,
      exitCode: summary.failed === 0 ? 0 : 1,
      checks
    }, null, 2)}\n`, "utf8");
    console.log(`provider-smoke: report ${reportPath}`);
    console.log(`provider-smoke: ${summary.failed === 0 ? "passed" : "failed"} ${summary.passed}/${summary.total}`);
  }
}

await main();
