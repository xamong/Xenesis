import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback, useMemo, useState } from 'react';
import type { MetaManagementProvider } from './metaManagementProvider';

export interface MetaQueryResult {
  columns: string[];
  rows: unknown[][];
}

export interface MetaSampleQuery {
  cat: string;
  name: string;
  q: string;
}

export interface UseMetaManagementQueryArgs {
  providerRef: MutableRefObject<MetaManagementProvider>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  showMsg: (msg: string, ok?: boolean) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export interface UseMetaManagementQueryResult {
  query: string;
  queryResult: MetaQueryResult | null;
  queryError: string | null;
  showQuery: boolean;
  showSampleMenu: boolean;
  sampleQueries: MetaSampleQuery[];
  setQuery: Dispatch<SetStateAction<string>>;
  setQueryResult: Dispatch<SetStateAction<MetaQueryResult | null>>;
  setQueryError: Dispatch<SetStateAction<string | null>>;
  setShowQuery: Dispatch<SetStateAction<boolean>>;
  setShowSampleMenu: Dispatch<SetStateAction<boolean>>;
  clearQuery: () => void;
  executeQuery: () => Promise<void>;
}

export function useMetaManagementQuery({
  providerRef,
  setIsLoading,
  showMsg,
  t,
}: UseMetaManagementQueryArgs): UseMetaManagementQueryResult {
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<MetaQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [showQuery, setShowQuery] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);

  const sampleQueries = useMemo<MetaSampleQuery[]>(
    () => [
      {
        cat: t('meta.sampleCatDefault'),
        name: t('meta.sampleQueryAllRows'),
        q: "SELECT * FROM TB_CODE_INFO_NEW WHERE DEL_YN='N' LIMIT 50",
      },
      {
        cat: t('meta.sampleCatDefault'),
        name: t('meta.sampleQueryGroups'),
        q: "SELECT * FROM TB_CODE_INFO_NEW WHERE TYPE='GROUP' AND DEL_YN='N'",
      },
      {
        cat: t('meta.sampleCatDefault'),
        name: t('meta.sampleQueryTables'),
        q: "SELECT name FROM sqlite_master WHERE type='table'",
      },
      {
        cat: t('meta.sampleCatMeta'),
        name: t('meta.sampleQueryMetabase'),
        q: "SELECT * FROM TB_CODE_INFO_NEW WHERE PID=0 AND DEL_YN='N'",
      },
      {
        cat: t('meta.sampleCatMeta'),
        name: t('meta.sampleQueryCodeMgmt'),
        q: "SELECT * FROM TB_CODE_INFO_NEW WHERE PCODE='CodeMgmt' AND DEL_YN='N' ORDER BY FORMORDER",
      },
      {
        cat: t('meta.sampleCatMeta'),
        name: t('meta.sampleQueryTypeStats'),
        q: "SELECT TYPE, COUNT(*) as CNT FROM TB_CODE_INFO_NEW WHERE DEL_YN='N' GROUP BY TYPE",
      },
    ],
    [t],
  );

  const clearQuery = useCallback(() => {
    setQuery('');
    setQueryResult(null);
    setQueryError(null);
  }, []);

  const executeQuery = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const result = await providerRef.current.runQuery(query);
      if (result?.type === 'SELECT') {
        const rows: Record<string, unknown>[] = Array.isArray(result.rows) ? result.rows : [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        setQueryResult({ columns, rows: rows.map((row) => columns.map((col) => row[col])) });
        showMsg(t('meta.rowsReturned', { n: String(result.rowCount ?? rows.length) }));
      } else {
        const msg =
          result?.changes !== undefined
            ? t('meta.rowsChanged', { n: String(result.changes), detail: result.type ?? '' })
            : (result?.message ?? t('meta.runComplete'));
        setQueryResult({ columns: [t('query.resultCol')], rows: [[msg]] });
        showMsg(msg);
      }
    } catch (error) {
      setQueryError(error instanceof Error ? error.message : t('meta.runError'));
    } finally {
      setIsLoading(false);
    }
  }, [providerRef, query, setIsLoading, showMsg, t]);

  return {
    query,
    queryResult,
    queryError,
    showQuery,
    showSampleMenu,
    sampleQueries,
    setQuery,
    setQueryResult,
    setQueryError,
    setShowQuery,
    setShowSampleMenu,
    clearQuery,
    executeQuery,
  };
}
