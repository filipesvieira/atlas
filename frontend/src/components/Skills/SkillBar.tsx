import { useEffect, useState } from 'react';
import { loadGameCatalog, SkillCatalogEntry } from '../../game/GameCatalog';
import { SkillEmblem } from '../../game/registries/SkillEmblemRegistry';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

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
  compact?: boolean;
}

const getMasteryLevel = (tries: number | undefined) => {
  if (!tries) return 10;
  return 10 + Math.floor(Math.pow(tries, 0.35) * 3);
};

const getMasteryProgress = (tries: number | undefined) => {
  if (!tries) return 0;
  const currentLevel = getMasteryLevel(tries);
  const nextLevel = currentLevel + 1;
  const triesForCurrent = Math.pow((currentLevel - 10) / 3, 1 / 0.35);
  const triesForNext = Math.pow((nextLevel - 10) / 3, 1 / 0.35);
  const progress = ((tries - triesForCurrent) / (triesForNext - triesForCurrent)) * 100;
  return Math.max(0, Math.min(100, progress));
};

interface MasteryRowProps {
  label: string;
  slotKey?: string;
  weaponKey?: string;
  tries?: number;
  color: string;
}

const MasteryRow = ({ label, slotKey, weaponKey, tries, color }: MasteryRowProps) => {
  const level = getMasteryLevel(tries);
  const progress = getMasteryProgress(tries);
  return (
    <div className="flex flex-col bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800 gap-1 relative overflow-hidden">
      <div className="flex justify-between items-center z-10 relative">
        <span className="text-slate-300 flex items-center gap-1">
          <PixelItemSprite slotType={slotKey} weaponType={weaponKey} size="sm" />
          <span>{label}</span>
        </span>
        <span className={`${color} font-bold font-pixel-heading text-[10px]`}>Nv. {level}</span>
      </div>
      <div className="w-full pixel-bar-bg h-2 rounded overflow-hidden z-10 relative">
        <div className="bg-amber-400 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};

const formatArchetype = (archetypes: string[] = []) => {
  if (archetypes.length >= 3) return 'Universal';
  if (archetypes.includes('melee')) return 'Melee';
  if (archetypes.includes('distance')) return 'Distância';
  if (archetypes.includes('magic')) return 'Magia';
  return 'Habilidade';
};

export function SkillBar({
  masteries = {},
  learnedSkills = [],
  activeSkills = [],
  skillCooldowns = {},
  primaryArchetype = 'melee',
  onToggleSkill,
  compact = false,
}: SkillBarProps) {
  const safeLearnedSkills = learnedSkills || [];
  const safeActiveSkills = activeSkills || [];
  const safeMasteries = masteries || {};

  const [catalogSkills, setCatalogSkills] = useState<Record<string, SkillCatalogEntry>>({});
  const [compactExpanded, setCompactExpanded] = useState(false);

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

  if (compact && !compactExpanded) {
    const compactRows = [
      ['Espada', safeMasteries.sword_mastery, 'text-amber-400'],
      ['Machado', safeMasteries.axe_mastery, 'text-amber-400'],
      ['Escudo', safeMasteries.shield_mastery, 'text-sky-400'],
      ['Dist.', safeMasteries.distance_mastery, 'text-emerald-400'],
      ['Clava', safeMasteries.club_mastery, 'text-amber-400'],
      ['Magia', safeMasteries.magic_mastery, 'text-fuchsia-400'],
    ] as const;

    return (
      <div className="pixel-card-gold rounded-xl p-2.5 space-y-2">
        <div className="pixel-card-header pixel-card-header-gold">
          <h3 className="font-pixel-heading text-xs text-amber-400 flex items-center gap-1.5">
            <PixelItemSprite name="livro" size="sm" />
            <span>Maestrias</span>
          </h3>
          <button onClick={() => setCompactExpanded(true)} className="pixel-btn pixel-btn-dark px-1.5 py-0.5 text-[9px]">Abrir</button>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[9px] font-pixel-body">
          {compactRows.map(([label, tries, color]) => (
            <div key={label} className="rounded border border-slate-800 bg-slate-950/80 px-1.5 py-1 text-center">
              <div className="text-slate-500 truncate">{label}</div>
              <div className={`${color} font-pixel-heading text-[9px]`}>Nv.{getMasteryLevel(tries)}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[9px] font-pixel-body text-slate-400 border-t border-slate-800 pt-1.5">
          <span>Habilidades {safeLearnedSkills.length}</span>
          <span className="text-amber-400">Ativas {safeActiveSkills.length}/4</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`pixel-card-gold rounded-xl space-y-3 ${compact ? 'p-2.5' : 'p-3'}`}>
      {/* Header */}
      <div className="pixel-card-header pixel-card-header-gold">
        <h3 className="font-pixel-heading text-xs text-amber-400 flex items-center gap-1.5">
          <PixelItemSprite name="livro" size="sm" />
          <span>Maestrias & Habilidades</span>
        </h3>
        {compact ? (
          <button onClick={() => setCompactExpanded(false)} className="pixel-btn pixel-btn-dark px-1.5 py-0.5 text-[9px]">Recolher</button>
        ) : (
          <span className="text-[10px] text-slate-400 font-pixel-body">Classless System</span>
        )}
      </div>

      {/* Maestrias de Armas (Progressão por Uso) */}
      <div className="space-y-1.5 bg-slate-950/90 p-2.5 rounded-lg border border-slate-800">
        <div className="text-[10px] font-pixel-heading text-slate-400 uppercase tracking-wider mb-1">
          Maestrias de Combate (Por Uso)
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-pixel-body">
          <MasteryRow label="Espada" weaponKey="sword" tries={safeMasteries.sword_mastery} color="text-amber-400" />
          <MasteryRow label="Machado" weaponKey="axe" tries={safeMasteries.axe_mastery} color="text-amber-400" />
          <MasteryRow label="Escudo" slotKey="offhand" tries={safeMasteries.shield_mastery} color="text-sky-400" />
          <MasteryRow label="Distância" weaponKey="bow" tries={safeMasteries.distance_mastery} color="text-emerald-400" />
          <MasteryRow label="Clava" weaponKey="club" tries={safeMasteries.club_mastery} color="text-amber-400" />
          <MasteryRow label="Magia" weaponKey="wand" tries={safeMasteries.magic_mastery} color="text-fuchsia-400" />
        </div>
      </div>

      {/* Habilidades permanentes e aprendidas por livros */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-pixel-heading text-slate-400 uppercase tracking-wider">
          <span>Habilidades ({safeLearnedSkills.length})</span>
          <span className="text-amber-400 font-normal">Ativas: {safeActiveSkills.length}/4</span>
        </div>
        <p className="rounded border border-sky-900/60 bg-sky-950/40 px-2 py-1.5 text-[9px] leading-relaxed text-sky-200/90 font-pixel-body">
          ✨ No nível 10 você desbloqueia Golpe Giratório, Tiro Quádruplo e Nova Arcana. 📖 As demais habilidades vêm de livros; a arma compatível é exigida somente para ativá-las.
        </p>

        {safeLearnedSkills.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {safeLearnedSkills.map((skillKey) => {
              const skill = catalogSkills[skillKey] || {
                key: skillKey,
                name: skillKey,
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
                  title={`${skill.description}\nAprendida permanentemente: sim\nTempo de Recarga: ${skill.cooldown_seconds || 2.25}s\nArquétipos: ${skill.allowed_archetypes.join(', ')}`}
                  onClick={() => canToggle && onToggleSkill && onToggleSkill(skillKey)}
                  className={`p-2 pixel-slot rounded flex items-center gap-2 relative select-none overflow-hidden ${
                    isActive
                      ? 'border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-400'
                      : isAllowedForCurrentWeapon
                      ? 'border-slate-800 hover:border-amber-400 cursor-pointer'
                      : 'border-slate-800/60 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Overlay translúcido de Cooldown ativo */}
                  {cdSecondsRemaining && (
                    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-20 backdrop-blur-[1px]">
                      <span className="pixel-alert-icon text-[10px] font-pixel-heading font-bold text-amber-300">
                        ⏳ {cdSecondsRemaining}s
                      </span>
                    </div>
                  )}

                  {isActive && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold text-slate-950 shadow ring-1 ring-slate-950 z-10">
                      ✓
                    </div>
                  )}
                  
                  {/* Ícone Pixel Art da Habilidade */}
                  <div className="flex-shrink-0">
                    <SkillEmblem skillKey={skillKey} size={24} />
                  </div>

                  <div className="truncate min-w-0 flex-1 font-pixel-body">
                    <div className="text-[11px] font-bold text-amber-300 truncate">{skill.name}</div>
                    {!isAllowedForCurrentWeapon && !isActive && <div className="truncate text-[8px] text-slate-500">Incompatível</div>}
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span className="text-sky-300 font-bold">{skill.mana_cost} MP</span>
                      <span className="text-[8px]">{formatArchetype(skill.allowed_archetypes)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2.5 text-center text-slate-500 text-[10px] font-pixel-body bg-slate-950/80 rounded-lg border border-slate-800">
            Derrote Monstros e Chefes para obter Livros de Magias!
          </div>
        )}
      </div>
    </div>
  );
}