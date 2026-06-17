import Navbar from './components/layout/Navbar'
import Hero from './components/home/Hero'
import About from './components/home/About'
import Branches from './components/home/Branches'
import MenuPreview from './components/home/MenuPreview'
import ShopPreview from './components/home/ShopPreview'
import DndPreview from './components/home/DndPreview'
import Footer from './components/layout/Footer'

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <About />
      <Branches />
      <MenuPreview />
      <ShopPreview />
      <DndPreview />
      <Footer />
    </main>
  )
}