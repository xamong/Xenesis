import { isAbsolute, relative, resolve } from 'node:path';

export function stripLegacyStatePrefix(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.xenesis\//, '');
}

export function resolveXenesisStatePath(xenesisHome: string, path: string) {
  if (isAbsolute(path)) return resolve(path);
  return resolve(xenesisHome, stripLegacyStatePrefix(path));
}

export function xenesisStatePath(xenesisHome: string, ...parts: string[]) {
  return resolve(xenesisHome, ...parts);
}

export function displayXenesisStatePath(xenesisHome: string, path: string) {
  const rel = relative(xenesisHome, path).replace(/\\/g, '/');
  if (!rel.startsWith('..') && rel !== '') return `$XENESIS_HOME/${rel}`;
  return path;
}
