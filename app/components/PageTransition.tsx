'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Lottie, { type LottieRef } from 'lottie-react'
import loadingAnimation from '@/public/lottie/loading.json'

const VISIBLE_MS = 900

export default function PageTransition() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const lottieRef: LottieRef = useRef(null)

  // The animation was looping continuously even while hidden, competing with
  // the actual page swap for the main thread — pausing it the rest of the
  // time is what was causing the jerk during navigation.
  useEffect(() => {
    if (visible) {
      lottieRef.current?.goToAndPlay(0, true)
    } else {
      lottieRef.current?.stop()
    }
  }, [visible])

  // Show the curtain at full opacity the instant a same-origin link is
  // clicked — before Next.js even starts swapping the route. Waiting for
  // `pathname` to change instead means the new page has often already
  // painted underneath by the time we react to it.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest?.('a')
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      setVisible(true)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Covers the initial page load, and re-arms every time the route actually
  // finishes changing — holding the curtain at full opacity for a beat
  // before fading it away to reveal the new page.
  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'var(--black)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        // Snap to fully opaque instantly when showing — only the hide should fade.
        transition: visible ? 'none' : 'opacity 0.4s ease',
      }}
    >
      <div style={{ width: '180px', height: '180px' }}>
        <Lottie lottieRef={lottieRef} animationData={loadingAnimation} loop autoplay={false} />
      </div>
    </div>
  )
}
