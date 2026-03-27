import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from '../contexts/theme'

export const useThemeMode = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider')
  }
  return context
}
