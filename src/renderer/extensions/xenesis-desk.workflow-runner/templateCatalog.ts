/**
 * XCON Template Catalog (Sprint 9-2).
 *
 * Manages XCON/SKETCH templates organized by category.
 * Phase 1: built-in templates. Phase 2: file-based sharing.
 */

export interface TemplateCatalogEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  source: string;
  thumbnail?: string;
  createdAt: number;
  author?: string;
  demoRank?: number;
  recommendedFor?: string[];
}

export type TemplateCatalogCategory =
  | 'chart'
  | 'dashboard'
  | 'kpi'
  | 'report'
  | 'monitoring'
  | 'form'
  | 'education'
  | 'other';

const FIRST_FIVE_MINUTE_RECOMMENDATION = 'first-5-demo';

const catalog = new Map<string, TemplateCatalogEntry>();

export function sortTemplateCatalogEntries<T extends TemplateCatalogEntry>(templates: T[]): T[] {
  return [...templates].sort((left, right) => {
    const leftRank = Number.isFinite(left.demoRank)
      ? (left.demoRank ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    const rightRank = Number.isFinite(right.demoRank)
      ? (right.demoRank ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftRecommended = left.recommendedFor?.includes(FIRST_FIVE_MINUTE_RECOMMENDATION) ? 0 : 1;
    const rightRecommended = right.recommendedFor?.includes(FIRST_FIVE_MINUTE_RECOMMENDATION) ? 0 : 1;
    if (leftRecommended !== rightRecommended) return leftRecommended - rightRecommended;

    const categoryOrder = left.category.localeCompare(right.category);
    if (categoryOrder !== 0) return categoryOrder;
    return left.name.localeCompare(right.name);
  });
}

export function addTemplate(entry: TemplateCatalogEntry): void {
  catalog.set(entry.id, entry);
}

export function removeTemplate(id: string): boolean {
  return catalog.delete(id);
}

export function getTemplate(id: string): TemplateCatalogEntry | undefined {
  return catalog.get(id);
}

export function listTemplates(category?: string): TemplateCatalogEntry[] {
  const all = Array.from(catalog.values());
  return sortTemplateCatalogEntries(category ? all.filter((t) => t.category === category) : all);
}

export function listCategories(): string[] {
  return [...new Set(Array.from(catalog.values()).map((t) => t.category))];
}

export function searchTemplates(query: string): TemplateCatalogEntry[] {
  const q = query.toLowerCase();
  return sortTemplateCatalogEntries(
    Array.from(catalog.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    ),
  );
}

export function exportTemplate(id: string): string | null {
  const entry = catalog.get(id);
  return entry ? JSON.stringify(entry, null, 2) : null;
}

export function importTemplate(json: string): TemplateCatalogEntry | null {
  try {
    const entry = JSON.parse(json) as TemplateCatalogEntry;
    if (!entry.id || !entry.name || !entry.source) return null;
    catalog.set(entry.id, entry);
    return entry;
  } catch {
    return null;
  }
}
