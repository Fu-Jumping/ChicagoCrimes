import { createContext } from 'react'

export interface GlobalFilters {
  year: number | number[] | null
  month: number | number[] | null
  primaryType: string | string[] | null
  startDate: string | null
  endDate: string | null
  district: number | number[] | null
  beat: string | string[] | null
  ward: number | number[] | null
  communityArea: number | number[] | null
  arrest: boolean | boolean[] | null
  domestic: boolean | boolean[] | null
}

export interface GlobalFiltersContextValue {
  filters: GlobalFilters
  setYear: (year: number | number[] | null) => void
  setMonth: (month: number | number[] | null) => void
  setPrimaryType: (primaryType: string | string[] | null) => void
  setDateRange: (startDate: string | null, endDate: string | null) => void
  setDistrict: (district: number | number[] | null) => void
  setBeat: (beat: string | string[] | null) => void
  setWard: (ward: number | number[] | null) => void
  setCommunityArea: (communityArea: number | number[] | null) => void
  setArrest: (arrest: boolean | boolean[] | null) => void
  setDomestic: (domestic: boolean | boolean[] | null) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  isMultiSelect: boolean
  setIsMultiSelect: (isMultiSelect: boolean) => void
}

export const GlobalFiltersContext = createContext<GlobalFiltersContextValue | undefined>(undefined)
