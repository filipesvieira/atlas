interface TacticalStanceSelectorProps {
  currentStance?: string;
  onSelectStance: (stance: string) => void;
}

export function TacticalStanceSelector({
  currentStance = 'balanced',
  onSelectStance,
}: TacticalStanceSelectorProps) {
  const stances = [
    {
      id: 'offensive',
      label: '⚔️ Ofensiva',
      sub: '+35% Atk | -20% Def',
      title: 'Ofensiva: Aumenta o dano causado. Autocura de emergência (15 MP) ativa quando HP < 35%.',
      color: 'hover:border-rose-500 text-rose-300',
      activeColor: 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-rose-500/10',
    },
    {
      id: 'balanced',
      label: '⚖️ Equilibrada',
      sub: 'Atributos Padrão',
      title: 'Equilibrada: Atributos normais. Autocura de emergência (15 MP) ativa quando HP < 35%.',
      color: 'hover:border-amber-500 text-amber-300',
      activeColor: 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-amber-500/10',
    },
    {
      id: 'defensive',
      label: '🛡️ Defensiva',
      sub: '+50% Def | -25% Atk',
      title: 'Defensiva: Foco em sobrevivência. Autocura de emergência antecipada (15 MP) ativa quando HP < 50%.',
      color: 'hover:border-sky-500 text-sky-300',
      activeColor: 'bg-sky-950/40 border-sky-500 text-sky-300 shadow-sky-500/10',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2">
      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
        <h3 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
          <span>🎯</span> Posturas Táticas
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">Estratégia de Combate</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stances.map((stance) => {
          const isSelected = currentStance === stance.id;
          return (
            <button
              key={stance.id}
              onClick={() => onSelectStance(stance.id)}
              title={stance.title}
              className={`p-2 rounded-lg border text-center transition-all ${
                isSelected
                  ? `${stance.activeColor} shadow-md`
                  : `bg-slate-950 border-slate-800 ${stance.color}`
              }`}
            >
              <div className="text-xs font-bold truncate">{stance.label}</div>
              <div className="text-[9px] font-mono opacity-80 mt-0.5">{stance.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
