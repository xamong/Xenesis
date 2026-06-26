import { createMcpResourceTools, type McpToolClient, type McpReadResourceResult } from "../../extensions/mcp.js";
import type { Tool, ToolContext, ToolResult } from "../../tools/types.js";
import type { OracleObservation } from "./GoldenReplay.js";

export interface ToolMcpResourcesReplayInput {
  servers: Array<{
    name: string;
    resources?: Array<{
      uri: string;
      name?: string;
      description?: string;
      mimeType?: string;
    }>;
    reads?: Record<string, McpReadResourceResult>;
    listError?: string;
  }>;
}

interface ProjectedResource {
  server: string;
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

function context(): ToolContext {
  return {
    workspaceRoot: process.cwd(),
    cwd: process.cwd(),
    sessionId: "tool-mcp-resources-oracle",
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function buildClient(server: ToolMcpResourcesReplayInput["servers"][number]): McpToolClient {
  const client: McpToolClient = {
    async listTools() {
      return [];
    },
    async callTool() {
      throw new Error("not used");
    },
    async listResources() {
      if (server.listError) throw new Error(server.listError);
      return server.resources ?? [];
    },
    async close() {}
  };

  if (server.reads) {
    client.readResource = async (uri: string) => {
      const result = server.reads?.[uri];
      if (!result) throw new Error(`Resource not found: ${uri}`);
      return result;
    };
  }

  return client;
}

function buildClients(servers: ToolMcpResourcesReplayInput["servers"]): Record<string, McpToolClient> {
  return Object.fromEntries(servers.map((server) => [server.name, buildClient(server)]));
}

function toolByName(tools: Tool[], name: string): Tool {
  const tool = tools.find((nextTool) => nextTool.name === name);
  if (!tool) throw new Error(`Expected MCP resource tool: ${name}`);
  return tool;
}

function dataRecord(result: ToolResult): Record<string, unknown> {
  return result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
}

function projectResource(value: unknown): ProjectedResource {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const projected: ProjectedResource = {
    server: String(record.server),
    uri: String(record.uri)
  };
  if (typeof record.name === "string") projected.name = record.name;
  if (typeof record.description === "string") projected.description = record.description;
  if (typeof record.mimeType === "string") projected.mimeType = record.mimeType;
  return projected;
}

function projectResourceData(result: ToolResult): ProjectedResource[] {
  return Array.isArray(result.data) ? result.data.map(projectResource) : [];
}

function projectReadData(result: ToolResult): McpReadResourceResult {
  return dataRecord(result) as McpReadResourceResult;
}

function projectListResult(result: ToolResult) {
  return {
    ok: result.ok,
    content: result.content,
    data: projectResourceData(result)
  };
}

function projectErrorResult(result: ToolResult) {
  return {
    ok: result.ok,
    content: result.content
  };
}

function serverNames(input: ToolMcpResourcesReplayInput) {
  const readable = input.servers.find((server) => server.reads);
  const readonly = input.servers.find((server) => server.resources?.length && !server.reads && !server.listError);
  const emptyOrBroken = input.servers.filter((server) => server.listError || (server.resources?.length ?? 0) === 0);
  if (!readable) throw new Error("Expected at least one readable MCP resource server");
  if (!readonly) throw new Error("Expected at least one readonly MCP resource server");
  return {
    readable,
    readonly,
    emptyOrBroken
  };
}

export async function collectToolMcpResourcesObservation(
  input: ToolMcpResourcesReplayInput
): Promise<OracleObservation> {
  const names = serverNames(input);
  const readUri = Object.keys(names.readable.reads ?? {})[0];
  if (!readUri) throw new Error("Expected readable MCP server to include at least one resource body");

  const allTools = createMcpResourceTools(buildClients(input.servers));
  const allList = toolByName(allTools, "list_mcp_resources");
  const allRead = toolByName(allTools, "read_mcp_resource");
  const noResourceTools = createMcpResourceTools(buildClients(names.emptyOrBroken));
  const noResourceList = toolByName(noResourceTools, "list_mcp_resources");
  const toolContext = context();

  const listAll = await allList.run({}, toolContext);
  const listDocs = await allList.run({ server: names.readable.name }, toolContext);
  const listMissingServer = await allList.run({ server: "missing" }, toolContext);
  const listNoResources = await noResourceList.run({}, toolContext);
  const readDocs = await allRead.run({ server: names.readable.name, uri: readUri }, toolContext);
  const readReadonly = await allRead.run({ server: names.readonly.name, uri: names.readonly.resources?.[0]?.uri ?? "" }, toolContext);
  const readMissingServer = await allRead.run({ server: "missing", uri: readUri }, toolContext);

  return {
    ledgerEntries: [
      {
        type: "tool.mcp_resources_local_catalog",
        listAll: projectListResult(listAll),
        listDocs: projectListResult(listDocs),
        listMissingServer: projectErrorResult(listMissingServer),
        listNoResources: projectListResult(listNoResources),
        readDocs: {
          ok: readDocs.ok,
          content: readDocs.content,
          data: projectReadData(readDocs)
        },
        readReadonly: projectErrorResult(readReadonly),
        readMissingServer: projectErrorResult(readMissingServer)
      }
    ],
    finalStatus: "tool_mcp_resources_oracle_ready",
    visibleResult: "MCP resource tools list server-filtered resources, isolate list failures, read text resources, and report missing or unreadable servers deterministically"
  };
}
