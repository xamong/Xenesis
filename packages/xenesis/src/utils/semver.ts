// Minimal semver range matcher for plugin engine COMPATIBILITY gating.
//
// Supports `>=` `<=` `>` `<` `=` comparators, space-separated AND, `||`-separated OR,
// and `*`/empty/absent meaning "any". Deliberately NO npm `semver` dependency and NO
// support for caret (`^`) or tilde (`~`) — those are treated as unparseable and REFUSED.
//
// Fail-closed policy: an absent range passes (no constraint declared), but an UNPARSEABLE
// range (or unparseable host version) returns false so a malformed compat declaration can
// never silently load against an incompatible host. This is COMPATIBILITY checking, not
// security — it does not sandbox plugin code or verify provenance.

const COMPARATOR = /^(>=|<=|>|<|=)?\s*(.+)$/;

interface CoreVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Parses `v?MAJOR[.MINOR[.PATCH]]` (zero-filling missing parts), ignoring prerelease/build. */
function parseVersion(value: string): CoreVersion | null {
  const trimmed = value.trim().replace(/^v/i, "");
  // Drop prerelease (-...) and build (+...) metadata; compare by the core triple only.
  const core = trimmed.split(/[-+]/, 1)[0];
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(core);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: match[2] ? Number.parseInt(match[2], 10) : 0,
    patch: match[3] ? Number.parseInt(match[3], 10) : 0
  };
}

function compare(a: CoreVersion, b: CoreVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/** Evaluates a single comparator (e.g. `>=1.0.0`). Returns null if it cannot be parsed. */
function matchComparator(version: CoreVersion, comparator: string): boolean | null {
  const parsed = COMPARATOR.exec(comparator.trim());
  if (!parsed) return null;
  const operator = (parsed[1] ?? "=") as ">=" | "<=" | ">" | "<" | "=";
  const target = parseVersion(parsed[2]);
  if (!target) return null;
  const cmp = compare(version, target);
  switch (operator) {
    case ">=":
      return cmp >= 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case "<":
      return cmp < 0;
    case "=":
      return cmp === 0;
    default:
      return null;
  }
}

/**
 * Returns true when `version` satisfies `range`.
 * - absent/empty/`*` range ⇒ true (no constraint)
 * - space-separated comparators are ANDed; `||` separates ORed ranges
 * - UNPARSEABLE range or version ⇒ false (fail-closed / refuse)
 */
export function satisfies(version: string, range: string | undefined | null): boolean {
  if (range === undefined || range === null) return true;
  const trimmedRange = range.trim();
  if (trimmedRange === "" || trimmedRange === "*") return true;

  const parsedVersion = parseVersion(version);
  if (!parsedVersion) return false;

  // `||` splits independent ranges; ANY satisfied range passes.
  const orGroups = trimmedRange.split("||").map((group) => group.trim()).filter(Boolean);
  if (orGroups.length === 0) return false;

  for (const group of orGroups) {
    if (group === "*") return true;
    const comparators = group.split(/\s+/).filter(Boolean);
    if (comparators.length === 0) continue;
    let groupOk = true;
    for (const comparator of comparators) {
      const result = matchComparator(parsedVersion, comparator);
      if (result === null) {
        // Unparseable comparator ⇒ this whole group is invalid ⇒ refuse it.
        groupOk = false;
        break;
      }
      if (!result) {
        groupOk = false;
        break;
      }
    }
    if (groupOk) return true;
  }
  return false;
}
