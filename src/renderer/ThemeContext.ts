import { createContext, useContext } from 'react';
import type { ThemeName } from '../shared/types';

export const ThemeContext = createContext<ThemeName>('dark');

export function useAppTheme(): ThemeName {
  return useContext(ThemeContext);
}
