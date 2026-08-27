// Bundled thumbnails for the menu categories, served from /public/images/menu
// rather than a third-party host. Each was picked and checked at 50px — the
// largest size the menu ever renders a category image at (24px in the rail).
//
// These take precedence over whatever `image` is stored on the menuCategories
// doc, so the set stays visually consistent. A category that isn't listed here
// falls back to its Firestore `image` field, so anything added in Manage Menu
// later still shows up.

const CATEGORY_IMAGES: Record<string, string> = {
  appetizers:        '/images/menu/appetizers.jpg',
  salad:             '/images/menu/salad.jpg',
  sandwiches:        '/images/menu/sandwiches.jpg',
  burgers:           '/images/menu/burgers.jpg',
  pizzas:            '/images/menu/pizzas.jpg',
  kaake:             '/images/menu/kaake.jpg',
  platters:          '/images/menu/platters.jpg',
  sauceanddips:      '/images/menu/sauce-and-dips.jpg',
  cocktails:         '/images/menu/cocktails.jpg',
  beer:              '/images/menu/beer.jpg',
  beverages:         '/images/menu/beverages.jpg',
  smoothies:         '/images/menu/smoothies.jpg',
  hotcoffee:         '/images/menu/hot-coffee.jpg',
  coldcoffee:        '/images/menu/cold-coffee.jpg',
  lemonades:         '/images/menu/lemonades.jpg',
  milkshakes:        '/images/menu/milkshakes.jpg',
  hotbeverage:       '/images/menu/hot-beverage.jpg',
  coldbeverage:      '/images/menu/cold-beverage.jpg',
  spiritsandliqueur: '/images/menu/spirits-and-liqueur.jpg',
  cakes:             '/images/menu/cakes.jpg',
  cookies:           '/images/menu/cookies.jpg',
  desserts:          '/images/menu/desserts.jpg',
  // "Salads" and a second "Appetizers" exist as duplicate category docs with a
  // blank section — deliberately not mapped, so they stay visibly unfinished
  // until they're merged into the real ones.
}

// Matched case- and punctuation-insensitively so "Sauce and Dips",
// "sauce & dips" and "Sauce And Dips" all resolve to the same file.
export function categoryImage(name: string, fallback?: string): string {
  return CATEGORY_IMAGES[name.toLowerCase().replace(/[^a-z0-9]/g, '')] ?? fallback ?? ''
}
