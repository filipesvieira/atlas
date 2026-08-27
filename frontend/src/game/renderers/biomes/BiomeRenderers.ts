/**
 * Hub modular de renderers de biomas em Canvas 2D.
 * Cada bioma foi decomposto em seu respectivo módulo para fácil manutenção e escalabilidade.
 */

export { getForestBackground, getForestArenaBackground, getForestDepthObjects, renderForestArenaDynamic, getCampBackground, renderCampDynamic, drawTree } from './forest';
export { getSherequeBackground } from './swamp';
export { getSherequeArenaBackground, renderSherequeDynamic, getSherequeDepthObjects } from './sherequeIso';
export { getChapolinBackground } from './sea';
export { getOrcRuinsBackground } from './orcRuins';
export { getEsgotosBackground, getPlanaltoBackground } from './city';
export { getRogartesBackground } from './castle';
export { getFrozenBackground } from './frozen';
export { getAbyssBackground } from './abyss';
export { getOffscreenCanvas } from './canvasCache';