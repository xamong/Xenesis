/**
 * Fixture/Sketch version store.
 *
 * Saves snapshots of fixture+sketch combinations for comparison,
 * rollback, and simulation fork.
 */

export interface ArtifactSnapshot {
  id: string;
  name: string;
  description?: string;
  source: string;
  fixtureJson?: string;
  createdAt: number;
  tags?: string[];
}

export interface ArtifactDiff {
  sourceChanged: boolean;
  fixtureChanged: boolean;
  sourceDiffLines: number;
  fixtureDiffKeys: string[];
}

export interface ArtifactVersionStore {
  save(name: string, source: string, fixtureJson?: string, description?: string): ArtifactSnapshot;
  list(): ArtifactSnapshot[];
  get(id: string): ArtifactSnapshot | undefined;
  restore(id: string): ArtifactSnapshot | undefined;
  compare(idA: string, idB: string): ArtifactDiff | null;
  fork(id: string, name: string): ArtifactSnapshot | undefined;
  remove(id: string): boolean;
  clear(): void;
}

let snapshotSeq = 0;

export function createArtifactVersionStore(): ArtifactVersionStore {
  const snapshots = new Map<string, ArtifactSnapshot>();

  return {
    save(name, source, fixtureJson, description): ArtifactSnapshot {
      const id = `snap-${Date.now()}-${++snapshotSeq}`;
      const snapshot: ArtifactSnapshot = {
        id,
        name,
        description,
        source,
        fixtureJson,
        createdAt: Date.now(),
      };
      snapshots.set(id, snapshot);
      return snapshot;
    },

    list(): ArtifactSnapshot[] {
      return Array.from(snapshots.values()).sort((a, b) => b.createdAt - a.createdAt);
    },

    get(id): ArtifactSnapshot | undefined {
      return snapshots.get(id);
    },

    restore(id): ArtifactSnapshot | undefined {
      return snapshots.get(id);
    },

    compare(idA, idB): ArtifactDiff | null {
      const a = snapshots.get(idA);
      const b = snapshots.get(idB);
      if (!a || !b) return null;

      const sourceChanged = a.source !== b.source;
      const sourceDiffLines = sourceChanged ? Math.abs(a.source.split('\n').length - b.source.split('\n').length) : 0;

      let fixtureChanged = false;
      const fixtureDiffKeys: string[] = [];
      if (a.fixtureJson && b.fixtureJson) {
        try {
          const fa = JSON.parse(a.fixtureJson);
          const fb = JSON.parse(b.fixtureJson);
          const allKeys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
          for (const key of allKeys) {
            if (JSON.stringify(fa[key]) !== JSON.stringify(fb[key])) {
              fixtureChanged = true;
              fixtureDiffKeys.push(key);
            }
          }
        } catch {
          fixtureChanged = a.fixtureJson !== b.fixtureJson;
        }
      } else {
        fixtureChanged = a.fixtureJson !== b.fixtureJson;
      }

      return { sourceChanged, fixtureChanged, sourceDiffLines, fixtureDiffKeys };
    },

    fork(id, name): ArtifactSnapshot | undefined {
      const original = snapshots.get(id);
      if (!original) return undefined;
      return this.save(`${name} (fork of ${original.name})`, original.source, original.fixtureJson);
    },

    remove(id): boolean {
      return snapshots.delete(id);
    },

    clear(): void {
      snapshots.clear();
    },
  };
}
