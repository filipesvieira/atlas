import { useEffect, useState } from 'react';
import { loadGameCatalog, SkillCatalogEntry } from '../../game/GameCatalog';

export interface MasteriesData {
  sword_mastery?: number;
  axe_mastery?: number;
  shield_mastery?: number;
  distance_mastery?: number;
  magic_mastery?: number;
  club_mastery?: number;
}

interface SkillBarProps {
  masteries?: MasteriesData;
  learnedSkills?: string[];
  activeSkills?: string[];
  skillCooldowns?: Record<string, number>;
  primaryArchetype?: string;
  onToggleSkill?: (skill: string) => void;
}

export function SkillBar({
  masteries = {},
  learnedSkills = [],
  activeSkills = [],
  skillCooldowns = {},
  primaryArchetype = 'melee',
  onToggleSkill,
}: SkillBarProps) {
  const safeLearnedSkills = learnedSkills || [];
  const safeActiveSkills = activeSkills || [];
  const safeMasteries = masteries || {};

  const [catalogSkills, setCatalogSkills] = useState<Record<string, SkillCatalogEntry>>({});

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
        console.error('Falha ao carregar skills do catálogo:', err);
      });
  }, []);

  const getLevel = (tries: number | undefined) => {
    if (!tries) return 10;
    return 10 + Math.floor(Math.pow(tries, 0.35) * 3);
  };

  const getMasteryProgress = (tries: number | undefined) => {
    if (!tries) return 0;
    const currentLevel = getLevel(tries);
    const nextLevel = currentLevel + 1;
    const triesForCurrent = Math.pow((currentLevel - 10) / 3, 1 / 0.35);
    const triesForNext = Math.pow((nextLevel - 10) / 3, 1 / 0.35);
    const progress = ((tries - triesForCurrent) / (triesForNext - triesForCurrent)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const MasteryRow = ({ label, tries, color }: { label: string; tries?: number; color: string }) => {
    const level = getLevel(tries);
    const progress = getMasteryProgress(tries);
    return (
      <div className="flex flex-col bg-slate-900 px-2 py-1.5 rounded border border-slate-800 gap-1 relative overflow-hidden">
        <div className="flex justify-between items-center z-10 relative">
          <span className="text-slate-300">{label}</span>
          <span className={`${color} font-bold`}>Nv. {level}</span>
        </div>
        <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden z-10 relative">
          <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  };

  const formatArchetype = (archetypes: string[] = []) => {
    if (archetypes.length >= 3) return '✨ Universal';
    if (archetypes.includes('melee')) return '⚔️ Melee';
    if (archetypes.includes('distance')) return '🏹 Distância';
    if (archetypes.includes('magic')) return '🪄 Magia';
    return '📜 Habilidade';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
        <h3 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
          <span>📖</span> Maestrias & Habilidades Ativas
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">Classless System</span>
      </div>

      {/* Maestrias de Armas (Progressão por Uso) */}
      <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Maestrias de Combate (Por Uso)
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <MasteryRow label="⚔️ Espada" tries={safeMasteries.sword_mastery} color="text-amber-400" />
          <MasteryRow label="🪓 Machado" tries={safeMasteries.axe_mastery} color="text-amber-400" />
          <MasteryRow label="🛡️ Escudo" tries={safeMasteries.shield_mastery} color="text-sky-400" />
          <MasteryRow label="🏹 Distância" tries={safeMasteries.distance_mastery} color="text-emerald-400" />
          <MasteryRow label="⛏️ Clava" tries={safeMasteries.club_mastery} color="text-amber-400" />
          <MasteryRow label="🔮 Magia" tries={safeMasteries.magic_mastery} color="text-fuchsia-400" />
        </div>
      </div>

      {/* Habilidades Aprendidas via Skill Books */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          <span>Habilidades Aprendidas ({safeLearnedSkills.length})</span>
          <span className="text-amber-400/80 font-normal">Ativas: {safeActiveSkills.length}/2</span>
        </div>
        <p className="rounded border border-sky-900/60 bg-sky-950/25 px-2 py-1.5 text-[9px] leading-relaxed text-sky-200/80">
          📖 Livros podem ser estudados com qualquer equipamento. A arma compatível é exigida somente para ativar e usar a habilidade.
        </p>

        {safeLearnedSkills.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {safeLearnedSkills.map((skillKey) => {
              const skill = catalogSkills[skillKey] || {
                key: skillKey,
                name: skillKey,
                icon: '📜',
                description: 'Habilidade Mística de Combate',
                mana_cost: 15,
                min_level: 1,
                cooldown_seconds: 2.25,
                allowed_archetypes: ['melee', 'distance', 'magic'],
                target_type: 'single',
                visual_key: skillKey,
              };

              const isActive = safeActiveSkills.includes(skillKey);
              const isAllowedForCurrentWeapon = skill.allowed_archetypes.includes(primaryArchetype);
              const canToggle = isActive || isAllowedForCurrentWeapon;
              const cdTicks = skillCooldowns[skillKey] || 0;
              const cdSecondsRemaining = cdTicks > 0 ? (cdTicks * 0.75).toFixed(1) : null;

              return (
                <div
                  key={skillKey}
                  title={`${skill.description}\nAprendida permanentemente: sim\nTempo de Recarga: ${skill.cooldown_seconds || 2.25}s\nArquétipos compatíveis: ${skill.allowed_archetypes.join(', ')}${isAllowedForCurrentWeapon ? '\n✅ Pode ser ativada com a arma atual.' : '\n🔒 Equipe uma arma compatível para ativar. O aprendizado não será perdido.'}`}
                  onClick={() => canToggle && onToggleSkill && onToggleSkill(skillKey)}
                  className={`p-2 bg-slate-950 border transition rounded-lg flex items-center gap-2 relative select-none overflow-hidden ${
                    isActive
                      ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/50'
                      : isAllowedForCurrentWeapon
                      ? 'border-slate-800 hover:border-amber-400 cursor-pointer'
                      : 'border-slate-800/60 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Overlay translúcido de Cooldown ativo */}
                  {cdSecondsRemaining && (
                    <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center z-20 backdrop-blur-[1px]">
                      <span className="text-[10px] font-mono font-bold text-amber-400 animate-pulse">
                        ⏳ {cdSecondsRemaining}s
                      </span>
                    </div>
                  )}

                  {isActive && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-white shadow ring-2 ring-slate-950 z-10">
                      ✓
                    </div>
                  )}
                  <span className="text-base flex-shrink-0">{skill.icon}</span>
                  <div className="truncate min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-amber-300 truncate">{skill.name}</div>
                    {!isAllowedForCurrentWeapon && !isActive && <div className="truncate text-[8px] text-slate-500">Aprendida · arma atual incompatível</div>}
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="text-sky-400">{skill.mana_cost} MP</span>
                      <span className="text-slate-400 text-[8px]">{formatArchetype(skill.allowed_archetypes)}</span>
                      <span className="text-amber-400/80 text-[8px]">⏱️ {skill.cooldown_seconds || 2.25}s</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2.5 text-center text-slate-500 text-[10px] bg-slate-950 rounded-lg border border-slate-800">
            Derrote Bosses ou abra baús para encontrar Tomes de Habilidade!
          </div>
        )}
      </div>
    </div>
  );
}
