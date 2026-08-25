import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

interface TacticalStanceSelectorProps {
  currentStance?: string;
  onSelectStance: (stance: string) => void;
  onOpenCombatHelp?: () => void;
}

export function TacticalStanceSelector({
  currentStance = 'balanced',
  onSelectStance,
  onOpenCombatHelp,
}: TacticalStanceSelectorProps) {
  const stances = [
    {
      id: 'offensive',
      label: 'Ofensiva',
      sub: '+35% Atk | -20% Def',
      title: 'Ofensiva: Aumenta o dano do ataque (+35% Atk) com redução de defesa (-20% Def).',
      slotKey: 'mainhand',
      weaponKey: 'sword',
      color: 'border-slate-800 text-rose-300 hover:border-rose-500',
      activeColor: 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
    },
    {
      id: 'balanced',
      label: 'Equilibrada',
      sub: 'Atributos Padrão',
      title: 'Equilibrada: Mantém os atributos normais e equilibrados do personagem sem penalidades.',
      slotKey: '',
      weaponKey: '',
      color: 'border-slate-800 text-amber-300 hover:border-amber-500',
      activeColor: 'bg-amber-950/60 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.4)]',
    },
    {
      id: 'defensive',
      label: 'Defensiva',
      sub: '+50% Def | -25% Atk',
      title: 'Defensiva: Foco em proteção (+50% Def) com redução do dano de ataque (-25% Atk).',
      slotKey: 'offhand',
      weaponKey: 'shield',
      color: 'border-slate-800 text-sky-300 hover:border-sky-500',
      activeColor: 'bg-sky-950/60 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.4)]',
    },
  ];

  return (
    <div className="pixel-card rounded-xl p-3 space-y-2">
      <div className="pixel-card-header">
        <h3 className="font-pixel-heading text-xs text-amber-400 flex items-center gap-1.5">
          <span>🎯 Posturas Táticas</span>
        </h3>
        <div className="flex items-center gap-2">
          {onOpenCombatHelp && (
            <button
              onClick={onOpenCombatHelp}
              className="pixel-btn pixel-btn-dark px-2 py-0.5 text-[10px] font-pixel-body"
              title="Entenda as posturas táticas e os estilos de combate"
            >
              <span>❓ Estilos</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 font-pixel-body">
        {stances.map((stance) => {
          const isSelected = currentStance === stance.id;
          return (
            <button
              key={stance.id}
              onClick={() => onSelectStance(stance.id)}
              title={stance.title}
              className={`p-2 pixel-slot rounded text-center transition-all flex flex-col items-center justify-center gap-1 ${
                isSelected
                  ? `${stance.activeColor}`
                  : `bg-slate-950/80 ${stance.color}`
              }`}
            >
              {stance.id === 'offensive' ? (
                <PixelItemSprite weaponType="sword" size="sm" />
              ) : stance.id === 'defensive' ? (
                <PixelItemSprite slotType="offhand" size="sm" />
              ) : (
                <span className="text-sm">⚖️</span>
              )}
              <div className="text-[11px] font-bold font-pixel-heading truncate">{stance.label}</div>
              <div className="text-[8px] opacity-80 mt-0.5">{stance.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}