import React, { useEffect, useMemo, useState } from 'react'
import { ThemeContext, themeStorageKey, type ThemeMode, type ThemeContextValue } from './theme'

const getInitialTheme = (): ThemeMode => {
  const stored = window.localStorage.getItem(themeStorageKey)
  if (stored === 'dark' || stored === 'light') {
    return stored
  }
  return 'dark'
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
