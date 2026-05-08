import { createContext, useContext } from 'react'
import appConfig from './appConfig'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  return (
    <AppContext.Provider value={appConfig}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppConfig() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppConfig must be used within AppProvider')
  return ctx
}
