import { useEffect, useState, useRef } from 'react';
import { loadGameCatalog, SkillCatalogEntry } from '../../game/GameCatalog';
import { ActiveBuff, AutoPotionSettings, AutoPotionState, DerivedStats, Item } from '../../hooks/useGameSocket';
import { SkillEmblem } from '../../game/registries/SkillEmblemRegistry';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';
import { PixelResourceSprite } from '../../game/registries/PixelResourceRegistry';

interface CombatActionBarProps {
  character: any;
  derivedStats?: DerivedStats | null;
  activeBuffs?: ActiveBuff[];
	  autoPotionSettings?: AutoPotionSettings | null;
	  autoPotionState?: AutoPotionState | null;
  skillCooldowns?: Record<string, number>;
  attackCooldownRemaining?: number;
  mainHandItem?: Item | null;
  onToggleSkill?: (skillKey: string) => void;
  currentStance?: string;
  onSelectStance?: (stance: string) => void;
	  onUpdateAutoPotionSettings?: (settings: AutoPotionSettings) => void;
}

export function CombatActionBar({
  character,
  derivedStats,
  activeBuffs = [],
	  autoPotionSettings,
	  autoPotionState,
  skillCooldowns = {},
  attackCooldownRemaining = 0,
  mainHandItem,
  currentStance = 'balanced',
  onSelectStance,
	  onUpdateAutoPotionSettings,
}: CombatActionBarProps) {
  const [catalogSkills, setCatalogSkills] = useState<Record<string, SkillCatalogEntry>>({});
  const [localAttackCd, setLocalAttackCd] = useState<number>(0);
  const [localSkillCds, setLocalSkillCds] = useState<Record<string, number>>({});
  const [buffClock, setBuffClock] = useState(() => Date.now());
	const [showAutoPotionPanel, setShowAutoPotionPanel] = useState(false);
  const lastSyncTimeRef = useRef<number>(performance.now());

  // Carregar catálogo de habilidades
  useEffect(() => {
    loadGameCatalog()
      .then((cat) => {
        if (cat && cat.skills) {
          const map: Record<string, SkillCatalogEntry> = {};
          for (const s of cat.skills) {
            map[s.key] = s;
          }
          setCatalogSkills(map);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar catálogo de habilidades:', err);
      });
  }, []);

  // Mantém a contagem regressiva visual atualizada sem depender de um novo
  // evento de combate. A aplicação do efeito continua sendo autoritativa no
  // servidor.
  useEffect(() => {
    const timer = window.setInterval(() => setBuffClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Sincronizar temporizador de ataque básico do servidor
  useEffect(() => {
    setLocalAttackCd(attackCooldownRemaining);
  }, [attackCooldownRemaining]);

  // Sincronizar temporizadores de habilidades do servidor
  useEffect(() => {
    setLocalSkillCds((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const [key, ticks] of Object.entries(skillCooldowns)) {
        if (ticks > 0) {
          const serverSec = ticks * 0.75;
          if (!prev[key] || Math.abs(prev[key] - serverSec) > 0.4) {
            next[key] = serverSec;
          }
        } else {
          next[key] = 0;
        }
      }
      return next;
    });
  }, [skillCooldowns]);

  // Loop contínuo a 60 FPS com requestAnimationFrame para descida suave de TODOS os cronômetros
  useEffect(() => {
    let animId: number;
    lastSyncTimeRef.current = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = (now - lastSyncTimeRef.current) / 1000;
      lastSyncTimeRef.current = now;

      // 1. Decrementar Ataque Básico suavemente
      setLocalAttackCd((prev) => Math.max(0, prev - dt));

      // 2. Decrementar Habilidades ativas suavemente a cada frame
      setLocalSkillCds((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const k in next) {
          if (next[k] > 0) {
            next[k] = Math.max(0, next[k] - dt);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const health = character?.health ?? 100;
  const maxHealth = derivedStats?.max_health ?? character?.max_health ?? 100;
  const hpPercent = maxHealth > 0 ? Math.max(0, Math.min(100, Math.round((health / maxHealth) * 100))) : 0;

  const mana = character?.mana ?? 50;
  const maxMana = derivedStats?.max_mana ?? character?.max_mana ?? 50;
  const manaPercent = maxMana > 0 ? Math.max(0, Math.min(100, Math.round((mana / maxMana) * 100))) : 0;

  const attackSpeed = derivedStats?.attack_speed_seconds || 2.0;

  // Determinar o ataque básico correto de acordo com a arma equipada
  const getBasicAttackInfo = () => {
    if (!mainHandItem) {
      return {
        key: 'basic_attack',
        name: 'Soco Desarmado',
        icon: 'basic_attack',
        label: 'Ataque Desarmado',
        archetype: 'Melee',
      };
    }
    const wType = mainHandItem.weapon_type?.toLowerCase() || '';
    const nameClean = mainHandItem.name.toLowerCase();

    if (wType === 'wand' || nameClean.includes('varinha') || nameClean.includes('cajado')) {
      return {
        key: 'magic_bolt',
        name: 'Disparo Arcano',
        icon: 'magic_bolt',
        label: 'Disparo de Varinha',
        archetype: 'Mágico',
      };
    }
    if (wType === 'bow' || nameClean.includes('arco') || nameClean.includes('flecha')) {
      return {
        key: 'sniper_shot',
        name: 'Tiro de Precisão',
        icon: 'sniper_shot',
        label: 'Tiro de Arco',
        archetype: 'Distância',
      };
    }
    return {
      key: 'power_strike',
      name: 'Golpe Poderoso',
      icon: 'power_strike',
      label: 'Golpe de Arma',
      archetype: 'Melee',
    };
  };

  const basicAttack = getBasicAttackInfo();
  const basicAttackKey = basicAttack.key;
  const activeSkills: string[] = character?.active_skills || [];
  const activeConsumables = activeBuffs.filter((buff) => {
    const expiresAt = new Date(buff.expires_at).getTime();
    return Number.isFinite(expiresAt) && expiresAt > buffClock;
  });
  const activeBuffTotals = activeConsumables.reduce<Record<string, number>>((totals, buff) => {
    totals[buff.effect_key] = (totals[buff.effect_key] || 0) + buff.magnitude;
    return totals;
  }, {});
  const formatBuffRemaining = (expiresAt: string) => {
    const remainingSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - buffClock) / 1000));
    if (remainingSeconds >= 3600) {
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.ceil((remainingSeconds % 3600) / 60);
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    if (remainingSeconds >= 60) return `${Math.ceil(remainingSeconds / 60)}m`;
    return `${remainingSeconds}s`;
  };
  const formatBuffEffect = (effectKey: string) => effectKey === 'attack_percent' ? 'Atk' : 'XP';
	const potionSettings: AutoPotionSettings = autoPotionSettings || {
		enabled: false,
		health_threshold_percent: 30,
		mana_threshold_percent: 25,
		max_gold_per_expedition: 50,
		revision: 0,
	};
	const potionState: AutoPotionState = autoPotionState || {
		gold_spent: 0,
		budget_exhausted: false,
		revision: 0,
	};
	const potionRemaining = Math.max(0, potionSettings.max_gold_per_expedition - potionState.gold_spent);
	const updatePotionSettings = (change: Partial<AutoPotionSettings>) => {
		onUpdateAutoPotionSettings?.({ ...potionSettings, ...change });
	};
	const getPotionCooldownSeconds = (cooldownUntil?: string): number => {
		if (!cooldownUntil) return 0;
		const cooldownTimestamp = new Date(cooldownUntil).getTime();
		if (!Number.isFinite(cooldownTimestamp)) return 0;
		return Math.max(0, Math.ceil((cooldownTimestamp - buffClock) / 1000));
	};
	const healthPotionCooldown = getPotionCooldownSeconds(potionState.health_cooldown_until);
	const manaPotionCooldown = getPotionCooldownSeconds(potionState.mana_cooldown_until);
	const formatPotionCooldown = (seconds: number) => seconds > 0 ? `${seconds}s` : 'PRONTA';

  // Progresso do ataque básico (0.0 a 1.0)
  const attackProgress = Math.max(0, Math.min(1.0, 1.0 - (localAttackCd / attackSpeed)));
  const isAttackReady = localAttackCd <= 0.05;

  return (
    <div className="w-full mt-2.5 flex flex-col gap-2.5 bg-slate-950/95 border-2 border-amber-600/50 rounded-xl p-3 shadow-2xl backdrop-blur-md select-none">
      {/* ─── 1. BARRAS DE VIDA (HP) E MANA (MP) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {/* Barra de Vida */}
        <div className="space-y-0.5">
          <div className="flex justify-between items-center text-[10px] font-pixel-body">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <span>❤️</span> Vida (HP)
            </span>
            <span className="text-rose-300 font-pixel-heading text-[10px]">
              {health} / {maxHealth} ({hpPercent}%)
            </span>
          </div>
          <div className="w-full pixel-bar-bg rounded h-2.5 overflow-hidden">
            <div
              className="pixel-bar-hp h-full transition-all duration-150"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Barra de Mana */}
        <div className="space-y-0.5">
          <div className="flex justify-between items-center text-[10px] font-pixel-body">
            <span className="text-sky-400 font-bold flex items-center gap-1">
              <span>🔮</span> Mana (MP)
            </span>
            <span className="text-sky-300 font-pixel-heading text-[10px]">
              {mana} / {maxMana} ({manaPercent}%)
            </span>
          </div>
          <div className="w-full pixel-bar-bg rounded h-2.5 overflow-hidden">
            <div
              className="pixel-bar-mana h-full transition-all duration-150"
              style={{ width: `${manaPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── 2. LINHA HORIZONTAL DE COMBATE: HABILIDADES + POSTURAS + CADÊNCIA ─── */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-900 w-full min-w-0">
        {/* GRUPO A: HABILIDADES & SLOTS (Ataque Básico + Magias 1..4) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* SLOT 1: ATAQUE BÁSICO */}
          <div
            className={`relative w-10 h-10 pixel-slot rounded flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group ${
              isAttackReady
                ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                : 'border-slate-800 opacity-90'
            }`}
            title={`${basicAttack.name} (${basicAttack.archetype})\nCadência: ${attackSpeed.toFixed(2)}s\nAtaca automaticamente em combate.`}
          >
            {/* Hotkey Tag */}
            <span className="absolute top-0.5 left-1 text-[7px] font-pixel-heading font-bold text-amber-300 bg-slate-950 px-0.5 rounded-sm z-30 pointer-events-none border border-amber-600/40">
              A
            </span>

            {/* Ícone Pixel Art */}
            <div className="z-0 transition-transform group-hover:scale-110">
              <SkillEmblem skillKey={basicAttackKey} size={22} />
            </div>

            {/* Cooldown Overlay Sweep */}
            {!isAttackReady && (
              <div
                className="absolute inset-0 bg-slate-950/80 z-10 pointer-events-none transition-all"
                style={{
                  clipPath: `inset(${Math.round(attackProgress * 100)}% 0 0 0)`,
                }}
              />
            )}

            {/* Contador de Segundos */}
            {!isAttackReady && localAttackCd > 0.05 && (
              <span className="absolute inset-0 flex items-center justify-center z-30 text-[9px] font-pixel-heading font-bold text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] pointer-events-none">
                {localAttackCd.toFixed(1)}s
              </span>
            )}

            {/* Barra de Recarga Inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 overflow-hidden z-20 pointer-events-none">
              <div
                className="bg-amber-400 h-full transition-all duration-75"
                style={{ width: `${Math.round(attackProgress * 100)}%` }}
              />
            </div>
          </div>

          {/* DIVISOR DE SLOTS */}
          <div className="w-[1px] h-6 bg-slate-800 mx-0.5"></div>

          {/* SLOTS 2..N: HABILIDADES ATIVAS EQUIPADAS */}
          {activeSkills.map((skillKey, idx) => {
            const skillDef = catalogSkills[skillKey];
            const remainingCd = localSkillCds[skillKey] || 0;
            const totalCd = (skillDef?.cooldown_ticks || 4) * 0.75;
            const skillProgress = Math.max(0, Math.min(1.0, 1.0 - (remainingCd / totalCd)));
            const isCdActive = remainingCd > 0.05;
            const hasMana = mana >= (skillDef?.mana_cost || 0);
            const isReady = !isCdActive && hasMana;

            return (
              <div
                key={skillKey}
                className={`relative w-10 h-10 pixel-slot rounded flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group ${
                  isReady
                    ? 'border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                    : !hasMana
                    ? 'border-blue-900/60 opacity-50'
                    : 'opacity-85'
                }`}
                title={`${skillDef?.name || skillKey}\nCusto: ${skillDef?.mana_cost || 0} MP\n${skillDef?.description || ''}`}
              >
                {/* Hotkey Tag */}
                <span className="absolute top-0.5 left-1 text-[7px] font-pixel-heading font-bold text-purple-300 bg-slate-950 px-0.5 rounded-sm z-30 pointer-events-none border border-purple-600/40">
                  {idx + 1}
                </span>

                {/* Custo de Mana */}
                {skillDef?.mana_cost && skillDef.mana_cost > 0 && (
                  <span className="absolute bottom-0.5 right-0.5 text-[6px] font-pixel-body font-bold text-sky-300 bg-slate-950 px-0.5 rounded z-30 pointer-events-none border border-sky-800">
                    {skillDef.mana_cost}M
                  </span>
                )}

                {/* Ícone Pixel Art */}
                <div className="z-0 transition-transform group-hover:scale-110">
                  <SkillEmblem skillKey={skillKey} size={22} />
                </div>

                {/* Overlay Escuro de Cooldown */}
                {isCdActive && (
                  <div
                    className="absolute inset-0 bg-slate-950/80 z-10 pointer-events-none transition-all"
                    style={{
                      clipPath: `inset(${Math.round(skillProgress * 100)}% 0 0 0)`,
                    }}
                  />
                )}

                {/* Contador de Segundos */}
                {isCdActive && (
                  <span className="absolute inset-0 flex items-center justify-center z-30 text-[9px] font-pixel-heading font-bold text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] pointer-events-none">
                    {remainingCd.toFixed(1)}s
                  </span>
                )}

                {/* Borda de Recarga Inferior */}
                {isCdActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 overflow-hidden z-20 pointer-events-none">
                    <div
                      className="bg-purple-400 h-full transition-all duration-75"
                      style={{ width: `${Math.round(skillProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* SLOTS VAZIOS */}
          {Array.from({ length: Math.max(0, 4 - activeSkills.length) }).map((_, i) => (
            <div
              key={`empty_${i}`}
              className="w-10 h-10 pixel-slot rounded border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-center opacity-40"
              title="Slot de Habilidade Livre"
            >
              <span className="text-slate-600 text-[10px] font-pixel-body">+{activeSkills.length + i + 1}</span>
            </div>
          ))}
        </div>

        {/* GRUPO B: 3 POSTURAS TÁTICAS (ÍCONES COM TOOLTIPS NATIVOS NO PADRÃO DAS MAGIAS) */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-lg border border-slate-800 shrink-0">
          {/* Postura Ofensiva */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectStance?.('offensive');
            }}
            className={`w-9 h-9 rounded flex items-center justify-center border transition-all cursor-pointer select-none ${
              currentStance === 'offensive'
                ? 'bg-rose-950/90 border-rose-500 ring-1 ring-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                : 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100 hover:border-rose-500/60'
            }`}
            title={`Postura Ofensiva\nModificadores: +35% Atk | -20% Def\nAumenta o dano de ataque em 35% com redução de 20% na defesa. Ideal para finalizações rápidas.`}
          >
            <PixelItemSprite weaponType="sword" size="sm" />
          </button>

          {/* Postura Equilibrada */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectStance?.('balanced');
            }}
            className={`w-9 h-9 rounded flex items-center justify-center border transition-all cursor-pointer select-none ${
              currentStance === 'balanced'
                ? 'bg-amber-950/90 border-amber-400 ring-1 ring-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                : 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100 hover:border-amber-500/60'
            }`}
            title={`Postura Equilibrada\nModificadores: Atributos Padrão (100% Atk / 100% Def)\nMantém os atributos normais e equilibrados do herói sem penalidades de ataque ou defesa.`}
          >
            <span className="text-sm leading-none select-none">⚖️</span>
          </button>

          {/* Postura Defensiva */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectStance?.('defensive');
            }}
            className={`w-9 h-9 rounded flex items-center justify-center border transition-all cursor-pointer select-none ${
              currentStance === 'defensive'
                ? 'bg-sky-950/90 border-sky-400 ring-1 ring-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                : 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100 hover:border-sky-500/60'
            }`}
            title={`Postura Defensiva\nModificadores: +50% Def | -25% Atk\nAumenta a defesa em 50% com redução de 25% no ataque. Máxima mitigação de dano e resistência.`}
          >
            <PixelItemSprite slotType="offhand" size="sm" />
          </button>
        </div>

        {/* GRUPO C: CONSUMÍVEIS ATIVOS (refeição e poção) */}
        {activeConsumables.length > 0 && (
          <div className="flex min-w-0 max-w-[260px] flex-wrap items-center gap-1 rounded-lg border border-emerald-800/70 bg-slate-950/90 px-2 py-1 font-pixel-body text-[9px] text-emerald-300">
            {Object.entries(activeBuffTotals).map(([effectKey, magnitude]) => (
              <span
                key={`total-${effectKey}`}
                className="rounded border border-emerald-500/60 bg-emerald-950/60 px-1 font-pixel-heading text-emerald-200"
                title="Bônus total acumulado entre todos os consumíveis ativos."
              >
                Total {formatBuffEffect(effectKey)} +{magnitude}%
              </span>
            ))}
            {activeConsumables.map((buff) => (
              <span
                key={`${buff.category}-${buff.source_resource_key}`}
                className="max-w-[125px] truncate whitespace-nowrap"
                title={`${buff.source_name}\n+${buff.magnitude}% ${formatBuffEffect(buff.effect_key)}\nRestante: ${formatBuffRemaining(buff.expires_at)}`}
              >
                {buff.category === 'meal' ? <span aria-hidden="true">🍽️</span> : <PixelResourceSprite resourceKey={buff.source_resource_key} name={buff.source_name} size="sm" />} {buff.source_name} +{buff.magnitude}% {formatBuffEffect(buff.effect_key)} · {formatBuffRemaining(buff.expires_at)}
              </span>
            ))}
          </div>
        )}

		{/* GRUPO C.1: SUPRIMENTOS AUTOMÁTICOS — compacto e no mesmo vocabulário
		    pixelado da barra, sem introduzir um painel genérico de aplicativo. */}
		<button
			type="button"
			onClick={() => setShowAutoPotionPanel((visible) => !visible)}
			className={`flex h-9 items-center gap-1 rounded border px-2 font-pixel-heading text-[8px] transition-colors ${
				potionSettings.enabled
					? potionState.budget_exhausted
						? 'border-rose-700 bg-rose-950/70 text-rose-300'
						: 'border-emerald-600/70 bg-emerald-950/50 text-emerald-200'
					: 'border-slate-700 bg-slate-950/90 text-slate-400 hover:border-amber-700 hover:text-amber-300'
			}`}
			title="Configurar frascos automáticos de Vida e Mana"
		>
			<PixelResourceSprite resourceKey="health_potion" name="Poção de Vida" size="sm" />
			<span>SUPR.</span>
			<span className="font-pixel-body text-[8px]">{potionSettings.enabled ? `${potionState.gold_spent}/${potionSettings.max_gold_per_expedition}g` : 'OFF'}</span>
			{potionSettings.enabled && (
				<span className="flex items-center gap-0.5 border-l border-slate-700 pl-1" title={`Vida: ${formatPotionCooldown(healthPotionCooldown)}\nMana: ${formatPotionCooldown(manaPotionCooldown)}`}>
					<PixelResourceSprite resourceKey="health_potion" name="Poção de Vida" size="sm" className="!w-4 !h-4" />
					<span className={healthPotionCooldown > 0 ? 'text-rose-300' : 'text-emerald-300'}>{healthPotionCooldown > 0 ? `${healthPotionCooldown}s` : '✓'}</span>
					<PixelResourceSprite resourceKey="mana_potion" name="Poção de Mana" size="sm" className="!w-4 !h-4" />
					<span className={manaPotionCooldown > 0 ? 'text-sky-300' : 'text-emerald-300'}>{manaPotionCooldown > 0 ? `${manaPotionCooldown}s` : '✓'}</span>
				</span>
			)}
		</button>

        {/* GRUPO D: RESUMO TÁTICO DE VELOCIDADE DE ATAQUE & PODER */}
        <div className="flex items-center gap-2.5 px-2.5 py-1 bg-slate-950/90 border border-slate-800 rounded-lg text-xs font-pixel-body shrink-0">
          <div
            className="flex flex-col text-right cursor-help"
            title="Velocidade de Ataque: tempo de intervalo (em segundos) entre cada ataque básico do herói."
          >
            <span className="text-[9px] text-slate-400">VA</span>
            <span className="text-amber-400 font-bold flex items-center gap-1 justify-end font-pixel-heading text-xs">
              <span>⚡</span> {attackSpeed.toFixed(2)}s
            </span>
          </div>
          <div className="w-[1px] h-5 bg-slate-800"></div>
          <div
            className="flex flex-col text-right cursor-help"
            title="DPS base: dano básico esperado por segundo, considerando atributos, arma, postura, intervalo de ataque e críticos médios. Não inclui magias, habilidades ou tempo fora de alcance."
          >
            <span className="text-[9px] text-slate-400">DPS base</span>
            <span className="text-rose-400 font-bold flex items-center gap-1 justify-end font-pixel-heading text-xs">
              <span>⚔️</span> {derivedStats?.current_dps || 0}
            </span>
          </div>
        </div>
      </div>

		{showAutoPotionPanel && (
			<section className={`${potionState.budget_exhausted ? 'pixel-alert-frame pixel-alert-critical' : 'border border-amber-700/70'} bg-slate-950/95 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.9)] font-pixel-body`}>
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
					<div>
						<h4 className="font-pixel-heading text-[10px] text-amber-300">🧪 SUPRIMENTOS AUTOMÁTICOS</h4>
						<p className="mt-0.5 text-[8px] text-slate-400">Rede de emergência paga com o ouro pessoal do herói.</p>
					</div>
					<button
						type="button"
						onClick={() => updatePotionSettings({ enabled: !potionSettings.enabled })}
						className={`pixel-btn px-2 py-1 text-[9px] ${potionSettings.enabled ? 'pixel-btn-purple' : 'pixel-btn-dark'}`}
					>
						{potionSettings.enabled ? 'ATIVO' : 'DESLIGADO'}
					</button>
				</div>

				<div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
					<label className="border border-rose-900/70 bg-rose-950/20 px-2 py-1.5 text-[8px] text-rose-200">
						<span className="block font-pixel-heading text-[8px] text-rose-300">❤️ VIDA · 15g</span>
						<select
							value={potionSettings.health_threshold_percent}
							onChange={(event) => updatePotionSettings({ health_threshold_percent: Number(event.target.value) })}
							disabled={!potionSettings.enabled}
							className="mt-1 w-full border border-rose-900 bg-slate-950 px-1 py-0.5 font-pixel-body text-[9px] text-slate-200 disabled:opacity-45"
						>
							<option value={20}>usar em 20%</option>
							<option value={30}>usar em 30%</option>
							<option value={40}>usar em 40%</option>
						</select>
					</label>
					<label className="border border-sky-900/70 bg-sky-950/20 px-2 py-1.5 text-[8px] text-sky-200">
						<span className="block font-pixel-heading text-[8px] text-sky-300">🔮 MANA · 12g</span>
						<select
							value={potionSettings.mana_threshold_percent}
							onChange={(event) => updatePotionSettings({ mana_threshold_percent: Number(event.target.value) })}
							disabled={!potionSettings.enabled}
							className="mt-1 w-full border border-sky-900 bg-slate-950 px-1 py-0.5 font-pixel-body text-[9px] text-slate-200 disabled:opacity-45"
						>
							<option value={15}>usar em 15%</option>
							<option value={25}>usar em 25%</option>
							<option value={35}>usar em 35%</option>
						</select>
					</label>
					<label className="border border-amber-900/70 bg-amber-950/20 px-2 py-1.5 text-[8px] text-amber-200">
						<span className="block font-pixel-heading text-[8px] text-amber-300">💰 ORÇAMENTO / EXP.</span>
						<select
							value={potionSettings.max_gold_per_expedition}
							onChange={(event) => updatePotionSettings({ max_gold_per_expedition: Number(event.target.value) })}
							disabled={!potionSettings.enabled}
							className="mt-1 w-full border border-amber-900 bg-slate-950 px-1 py-0.5 font-pixel-body text-[9px] text-slate-200 disabled:opacity-45"
						>
							<option value={25}>25 ouro</option>
							<option value={50}>50 ouro</option>
							<option value={100}>100 ouro</option>
							<option value={250}>250 ouro</option>
						</select>
						<span className="mt-1 block text-[8px] text-amber-200/80">Usado: {potionState.gold_spent}g · Restante: {potionRemaining}g</span>
					</label>
				</div>
				<div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
					<div className="flex items-center gap-2 border border-rose-900/70 bg-rose-950/20 px-2 py-1.5 text-[8px] text-rose-200" title="A próxima Poção de Vida respeita o cooldown autoritativo do servidor.">
						<PixelResourceSprite resourceKey="health_potion" name="Poção de Vida" size="md" />
						<div className="min-w-0">
							<span className="block font-pixel-heading text-[8px] text-rose-300">POÇÃO DE VIDA</span>
							<span className={healthPotionCooldown > 0 ? 'text-rose-200' : 'text-emerald-300'}>Próxima: {formatPotionCooldown(healthPotionCooldown)}</span>
						</div>
					</div>
					<div className="flex items-center gap-2 border border-sky-900/70 bg-sky-950/20 px-2 py-1.5 text-[8px] text-sky-200" title="A próxima Poção de Mana respeita o cooldown autoritativo do servidor.">
						<PixelResourceSprite resourceKey="mana_potion" name="Poção de Mana" size="md" />
						<div className="min-w-0">
							<span className="block font-pixel-heading text-[8px] text-sky-300">POÇÃO DE MANA</span>
							<span className={manaPotionCooldown > 0 ? 'text-sky-200' : 'text-emerald-300'}>Próxima: {formatPotionCooldown(manaPotionCooldown)}</span>
						</div>
					</div>
				</div>
				<div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-900 pt-1.5 text-[8px]">
					<span className={potionState.budget_exhausted ? 'text-rose-300' : 'text-emerald-300'}>
						{potionState.budget_exhausted ? '⚠ ORÇAMENTO ESGOTADO' : `Bolsa da expedição: ${potionRemaining}g restantes`}
					</span>
					<span className="text-slate-500">Mana repõe abaixo do limite quando há magia ativa compatível.</span>
				</div>
			</section>
		)}
    </div>
  );
}