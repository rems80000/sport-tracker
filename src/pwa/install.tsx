import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { InstallContext } from './installContext'
import type { BeforeInstallPromptEvent, InstallContextValue } from './installContext'

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

function runningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as NavigatorWithStandalone).standalone)
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(runningStandalone)
  const isAndroid = /Android/i.test(navigator.userAgent)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const value = useMemo<InstallContextValue>(() => ({
    canInstall: Boolean(promptEvent) && !installed,
    installed,
    isAndroid,
    install: async () => {
      if (!promptEvent) return 'unavailable'
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setPromptEvent(null)
      }
      return choice.outcome
    },
  }), [installed, isAndroid, promptEvent])

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>
}
