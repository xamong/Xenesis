import type { UseMetaManagementQueryResult } from '../useMetaManagementQuery';

export interface MetaManagementQueryPanelProps {
  queryTools: UseMetaManagementQueryResult;
  isLoading: boolean;
  t: (key: string, values?: Record<string, string>) => string;
}

export function MetaManagementQueryPanel({ queryTools, isLoading, t }: MetaManagementQueryPanelProps) {
  const sampleCats = [t('meta.sampleCatDefault'), t('meta.sampleCatMeta')];

  return (
    <div className="mm-query-section" style={{ flexShrink: 0, borderBottom: '1px solid #3a4556' }}>
      <div className="mm-query-toggle" onClick={() => queryTools.setShowQuery((value) => !value)}>
        <span style={{ marginRight: 6 }}>{t('meta.sqlQuery')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
          {queryTools.showQuery ? t('meta.queryHide') : t('meta.queryShow')}
        </span>
      </div>
      {queryTools.showQuery && (
        <div className="mm-query-body">
          <div className="mm-query-row">
            <textarea
              className="mm-query-textarea"
              value={queryTools.query}
              onChange={(event) => queryTools.setQuery(event.target.value)}
              placeholder={t('meta.sqlPlaceholder')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  queryTools.executeQuery();
                }
              }}
            />
            <div className="mm-query-actions">
              <button
                className="mm-btn primary"
                onClick={queryTools.executeQuery}
                disabled={isLoading || !queryTools.query.trim()}
              >
                {t('meta.runQuery')}
              </button>
              <button className="mm-btn" onClick={queryTools.clearQuery}>
                {t('meta.clearQuery')}
              </button>
              <div style={{ position: 'relative' }}>
                <button className="mm-btn" onClick={() => queryTools.setShowSampleMenu((value) => !value)}>
                  {t('meta.sampleQuery')}
                </button>
                {queryTools.showSampleMenu && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      onClick={() => queryTools.setShowSampleMenu(false)}
                    />
                    <div className="mm-sample-menu">
                      {sampleCats.map((cat) => (
                        <div key={cat}>
                          <div className="mm-sample-cat">{cat}</div>
                          {queryTools.sampleQueries
                            .filter((sample) => sample.cat === cat)
                            .map((sample, index) => (
                              <button
                                key={`${sample.name}-${index}`}
                                className="mm-sample-item"
                                onClick={() => {
                                  queryTools.setQuery(sample.q);
                                  queryTools.setShowSampleMenu(false);
                                }}
                              >
                                <div className="mm-sample-name">{sample.name}</div>
                                <div className="mm-sample-preview">{sample.q}</div>
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mm-query-hint">{t('meta.ctrlEnterHint')}</div>
          {queryTools.queryError && (
            <div className="mm-query-error">
              {t('meta.queryError')} {queryTools.queryError}
            </div>
          )}
          {queryTools.queryResult && (
            <div className="mm-query-result">
              <div className="mm-grid-table-wrap">
                <table className="mm-grid-table">
                  <thead>
                    <tr>
                      {queryTools.queryResult.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryTools.queryResult.rows.length === 0 ? (
                      <tr>
                        <td colSpan={queryTools.queryResult.columns.length} className="mm-grid-empty">
                          {t('meta.noResults')}
                        </td>
                      </tr>
                    ) : (
                      queryTools.queryResult.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{String(cell ?? '')}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
