import { z } from "zod";
import type { WebToolsConfig } from "../config/types.js";
import { safeFetch } from "./ssrfGuard.js";
import type { Tool } from "./types.js";

const fetchInput = z.object({
  url: z.string().url(),
  maxBytes: z.number().int().positive().max(200000).default(100000)
});

const fetchOpenAIInput = z.object({
  url: z.string(),
  maxBytes: z.number().int().positive().max(200000)
});

const searchInput = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().max(10).default(5)
});

export const DEFAULT_WEB_TOOLS_CONFIG: WebToolsConfig = {
  allowedHosts: [],
  fetchTimeoutMs: 15000,
  maxRedirects: 5
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, "").trim());
}

export function createWebFetchTool(config: WebToolsConfig = DEFAULT_WEB_TOOLS_CONFIG): Tool<z.infer<typeof fetchInput>, {
  status: number;
  contentType: string;
  truncated: boolean;
}> {
  return {
    name: "web_fetch",
    description: "Fetch bounded text content from an HTTP(S) URL.",
    inputSchema: fetchInput,
    openaiInputSchema: fetchOpenAIInput,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async run(input) {
      try {
        const result = await safeFetch(input.url, {
          maxBytes: input.maxBytes,
          timeoutMs: config.fetchTimeoutMs,
          allowedHosts: config.allowedHosts,
          maxRedirects: config.maxRedirects
        });
        return {
          ok: result.status >= 200 && result.status < 400,
          content: result.text,
          data: {
            status: result.status,
            contentType: result.contentType,
            truncated: result.truncated
          }
        };
      } catch (error) {
        return {
          ok: false,
          content: `web_fetch blocked: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  };
}

function resultUrl(raw: string) {
  const decoded = decodeHtml(raw);
  try {
    const parsed = new URL(decoded);
    return parsed.searchParams.get("uddg") ?? decoded;
  } catch {
    return decoded;
  }
}

function parseDuckDuckGoResults(html: string, maxResults: number) {
  const results: string[] = [];
  const anchorPattern = /<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html)) && results.length < maxResults) {
    const title = stripTags(match[2]);
    const url = resultUrl(match[1]);
    if (title && url) results.push(`${title} - ${url}`);
  }

  return results;
}

export function createWebSearchTool(config: WebToolsConfig = DEFAULT_WEB_TOOLS_CONFIG): Tool<z.infer<typeof searchInput>, { count: number }> {
  return {
    name: "web_search",
    description: "Search the web and return result titles with links.",
    inputSchema: searchInput,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async run(input) {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`;
      try {
        const result = await safeFetch(url, {
          maxBytes: 100000,
          timeoutMs: config.fetchTimeoutMs,
          allowedHosts: config.allowedHosts,
          maxRedirects: config.maxRedirects
        });
        if (result.status < 200 || result.status >= 400) {
          return { ok: false, content: `Search failed with status ${result.status}.`, data: { count: 0 } };
        }

        const results = parseDuckDuckGoResults(result.text, input.maxResults);
        return {
          ok: true,
          content: results.length > 0 ? results.join("\n") : "No results.",
          data: { count: results.length }
        };
      } catch (error) {
        return {
          ok: false,
          content: `web_search blocked: ${error instanceof Error ? error.message : String(error)}`,
          data: { count: 0 }
        };
      }
    }
  };
}

export const webFetchTool = createWebFetchTool();
export const webSearchTool = createWebSearchTool();
