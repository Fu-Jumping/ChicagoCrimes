import { createContext } from 'react'

export interface GlobalFilters {
  year: number | null
  month: number | null
  primaryType: string | null
  startDate: string | null
  endDate: string | null
  district: number | null
  beat: string | null
  ward: number | null
  communityArea: number | null
  arrest: boolean | null
  domestic: boolean | null
}

export interface GlobalFiltersContextValue {
  filters: GlobalFilters
  setYear: (year: number | null) => void
  setMonth: (month: number | null) => void
  setPrimaryType: (primaryType: string | null) => void
  setDateRange: (startDate: string | null, endDate: string | null) => void
  setDistrict: (district: number | null) => void
  setBeat: (beat: string | null) => void
  setWard: (ward: number | null) => void
  setCommunityArea: (communityArea: number | null) => void
  setArrest: (arrest: boolean | null) => void
  setDomestic: (domestic: boolean | null) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

export const GlobalFiltersContext = createContext<GlobalFiltersContextValue | undefined>(undefined)
