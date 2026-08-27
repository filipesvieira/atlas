export interface CombatEffectEvent {
  kind: 'skill' | 'attack' | 'heal' | 'status';
  key: string; // 'whirlwind' | 'brutal_strike' | 'multishot' | 'sniper_shot' | 'fireball' | 'ice_shard' | 'arcane_nova' | 'divine_heal' | 'basic_attack'
  source_id?: string;
  target_ids?: string[];
  amount?: number;
  is_crit?: boolean;
  status_key?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface VisualEffect {
  id: string;
  isFinished: boolean;
  update(deltaMs: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}