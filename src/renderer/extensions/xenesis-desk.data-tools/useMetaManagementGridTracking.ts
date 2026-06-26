import { type MutableRefObject, useCallback, useRef } from 'react';
import {
  createEmptyMetaGridChanges,
  createEmptyMetaGridDeletes,
  type MetaGridChanges,
  type MetaGridDeletes,
} from './useMetaManagementData';

export interface UseMetaManagementGridTrackingResult {
  changed: MutableRefObject<MetaGridChanges>;
  deleted: MutableRefObject<MetaGridDeletes>;
  resetGridTracking: () => void;
}

export function useMetaManagementGridTracking(): UseMetaManagementGridTrackingResult {
  const changed = useRef<MetaGridChanges>(createEmptyMetaGridChanges());
  const deleted = useRef<MetaGridDeletes>(createEmptyMetaGridDeletes());

  const resetGridTracking = useCallback(() => {
    changed.current = createEmptyMetaGridChanges();
    deleted.current = createEmptyMetaGridDeletes();
  }, []);

  return { changed, deleted, resetGridTracking };
}
