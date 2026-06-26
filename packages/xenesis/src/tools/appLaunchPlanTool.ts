import { createServer } from "node:net";
import { access, readFile } from "node:fs/promises";
import { basename, relative, sep } from "node:path";
import { z } from "zod";
import { assertExistingPathInsideWorkspace, assertInsideWorkspace } from "../utils/workspace.js";
import type { Tool } from "./types.js";

const appLaunchPlanInput = z.object({
  cwd: z.string().default("."),
  entry: z.string().nullable().optional(),
  target: z.enum(["auto", "browser", "server"]).default("auto")
});

const appLaunchPlanOpenAIInput = z.object({
  cwd: z.string(),
  entry: z.string().nullable(),
  target: z.enum(["auto", "browser", "server"])
});

type AppLaunchPlanInput = z.infer<typeof appLaunchPlanInput>;

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface LaunchPlan {
  ok: boolean;
  status: string;
  strategy?: "npm_script" | "python" | "static";
  confidence?: "high" | "medium" | "low";
  framework?: string;
  cwd: string;
  script?: string;
  command?: string;
  commandKind?: string;
  entry?: string;
  port?: number;
  readinessUrl?: string;
  readinessPath?: string;
  portPolicy?: string;
  preferredTool?: string;
  nextTools: string;
  notes?: string[];
}

function toWorkspaceRelative(workspaceRoot: string, absolutePath: string) {
  const result = relative(workspaceRoot, absolutePath);
  return result ? result.split(sep).join("/") : ".";
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

async function allocateLocalHttpPort() {
  return await new Promise<number>((resolvePort, rejectPort) => {
    const server = createServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => rejectPort(new Error("Failed to allocate a local HTTP port.")));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
  });
}

async function readPackageJson(cwdPath: string): Promise<PackageJson | undefined> {
  const text = await readTextIfExists(`${cwdPath}/package.json`);
  if (!text) return undefined;
  const parsed = JSON.parse(text) as PackageJson;
  return parsed;
}

function allDependencies(packageJson: PackageJson) {
  return {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {})
  };
}

function hasDependency(packageJson: PackageJson, name: string) {
  return Object.prototype.hasOwnProperty.call(allDependencies(packageJson), name);
}

function extractPort(script: string, fallback: number) {
  const portFlag = script.match(/(?:^|\s)(?:--port|-p)\s+(\d{2,5})(?:\s|$)/);
  if (portFlag) return Number(portFlag[1]);
  const portEquals = script.match(/(?:^|\s)--port=(\d{2,5})(?:\s|$)/);
  if (portEquals) return Number(portEquals[1]);
  const envPort = script.match(/(?:^|\s)PORT=(\d{2,5})(?:\s|$)/i);
  if (envPort) return Number(envPort[1]);
  const hostPort = script.match(/(?:localhost|127\.0\.0\.1):(\d{2,5})/i);
  if (hostPort) return Number(hostPort[1]);
  return fallback;
}

function pickScript(scripts: Record<string, string>, names: string[]) {
  for (const name of names) {
    if (scripts[name]) return { name, command: scripts[name] };
  }
  return undefined;
}

function detectPackageLaunch(cwd: string, packageJson: PackageJson): LaunchPlan | undefined {
  const scripts = packageJson.scripts ?? {};
  const scriptText = Object.values(scripts).join("\n");
  const dependencies = allDependencies(packageJson);
  const dependencyNames = new Set(Object.keys(dependencies));

  const viteLike = hasDependency(packageJson, "vite") || /\bvite\b/i.test(scriptText);
  if (viteLike) {
    const script = pickScript(scripts, ["dev", "start", "serve"]);
    if (!script) return undefined;
    const port = extractPort(script.command, 5173);
    return {
      ok: true,
      status: "pass",
      strategy: "npm_script",
      confidence: "high",
      framework: dependencyNames.has("@sveltejs/kit") ? "sveltekit" : "vite",
      cwd,
      script: script.name,
      command: `npm run ${script.name}`,
      port,
      readinessUrl: `http://127.0.0.1:${port}/`,
      preferredTool: "server",
      nextTools: "server -> app_e2e_check"
    };
  }

  const nextLike = hasDependency(packageJson, "next") || /\bnext\s+(dev|start)\b/i.test(scriptText);
  if (nextLike) {
    const script = pickScript(scripts, ["dev", "start"]);
    if (!script) return undefined;
    const port = extractPort(script.command, 3000);
    return {
      ok: true,
      status: "pass",
      strategy: "npm_script",
      confidence: "high",
      framework: "next",
      cwd,
      script: script.name,
      command: `npm run ${script.name}`,
      port,
      readinessUrl: `http://127.0.0.1:${port}/`,
      preferredTool: "server",
      nextTools: "server -> app_e2e_check"
    };
  }

  const astroLike = hasDependency(packageJson, "astro") || /\bastro\s+dev\b/i.test(scriptText);
  if (astroLike) {
    const script = pickScript(scripts, ["dev", "start"]);
    if (!script) return undefined;
    const port = extractPort(script.command, 4321);
    return {
      ok: true,
      status: "pass",
      strategy: "npm_script",
      confidence: "high",
      framework: "astro",
      cwd,
      script: script.name,
      command: `npm run ${script.name}`,
      port,
      readinessUrl: `http://127.0.0.1:${port}/`,
      preferredTool: "server",
      nextTools: "server -> app_e2e_check"
    };
  }

  const reactScriptsLike = hasDependency(packageJson, "react-scripts") || /\breact-scripts\s+start\b/i.test(scriptText);
  if (reactScriptsLike) {
    const script = pickScript(scripts, ["start", "dev"]);
    if (!script) return undefined;
    const port = extractPort(script.command, 3000);
    return {
      ok: true,
      status: "pass",
      strategy: "npm_script",
      confidence: "high",
      framework: "react-scripts",
      cwd,
      script: script.name,
      command: `npm run ${script.name}`,
      port,
      readinessUrl: `http://127.0.0.1:${port}/`,
      preferredTool: "server",
      nextTools: "server -> app_e2e_check"
    };
  }

  const genericScript = pickScript(scripts, ["dev", "start", "serve"]);
  if (genericScript) {
    const framework = /\bnode\b/i.test(genericScript.command) || hasDependency(packageJson, "express")
      ? "node"
      : "npm";
    const port = extractPort(genericScript.command, 3000);
    return {
      ok: true,
      status: "pass",
      strategy: "npm_script",
      confidence: framework === "node" ? "medium" : "low",
      framework,
      cwd,
      script: genericScript.name,
      command: `npm run ${genericScript.name}`,
      port,
      readinessUrl: `http://127.0.0.1:${port}/`,
      preferredTool: "server",
      nextTools: "server -> app_readiness -> app_e2e_check",
      notes: ["Port is inferred. Inspect package.json before relying on this readiness URL."]
    };
  }

  return undefined;
}

async function detectPythonLaunch(cwdPath: string, cwd: string): Promise<LaunchPlan | undefined> {
  if (await fileExists(`${cwdPath}/manage.py`)) {
    return {
      ok: true,
      status: "pass",
      strategy: "python",
      confidence: "high",
      framework: "django",
      cwd,
      command: "python manage.py runserver 127.0.0.1:8000",
      port: 8000,
      readinessUrl: "http://127.0.0.1:8000/",
      preferredTool: "server",
      nextTools: "server -> app_e2e_check"
    };
  }

  const candidates = ["app.py", "main.py"];
  for (const candidate of candidates) {
    const text = await readTextIfExists(`${cwdPath}/${candidate}`);
    if (!text) continue;
    if (/\bfrom\s+flask\s+import\b|\bFlask\s*\(/.test(text)) {
      return {
        ok: true,
        status: "pass",
        strategy: "python",
        confidence: "high",
        framework: "flask",
        cwd,
        command: `python -m flask --app ${candidate.replace(/\.py$/i, "")} run --host 127.0.0.1 --port 5000`,
        port: 5000,
        readinessUrl: "http://127.0.0.1:5000/",
        preferredTool: "server",
        nextTools: "server -> app_e2e_check"
      };
    }
    if (/\bFastAPI\s*\(/.test(text)) {
      return {
        ok: true,
        status: "pass",
        strategy: "python",
        confidence: "medium",
        framework: "fastapi",
        cwd,
        command: `python -m uvicorn ${candidate.replace(/\.py$/i, "")}:app --host 127.0.0.1 --port 8000`,
        port: 8000,
        readinessUrl: "http://127.0.0.1:8000/",
        preferredTool: "server",
        nextTools: "server -> app_e2e_check"
      };
    }
  }

  return undefined;
}

async function detectStaticLaunch(
  workspaceRoot: string,
  cwdPath: string,
  cwd: string,
  entry: string | null | undefined
): Promise<LaunchPlan | undefined> {
  const requestedEntry = normalizeEntryCandidate(entry);
  const candidates = [
    requestedEntry,
    "index.html",
    "client.html",
    "public/index.html",
    "dist/index.html",
    "build/index.html"
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const absolute = assertInsideWorkspace(workspaceRoot, `${cwd}/${candidate}`.replace(/^\.\//, ""));
    if (!(await fileExists(absolute))) continue;
    const port = await allocateLocalHttpPort();
    const entryPath = toWorkspaceRelative(cwdPath, absolute);
    return {
      ok: true,
      status: "pass",
      strategy: "static",
      confidence: "high",
      cwd,
      command: "xenesis:static .",
      entry: entryPath,
      commandKind: "managed_static_server",
      port,
      readinessUrl: `http://127.0.0.1:${port}/${entryPath}`,
      portPolicy: "allocate_free_local_port",
      readinessPath: `/${entryPath}`,
      preferredTool: "server",
      nextTools: "server -> app_e2e_check",
      notes: [
        "Use Xenesis managed static serving or the app_e2e_check local-file auto-repair path.",
        "Do not invent placeholder server commands."
      ]
    };
  }

  return undefined;
}

function normalizeEntryCandidate(entry: string | null | undefined) {
  const trimmed = entry?.trim();
  if (!trimmed) return undefined;
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || /^file:/i.test(trimmed)) return trimmed;
  return trimmed.replace(/^[\\/]+/, "") || undefined;
}

function renderLaunchPlan(plan: LaunchPlan) {
  const lines = [
    `status: ${plan.status}`,
    ...(plan.strategy ? [`strategy: ${plan.strategy}`] : []),
    ...(plan.confidence ? [`confidence: ${plan.confidence}`] : []),
    ...(plan.framework ? [`framework: ${plan.framework}`] : []),
    `cwd: ${plan.cwd}`,
    ...(plan.script ? [`script: ${plan.script}`] : []),
    ...(plan.command ? [`command: ${plan.command}`] : []),
    ...(plan.commandKind ? [`commandKind: ${plan.commandKind}`] : []),
    ...(plan.entry ? [`entry: ${plan.entry}`] : []),
    ...(plan.port ? [`port: ${plan.port}`] : []),
    ...(plan.readinessUrl ? [`readinessUrl: ${plan.readinessUrl}`] : []),
    ...(plan.readinessPath ? [`readinessPath: ${plan.readinessPath}`] : []),
    ...(plan.portPolicy ? [`portPolicy: ${plan.portPolicy}`] : []),
    ...(plan.preferredTool ? [`preferredTool: ${plan.preferredTool}`] : []),
    `nextTools: ${plan.nextTools}`
  ];
  if (plan.notes?.length) {
    lines.push("notes:");
    for (const note of plan.notes) lines.push(`- ${note}`);
  }
  return lines.join("\n");
}

export const appLaunchPlanTool: Tool<AppLaunchPlanInput> = {
  name: "app_launch_plan",
  description: "Inspect workspace files and choose a concrete app launch strategy before starting a server or browser check.",
  inputSchema: appLaunchPlanInput,
  openaiInputSchema: appLaunchPlanOpenAIInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const requestedCwd = normalizeRequestedCwd(input.cwd);
    const cwdPath = await assertExistingPathInsideWorkspace(context.workspaceRoot, requestedCwd);
    const cwd = toWorkspaceRelative(context.workspaceRoot, cwdPath);

    const packageJson = await readPackageJson(cwdPath);
    const packagePlan = packageJson ? detectPackageLaunch(cwd, packageJson) : undefined;
    if (packagePlan) return { ok: true, content: renderLaunchPlan(packagePlan), data: packagePlan };

    const pythonPlan = await detectPythonLaunch(cwdPath, cwd);
    if (pythonPlan) return { ok: true, content: renderLaunchPlan(pythonPlan), data: pythonPlan };

    const staticPlan = await detectStaticLaunch(context.workspaceRoot, cwdPath, cwd, input.entry);
    if (staticPlan) return { ok: true, content: renderLaunchPlan(staticPlan), data: staticPlan };

    const unsupported: LaunchPlan = {
      ok: false,
      status: "no_app_launch_strategy",
      cwd,
      nextTools: "list -> read -> ask",
      notes: [
        `No package script, Python app entry, or static HTML entry was detected in ${basename(cwdPath)}.`,
        "Ask for the intended app entrypoint before starting server or shell commands."
      ]
    };
    return { ok: false, content: renderLaunchPlan(unsupported), data: unsupported };
  }
};

function normalizeRequestedCwd(cwd: string | undefined) {
  const requestedCwd = cwd?.trim() || ".";
  if (requestedCwd === "/" || requestedCwd === "\\") return ".";
  return requestedCwd;
}
