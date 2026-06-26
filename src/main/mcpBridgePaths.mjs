const WSL_MOUNT_PATH_RE = /^\/mnt\/([a-zA-Z])(?:\/(.*))?$/;
const BRIDGE_PATH_FIELDS = new Set(['filePath', 'workspaceDir', 'outDir', 'pdfOutDir']);

export function normalizeBridgePathForPlatform(value, { platform = process.platform } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (platform === 'win32') {
    const match = raw.match(WSL_MOUNT_PATH_RE);
    if (match) {
      const drive = match[1].toUpperCase();
      const rest = String(match[2] || '').replace(/\//g, '\\');
      return rest ? `${drive}:\\${rest}` : `${drive}:\\`;
    }
  }

  return raw;
}

export function normalizeBridgePathFields(payload, options = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const normalized = { ...payload };
  for (const key of BRIDGE_PATH_FIELDS) {
    if (typeof normalized[key] === 'string') {
      normalized[key] = normalizeBridgePathForPlatform(normalized[key], options);
    }
  }
  return normalized;
}
