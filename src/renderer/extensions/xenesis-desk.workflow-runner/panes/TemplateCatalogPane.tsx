import React, { useMemo, useState } from 'react';
import {
  listCategories,
  listTemplates,
  searchTemplates,
  sortTemplateCatalogEntries,
  type TemplateCatalogEntry,
} from '../templateCatalog';
import { getPlaygroundTemplates } from './xconPlaygroundEnhancer';

function isFirstFiveMinuteTemplate(template: Pick<TemplateCatalogEntry, 'recommendedFor' | 'tags'>): boolean {
  return Boolean(template.recommendedFor?.includes('first-5-demo') || template.tags.includes('first-5-demo'));
}

export default function TemplateCatalogPane() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const builtinTemplates = useMemo(() => {
    const playground = getPlaygroundTemplates();
    return playground.map(
      (t) =>
        ({
          id: t.id,
          name: t.label,
          category: t.category,
          description: t.description ?? `${t.category} template`,
          tags: t.tags ?? [t.category],
          source: t.source,
          createdAt: Date.now(),
          demoRank: t.demoRank,
          recommendedFor: t.recommendedFor,
        }) as TemplateCatalogEntry,
    );
  }, []);

  const allTemplates = useMemo(() => {
    const catalogTemplates = query ? searchTemplates(query) : listTemplates(category === 'all' ? undefined : category);
    return sortTemplateCatalogEntries([...builtinTemplates, ...catalogTemplates]);
  }, [query, category, builtinTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(['all', ...builtinTemplates.map((t) => t.category), ...listCategories()]);
    return Array.from(cats);
  }, [builtinTemplates]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #333)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>XCON Template Catalog</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            placeholder="Search templates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--border, #444)',
              background: 'var(--bg3, #222)',
              color: 'var(--ink, #eee)',
              fontSize: 11,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setQuery('');
              }}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 600,
                background: category === c ? 'var(--accent, #2563eb)' : 'var(--bg3, #222)',
                color: category === c ? '#fff' : 'var(--ink-2, #aaa)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8,
          alignContent: 'start',
        }}
      >
        {allTemplates.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--ink-3, #666)' }}>
            No templates found.
          </div>
        ) : (
          allTemplates.map((t) => (
            <div
              key={t.id}
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border, #333)',
                background: 'var(--bg3, #1a1f2e)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{t.name}</div>
                {isFirstFiveMinuteTemplate(t) && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 5px',
                      borderRadius: 3,
                      background: 'rgba(6, 182, 212, 0.14)',
                      color: '#67e8f9',
                      border: '1px solid rgba(6, 182, 212, 0.35)',
                    }}
                  >
                    First 5 min
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-3, #888)', marginBottom: 6 }}>{t.description}</div>
              <span
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'var(--bg2, #222)',
                  color: 'var(--ink-2, #aaa)',
                }}
              >
                {t.category}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
