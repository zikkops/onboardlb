import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const menuData = [
  {
    category: 'Appetizers',
    image: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80',
    items: [
      { name: 'Crispy Calamari',        description: 'Lightly breaded calamari rings, served with marinara sauce', price: '$9' },
      { name: 'Bruschetta Board',       description: 'Toasted bread, tomato, basil, garlic and olive oil', price: '$8' },
      { name: 'Loaded Nachos',          description: 'Tortilla chips, guacamole, salsa, cheese sauce, jalapeños', price: '$10' },
      { name: 'Mozzarella Sticks',      description: 'Golden fried mozzarella sticks with marinara dipping sauce', price: '$8' },
    ],
  },
  {
    category: 'Sandwiches',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
    items: [
      { name: 'Club Sandwich',          description: 'Triple decker with chicken, turkey, bacon, avocado, tomato', price: '$12' },
      { name: 'Grilled Veggie Wrap',    description: 'Seasonal vegetables, hummus, feta cheese in a warm wrap', price: '$10' },
      { name: 'Crispy Chicken Sandwich', description: 'Fried chicken fillet, coleslaw, pickles, sriracha mayo', price: '$11' },
    ],
  },
  {
    category: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    items: [
      { name: 'The Game Master Burger', description: 'Double smash patty, aged cheddar, caramelised onion, house sauce', price: '$14' },
      { name: 'Classic Cheeseburger',   description: 'Beef patty, American cheese, lettuce, tomato, pickles', price: '$12' },
      { name: 'Mushroom Swiss Burger',  description: 'Beef patty, sautéed mushrooms, swiss cheese, garlic aioli', price: '$13' },
      { name: 'Veggie Burger',          description: 'Plant-based patty, avocado, tomato, lettuce, chipotle mayo', price: '$11' },
    ],
  },
  {
    category: 'Salads',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    items: [
      { name: 'Caesar Salad',           description: 'Romaine lettuce, parmesan, croutons, caesar dressing', price: '$9' },
      { name: 'Greek Salad',            description: 'Tomato, cucumber, olives, feta cheese, red onion, oregano', price: '$9' },
      { name: 'Grilled Chicken Salad',  description: 'Mixed greens, grilled chicken, avocado, cherry tomato', price: '$12' },
    ],
  },
  {
    category: 'Milkshakes',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
    items: [
      { name: 'Classic Vanilla',        description: 'Creamy vanilla ice cream blended with whole milk', price: '$7' },
      { name: 'Double Chocolate',       description: 'Rich chocolate ice cream with chocolate syrup', price: '$7' },
      { name: 'Strawberry Dream',       description: 'Fresh strawberries blended with vanilla ice cream', price: '$7' },
      { name: 'Lotus Biscoff',          description: 'Biscoff spread and ice cream with crushed cookies on top', price: '$8' },
    ],
  },
  {
    category: 'Tea',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
    items: [
      { name: 'Classic Lebanese Tea',   description: 'Strong black tea served in traditional style', price: '$3' },
      { name: 'Mint Tea',               description: 'Fresh mint leaves steeped in hot water', price: '$3' },
      { name: 'Chamomile',              description: 'Soothing chamomile flowers, perfect for a long game night', price: '$3' },
      { name: 'Cinnamon Tea',           description: 'Warming cinnamon sticks brewed with black tea', price: '$3' },
    ],
  },
  {
    category: 'Cookies',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&q=80',
    items: [
      { name: 'Chocolate Chip Cookie',  description: 'Warm, freshly baked classic chocolate chip cookie', price: '$3' },
      { name: 'Double Chocolate Cookie', description: 'Rich cocoa dough loaded with chocolate chunks', price: '$3' },
      { name: 'Oatmeal Raisin Cookie',  description: 'Wholesome oats, plump raisins, hint of cinnamon', price: '$3' },
    ],
  },
  {
    category: 'Soft Drinks',
    image: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400&q=80',
    items: [
      { name: 'Fresh Lemonade',         description: 'Freshly squeezed lemon with mint and sugar syrup', price: '$4' },
      { name: 'Soft Drinks',            description: 'Pepsi, 7UP, Miranda — ask your server for options', price: '$3' },
      { name: 'Sparkling Water',        description: 'Chilled sparkling mineral water', price: '$2' },
      { name: 'Fresh Juice',            description: 'Orange, watermelon, or mango — freshly pressed', price: '$5' },
    ],
  },
  {
    category: 'Beers',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80',
    items: [
      { name: 'Almaza',                 description: 'Lebanon\'s classic pilsner — crisp and refreshing', price: '$4' },
      { name: 'Almaza Light',           description: 'Lighter version of Lebanon\'s favourite beer', price: '$4' },
      { name: 'Corona',                 description: 'Mexican lager served with a slice of lime', price: '$5' },
      { name: 'Heineken',               description: 'Dutch pale lager, smooth and balanced', price: '$5' },
    ],
  },
  {
    category: 'Alcoholic Drinks',
    image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&q=80',
    items: [
      { name: 'Mojito',                 description: 'White rum, fresh mint, lime, sugar, soda water', price: '$9' },
      { name: 'Gin & Tonic',            description: 'Premium gin, tonic water, lime, cucumber', price: '$9' },
      { name: 'Whiskey Sour',           description: 'Bourbon, lemon juice, sugar syrup, egg white', price: '$10' },
      { name: 'House Wine',             description: 'Red or white — ask your server for today\'s selection', price: '$8' },
    ],
  },
]

export default function MenuPage() {
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
            }}>
              Food & Drinks
            </p>
            <h1 style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: '3.5rem',
              color: 'var(--offwhite)',
              lineHeight: 1.2,
            }}>
              Our Menu
            </h1>
          </div>
        </section>

        {/* Menu Categories */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 3rem' }}>
          {menuData.map(({ category, image, items }) => (
            <div key={category} style={{
              marginBottom: '5rem',
            }}>
              {/* Category Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '4px',
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.06)',
                }} />
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '1.6rem',
                    color: 'var(--offwhite)',
                  }}>{category}</h2>
                  <div style={{
                    width: '40px', height: '2px',
                    backgroundColor: 'var(--teal)',
                    marginTop: '0.4rem',
                  }} />
                </div>
              </div>

              {/* Items */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0',
              }}>
                {items.map(({ name, description, price }) => (
                  <div key={name} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '1.2rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    gap: '1rem',
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: 'var(--font-cinzel)',
                        fontSize: '0.95rem',
                        color: 'var(--offwhite)',
                        marginBottom: '0.3rem',
                      }}>{name}</p>
                      <p style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: '0.78rem',
                        color: 'rgba(245,242,236,0.4)',
                        lineHeight: 1.6,
                      }}>{description}</p>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.9rem',
                      color: 'var(--teal)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>{price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </main>
      <Footer />
    </>
  )
}