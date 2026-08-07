import { useState, useEffect } from 'react';
import { GameCanvas } from '../Viewport/GameCanvas';
import { TibiaEquipmentGrid } from '../Inventory/TibiaEquipmentGrid';
import { ExpeditionRegionSelector } from '../Expedition/ExpeditionRegionSelector';
import { TacticalStanceSelector } from '../Expedition/TacticalStanceSelector';
import { SkillBar } from '../Skills/SkillBar';
import { StarterOnboardingModal } from '../Onboarding/StarterOnboardingModal';
import { useGameSocket } from '../../hooks/useGameSocket';

interface DashboardGridProps {
  token: string;
  character: any;
  onCharacterUpdate?: (char: any) => void;
}

export function DashboardGrid({ token, character: initialChar, onCharacterUpdate }: DashboardGridProps) {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const {
    character: liveChar,
    inventory,
    totalAttack,
    totalDefense,
    activeRegion,
    activeStance,
    currentStage,
    maxStages,
    isBossStage,
    unlockedRegions,
    isExpeditionActive,
    autoResumeExpedition,
    dps,
    logs,
    connected,
    toggleExpedition,
    setAutoResumeExpedition,
    equipItem,
    unequipItem,
    discardItem,
    changeRegion,
    setStance,
    toggleSkill,
    allocateStat,
    chooseStarterPack,
    bulkSell,
    setOnCombatEvent,
  } = useGameSocket(token, initialChar.id, initialChar);

  const char = liveChar || initialChar;

  // Verifica se o personagem já escolheu uma vocação/kit inicial estritamente (Guerreiro, Arqueiro ou Mago)
  const hasChosenStarterPack = Boolean(
    char && char.vocation && (char.vocation === 'Guerreiro' || char.vocation === 'Arqueiro' || char.vocation === 'Mago')
  );
  const showOnboardingModal = isOnboardingOpen || !hasChosenStarterPack;

  // Notifica o App.tsx para atualizar a label superior do header em tempo real quando o nível mudar
  useEffect(() => {
    if (char && onCharacterUpdate) {
      onCharacterUpdate(char);
    }
  }, [char, onCharacterUpdate]);

  // Fórmula de XP Balanceada (progresso real do nível atual)
  const xpNextLevel = char ? (char.level <= 1 ? 250 : Math.floor(250 * Math.pow(char.level, 1.95))) : 250;
  const xpCurrentLevelBase = char ? (char.level <= 1 ? 0 : Math.floor(250 * Math.pow(char.level - 1, 1.95))) : 0;
  const xpPercent = char
    ? Math.max(0, Math.min(100, Math.round(((char.experience - xpCurrentLevelBase) / (xpNextLevel - xpCurrentLevelBase)) * 100)))
    : 0;

  // Cap base de 1000 oz escalado pelo Nível
  const baseCapacity = char ? 1000 + char.level * 10 : 1500;

  return (
    <div className="p-4 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Painel Esquerdo: Equipamentos & Status do Aventureiro (4 Colunas) */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <TibiaEquipmentGrid
            character={char}
            equipment={inventory.equipment}
            backpack={inventory.backpack}
            cap={baseCapacity}
            totalAttack={totalAttack}
            totalDefense={totalDefense}
            health={char.health}
            maxHealth={char.max_health}
            mana={char.mana}
            maxMana={char.max_mana}
            onEquipItem={equipItem}
            onUnequipItem={unequipItem}
            onDiscardItem={discardItem}
            onBulkSell={bulkSell}
          />
        </div>

        {/* Painel Central: Viewport de Combate 2D & Log de Batalha (5 Colunas) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          {/* Canvas PixiJS com a Arena em Pixel Art */}
          <GameCanvas setOnCombatEvent={setOnCombatEvent} />

          {/* Log de Combate WebSocket Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl flex-1 flex flex-col">
            <h3 className="font-semibold text-amber-400 text-xs mb-2 flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span>📜 Log de Batalha & Eventos</span>
              <span className="text-[10px] text-slate-500 font-mono">WebSocket Stream</span>
            </h3>
            <div className="flex-1 max-h-44 overflow-y-auto text-[11px] font-mono text-slate-400 space-y-1.5 pr-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              {logs.map((log, idx) => (
                <p key={idx} className="border-b border-slate-900/60 pb-1 leading-relaxed">
                  <span className="text-amber-500 mr-1 opacity-70">&gt;</span>
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Painel Direito: Controles & Estatísticas do Personagem (3 Colunas) */}
        <div className="md:col-span-3 flex flex-col gap-4">
          {/* Card de Ação Principal: Controle da Expedição */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <h3 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <span>🚀 Controle de Expedição</span>
              </h3>
              <span className={connected ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
                {connected ? '● ON' : '○ OFF'}
              </span>
            </div>

            <button
              onClick={toggleExpedition}
              disabled={!connected}
              className={`w-full py-2.5 font-bold rounded-xl transition-all shadow-lg text-xs ${
                isExpeditionActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isExpeditionActive ? 'Pausar Expedição' : 'Iniciar Expedição'}
            </button>

            {/* Toggle de Auto-Retorno Pós-Derrota no Acampamento */}
            <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 mt-2">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Retornar automaticamente</span>
                <span className="text-[10px] text-slate-400">Ao recuperar 100% de HP e Mana no acampamento</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoResumeExpedition}
                  onChange={(e) => setAutoResumeExpedition(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Modal de Onboarding para Escolha do Kit Inicial */}
          <StarterOnboardingModal
            isOpen={showOnboardingModal}
            isForced={!hasChosenStarterPack}
            onClose={() => setIsOnboardingOpen(false)}
            onSelectPack={(pack) => chooseStarterPack(pack)}
          />

          {/* Seletor de Posturas Táticas */}
          <TacticalStanceSelector currentStance={activeStance} onSelectStance={setStance} />

          {/* Seletor de Regiões de Expedição por Nível */}
          <ExpeditionRegionSelector
            currentRegion={activeRegion}
            characterLevel={char.level}
            unlockedRegions={unlockedRegions || char.unlocked_regions}
            currentStage={currentStage}
            maxStages={maxStages}
            isBossStage={isBossStage}
            onSelectRegion={changeRegion}
          />

          {/* Barra de Maestrias por Uso & Livros de Habilidade */}
          <SkillBar 
            masteries={char.masteries} 
            learnedSkills={char.learned_skills} 
            activeSkills={char.active_skills} 
            onToggleSkill={toggleSkill} 
          />



          {/* Card de Status & Experiência Balanceada */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl text-xs space-y-2.5">
            <h3 className="font-semibold text-amber-400 text-xs border-b border-slate-800 pb-1.5">
              <span>📊 Dados do Aventureiro</span>
            </h3>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Nível Atual:</span>
              <span className="text-amber-300 font-bold">Nível {char.level}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>XP ({xpPercent}%)</span>
                <span>{char.experience - xpCurrentLevelBase} / {xpNextLevel - xpCurrentLevelBase}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${xpPercent}%` }}></div>
              </div>
            </div>
            <div className="flex justify-between font-mono pt-1 border-t border-slate-800">
              <span className="text-slate-400">Poder Ofensivo (DPS):</span>
              <span className="text-rose-400 font-bold">⚔️ {dps} DPS</span>
            </div>
            <div className="flex justify-between font-mono pt-1">
              <span className="text-slate-400">Saldo Bancário:</span>
              <span className="text-amber-300 font-bold">💰 {char.gold_bank} Gold</span>
            </div>

            {/* Painel de Atributos Primários & Pontos Disponíveis */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-slate-300 font-bold">Atributos Primários</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${char.unspent_points > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                  {char.unspent_points || 0} Pontos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                {/* FOR / STR */}
                <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <span className="text-slate-300">⚔️ FOR: <strong className="text-amber-400">{char.str || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('str')}
                      className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition"
                      title="+1.5 Dano Melee, +15 Cap"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* DES / DEX */}
                <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <span className="text-slate-300">🏹 DES: <strong className="text-emerald-400">{char.dex || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('dex')}
                      className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition"
                      title="+1.5 Dano Distância, +0.25% Crítico"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* INT / INT */}
                <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <span className="text-slate-300">🔮 INT: <strong className="text-sky-400">{char.int_stat || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('int')}
                      className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition"
                      title="+2.0 Dano Mágico, +12 Max Mana"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* VIT / VIT */}
                <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <span className="text-slate-300">❤️ VIT: <strong className="text-rose-400">{char.vit || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('vit')}
                      className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition"
                      title="+25 Max HP, +0.5 Defesa"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
