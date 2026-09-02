/** @jsxImportSource @opentui/solid */
import { createContext, createSignal, useContext } from "solid-js"

type PromptSubmitState = {
  submittedAt: number | null
  sessionID: string | null
}

type PromptSubmitContextType = {
  state: () => PromptSubmitState
  markSubmitted: (sessionID: string) => void
  clear: () => void
}

const PromptSubmitContext = createContext<PromptSubmitContextType | null>(null)

export function usePromptSubmit() {
  const ctx = useContext(PromptSubmitContext)
  if (!ctx) {
    // Return no-op defaults when provider is not present (e.g. home route)
    return {
      state: () => ({ submittedAt: null, sessionID: null }),
      markSubmitted: () => {},
      clear: () => {},
    }
  }
  return ctx
}

export function PromptSubmitProvider(props: { children: any }) {
  const [state, setState] = createSignal<PromptSubmitState>({
    submittedAt: null,
    sessionID: null,
  })

  const markSubmitted = (sessionID: string) => {
    setState({ submittedAt: Date.now(), sessionID })
  }

  const clear = () => {
    setState({ submittedAt: null, sessionID: null })
  }

  return (
    <PromptSubmitContext.Provider value={{ state, markSubmitted, clear }}>
      {props.children}
    </PromptSubmitContext.Provider>
  )
}

export function useIsPromptPending(sessionID: string) {
  const { state } = usePromptSubmit()
  return () => {
    const s = state()
    if (!s.submittedAt || s.sessionID !== sessionID) return false
    // Consider pending for 30 seconds max
    return Date.now() - s.submittedAt < 30000
  }
}
