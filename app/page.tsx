import Navbar from './components/layout/Navbar'
import Hero from './components/home/Hero'
import About from './components/home/About'
import EventsPreview from './components/home/EventsPreview'
import ShopPreview from './components/home/ShopPreview'
import MenuPreview from './components/home/MenuPreview'
import DndPreview from './components/home/DndPreview'
import Footer from './components/layout/Footer'

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <About />
      <EventsPreview />
      <ShopPreview />
      <MenuPreview />
      <DndPreview />
      <Footer />
    </main>
  )
}