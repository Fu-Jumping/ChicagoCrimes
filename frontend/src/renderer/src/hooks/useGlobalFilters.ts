import { useContext } from 'react'
import {
  GlobalFiltersContext,
  type GlobalFiltersContextValue
} from '../contexts/globalFiltersState'

export const useGlobalFilters = (): GlobalFiltersContextValue => {
  const context = useContext(GlobalFiltersContext)
  if (!context) {
    throw new Error('useGlobalFilters must be used within GlobalFiltersProvider')
  }
  return context
}
