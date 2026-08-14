import { createContext, useContext } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface InstallContextValue {
  canInstall: boolean
  installed: boolean
  isAndroid: boolean
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

export const InstallContext = createContext<InstallContextValue | null>(null)

export function useInstallApp() {
  const context = useContext(InstallContext)
  if (!context) throw new Error('useInstallApp doit être utilisé dans InstallProvider')
  return context
}
