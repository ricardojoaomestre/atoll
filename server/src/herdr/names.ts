export const ISLAND_NAMES = [
  'Barnacle',
  'Biscuit',
  'Noodle',
  'Pickle',
  'Waffle',
  'Mango',
  'Pebble',
  'Squid',
  'Kelp',
  'Buoy',
  'Dumpling',
  'Pretzel',
  'Mochi',
  'Crumb',
  'Pudding',
  'Jellybean',
  'Coconut',
  'Driftwood',
  'Marlin',
  'Lagoon',
  'Anchor',
  'Scooter',
  'Puddle',
  'Comet',
  'Button',
  'Fizz',
  'Zigzag',
  'Nibbles',
  'Pancake',
  'Turnip',
]

export function islandName(id: string, used: ReadonlySet<string>) {
  let hash = 0
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  for (let step = 0; step < ISLAND_NAMES.length; step += 1) {
    const name = ISLAND_NAMES[(hash + step) % ISLAND_NAMES.length]
    if (!used.has(name)) return name
  }
  const base = ISLAND_NAMES[hash % ISLAND_NAMES.length]
  let n = 2
  while (used.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}
