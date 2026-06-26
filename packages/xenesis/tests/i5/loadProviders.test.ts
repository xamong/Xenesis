import { describe, it, expect, afterEach } from "vitest";
import { loadPluginProviders } from "../../src/extensions/plugins.js";
import { getProviderFactory, getRegisteredCapabilities, resetProviderFactories } from "../../src/providers/providerFactory.js";
import { createProvider } from "../../src/core/AgentRuntimeFactory.js";
import { defaultConfig, type XenesisConfig } from "../../src/config/index.js";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

afterEach(() => resetProviderFactories());

async function pluginWith(entrySrc: string, manifest: object) {
  const d = await mkdtemp(join(tmpdir(), "i5p-"));
  await writeFile(join(d, "prov.mjs"), entrySrc, "utf8");
  await writeFile(join(d, "xenesis.plugin.json"), JSON.stringify(manifest), "utf8");
  return d;
}

// Creates a plugin in `<parent>/<name>/` so several plugins can share one workspaceRoot
// (= `parent`). Both plugin dirs then pass workspace containment, which lets the
// loadPluginProviders loop reach the second descriptor and exercise the duplicate-name guard.
async function pluginInside(parent: string, name: string, entrySrc: string, manifest: object) {
  const d = join(parent, name);
  await mkdir(d, { recursive: true });
  await writeFile(join(d, "prov.mjs"), entrySrc, "utf8");
  await writeFile(join(d, "xenesis.plugin.json"), JSON.stringify(manifest), "utf8");
  return d;
}

const FACTORY_SRC = `export const factory = (opts) => ({ kind: 'plugin-provider', name: opts.name });`;
const manifest = { name: "p", providers: [{ name: "myllm", entry: "./prov.mjs", exportName: "factory", capabilities: { supportsTools: true, requiresApiKey: false, transport: "http-streaming", streaming: true, persistentSession: false } }] };

describe("loadPluginProviders", () => {
  it("registers a manifest provider so getProviderFactory resolves it", async () => {
    const d = await pluginWith(FACTORY_SRC, manifest);
    await loadPluginProviders({ workspaceRoot: d, paths: [d] });
    const f = getProviderFactory("myllm");
    expect(typeof f).toBe("function");
    expect(getRegisteredCapabilities("myllm")?.supportsTools).toBe(true);
  });
  it("makes a manifest provider resolvable through createProvider (seam end-to-end)", async () => {
    const d = await pluginWith(FACTORY_SRC, manifest);
    await loadPluginProviders({ workspaceRoot: d, paths: [d] });
    // createProvider reads getProviderFactory(config.provider) and invokes the
    // registered factory: proves the seam from manifest -> registry -> createProvider.
    const config = {
      ...defaultConfig,
      provider: "myllm" as XenesisConfig["provider"],
      model: "m",
      xenesisHome: join(d, ".xenesis")
    };
    const provider = createProvider(config, process.env) as unknown as { kind: string; name: string };
    expect(provider.kind).toBe("plugin-provider");
    expect(provider.name).toBe("myllm");
  });
  it("throws when the export is not a function", async () => {
    const d = await pluginWith(`export const factory = { not: "a function" };`, manifest);
    await expect(loadPluginProviders({ workspaceRoot: d, paths: [d] })).rejects.toThrow();
  });
  it("strict policy (default) re-throws when a provider plugin fails", async () => {
    const d = await pluginWith(`export const factory = { not: "a function" };`, manifest);
    await expect(
      loadPluginProviders({ workspaceRoot: d, paths: [d], pluginLoadPolicy: "strict" })
    ).rejects.toThrow();
  });
  it("tolerant policy skips a faulty provider plugin without crashing boot", async () => {
    // Bad plugin (non-function export) is skipped; good plugin still registers.
    const root = await mkdtemp(join(tmpdir(), "i5p-tol-"));
    const bad = await pluginInside(root, "bad", `export const factory = { not: "a function" };`, manifest);
    const goodManifest = { name: "p2", providers: [{ name: "okllm", entry: "./prov.mjs", exportName: "factory", capabilities: { supportsTools: true, requiresApiKey: false, transport: "http-streaming", streaming: true, persistentSession: false } }] };
    const good = await pluginInside(root, "good", FACTORY_SRC, goodManifest);
    await expect(
      loadPluginProviders({ workspaceRoot: root, paths: [bad, good], pluginLoadPolicy: "tolerant" })
    ).resolves.toBeUndefined();
    expect(getProviderFactory("myllm")).toBeUndefined();
    expect(typeof getProviderFactory("okllm")).toBe("function");
  });
  it("throws on a duplicate provider name across plugins", async () => {
    // Both plugins live inside ONE shared workspaceRoot, so each passes containment and the
    // loop reaches the second descriptor. The message regex pins the failure to the
    // duplicate-name guard (not an incidental workspace-containment error).
    const root = await mkdtemp(join(tmpdir(), "i5p-ws-"));
    const d1 = await pluginInside(root, "a", FACTORY_SRC, manifest);
    const d2 = await pluginInside(root, "b", FACTORY_SRC, manifest);
    await expect(
      loadPluginProviders({ workspaceRoot: root, paths: [d1, d2] })
    ).rejects.toThrow(/already registered/);
  });
  it("throws when a provider entry escapes the plugin directory (path containment)", async () => {
    // The plugin lives inside `root`; its provider entry "../escape.mjs" resolves to
    // `root/escape.mjs` (which EXISTS, so this is not a not-found error) but is OUTSIDE the
    // plugin dir -> the resolveEntryPath guard must throw before any import runs.
    const root = await mkdtemp(join(tmpdir(), "i5p-esc-"));
    await writeFile(join(root, "escape.mjs"), FACTORY_SRC, "utf8");
    const escManifest = { name: "p", providers: [{ name: "escllm", entry: "../escape.mjs", exportName: "factory", capabilities: { supportsTools: true, requiresApiKey: false, transport: "http-streaming", streaming: true, persistentSession: false } }] };
    const plugin = await pluginInside(root, "plug", FACTORY_SRC, escManifest);
    await expect(
      loadPluginProviders({ workspaceRoot: root, paths: [plugin] })
    ).rejects.toThrow(/outside the plugin directory/);
    // and nothing was registered
    expect(getProviderFactory("escllm")).toBeUndefined();
  });
});
