import { createContext } from 'react'

export type ThemeMode = 'dark' | 'light'

export interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
}

export const themeStorageKey = 'ccv.theme.mode'

export const ThemeContext = createContext<ThemeContextValue | null>(null)
