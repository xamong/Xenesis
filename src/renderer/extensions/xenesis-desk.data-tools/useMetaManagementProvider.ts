import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect, useRef, useState } from 'react';
import {
  createHttpMetaManagementProvider,
  DEFAULT_META_API_URL,
  type MetaManagementProvider,
} from './metaManagementProvider';

export interface UseMetaManagementProviderResult {
  apiUrl: string;
  providerRef: MutableRefObject<MetaManagementProvider>;
  connected: boolean | null;
  setConnected: Dispatch<SetStateAction<boolean | null>>;
}

export function useMetaManagementProvider(): UseMetaManagementProviderResult {
  const [apiUrl, setApiUrl] = useState(DEFAULT_META_API_URL);
  const providerRef = useRef(createHttpMetaManagementProvider(DEFAULT_META_API_URL));
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    window.terminalAPI
      .getSettings()
      .then((settings) => {
        const url = settings.apiUrl || DEFAULT_META_API_URL;
        setApiUrl(url);
        providerRef.current = createHttpMetaManagementProvider(url);
      })
      .catch(() => {});

    const onChanged = (event: Event) => {
      const newUrl = (event as CustomEvent).detail?.apiUrl;
      if (newUrl !== undefined) {
        const url = newUrl || DEFAULT_META_API_URL;
        setApiUrl(url);
        providerRef.current = createHttpMetaManagementProvider(url);
        setConnected(null);
      }
    };

    window.addEventListener('app-settings-changed', onChanged);
    return () => window.removeEventListener('app-settings-changed', onChanged);
  }, []);

  return { apiUrl, providerRef, connected, setConnected };
}
