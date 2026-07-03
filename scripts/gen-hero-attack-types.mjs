import https from 'node:https'

const url = 'https://raw.githubusercontent.com/odota/dotaconstants/master/build/heroes.json'

https.get(url, (res) => {
  let data = ''
  res.on('data', (c) => { data += c })
  res.on('end', () => {
    const heroes = JSON.parse(data)
    const entries = Object.entries(heroes)
      .map(([id, h]) => {
        const type = h.attack_type === 'Melee' ? 'melee' : 'ranged'
        return `  ${id}: '${type}',`
      })
      .join('\n')

    const content = `// Auto-generated from OpenDota dotaconstants heroes.json (attack_type field).
// Regenerate: node scripts/gen-hero-attack-types.mjs

export type HeroAttackType = 'melee' | 'ranged'

export const HERO_ATTACK_TYPE_BY_WINDRUN_ID: Record<number, HeroAttackType> = {
${entries}
}

export function getHeroAttackType(windrunId: number): HeroAttackType | null {
  return HERO_ATTACK_TYPE_BY_WINDRUN_ID[windrunId] ?? null
}
`
    process.stdout.write(content)
  })
})
