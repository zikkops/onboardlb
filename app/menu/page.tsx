'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

interface Category {
  id: string
  name: string
  order: number
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  order: number
  badge?: string
  available: boolean
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems]           = useState<MenuItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('')

  useEffect(() => {
    async function load() {
      const [catSnap, itemSnap] = await Promise.all([
        getDocs(collection(db, 'menuCategories')),
        getDocs(collection(db, 'menuItems')),
      ])

      const cats = catSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Category))
        .sort((a, b) => a.order - b.order)

      const its = itemSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as MenuItem))
        .filter(i => i.available)
        .sort((a, b) => a.order - b.order)

      setCategories(cats)
      setItems(its)
      if (cats.length > 0) setActiveCategory(cats[0].id)
      setLoading(false)
    }
    load()
  }, [])

  const activeItems = items.filter(i => i.categoryId === activeCategory)

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{
          position: 'relative',
          height: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.7rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-inter)',
            }}>Food & Drinks</p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>Our Menu</h1>
          </div>
        </section>

        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8rem',
            color: 'rgba(245,242,236,0.3)',
            fontFamily: 'var(--font-inter)',
          }}>Loading menu…</div>
        ) : (
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 3rem' }}>

            {/* Category Tabs */}
            <div style={{
              display: 'flex',
              gap: '0',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '3rem',
              flexWrap: 'wrap',
            }}>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeCategory === cat.id ? 'var(--teal)' : 'transparent'}`,
                  color: activeCategory === cat.id ? 'var(--offwhite)' : 'rgba(245,242,236,0.4)',
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.78rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                  marginBottom: '-1px',
                  transition: 'all 0.2s',
                }}>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            {activeItems.length === 0 ? (
              <p style={{ color: 'rgba(245,242,236,0.3)', fontFamily: 'var(--font-inter)' }}>
                No items in this category yet.
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0',
              }}>
                {activeItems.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '1.2rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    gap: '1rem',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                        <p style={{
                          fontFamily: 'var(--font-cinzel)',
                          fontSize: '0.95rem',
                          color: 'var(--offwhite)',
                        }}>{item.name}</p>
                        {item.badge && (
                          <span style={{
                            fontSize: '0.6rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '50px',
                            backgroundColor: 'rgba(228,51,41,0.15)',
                            color: 'var(--red)',
                            fontFamily: 'var(--font-inter)',
                          }}>{item.badge}</span>
                        )}
                      </div>
                      <p style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: '0.78rem',
                        color: 'rgba(245,242,236,0.4)',
                        lineHeight: 1.6,
                      }}>{item.description}</p>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.9rem',
                      color: 'var(--teal)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>${item.price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
      <Footer />
    </>
  )
}