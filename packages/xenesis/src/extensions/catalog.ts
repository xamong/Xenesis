import type { XenesisConfig } from "../config/index.js";
import type { ExtensionCapabilityDescriptor, ExtensionCatalog, ExtensionDescriptor } from "./types.js";

function commandSummary(command: string, args: string[]) {
  return [command, ...args].join(" ");
}

const extensionRoles = {
  memory: {
    role: "context",
    purpose: "Stores durable project facts, user preferences, and reusable decisions for future runs.",
    whenToUse: "Use when information should survive beyond the current session."
  },
  subagent: {
    role: "delegation",
    purpose: "Runs bounded specialist agents for independent research, review, or background work.",
    whenToUse: "Use when a task can be split from the main conversation without sharing mutable state."
  },
  mcp: {
    role: "external tools",
    purpose: "Connects Xenesis to external tool servers and resource providers.",
    whenToUse: "Use when capabilities live outside the built-in tool registry."
  },
  plugin: {
    role: "packaging",
    purpose: "Packages tools, workflows, and MCP server declarations as reusable local extensions.",
    whenToUse: "Use when a capability should be installed, enabled, disabled, or shared as a bundle."
  },
  skill: {
    role: "instructions",
    purpose: "Injects task-specific operating instructions into the agent context.",
    whenToUse: "Use when behavior should change through guidance rather than new executable tools."
  }
} satisfies Record<ExtensionDescriptor["kind"], Pick<ExtensionDescriptor, "role" | "purpose" | "whenToUse">>;

function memoryCapabilities(enabled: boolean, path: string): ExtensionCapabilityDescriptor[] {
  return [{
    sourceKind: "memory",
    intentKinds: ["context", "read", "search", "create", "edit", "delete"],
    runtimeSurface: "memory_store",
    configuredBy: "extensions.memory",
    approvalPolicy: "tool_policy",
    verificationHint: enabled
      ? `memory store configured at ${path}`
      : "enable extensions.memory before memory tools are registered"
  }];
}

function subagentCapabilities(enabled: boolean): ExtensionCapabilityDescriptor[] {
  return [{
    sourceKind: "subagent",
    intentKinds: ["run", "verify", "workflow"],
    runtimeSurface: "subagent_runner",
    configuredBy: "extensions.subagents",
    approvalPolicy: "tool_policy",
    verificationHint: enabled
      ? "subagent_task tool is registered when subagents are enabled"
      : "enable extensions.subagents before delegated agent tasks are registered"
  }];
}

function mcpCapabilities(serverName: string): ExtensionCapabilityDescriptor[] {
  return [{
    sourceKind: "mcp",
    intentKinds: ["tool", "read", "search", "run"],
    runtimeSurface: "mcp_client",
    configuredBy: `extensions.mcpServers.${serverName}`,
    approvalPolicy: "capability_policy",
    verificationHint: "connect report or runtime tool listing should confirm advertised MCP tools/resources"
  }];
}

function pluginCapabilities(path: string): ExtensionCapabilityDescriptor[] {
  return [{
    sourceKind: "plugin",
    intentKinds: ["tool", "workflow"],
    runtimeSurface: "plugin_loader",
    configuredBy: `extensions.plugins.paths:${path}`,
    approvalPolicy: "configuration",
    verificationHint: "plugin doctor should validate manifest, tool exports, workflows, and MCP declarations"
  }];
}

function skillCapabilities(name: string, autoLoad: boolean): ExtensionCapabilityDescriptor[] {
  return [{
    sourceKind: "skill",
    intentKinds: ["context", "workflow"],
    runtimeSurface: autoLoad ? "system_context" : "tool_registry",
    configuredBy: name === "local"
      ? "extensions.skills"
      : `extensions.skills.paths:${name}`,
    approvalPolicy: "tool_policy",
    verificationHint: autoLoad
      ? "skill system context should list active SKILL.md guidance"
      : "Skill tool remains available for explicit skill invocation when configured"
  }];
}

export function createExtensionCatalog(config: XenesisConfig): ExtensionCatalog {
  const descriptors: ExtensionDescriptor[] = [];
  const { extensions } = config;

  descriptors.push({
    kind: "memory",
    name: "workspace",
    enabled: extensions.memory.enabled,
    summary: extensions.memory.enabled
      ? `persistent memory at ${extensions.memory.path}`
      : "persistent memory disabled",
    capabilities: memoryCapabilities(extensions.memory.enabled, extensions.memory.path),
    ...extensionRoles.memory
  });

  descriptors.push({
    kind: "subagent",
    name: "local",
    enabled: extensions.subagents.enabled,
    summary: extensions.subagents.enabled
      ? `subagent registry enabled, maxConcurrent=${extensions.subagents.maxConcurrent}`
      : "subagent registry disabled",
    capabilities: subagentCapabilities(extensions.subagents.enabled),
    ...extensionRoles.subagent
  });

  for (const [name, server] of Object.entries(extensions.mcpServers)) {
    descriptors.push({
      kind: "mcp",
      name,
      enabled: true,
      summary: "url" in server && (server.type === "http" || server.type === "sse")
        ? `${server.type} ${server.url}`
        : "command" in server
          ? commandSummary(server.command, server.args)
          : "unknown MCP server",
      capabilities: mcpCapabilities(name),
      ...extensionRoles.mcp
    });
  }

  for (const path of extensions.plugins.paths) {
    descriptors.push({
      kind: "plugin",
      name: path,
      enabled: true,
      summary: "plugin manifest path",
      capabilities: pluginCapabilities(path),
      ...extensionRoles.plugin
    });
  }

  if (extensions.skills.paths.length === 0) {
    descriptors.push({
      kind: "skill",
      name: "local",
      enabled: extensions.skills.autoLoad,
      summary: extensions.skills.autoLoad ? "skill registry autoLoad enabled" : "skill registry disabled",
      capabilities: skillCapabilities("local", extensions.skills.autoLoad),
      ...extensionRoles.skill
    });
  } else {
    for (const path of extensions.skills.paths) {
      descriptors.push({
        kind: "skill",
        name: path,
        enabled: true,
        summary: `skill path, autoLoad=${extensions.skills.autoLoad}`,
        capabilities: skillCapabilities(path, extensions.skills.autoLoad),
        ...extensionRoles.skill
      });
    }
  }

  return { config: extensions, descriptors };
}
