import { lstat, mkdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export function resolveWorkspacePath(workspaceRoot: string, requestedPath: string) {
  return isAbsolute(requestedPath) ? resolve(requestedPath) : resolve(workspaceRoot, requestedPath);
}

export function isPathInside(parent: string, child: string) {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  const relativePath = relative(resolvedParent, resolvedChild);

  if (relativePath === '') return true;
  return !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

export function assertInsideWorkspace(workspaceRoot: string, requestedPath: string) {
  const resolved = resolveWorkspacePath(workspaceRoot, requestedPath);
  if (!isPathInside(workspaceRoot, resolved)) {
    throw new Error(`Path is outside the workspace: ${requestedPath}`);
  }
  return resolved;
}

async function realWorkspaceRoot(workspaceRoot: string) {
  return await realpath(workspaceRoot);
}

function isNotFoundError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

export async function assertExistingPathInsideWorkspace(workspaceRoot: string, requestedPath: string) {
  const resolved = assertInsideWorkspace(workspaceRoot, requestedPath);
  const [rootRealPath, targetRealPath] = await Promise.all([realWorkspaceRoot(workspaceRoot), realpath(resolved)]);

  if (!isPathInside(rootRealPath, targetRealPath)) {
    throw new Error(`Path is outside the workspace: ${requestedPath}`);
  }

  return targetRealPath;
}

export async function prepareWorkspaceWritePath(workspaceRoot: string, requestedPath: string) {
  const resolved = assertInsideWorkspace(workspaceRoot, requestedPath);
  const rootRealPath = await realWorkspaceRoot(workspaceRoot);

  try {
    const targetStats = await lstat(resolved);
    try {
      const targetRealPath = await realpath(resolved);
      if (!isPathInside(rootRealPath, targetRealPath)) {
        throw new Error(`Path is outside the workspace: ${requestedPath}`);
      }
    } catch (error) {
      if (targetStats.isSymbolicLink() && isNotFoundError(error)) {
        throw new Error(`Path is a broken symlink inside the workspace: ${requestedPath}`);
      }
      throw error;
    }
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  let existingParent = dirname(resolved);
  while (true) {
    try {
      const parentRealPath = await realpath(existingParent);
      if (!isPathInside(rootRealPath, parentRealPath)) {
        throw new Error(`Path is outside the workspace: ${requestedPath}`);
      }
      break;
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
      const nextParent = dirname(existingParent);
      if (nextParent === existingParent) throw error;
      existingParent = nextParent;
    }
  }

  const parent = dirname(resolved);
  await mkdir(parent, { recursive: true });
  const parentRealPath = await realpath(parent);
  if (!isPathInside(rootRealPath, parentRealPath)) {
    throw new Error(`Path is outside the workspace: ${requestedPath}`);
  }

  return resolved;
}
