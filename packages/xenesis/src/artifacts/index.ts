import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface ArtifactRecord {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
  path: string;
  bytes: number;
  sessionId?: string;
}

export interface Artifact extends ArtifactRecord {
  content: string;
}

export interface SaveArtifactInput {
  title: string;
  content: string;
  kind?: string;
  sessionId?: string;
}

export interface FileArtifactStoreOptions {
  xenesisHome: string;
  now?: () => Date;
}

function timestampId(date: Date) {
  return date.toISOString().replace(/[-:.]/g, '');
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'artifact';
}

export class FileArtifactStore {
  private readonly root: string;
  private readonly indexPath: string;
  private readonly now: () => Date;

  constructor(options: FileArtifactStoreOptions) {
    this.root = resolve(options.xenesisHome, 'artifacts');
    this.indexPath = resolve(this.root, 'index.json');
    this.now = options.now ?? (() => new Date());
  }

  async save(input: SaveArtifactInput): Promise<ArtifactRecord> {
    const records = await this.list();
    const createdAt = this.now().toISOString();
    const baseId = `${timestampId(new Date(createdAt))}-${slugify(input.title)}`;
    let id = baseId;
    let suffix = 2;
    while (records.some((record) => record.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const relativePath = `items/${id}.txt`;
    const path = resolve(this.root, relativePath);
    const record: ArtifactRecord = {
      id,
      title: input.title,
      kind: input.kind ?? 'text',
      createdAt,
      path: relativePath,
      bytes: Buffer.byteLength(input.content, 'utf8'),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    };

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.content, 'utf8');
    await this.writeIndex([record, ...records]);
    return record;
  }

  async list(): Promise<ArtifactRecord[]> {
    try {
      return JSON.parse(await readFile(this.indexPath, 'utf8')) as ArtifactRecord[];
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async read(id: string): Promise<Artifact | undefined> {
    const record = (await this.list()).find((candidate) => candidate.id === id);
    if (!record) return undefined;
    const content = await readFile(resolve(this.root, record.path), 'utf8');
    return {
      ...record,
      content,
    };
  }

  private async writeIndex(records: ArtifactRecord[]) {
    await mkdir(dirname(this.indexPath), { recursive: true });
    await writeFile(this.indexPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }
}
