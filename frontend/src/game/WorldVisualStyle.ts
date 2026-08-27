/** Contrato visual compartilhado pelos cenários isométricos. */
export const WORLD_VISUAL_CONTRACT = {
  isoTile: { width: 32, height: 16, edgeDepth: 5 },
  actorAnchor: 'feet',
  outline: '#07111f',
  sky: '#06082c',
  uiLight: '#fef3c7',
} as const;

export const FOREST_NIGHT_PALETTE = {
  void: '#050b1a',
  horizonTop: '#07052b',
  horizonBottom: '#172554',
  grass: ['#173f31', '#1b4935', '#1d513a', '#204f38'],
  grassEdge: '#102c26',
  grassSide: '#0b221d',
  path: '#60452d',
  pathLight: '#795a37',
  river: '#0a4b70',
  riverDeep: '#07334f',
  trunk: '#4b2d1a',
  trunkLight: '#70401f',
  pineDark: '#0a2d27',
  pineMid: '#104735',
  pineLight: '#1d633f',
  rockDark: '#27313c',
  rockMid: '#45515d',
  rockLight: '#687582',
} as const;

export function stableVisualVariant(x: number, y: number, variants: number): number {
  return Math.abs((x * 31 + y * 17 + x * y * 7) % variants);
}