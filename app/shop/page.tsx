'use client'

import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Skeleton from '../components/Skeleton'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faClock, faCakeCandles, faSearch, faSliders, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { totalStock } from '../lib/branches'

interface Game {
  id: string
  name: string
  category: string
  description: string
  players: string
  duration: string
  age: string
  stock: Record<string, number>
  price: number
  image: string
}

function truncate(text: string, words: number) {
  const arr = text.split(' ')
  return arr.length > words ? arr.slice(0, words).join(' ') + '…' : text
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

function FilterSection({
  title, icon, collapsed, onToggle, children, maxHeight = '500px',
}: {
  title: string
  icon?: IconDefinition
  collapsed: boolean
  onToggle: () => void
  children: React.ReactNode
  maxHeight?: string
}) {
  return (
    <div>
      <button onClick={onToggle} style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 0 0.8rem',
        marginBottom: collapsed ? '0' : '0.8rem',
        cursor: 'pointer',
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(245,242,236,0.3)',
          fontFamily: 'var(--font-inter)',
        }}>
          {icon && <FontAwesomeIcon icon={icon} style={{ width: '12px' }} />}
          {title}
        </span>
        <span style={{
          color: 'var(--purple)',
          fontSize: '0.6rem',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        }}>▼</span>
      </button>
      <div style={{
        maxHeight: collapsed ? '0' : maxHeight,
        overflow: 'hidden',
        transition: 'max-height 0.4s ease',
      }}>
        {children}
      </div>
    </div>
  )
}

export default function ShopPage() {
  const [games, setGames]               = useState<Game[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('All')
  const [search, setSearch]             = useState('')
  const [maxPrice, setMaxPrice]         = useState<number | null>(null)
  const [sliderMax, setSliderMax]       = useState<number>(200)
  const [hoveredId, setHoveredId]       = useState<string | null>(null)
  const [dbCategories, setDbCategories] = useState<string[]>([])
  const [minPlayers, setMinPlayers] = useState<number>(1)
  const [maxPlayers, setMaxPlayers] = useState<number>(10)
  const isMobile = useIsMobile()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [collapsedFilters, setCollapsedFilters] = useState<Record<string, boolean>>({
    search: true,
    category: true,
    price: true,
    players: true,
  })

  function toggleFilter(key: string) {
    setCollapsedFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    async function load() {
      const [gamesSnap, catSnap] = await Promise.all([
        getDocs(collection(db, 'games')),
        getDocs(collection(db, 'gameCategories')),
      ])

      const loadedGames = gamesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Game))
      const cats        = catSnap.docs.map(d => (d.data() as any).name as string)

      const highestPrice = loadedGames.length > 0
        ? Math.max(...loadedGames.map(g => g.price ?? 0))
        : 200

      setGames(loadedGames)
      setDbCategories(cats)
      setSliderMax(highestPrice)
      setMaxPrice(highestPrice)
      setLoading(false)
    }
    load()
  }, [])

  const CATEGORIES = useMemo(() => {
    const cats = dbCategories.length > 0
      ? dbCategories
      : ['Strategy', 'Party', 'Family', 'Cooperative', 'Card', 'Trivia', 'RPG', 'Puzzle']
    return ['All', ...cats]
  }, [dbCategories])

  const filtered = useMemo(() => {
    return games.filter(g => {
      const matchCat    = filter === 'All' || g.category === filter
      const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.category.toLowerCase().includes(search.toLowerCase())
      const matchPrice  = maxPrice === null || (g.price ?? 0) <= maxPrice

      // Parse players range e.g. "2-4" or "2–4"
      const playersStr  = g.players ?? ''
      const nums        = playersStr.match(/\d+/g)?.map(Number) ?? []
      const gameMin     = nums[0] ?? 1
      const gameMax     = nums[1] ?? gameMin
      const matchPlayers = gameMax >= minPlayers && gameMin <= maxPlayers

      return matchCat && matchSearch && matchPrice && matchPlayers
    })
  }, [games, filter, search, maxPrice, minPlayers, maxPlayers])

  function reset() {
    setSearch('')
    setFilter('All')
    setMaxPrice(sliderMax)
    setMinPlayers(1)
    setMaxPlayers(10)
  }

  const filterFields = (
    <>
      {/* Search */}
      <FilterSection title="Search" icon={faSearch} maxHeight="100px"
        collapsed={collapsedFilters.search} onToggle={() => toggleFilter('search')}>
        <div style={{ position: 'relative' }}>
          <FontAwesomeIcon icon={faSearch} style={{
            position: 'absolute',
            left: '0.9rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '13px',
            color: 'rgba(245,242,236,0.3)',
            pointerEvents: 'none',
          }} />
          <input
            type="search"
            placeholder="Search games…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--offwhite)',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              outline: 'none',
              fontFamily: 'var(--font-inter)',
            }}
          />
        </div>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Category" icon={faSliders} maxHeight="320px"
        collapsed={collapsedFilters.category} onToggle={() => toggleFilter('category')}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          maxHeight: '260px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          padding: '0.6rem',
          borderRadius: '8px',
          background: 'rgba(106,106,183,0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(106,106,183,0.25)',
        }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              borderLeft: `2px solid ${filter === cat ? 'var(--purple)' : 'transparent'}`,
              color: filter === cat ? 'var(--offwhite)' : 'rgba(245,242,236,0.55)',
              padding: '0.5rem 0.8rem',
              fontSize: '0.82rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              textAlign: 'left',
              transition: 'all 0.2s',
              borderRadius: '0 4px 4px 0',
              background: filter === cat ? 'rgba(106,106,183,0.25)' : 'transparent',
              flexShrink: 0,
            }}>{cat}</button>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Max Price" maxHeight="200px"
        collapsed={collapsedFilters.price} onToggle={() => toggleFilter('price')}>
        <p style={{
          fontFamily: 'var(--font-cinzel)',
          fontSize: '1.5rem',
          color: 'var(--purple)',
          marginBottom: '1rem',
        }}>${maxPrice ?? sliderMax}</p>
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={maxPrice ?? sliderMax}
          onChange={e => setMaxPrice(+e.target.value)}
          style={{
            width: '100%',
            accentColor: 'var(--purple)',
            cursor: 'pointer',
            height: '4px',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.4rem',
          fontSize: '0.68rem',
          color: 'rgba(245,242,236,0.25)',
          fontFamily: 'var(--font-inter)',
        }}>
          <span>$0</span>
          <span>${sliderMax}</span>
        </div>
      </FilterSection>

      {/* Players Filter */}
      <FilterSection title="Number of Players" maxHeight="380px"
        collapsed={collapsedFilters.players} onToggle={() => toggleFilter('players')}>
        <p style={{
          fontFamily: 'var(--font-cinzel)',
          fontSize: '1.2rem',
          color: 'var(--purple)',
          marginBottom: '1rem',
        }}>
          {minPlayers === maxPlayers ? `${minPlayers} players` : `${minPlayers}–${maxPlayers} players`}
        </p>

        {/* Min Players */}
        <div style={{ marginBottom: '0.8rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.65rem',
            color: 'rgba(245,242,236,0.25)',
            fontFamily: 'var(--font-inter)',
            marginBottom: '0.3rem',
          }}>
            <span>Min players</span>
            <span>{minPlayers}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={minPlayers}
            onChange={e => {
              const val = +e.target.value
              setMinPlayers(val)
              if (val > maxPlayers) setMaxPlayers(val)
            }}
            style={{
              width: '100%',
              accentColor: 'var(--purple)',
              cursor: 'pointer',
              height: '4px',
            }}
          />
        </div>

        {/* Max Players */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.65rem',
            color: 'rgba(245,242,236,0.25)',
            fontFamily: 'var(--font-inter)',
            marginBottom: '0.3rem',
          }}>
            <span>Max players</span>
            <span>{maxPlayers}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={maxPlayers}
            onChange={e => {
              const val = +e.target.value
              setMaxPlayers(val)
              if (val < minPlayers) setMinPlayers(val)
            }}
            style={{
              width: '100%',
              accentColor: 'var(--purple)',
              cursor: 'pointer',
              height: '4px',
            }}
          />
        </div>

        {/* Quick select */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
          marginTop: '0.8rem',
        }}>
          {[
            { label: 'Solo',    min: 1, max: 1 },
            { label: '2',       min: 2, max: 2 },
            { label: '2–4',     min: 2, max: 4 },
            { label: '4+',      min: 4, max: 10 },
            { label: 'Any',     min: 1, max: 10 },
          ].map(({ label, min, max }) => (
            <button
              key={label}
              onClick={() => { setMinPlayers(min); setMaxPlayers(max) }}
              style={{
                backgroundColor: minPlayers === min && maxPlayers === max
                  ? 'var(--purple)'
                  : 'transparent',
                border: `1px solid ${minPlayers === min && maxPlayers === max
                  ? 'var(--purple)'
                  : 'rgba(255,255,255,0.1)'}`,
                color: minPlayers === min && maxPlayers === max
                  ? '#fff'
                  : 'rgba(245,242,236,0.4)',
                padding: '0.3rem 0.6rem',
                borderRadius: '2px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
                transition: 'all 0.2s',
              }}
            >{label}</button>
          ))}
        </div>
      </FilterSection>

      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />

      {/* Results + Reset */}
      <div>
        <p style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '0.78rem',
          color: 'rgba(245,242,236,0.35)',
          marginBottom: '0.8rem',
        }}>
          <span style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-cinzel)' }}>{filtered.length}</span> of {games.length} games
        </p>
        <button onClick={reset} style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(245,242,236,0.4)',
          padding: '0.6rem',
          borderRadius: '4px',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter)',
        }}>
          <FontAwesomeIcon icon={faXmark} style={{ width: '12px' }} />
          Reset Filters
        </button>

        {isMobile && (
          <button onClick={() => setFiltersOpen(false)} style={{
            width: '100%',
            marginTop: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'var(--purple)',
            border: 'none',
            color: '#fff',
            padding: '0.8rem',
            borderRadius: '4px',
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
          }}>
            <FontAwesomeIcon icon={faSearch} style={{ width: '12px' }} />
            Search ({filtered.length})
          </button>
        )}
      </div>
    </>
  )

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: '55vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)' }} />
          <div style={{ position: 'relative', zIndex: 1, paddingTop: '4rem' }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--purple)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Board Game Library</p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>
              Buy a Game,<br />Take it Home
            </h1>
          </div>
        </section>

        {/* Main content */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: isMobile ? '2.5rem 1.25rem' : '5rem 3rem',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '260px 1fr',
          gap: isMobile ? '1.5rem' : '3rem',
          alignItems: 'start',
        }}>

          {/* LEFT SIDEBAR — desktop only, always visible */}
          {!isMobile && (
            <div style={{
              position: 'sticky',
              top: '90px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
            }}>
              {filterFields}
            </div>
          )}

          {/* Mobile filter tab — fixed, vertically centered on the left edge */}
          {isMobile && !filtersOpen && (
            <button onClick={() => setFiltersOpen(true)} style={{
              position: 'fixed',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--purple)',
              border: 'none',
              color: '#fff',
              padding: '1rem 0.6rem',
              borderRadius: '0 6px 6px 0',
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              boxShadow: '4px 0 12px rgba(0,0,0,0.4)',
            }}>
              <FontAwesomeIcon icon={faSliders} style={{ width: '13px' }} />
              Filters
            </button>
          )}

          {/* Mobile filter panel — slides in from the left, covers half the page */}
          {isMobile && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '50%',
              backgroundColor: 'var(--black)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '8px 0 24px rgba(0,0,0,0.6)',
              zIndex: 60,
              overflowY: 'auto',
              padding: '6rem 1.25rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
              transform: filtersOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease',
            }}>
              {filterFields}
            </div>
          )}

          {/* RIGHT — Games Grid */}
          <div>
            {loading ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: isMobile ? '0.75rem' : '1.5rem',
              }}>
                {Array.from({ length: isMobile ? 4 : 6 }).map((_, i) => (
                  <div key={i} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <Skeleton height={isMobile ? '120px' : '200px'} borderRadius="0" />
                    <div style={{ padding: isMobile ? '0.8rem' : '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <Skeleton width="70%" height="1rem" />
                      <Skeleton width="45%" height="0.8rem" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '5rem',
                color: 'rgba(245,242,236,0.2)',
                fontFamily: 'var(--font-inter)',
              }}>
                <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No games found</p>
                <p style={{ fontSize: '0.82rem' }}>Try adjusting your filters</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: isMobile ? '0.75rem' : '1.5rem',
              }}>
                {filtered.map(game => {
                  const stock       = totalStock(game.stock)
                  const outOfStock  = stock === 0
                  const hovered     = hoveredId === game.id
                  return (
                    <Link key={game.id} href={`/shop/${game.id}`}
                      onMouseEnter={() => setHoveredId(game.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${hovered && !outOfStock ? 'rgba(106,106,183,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        opacity: outOfStock ? 0.6 : 1,
                        transition: 'border-color 0.2s, opacity 0.2s',
                        position: 'relative',
                      }}>

                      {/* Out of stock banner */}
                      {outOfStock && (
                        <div style={{
                          position: 'absolute',
                          top: '1rem', left: 0, right: 0,
                          textAlign: 'center',
                          zIndex: 2,
                        }}>
                          <span style={{
                            backgroundColor: 'rgba(228,51,41,0.9)',
                            color: '#fff',
                            padding: '0.3rem 1rem',
                            fontSize: '0.65rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-inter)',
                            borderRadius: '2px',
                          }}>Out of Stock</span>
                        </div>
                      )}

                      {/* Image */}
                      <div style={{
                        backgroundColor: '#fff',
                        padding: isMobile ? '0.6rem' : '1rem',
                        height: isMobile ? '120px' : '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        <img
                          src={game.image || 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400&q=80'}
                          alt={game.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            filter: outOfStock ? 'grayscale(60%)' : 'none',
                            transform: hovered && !outOfStock ? 'scale(1.08)' : 'scale(1)',
                            transition: 'transform 0.35s ease, filter 0.3s ease',
                          }}
                        />
                      </div>

                      {/* Content */}
                      <div style={{
                        padding: isMobile ? '0.8rem' : '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        gap: '0.6rem',
                      }}>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: 'rgba(50,50,124,0.3)',
                          color: 'rgba(245,242,236,0.6)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '2px',
                          fontSize: '0.65rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-inter)',
                          width: 'fit-content',
                        }}>{game.category}</span>

                        <h3 style={{
                          fontFamily: 'var(--font-cinzel)',
                          fontSize: isMobile ? '0.85rem' : '1rem',
                          color: 'var(--offwhite)',
                        }}>{game.name}</h3>

                        {!isMobile && (
                          <p style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: '0.78rem',
                            color: 'rgba(245,242,236,0.4)',
                            lineHeight: 1.6,
                          }}>{truncate(game.description, 10)}</p>
                        )}

                        {!isMobile && (
                          <div style={{
                            display: 'flex',
                            gap: '0.8rem',
                            fontSize: '0.68rem',
                            color: 'rgba(245,242,236,0.35)',
                            fontFamily: 'var(--font-inter)',
                            flexWrap: 'wrap',
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <FontAwesomeIcon icon={faUsers} style={{ width: '11px', color: 'white' }} />
                              {game.players}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <FontAwesomeIcon icon={faClock} style={{ width: '11px', color: 'white' }} />
                              {game.duration}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <FontAwesomeIcon icon={faCakeCandles} style={{ width: '11px', color: 'white' }} />
                              {game.age}
                            </span>
                          </div>
                        )}

                        <div style={{
                          marginTop: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.6rem',
                          borderTop: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {game.price > 0 && (
                              <span style={{
                                fontFamily: 'var(--font-cinzel)',
                                fontSize: isMobile ? '1rem' : '1.2rem',
                                color: 'var(--purple)',
                              }}>${game.price}</span>
                            )}
                            <span style={{
                              fontFamily: 'var(--font-inter)',
                              fontSize: isMobile ? '0.6rem' : '0.68rem',
                              color: outOfStock ? 'var(--red)' : 'var(--teal)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                            }}>
                              {outOfStock ? 'Out of stock' : `${stock} in stock`}
                            </span>
                          </div>
                          {!isMobile && (
                            <span style={{
                              fontFamily: 'var(--font-inter)',
                              fontSize: '0.7rem',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: hovered && !outOfStock ? 'var(--purple)' : 'rgba(245,242,236,0.3)',
                              transition: 'color 0.2s',
                            }}>
                              Learn More →
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}