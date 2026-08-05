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
  onToggleSkill?: (skill: string) => void;
}

export function SkillBar({ masteries = {}, learnedSkills = [], activeSkills = [], onToggleSkill }: SkillBarProps) {
  const getLevel = (tries: number | undefined) => {
    if (!tries) return 10;
    return 10 + Math.floor(Math.pow(tries, 0.35) * 3);
  };

  const getMasteryProgress = (tries: number | undefined) => {
    if (!tries) return 0;
    const currentLevel = getLevel(tries);
    const nextLevel = currentLevel + 1;
    
    // Tries needed for currentLevel: tries = ((currentLevel - 10) / 3) ^ (1/0.35)
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

  const skillsMap: Record<string, { name: string; icon: string; cost: string; desc: string }> = {
    whirlwind: { name: 'Golpe Giratório', icon: '🌀', cost: '18 MP', desc: 'Dano físico em área a toda a horda' },
    fireball: { name: 'Bola de Fogo', icon: '🔥', cost: '25 MP', desc: 'Dano mágico concentrado no alvo principal' },
    multishot: { name: 'Tiro Quádruplo', icon: '🏹', cost: '15 MP', desc: 'Dispara flechas em múltiplos alvos' },
    divine_heal: { name: 'Cura Divina', icon: '✨', cost: '30 MP', desc: 'Restaura +100 HP instantaneamente' },
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
          <MasteryRow label="⚔️ Espada" tries={masteries.sword_mastery} color="text-amber-400" />
          <MasteryRow label="🪓 Machado" tries={masteries.axe_mastery} color="text-amber-400" />
          <MasteryRow label="🛡️ Escudo" tries={masteries.shield_mastery} color="text-sky-400" />
          <MasteryRow label="🏹 Distância" tries={masteries.distance_mastery} color="text-emerald-400" />
          <MasteryRow label="⛏️ Clava" tries={masteries.club_mastery} color="text-amber-400" />
          <MasteryRow label="🔮 Magia" tries={masteries.magic_mastery} color="text-fuchsia-400" />
        </div>
      </div>

      {/* Habilidades Aprendidas via Skill Books */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Habilidades Aprendidas ({learnedSkills.length})
        </div>

        {learnedSkills.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {learnedSkills.map((skillKey) => {
              const skill = skillsMap[skillKey] || {
                name: skillKey,
                icon: '📜',
                cost: '15 MP',
                desc: 'Habilidade Mística',
              };

              const isActive = activeSkills.includes(skillKey);

              return (
                <div
                  key={skillKey}
                  title={skill.desc}
                  onClick={() => onToggleSkill && onToggleSkill(skillKey)}
                  className={`p-2 bg-slate-950 border ${isActive ? 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'border-slate-800'} hover:border-amber-400 rounded-lg flex items-center gap-2 transition cursor-pointer relative`}
                >
                  {isActive && <div className="absolute -top-1 -right-1 bg-amber-500 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-white shadow">✓</div>}
                  <span className="text-base">{skill.icon}</span>
                  <div className="truncate">
                    <div className="text-[11px] font-bold text-amber-300 truncate">{skill.name}</div>
                    <div className="text-[9px] font-mono text-sky-400">{skill.cost}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2 text-center text-slate-500 text-[10px] bg-slate-950 rounded-lg border border-slate-800">
            Use Livros de Habilidade (Skill Books) para aprender feitiços!
          </div>
        )}
      </div>
    </div>
  );
}
