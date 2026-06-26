import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Locale = string;

export interface LocaleOption {
  locale: Locale;
  label: string;
}

interface LocaleDefinition extends LocaleOption {
  messages: Record<string, unknown>;
}

interface LocaleModule {
  locale?: string;
  label?: string;
  messages?: Record<string, unknown>;
  default?: {
    locale?: string;
    label?: string;
    messages?: Record<string, unknown>;
  };
}

const LOCALE_STORAGE_KEY = 'xamongcode-locale';

const localeModules = import.meta.glob<LocaleModule>('./*.ts', { eager: true });

function localeFromPath(modulePath: string): string {
  return modulePath.split('/').pop()?.replace(/\.ts$/, '') ?? modulePath;
}

function normalizeLocaleModule(modulePath: string, module: LocaleModule): LocaleDefinition | null {
  const fallbackLocale = localeFromPath(modulePath);
  const locale = module.locale ?? module.default?.locale ?? fallbackLocale;
  const label = module.label ?? module.default?.label ?? locale;
  const messages = module.messages ?? module.default?.messages;

  if (!messages) return null;
  return { locale, label, messages };
}

const localeDefinitions = Object.entries(localeModules)
  .map(([modulePath, module]) => normalizeLocaleModule(modulePath, module))
  .filter((definition): definition is LocaleDefinition => definition != null)
  .sort((a, b) => a.locale.localeCompare(b.locale));

const translations: Record<Locale, Record<string, unknown>> = Object.fromEntries(
  localeDefinitions.map((definition) => [definition.locale, definition.messages]),
);

const DEFAULT_LOCALE: Locale = Object.hasOwn(translations, 'ko') ? 'ko' : (localeDefinitions[0]?.locale ?? 'ko');

export const availableLocales: LocaleOption[] = localeDefinitions.map(({ locale, label }) => ({
  locale,
  label,
}));

function normalizeLocale(locale: string | null | undefined): Locale {
  return locale && Object.hasOwn(translations, locale) ? locale : DEFAULT_LOCALE;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: LocaleOption[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  availableLocales,
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return normalizeLocale(stored);
  });

  const setLocale = useCallback((newLocale: Locale) => {
    const normalized = normalizeLocale(newLocale);
    setLocaleState(normalized);
    localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const value = getNestedValue(translations[locale] ?? {}, key);
      if (value !== undefined) return interpolate(value, vars);
      const fallback = getNestedValue(translations[DEFAULT_LOCALE] ?? {}, key);
      if (fallback !== undefined) return interpolate(fallback, vars);
      return key;
    },
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, availableLocales, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
