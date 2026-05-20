import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {message}</span>
    </div>
  )
}
