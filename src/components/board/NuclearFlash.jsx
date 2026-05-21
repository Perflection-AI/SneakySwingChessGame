import { useEffect, useRef } from 'react'

export default function NuclearFlash({ nuclearPhase, dispatch }) {
  const dispatchedRef = useRef('idle')

  useEffect(() => {
    if (nuclearPhase === 'flash' && dispatchedRef.current !== 'flash') {
      dispatchedRef.current = 'flash'
      const t = setTimeout(() => {
        dispatch({ type: 'NUCLEAR_FLASH_COMPLETE' })
      }, 800)
      return () => clearTimeout(t)
    }
    if (nuclearPhase === 'reset' && dispatchedRef.current !== 'reset') {
      dispatchedRef.current = 'reset'
      const t = setTimeout(() => {
        dispatch({ type: 'NUCLEAR_RESET_COMPLETE' })
        dispatchedRef.current = 'idle'
      }, 700)
      return () => clearTimeout(t)
    }
  }, [nuclearPhase, dispatch])

  if (nuclearPhase !== 'flash') return null

  return <div className="nuclear-flash" />
}
