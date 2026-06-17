'use client'

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
      fontSize: '2rem',
      color: 'var(--offwhite)',
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
      fontSize: '2rem',
      color: 'var(--offwhite)',
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '5rem',
        alignItems: 'center',
      }}>

        {/* Left — Text */}
        <div>
          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            marginBottom: '1rem',
          }}>
            Our Story
          </p>

          <h2 style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: '2.8rem',
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
            marginBottom: '1.2rem',
            fontFamily: 'var(--font-inter)',
          }}>
            Onboard was born from a simple belief: the best moments happen around
            a table. Whether you're plotting world domination in a strategy game,
            laughing through a party classic, or discovering a hidden gem for the
            first time — we're here to make it happen.
          </p>

          <p style={{
            color: 'rgba(245,242,236,0.55)',
            lineHeight: 1.9,
            marginBottom: '3rem',
            fontFamily: 'var(--font-inter)',
          }}>
            We're a restaurant, a social hub, and home to Lebanon's biggest board
            game library — all under one roof. Three locations, one community.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '3rem' }}>
            <div style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '1rem' }}>
              <AnimatedNumber target={500} suffix="+" />
              <div style={{
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(245,242,236,0.4)',
                marginTop: '0.3rem',
                fontFamily: 'var(--font-inter)',
              }}>Games in library</div>
            </div>

            <div style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '1rem' }}>
              <AnimatedNumber target={3} />
              <div style={{
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(245,242,236,0.4)',
                marginTop: '0.3rem',
                fontFamily: 'var(--font-inter)',
              }}>Branches</div>
            </div>

            <div style={{ borderLeft: '2px solid var(--teal)', paddingLeft: '1rem' }}>
              <InfinityNumber />
              <div style={{
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(245,242,236,0.4)',
                marginTop: '0.3rem',
                fontFamily: 'var(--font-inter)',
              }}>Good times</div>
            </div>
          </div>
        </div>

        {/* Right — Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}>
          {[
            { icon: '/images/icon-2.png', title: 'Biggest Library',  text: 'Over 500 board games spanning every genre, age, and playstyle.', accent: true },
            { icon: '/images/icon-1.png', title: 'Full Restaurant',  text: 'Real food, real drinks, made for long sessions and great company.' },
            { icon: '/images/icon-3.png', title: 'Game Masters',     text: 'Our team helps you pick the perfect game and teaches you the rules.' },
            { icon: '/images/icon-4.png', title: 'Tournaments',      text: 'Regular events, championships, and community nights all year round.' },
          ].map(({ icon, title, text, accent }) => (
            <div key={title} style={{
              background: accent ? 'rgba(0,160,152,0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${accent ? 'rgba(0,160,152,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '4px',
              padding: '1.8rem 1.5rem',
            }}>
              <Image
                src={icon}
                alt={title}
                width={48}
                height={48}
                style={{
                  marginBottom: '0.8rem',
                  mixBlendMode: 'screen',
                  width: '48px',
                  height: '48px',
                }}
              />
              <h3 style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '0.95rem',
                color: 'var(--offwhite)',
                marginBottom: '0.6rem',
              }}>{title}</h3>
              <p style={{
                fontSize: '0.82rem',
                color: 'rgba(245,242,236,0.45)',
                lineHeight: 1.7,
                fontFamily: 'var(--font-inter)',
              }}>{text}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}