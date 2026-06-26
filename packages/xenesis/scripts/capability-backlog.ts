#!/usr/bin/env node
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  acceptedCapabilityScenarios,
  readCapabilityScenarioBacklog,
  updateCapabilityCandidateStatus,
  writeCapabilityScenarioBacklog,
  type CapabilityScenarioBacklog,
  type CapabilityScenarioCandidate
} from "../src/evaluation/index.js";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

type BacklogCommand = "list" | "show" | "accept" | "ignore" | "export" | "promote";

interface ParsedArgs {
  command?: BacklogCommand;
  id?: string;
  backlog?: string;
  out?: string;
  notes?: string;
  json: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { json: false };
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Option ${arg} requires a value.`);
      index += 1;
      return value;
    };
    if (arg === "--backlog") parsed.backlog = next();
    else if (arg === "--out") parsed.out = next();
    else if (arg === "--notes") parsed.notes = next();
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option ${arg}. Run "npm run capability:backlog -- --help".`);
    } else {
      positionals.push(arg);
    }
  }

  const command = positionals[0];
  if (
    command === "list" ||
    command === "show" ||
    command === "accept" ||
    command === "ignore" ||
    command === "export" ||
    command === "promote"
  ) {
    parsed.command = command;
    parsed.id = positionals[1];
  } else if (command) {
    throw new Error(`Unknown command ${command}. Run "npm run capability:backlog -- --help".`);
  }
  return parsed;
}

function printHelp() {
  console.log([
    "Usage: npm run capability:backlog -- <command> [id] [options]",
    "",
    "Commands:",
    "  list                 List candidate scenario backlog entries.",
    "  show <id>            Show one candidate as JSON.",
    "  accept <id>          Mark a candidate as accepted.",
    "  ignore <id>          Mark a candidate as ignored.",
    "  export               Export accepted candidates to scenario JSON.",
    "  promote <id>         Accept one candidate and export accepted scenarios.",
    "",
    "Options:",
    "  --backlog <path>     Backlog path. Default: $XENESIS_HOME/reports/capability-scenario-backlog.json",
    "  --out <path>         Export path. Default: $XENESIS_HOME/reports/capability-accepted-scenarios.json",
    "  --notes <text>       Notes saved on accept/ignore/promote.",
    "  --json               Print JSON output."
  ].join("\n"));
}

function resolveXenesisHome() {
  return process.env.XENESIS_HOME?.trim()
    ? resolve(process.env.XENESIS_HOME)
    : resolve(homedir(), ".xenesis");
}

function defaultBacklogPath() {
  return resolve(resolveXenesisHome(), "reports", "capability-scenario-backlog.json");
}

function defaultAcceptedScenariosPath() {
  return resolve(resolveXenesisHome(), "reports", "capability-accepted-scenarios.json");
}

async function requireBacklog(path: string): Promise<CapabilityScenarioBacklog> {
  const backlog = await readCapabilityScenarioBacklog(path);
  if (!backlog) throw new Error(`Capability scenario backlog not found: ${path}`);
  return backlog;
}

function requireId(parsed: ParsedArgs) {
  if (!parsed.id) throw new Error(`Command "${parsed.command}" requires a candidate id.`);
  return parsed.id;
}

function renderCandidateLine(candidate: CapabilityScenarioCandidate) {
  return [
    candidate.id,
    candidate.status,
    `occurrences=${candidate.occurrences}`,
    `source=${candidate.sourceScenarioId}`,
    `last=${candidate.lastSeenAt}`
  ].join(" ");
}

async function exportAcceptedScenarios(backlog: CapabilityScenarioBacklog, outPath: string) {
  const scenarios = acceptedCapabilityScenarios(backlog);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(scenarios, null, 2)}\n`, "utf8");
  return scenarios;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed.command ?? "list";
  const backlogPath = resolve(parsed.backlog ?? defaultBacklogPath());
  const outPath = resolve(parsed.out ?? defaultAcceptedScenariosPath());
  let backlog = await requireBacklog(backlogPath);

  if (command === "list") {
    const payload = backlog.candidates;
    if (parsed.json) console.log(JSON.stringify(payload, null, 2));
    else if (payload.length === 0) console.log("capability-backlog: no candidates");
    else for (const candidate of payload) console.log(renderCandidateLine(candidate));
    return;
  }

  if (command === "show") {
    const id = requireId(parsed);
    const candidate = backlog.candidates.find((item) => item.id === id);
    if (!candidate) throw new Error(`Capability scenario candidate not found: ${id}`);
    console.log(JSON.stringify(candidate, null, 2));
    return;
  }

  if (command === "accept" || command === "ignore" || command === "promote") {
    const id = requireId(parsed);
    backlog = updateCapabilityCandidateStatus({
      backlog,
      id,
      status: command === "ignore" ? "ignored" : "accepted",
      notes: parsed.notes
    });
    await writeCapabilityScenarioBacklog(backlogPath, backlog);
    if (command !== "promote") {
      if (parsed.json) console.log(JSON.stringify({ backlog: backlogPath, id, status: command === "ignore" ? "ignored" : "accepted" }, null, 2));
      else console.log(`capability-backlog: ${id} ${command === "ignore" ? "ignored" : "accepted"}`);
      return;
    }
  }

  const scenarios = await exportAcceptedScenarios(backlog, outPath);
  if (parsed.json) {
    console.log(JSON.stringify({
      backlog: backlogPath,
      out: outPath,
      scenarios: scenarios.length
    }, null, 2));
  } else {
    console.log(`capability-backlog: exported ${scenarios.length} accepted scenario(s)`);
    console.log(`capability-backlog: ${outPath}`);
  }
}

main().catch((error) => {
  console.error(`capability-backlog: error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
