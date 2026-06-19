'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

function AnimatedNumber({ target, suffix = '' }: { target: number, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1500
          const steps = 60
          const increment = target / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= target) {
              setCount(target)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref} style={{
      fontFamily: 'var(--font-cinzel)',
      fontSize: '2.5rem',
      color: 'var(--offwhite)',
      minWidth: '80px',
      textAlign: 'center',
    }}>
      {count}{suffix}
    </div>
  )
}

function InfinityNumber() {
  const [display, setDisplay] = useState('0')
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1500
          const steps = 60
          let current = 0
          const timer = setInterval(() => {
            current += 1
            setDisplay(String(current * 17))
            if (current >= steps) {
              clearInterval(timer)
              setDisplay('∞')
            }
          }, duration / steps)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      fontFamily: 'var(--font-cinzel)',
      fontSize: '2.5rem',
      color: 'var(--offwhite)',
      minWidth: '80px',
      textAlign: 'center',
    }}>
      {display}
    </div>
  )
}

export default function About() {
  return (
    <section id="about" style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '6rem 3rem',
    }}>

      {/* Top grid — image + text */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '5rem',
        alignItems: 'center',
        marginBottom: '4rem',
      }}>

        {/* Left — Image */}
        <div style={{
          position: 'relative',
          height: '450px',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Image
            src="/images/BG-img1.webp"
            alt="Onboard interior"
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>

        {/* Right — Text */}
        <div>
          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-inter)',
          }}>
            Who We Are
          </p>

          <h2 style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: '2.5rem',
            color: 'var(--offwhite)',
            lineHeight: 1.2,
            marginBottom: '1.5rem',
          }}>
            More than a café.<br />A place to play.
          </h2>

          <div style={{
            width: '60px', height: '2px',
            backgroundColor: 'var(--teal)',
            marginBottom: '2rem',
          }} />

          <p style={{
            color: 'rgba(245,242,236,0.55)',
            lineHeight: 1.9,
            marginBottom: '2.5rem',
            fontFamily: 'var(--font-inter)',
          }}>
            Onboard was born from a simple belief: the best moments happen around
            a table. We're a restaurant, a social hub, and home to Lebanon's biggest
            board game library — all under one roof. Three locations, one community.
          </p>

          <Link href="/about" style={{
            display: 'inline-block',
            backgroundColor: 'var(--teal)',
            color: '#fff',
            padding: '0.85rem 2.5rem',
            borderRadius: '2px',
            fontSize: '0.78rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
          }}>
            Our Story
          </Link>
        </div>
      </div>

      {/* Full width stats bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        backgroundColor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--black)',
        }}>
          <AnimatedNumber target={500} suffix="+" />
          <div style={{
            fontSize: '0.68rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.4)',
            marginTop: '0.5rem',
            fontFamily: 'var(--font-inter)',
          }}>Games in Library</div>
        </div>

        <div style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--black)',
        }}>
          <AnimatedNumber target={3} />
          <div style={{
            fontSize: '0.68rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.4)',
            marginTop: '0.5rem',
            fontFamily: 'var(--font-inter)',
          }}>Branches</div>
        </div>

        <div style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--black)',
        }}>
          <InfinityNumber />
          <div style={{
            fontSize: '0.68rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(245,242,236,0.4)',
            marginTop: '0.5rem',
            fontFamily: 'var(--font-inter)',
          }}>Good Times</div>
        </div>
      </div>

    </section>
  )
}