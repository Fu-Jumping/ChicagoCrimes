import messages from './zh-CN.json'

interface MessageTree {
  [key: string]: string | MessageTree
}

const dictionary = messages as MessageTree

const getByPath = (path: string): string | MessageTree | undefined => {
  return path.split('.').reduce<string | MessageTree | undefined>((current, key) => {
    if (!current || typeof current === 'string') {
      return undefined
    }
    return current[key]
  }, dictionary)
}

export const t = (key: string, params?: Record<string, string | number>): string => {
  const value = getByPath(key)
  if (typeof value !== 'string') {
    return key
  }
  if (!params) {
    return value
  }
  return value.replace(/\{(\w+)\}/g, (_, token: string) => {
    const paramValue = params[token]
    if (paramValue === undefined || paramValue === null) {
      return ''
    }
    return String(paramValue)
  })
}
