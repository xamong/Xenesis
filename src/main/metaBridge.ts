/**
 * Meta Management bridge for main process.
 *
 * Connects xd.meta.* CR capability calls to the MetaManagement HTTP API.
 * This is the "wiring" that makes the CR nodes actually work.
 *
 * Architecture:
 *   CR call (xd.meta.codes.list)
 *     → metaBridge.dispatch(path, args)
 *     → HTTP fetch to MetaManagement API (ai.xamong.com or custom)
 *     → response back to CR caller
 */

import type { DeskBridgeCapabilityCallResult } from '../shared/deskBridgeCapabilities';

export interface MetaBridgeConfig {
  apiUrl: string;
}

export interface MetaBridge {
  dispatch(path: string, args: Record<string, unknown>): Promise<DeskBridgeCapabilityCallResult>;
  isMetaPath(path: string): boolean;
  setApiUrl(url: string): void;
}

const DEFAULT_API_URL = 'https://ai.xamong.com';

async function apiFetch<T>(baseUrl: string, path: string, opts?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!response.ok) throw new Error(`Meta API HTTP ${response.status}`);
  const json = await response.json();
  if (json.success === false) throw new Error(json.error ?? 'Meta API error');
  return json.data as T;
}

export function createMetaBridge(config: MetaBridgeConfig = { apiUrl: DEFAULT_API_URL }): MetaBridge {
  let apiUrl = config.apiUrl.replace(/\/+$/, '');

  const handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
    'xd.meta.tree.load': async () => {
      return apiFetch(apiUrl, '/api/codes/tree');
    },

    'xd.meta.tree.search': async (args) => {
      const query = String(args.query || '');
      const tree = await apiFetch<any[]>(apiUrl, '/api/codes/tree');
      return searchTree(tree, query);
    },

    'xd.meta.codes.list': async (args) => {
      const params = new URLSearchParams();
      if (args.PID) params.set('PID', String(args.PID));
      if (args.TYPE) params.set('TYPE', String(args.TYPE));
      if (args.CODE) params.set('CODE', String(args.CODE));
      const qs = params.toString();
      return apiFetch(apiUrl, `/api/codes${qs ? '?' + qs : ''}`);
    },

    'xd.meta.codes.create': async (args) => {
      return apiFetch(apiUrl, '/api/codes', {
        method: 'POST',
        body: JSON.stringify(args),
      });
    },

    'xd.meta.codes.update': async (args) => {
      const uid = args.uid || args.UID;
      if (!uid) throw new Error('uid is required');
      const payload = { ...args };
      delete payload.uid;
      delete payload.UID;
      return apiFetch(apiUrl, `/api/codes/${encodeURIComponent(String(uid))}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    'xd.meta.codes.batch': async (args) => {
      const items = args.items;
      if (!Array.isArray(items)) throw new Error('items array is required');
      return apiFetch(apiUrl, '/api/codes/batch', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },

    'xd.meta.attributes.list': async () => {
      return apiFetch(apiUrl, '/api/codes/attributes');
    },

    'xd.meta.attributes.schema': async (args) => {
      const attrs = await apiFetch<any[]>(apiUrl, '/api/codes/attributes');
      return buildFormSchema(attrs, args);
    },

    'xd.meta.instances.list': async (args) => {
      const params = new URLSearchParams();
      if (args.PID) params.set('PID', String(args.PID));
      params.set('TYPE', 'DATA');
      const qs = params.toString();
      return apiFetch(apiUrl, `/api/codes${qs ? '?' + qs : ''}`);
    },

    'xd.meta.instances.toFixture': async (args) => {
      const node = String(args.node || '');
      if (!node) throw new Error('node CODE is required');
      const tree = await apiFetch<any[]>(apiUrl, '/api/codes/tree');
      const targetNode = findNodeByCode(tree, node);
      if (!targetNode) throw new Error(`Node not found: ${node}`);

      const instances = await apiFetch<any[]>(apiUrl, `/api/codes?PID=${targetNode.UID}&TYPE=DATA`);
      return { node, uid: targetNode.UID, data: instances, rowCount: instances.length };
    },

    'xd.meta.query.run': async (args) => {
      const sql = String(args.sql || '');
      if (!sql) throw new Error('sql is required');
      return apiFetch(apiUrl, '/api/database/query', {
        method: 'POST',
        body: JSON.stringify({ sql }),
      });
    },

    'xd.meta.snapshot.export': async (args) => {
      const uid = args.uid || args.UID;
      if (!uid) throw new Error('uid is required for export');
      const codes = await apiFetch<any[]>(apiUrl, `/api/codes?PID=${uid}`);
      const attrs = await apiFetch<any[]>(apiUrl, '/api/codes/attributes');
      return {
        version: 'xd-meta-xmdb-assist/v1',
        exportedAt: new Date().toISOString(),
        selectedNode: { UID: uid },
        templates: codes.filter((c: any) => c.TYPE === 'GROUP' || c.TYPE === 'TABLE'),
        attributes: attrs,
        instances: codes.filter((c: any) => c.TYPE === 'DATA' || c.TYPE === 'CODE'),
      };
    },

    'xd.meta.snapshot.import': async (args) => {
      const snapshot = args.snapshot || args;
      const target = args.target || {};
      return apiFetch(apiUrl, '/api/codes/import-snapshot', {
        method: 'POST',
        body: JSON.stringify({ snapshot, target }),
      });
    },

    'xd.meta.relations.graph': async (args) => {
      const uid = args.uid || args.UID;
      if (!uid) throw new Error('uid is required');
      const codes = await apiFetch<any[]>(apiUrl, `/api/codes?PID=${uid}`);
      const relations = codes
        .filter((c: any) => c.PID && c.UID)
        .map((c: any) => ({
          from: String(c.PID),
          to: String(c.UID),
          label: c.CODE || c.TYPE || '',
          kind: c.TYPE === 'DATA' ? 'instance' : c.TYPE === 'GROUP' ? 'template' : 'attribute',
        }));
      return { uid, relations };
    },
  };

  return {
    isMetaPath(path: string): boolean {
      return path.startsWith('xd.meta.');
    },

    async dispatch(path, args): Promise<DeskBridgeCapabilityCallResult> {
      const handler = handlers[path];
      if (!handler) {
        return { ok: false, path, error: `Unknown meta path: ${path}` };
      }
      try {
        const result = await handler(args);
        return { ok: true, path, result };
      } catch (error) {
        return {
          ok: false,
          path,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    setApiUrl(url: string): void {
      apiUrl = url.replace(/\/+$/, '');
    },
  };
}

function searchTree(nodes: any[], query: string): any[] {
  const q = query.toLowerCase();
  const results: any[] = [];
  function walk(list: any[]) {
    for (const node of list) {
      if (
        (node.CODE && String(node.CODE).toLowerCase().includes(q)) ||
        (node.NAME && String(node.NAME).toLowerCase().includes(q))
      ) {
        results.push(node);
      }
      if (node.children) walk(node.children);
    }
  }
  walk(nodes);
  return results;
}

function findNodeByCode(nodes: any[], code: string): any | null {
  for (const node of nodes) {
    if (node.CODE === code) return node;
    if (node.children) {
      const found = findNodeByCode(node.children, code);
      if (found) return found;
    }
  }
  return null;
}

function buildFormSchema(attrs: any[], _args: Record<string, unknown>): any[] {
  return attrs.map((attr: any) => {
    const code = String(attr.CODE || '');
    const name = String(attr.NAME || code);
    let inputType = 'text';
    if (code.endsWith('_YN') || code.includes('USE_YN')) inputType = 'checkbox';
    else if (code.endsWith('_DT') || code.includes('DATE')) inputType = 'date';
    else if (code.includes('CNT') || code.includes('AMOUNT')) inputType = 'number';

    return { code, label: name, inputType, visible: attr.SHOW_YN !== 'N' };
  });
}
