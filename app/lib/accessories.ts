// The best-seller keychains from the supplier sheet
// "keychains best sellers highlited in yellow.xlsx" (rows marked yellow).
//
// This list is SEED DATA ONLY — scripts/seed-keychains.mjs copies it into the
// `games` collection (category KEYCHAIN_CATEGORY), uploading each picture to
// imgbb like any game image. From then on Firestore is the source of truth:
// /accessories reads it live and staff edit price, wholesale price and stock
// at /admin/accessories. Editing a name here does nothing to a seeded doc.
//
// `code` is the supplier code, stored on the doc as supplierCode.

export interface Keychain {
  code: string
  name: string
  series: string
}

// Keychains live in `games` under this category. Board-game pages (shop,
// retail and price lists) filter it out with isAccessory(); wholesale and the
// trade catalogue keep it.
export const KEYCHAIN_CATEGORY = 'Keychains'
export const KEYCHAIN_RETAIL_PRICE = 3.3

export function isAccessory(item: { category?: string | null }): boolean {
  return item.category === KEYCHAIN_CATEGORY
}

export const KEYCHAIN_SERIES = [
  'Pokémon',
  'Marvel',
  'Disney & Cartoons',
  'Gaming',
  'Anime',
  'Movies & TV',
  'Fun & Cute',
] as const

export const KEYCHAINS: Keychain[] = [
  // Pokémon
  { code: 'HYB7047-01', name: 'Pikachu',          series: 'Pokémon' },
  { code: 'HYB7047-24', name: 'Pikachu II',       series: 'Pokémon' },
  { code: 'HYB7047-02', name: 'Charmander',       series: 'Pokémon' },
  { code: 'HYB7047-08', name: 'Charizard',        series: 'Pokémon' },
  { code: 'HYB7047-07', name: 'Bulbasaur',        series: 'Pokémon' },
  { code: 'HYB7047-06', name: 'Squirtle',         series: 'Pokémon' },
  { code: 'HYB7047-14', name: 'Mewtwo',           series: 'Pokémon' },
  { code: 'HYB7047-15', name: 'Mew',              series: 'Pokémon' },
  { code: 'HYB7047-11', name: 'Poké Ball',        series: 'Pokémon' },

  // Marvel
  { code: 'HYB7012-15', name: 'Spider-Man',       series: 'Marvel' },
  { code: 'HYB7012-11', name: 'Spider-Man Face',  series: 'Marvel' },
  { code: 'HYB7012-14', name: 'Iron Man',         series: 'Marvel' },
  { code: 'HYB7012-02', name: 'Iron Man Face',    series: 'Marvel' },
  { code: 'HYB7012-16', name: 'Hulk',             series: 'Marvel' },
  { code: 'HYB7012-03', name: 'Hulk Face',        series: 'Marvel' },
  { code: 'HYB7012-12', name: 'Thor',             series: 'Marvel' },

  // Disney & Cartoons
  { code: 'HYB7003-01', name: 'Mickey Mouse',     series: 'Disney & Cartoons' },
  { code: 'HYB7003-08', name: 'Mickey Mouse II',  series: 'Disney & Cartoons' },
  { code: 'HYB7003-09', name: 'Mickey Mouse III', series: 'Disney & Cartoons' },
  { code: 'HYB7003-02', name: 'Minnie Mouse',     series: 'Disney & Cartoons' },
  { code: 'HYB7003-07', name: 'Minnie Mouse II',  series: 'Disney & Cartoons' },
  { code: 'HYB7003-03', name: 'Daisy Duck',       series: 'Disney & Cartoons' },
  { code: 'HYB7003-04', name: 'Donald Duck',      series: 'Disney & Cartoons' },
  { code: 'HYB7003-05', name: 'Goofy',            series: 'Disney & Cartoons' },
  { code: 'HYB7003-06', name: 'Pluto',            series: 'Disney & Cartoons' },
  { code: 'HYB7034-06', name: 'Stitch Dancing',   series: 'Disney & Cartoons' },
  { code: 'HYB7034-02', name: 'Stitch Singing',   series: 'Disney & Cartoons' },
  { code: 'HYB7096-04', name: 'Up House',         series: 'Disney & Cartoons' },
  { code: 'HYB7001-05', name: 'Minion',           series: 'Disney & Cartoons' },
  { code: 'HYB7001-06', name: 'Minion II',        series: 'Disney & Cartoons' },
  { code: 'HYB7001-09', name: 'Minion III',       series: 'Disney & Cartoons' },
  { code: 'HYB7013-01', name: 'SpongeBob',        series: 'Disney & Cartoons' },
  { code: 'HYB7013-02', name: 'SpongeBob II',     series: 'Disney & Cartoons' },
  { code: 'HYB70121-01', name: 'Snoopy',          series: 'Disney & Cartoons' },
  { code: 'HYB7005-01', name: 'Hello Kitty',      series: 'Disney & Cartoons' },
  { code: 'HYB7005-02', name: 'Hello Kitty Face', series: 'Disney & Cartoons' },

  // Gaming
  { code: 'HYB7009-01', name: 'Mario',            series: 'Gaming' },
  { code: 'HYB7009-02', name: 'Luigi',            series: 'Gaming' },
  { code: 'HYB7009-14', name: 'Super Star',       series: 'Gaming' },
  { code: 'HYB7009-16', name: 'Red Mushroom',     series: 'Gaming' },
  { code: 'HYB7009-17', name: 'Yellow Mushroom',  series: 'Gaming' },
  { code: 'HYB7060-43', name: 'Game Boy',         series: 'Gaming' },
  { code: 'HYB7060-44', name: 'NES Controller',   series: 'Gaming' },
  { code: 'HYB7060-01', name: 'Red Joystick',     series: 'Gaming' },
  { code: 'HYB7060-02', name: 'Blue Joystick',    series: 'Gaming' },
  { code: 'HYB7060-14', name: 'Yellow Joystick',  series: 'Gaming' },
  { code: 'HYB70117-16', name: 'Arabic Handheld Game', series: 'Gaming' },
  { code: 'HYB70106-15', name: 'D&D Dice',        series: 'Gaming' },
  { code: 'HYB70106-12', name: 'Dragon',          series: 'Gaming' },

  // Anime
  { code: 'HYB7039-01', name: 'One Piece',        series: 'Anime' },
  { code: 'HYB7039-02', name: 'One Piece II',     series: 'Anime' },
  { code: 'HYB7081-01', name: 'Death Note',       series: 'Anime' },
  { code: 'HYB7081-05', name: 'L (Death Note)',   series: 'Anime' },
  { code: 'HYB7023-02', name: 'Totoro & No-Face', series: 'Anime' },
  { code: 'HYB7085-01', name: 'Spots On! (Miraculous)', series: 'Disney & Cartoons' },

  // Movies & TV
  { code: 'HYB7032-02', name: 'Harry Potter',     series: 'Movies & TV' },
  { code: 'HYB7032-17', name: 'Harry Potter & Hedwig', series: 'Movies & TV' },
  { code: 'HYB7032-04', name: 'Ron Weasley',      series: 'Movies & TV' },
  { code: 'HYB7032-05', name: 'Hermione Granger', series: 'Movies & TV' },
  { code: 'HYB70106-03', name: 'Stranger Things Gang', series: 'Movies & TV' },
  { code: 'HYB70106-06', name: 'Demogorgon',      series: 'Movies & TV' },
  { code: 'HYB7086-06', name: 'Squid Game Guard I',   series: 'Movies & TV' },
  { code: 'HYB7086-07', name: 'Squid Game Guard II',  series: 'Movies & TV' },
  { code: 'HYB7086-08', name: 'Squid Game Guard III', series: 'Movies & TV' },
  { code: 'HYB7091-07', name: 'Central Perk',     series: 'Movies & TV' },
  { code: 'HYB7091-08', name: 'How You Doin’?', series: 'Movies & TV' },
  { code: 'HYB7091-12', name: 'I’ll Be There for You', series: 'Movies & TV' },
  { code: 'HYB7030-01', name: 'Joker',            series: 'Movies & TV' },

  // Fun & Cute
  { code: 'HYB70108-01', name: 'I Need My Space', series: 'Fun & Cute' },
  { code: 'HYB70108-02', name: 'Espresso',        series: 'Fun & Cute' },
  { code: 'HYB7042-02', name: 'Laughing Emoji',   series: 'Fun & Cute' },
  { code: 'HYB7054-14', name: 'Golden Retriever', series: 'Fun & Cute' },
  { code: 'HYB7045-30', name: 'Lucky Cat',        series: 'Fun & Cute' },
  { code: 'HYB7054-66', name: 'Happy Cat',        series: 'Fun & Cute' },
  { code: 'HYB7053-03', name: 'Sunflower',        series: 'Fun & Cute' },
  { code: 'HYB7053-05', name: 'Avocado Love',     series: 'Fun & Cute' },
  { code: 'HYB7052-12', name: 'Basketball',       series: 'Fun & Cute' },
  { code: 'HYB7052-07', name: 'Football',         series: 'Fun & Cute' },
  { code: 'HYB7074-01', name: 'Don’t Panic, It’s Organic', series: 'Fun & Cute' },
  { code: 'HYB7074-02', name: 'Don’t Panic, It’s Organic II', series: 'Fun & Cute' },
]
