import { useEffect, useState, useRef } from 'react';
import { loadGameCatalog, SkillCatalogEntry } from '../../game/GameCatalog';
import { DerivedStats, Item } from '../../hooks/useGameSocket';

interface CombatActionBarProps {
  character: any;
  derivedStats?: DerivedStats | null;
  skillCooldowns?: Record<string, number>;
  attackCooldownRemaining?: number;
  mainHandItem?: Item | null;
  onToggleSkill?: (skillKey: string) => void;
}

export function CombatActionBar({
  character,
  derivedStats,
  skillCooldowns = {},
  attackCooldownRemaining = 0,
  mainHandItem,
}: CombatActionBarProps) {
  const [catalogSkills, setCatalogSkills] = useState<Record<string, SkillCatalogEntry>>({});
  const [localAttackCd, setLocalAttackCd] = useState<number>(0);
  const [localSkillCds, setLocalSkillCds] = useState<Record<string, number>>({});
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

  // Sincronizar temporizador de ataque básico do servidor
  useEffect(() => {
    setLocalAttackCd(attackCooldownRemaining);
  }, [attackCooldownRemaining]);

  // Sincronizar temporizadores de habilidades do servidor (convertendo ticks de 0.75s em segundos contínuos)
  useEffect(() => {
    setLocalSkillCds((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const [key, ticks] of Object.entries(skillCooldowns)) {
        if (ticks > 0) {
          const serverSec = ticks * 0.75;
          // Se o servidor acabou de registrar uma recarga maior ou se a diferença for significativa, sincroniza
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

  // Loop contínuo a 60 FPS com requestAnimationFrame para descida suave e gradual de TODOS os cronômetros
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

  const health = character?.health || 100;
  const maxHealth = character?.max_health || derivedStats?.max_health || 100;
  const mana = character?.mana || 30;
  const maxMana = character?.max_mana || derivedStats?.max_mana || 30;

  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const manaPct = Math.max(0, Math.min(100, (mana / maxMana) * 100));

  const attackSpeed = derivedStats?.attack_speed_seconds || 2.20;
  const attackProgress = Math.max(0, Math.min(1.0, 1.0 - (localAttackCd / attackSpeed)));
  const isAttackReady = localAttackCd <= 0.05;

  const activeSkills: string[] = character?.active_skills || [];

  // Ícone e Nome do Ataque Básico baseado no Equipamento
  const getBasicAttackInfo = () => {
    const archetype = derivedStats?.primary_archetype || 'melee';
    const itemName = mainHandItem?.name || '';
    if (archetype === 'distance') {
      return { icon: '🏹', name: itemName || 'Disparo com Arco', type: 'Distância' };
    }
    if (archetype === 'magic') {
      const isStaff = (mainHandItem?.hands || 1) === 2 || itemName.toLowerCase().includes('cajado');
      return {
        icon: isStaff ? '🔮' : '🪄',
        name: itemName || (isStaff ? 'Impacto Arcano (Cajado)' : 'Disparo Mágico (Varinha)'),
        type: 'Magia',
      };
    }
    return {
      icon: mainHandItem ? '⚔️' : '👊',
      name: itemName || 'Ataque Desarmado',
      type: 'Corpo a Corpo',
    };
  };

  const basicAttack = getBasicAttackInfo();

  return (
    <div className="w-full mt-2 flex flex-col gap-2 select-none">
      {/* ─── 1. BARRAS DE RECURSOS METÁLICAS ESTILO MMORPG (HP / MP) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Barra de Vida (HP) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-1.5 shadow-inner relative overflow-hidden flex flex-col justify-center">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold z-10 px-1 text-slate-200">
            <span className="flex items-center gap-1 text-rose-400">
              <span>❤️</span> VIDA
            </span>
            <span className="tracking-wide">
              {health.toLocaleString()} / {maxHealth.toLocaleString()} ({Math.round(healthPct)}%)
            </span>
          </div>
          <div className="w-full bg-slate-900/90 h-2.5 rounded overflow-hidden border border-red-950 mt-1 relative">
            <div
              className="bg-gradient-to-r from-red-700 via-rose-600 to-red-500 h-full transition-all duration-200 shadow-md relative"
              style={{ width: `${healthPct}%` }}
            >
              <div className="absolute inset-0 bg-white/15 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Barra de Mana (MP) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-1.5 shadow-inner relative overflow-hidden flex flex-col justify-center">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold z-10 px-1 text-slate-200">
            <span className="flex items-center gap-1 text-sky-400">
              <span>💧</span> MANA
            </span>
            <span className="tracking-wide">
              {mana.toLocaleString()} / {maxMana.toLocaleString()} ({Math.round(manaPct)}%)
            </span>
          </div>
          <div className="w-full bg-slate-900/90 h-2.5 rounded overflow-hidden border border-blue-950 mt-1 relative">
            <div
              className="bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-500 h-full transition-all duration-200 shadow-md relative"
              style={{ width: `${manaPct}%` }}
            >
              <div className="absolute inset-0 bg-white/15 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. ACTION BAR / HOTBAR DE SLOTS (IMG 1 MMORPG) ─── */}
      <div className="bg-slate-950/95 border border-slate-800/90 rounded-xl p-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-2 backdrop-blur-md">
        {/* Lista de Slots de Combate */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* SLOT 1: AUTO-ATAQUE / ATAQUE BÁSICO */}
          <div
            className={`relative w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group ${
              isAttackReady
                ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                : 'bg-slate-900/90 border-slate-700/80 opacity-90'
            }`}
            title={`${basicAttack.name} (${basicAttack.type})\nVelocidade de Ataque: ${attackSpeed.toFixed(2)}s por golpe`}
          >
            {/* Hotkey Tag */}
            <span className="absolute top-0.5 left-1 text-[8px] font-mono font-black text-amber-400/90 bg-slate-950/90 px-1 rounded-sm z-30 pointer-events-none">
              A
            </span>

            {/* Ícone Base */}
            <span className="text-xl z-0 transition-transform group-hover:scale-110 drop-shadow-md">
              {basicAttack.icon}
            </span>

            {/* Cooldown Overlay Sweep */}
            {!isAttackReady && (
              <div
                className="absolute inset-0 bg-slate-950/75 rounded-lg z-10 pointer-events-none transition-all"
                style={{
                  clipPath: `inset(${Math.round(attackProgress * 100)}% 0 0 0)`,
                }}
              />
            )}

            {/* Contador de Segundos Restantes do Ataque (SEMPRE NA FRENTE DO ÍCONE - z-30) */}
            {!isAttackReady && localAttackCd > 0.05 && (
              <span className="absolute inset-0 flex items-center justify-center z-30 text-xs font-mono font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] pointer-events-none">
                {localAttackCd.toFixed(1)}s
              </span>
            )}

            {/* Borda de Recarga Inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-lg overflow-hidden z-20 pointer-events-none">
              <div
                className="bg-amber-400 h-full transition-all duration-75"
                style={{ width: `${Math.round(attackProgress * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* DIVISOR DE SLOTS */}
          <div className="w-[1px] h-9 bg-slate-800 mx-1"></div>

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
                className={`relative w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden group ${
                  isReady
                    ? 'bg-purple-950/40 border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.45)]'
                    : !hasMana
                    ? 'bg-slate-900/60 border-blue-900/60 opacity-60'
                    : 'bg-slate-900/90 border-slate-700/80 opacity-90'
                }`}
                title={`${skillDef?.name || skillKey}\nCusto: ${skillDef?.mana_cost || 0} MP\n${skillDef?.description || ''}`}
              >
                {/* Hotkey Tag */}
                <span className="absolute top-0.5 left-1 text-[8px] font-mono font-black text-purple-300 bg-slate-950/90 px-1 rounded-sm z-30 pointer-events-none">
                  {idx + 1}
                </span>

                {/* Custo de Mana */}
                {skillDef?.mana_cost && skillDef.mana_cost > 0 && (
                  <span className="absolute bottom-0.5 right-1 text-[7px] font-mono font-bold text-sky-300 bg-slate-950/90 px-0.5 rounded z-30 pointer-events-none">
                    {skillDef.mana_cost}M
                  </span>
                )}

                {/* Ícone da Habilidade (z-0: fica sempre atrás do overlay e do texto do timer) */}
                <span className="text-xl z-0 transition-transform group-hover:scale-110 drop-shadow-md">
                  {skillDef?.icon || '✨'}
                </span>

                {/* Overlay Escuro Translúcido de Cooldown (z-10) */}
                {isCdActive && (
                  <div
                    className="absolute inset-0 bg-slate-950/80 rounded-lg z-10 pointer-events-none transition-all"
                    style={{
                      clipPath: `inset(${Math.round(skillProgress * 100)}% 0 0 0)`,
                    }}
                  />
                )}

                {/* Contador de Segundos Restantes da Magia (z-30: SEMPRE NA FRENTE DO ÍCONE E VISÍVEL) */}
                {isCdActive && (
                  <span className="absolute inset-0 flex items-center justify-center z-30 text-xs font-mono font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] pointer-events-none">
                    {remainingCd.toFixed(1)}s
                  </span>
                )}

                {/* Borda de Recarga Inferior da Magia */}
                {isCdActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-lg overflow-hidden z-20 pointer-events-none">
                    <div
                      className="bg-purple-400 h-full transition-all duration-75"
                      style={{ width: `${Math.round(skillProgress * 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>
            );
          })}

          {/* SLOTS VAZIOS (FEEDBACK DE SLOTS DISPONÍVEIS ESTILO RPG) */}
          {Array.from({ length: Math.max(0, 4 - activeSkills.length) }).map((_, i) => (
            <div
              key={`empty_${i}`}
              className="w-12 h-12 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-center opacity-40"
              title="Slot de Habilidade Livre (Ative na aba de Maestrias & Habilidades)"
            >
              <span className="text-slate-600 text-xs font-mono">+{activeSkills.length + i + 1}</span>
            </div>
          ))}
        </div>

        {/* ─── 3. RESUMO TÁTICO DE VELOCIDADE DE ATAQUE ─── */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400">Cadência de Golpe</span>
            <span className="text-amber-400 font-bold flex items-center gap-1 justify-end">
              <span>⚡</span> {attackSpeed.toFixed(2)}s <span className="text-[10px] text-slate-500 font-normal">/atk</span>
            </span>
          </div>
          <div className="w-[1px] h-6 bg-slate-800"></div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400">Poder (DPS)</span>
            <span className="text-rose-400 font-bold flex items-center gap-1 justify-end">
              <span>⚔️</span> {derivedStats?.current_dps || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
