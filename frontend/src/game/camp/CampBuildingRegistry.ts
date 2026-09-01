import { BuildingRenderContext } from './types';
import { renderCampfire } from './renderers/CampfireRenderer';
import { renderArcaneSpring } from './renderers/ArcaneSpringRenderer';
import { renderHut } from './renderers/HutRenderer';
import { renderWarehouse } from './renderers/WarehouseRenderer';
import { renderWorkbench } from './renderers/WorkbenchRenderer';
import { renderKitchen } from './renderers/KitchenRenderer';
import { renderAlchemyBench } from './renderers/AlchemyBenchRenderer';
import {
  renderWallPreview,
  renderGatePreview,
  renderWatchtower,
  renderBarracks,
  renderVault,
  renderInfirmary,
  renderPrison,
  renderEngineerWorkshop,
  renderWarRoom,
  renderResonator,
} from './renderers/DefenseBuildingRenderers';

type BuildingRenderer = (ctx: CanvasRenderingContext2D, renderCtx: BuildingRenderContext) => void;

class CampBuildingRegistryClass {
  private renderers: Map<string, BuildingRenderer> = new Map();

  constructor() {
    this.register('campfire', renderCampfire);
    this.register('arcane_spring', renderArcaneSpring);
    this.register('adventurer_hut', renderHut);
    this.register('warehouse', renderWarehouse);
    this.register('workbench', renderWorkbench);
    this.register('kitchen', renderKitchen);
    this.register('alchemy_bench', renderAlchemyBench);
    this.register('wall', renderWallPreview);
    this.register('gate', renderGatePreview);
    this.register('watchtower', renderWatchtower);
    this.register('barracks', renderBarracks);
    this.register('vault', renderVault);
    this.register('infirmary', renderInfirmary);
    this.register('prison', renderPrison);
    this.register('engineer_workshop', renderEngineerWorkshop);
    this.register('war_room', renderWarRoom);
    this.register('resonator', renderResonator);
  }

  public register(buildingKey: string, renderer: BuildingRenderer) {
    this.renderers.set(buildingKey, renderer);
  }

  public get(buildingKey: string): BuildingRenderer | undefined {
    return this.renderers.get(buildingKey);
  }
}

export const CampBuildingRegistry = new CampBuildingRegistryClass();