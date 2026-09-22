import * as dicebearCollection from '@dicebear/collection'

export const avatarStyles = {
  adventurer: dicebearCollection.adventurer,
  adventurerNeutral: dicebearCollection.adventurerNeutral,
  avataaars: dicebearCollection.avataaars,
  bigSmile: dicebearCollection.bigSmile,
  bottts: dicebearCollection.bottts,
  croodles: dicebearCollection.croodles,
  funEmoji: dicebearCollection.funEmoji,
  lorelei: dicebearCollection.lorelei,
  micah: dicebearCollection.micah,
  notionists: dicebearCollection.notionists,
  openPeeps: dicebearCollection.openPeeps,
  toonHead: dicebearCollection.toonHead,
} as const

export type AvatarStyleKey = keyof typeof avatarStyles

export function isValidAvatarConfig(config: string | null | undefined): boolean {
  if (!config) return false
  const [style, seed] = config.split(':')
  return style in avatarStyles && !!seed
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}
