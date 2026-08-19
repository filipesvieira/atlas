import { useState, useEffect } from 'react';
import { GameCanvas } from '../Viewport/GameCanvas';
import { TibiaEquipmentGrid } from '../Inventory/TibiaEquipmentGrid';
import { ExpeditionRegionSelector } from '../Expedition/ExpeditionRegionSelector';
import { TacticalStanceSelector } from '../Expedition/TacticalStanceSelector';
import { SkillBar } from '../Skills/SkillBar';
import { CombatStylesHelpModal } from '../Onboarding/CombatStylesHelpModal';
import { CampManagementModal } from '../Camp/CampManagementModal';
import { ResourceDepotModal } from '../Camp/ResourceDepotModal';
import { SkinSelectionModal } from '../Skins/SkinSelectionModal';
import { SkinRegistryService } from '../../game/registries/SkinRegistry';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useGameCatalog } from '../../hooks/useGameCatalog';
import { EconomyHubModal } from '../Economy/EconomyHubModal';

interface DashboardGridProps {
  token: string;
  character: any;
  onCharacterUpdate?: (char: any) => void;
}

export function DashboardGrid({ token, character: initialChar, onCharacterUpdate }: DashboardGridProps) {
  const [isCombatHelpOpen, setIsCombatHelpOpen] = useState(false);
  const [isDepotOpen, setIsDepotOpen] = useState(false);
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [isSkinModalOpen, setIsSkinModalOpen] = useState(false);
  const [isEconomyOpen, setIsEconomyOpen] = useState(false);
  const { catalog } = useGameCatalog();

  const {
    character: liveChar,
    camp,
    resources,
    salvagePreview,
    derivedStats,
    skillCooldowns,
    inventory,
    discoveredLoot,
    economy,
    craftPreview,
    lastCraftBatchResult,
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
    attackCooldownRemaining,
    logs,
    connected,
    toggleExpedition,
    setAutoResumeExpedition,
    equipItem,
    unequipItem,
    discardItem,
    discardResource,
    changeRegion,
    setStance,
    toggleSkill,
    allocateStat,
    bulkSell,
    startBuildingUpgrade,
    requestSalvagePreview,
    salvageItem,
    salvageBatch,
    learnBuildingBlueprint,
    clearSalvagePreview,
    startGathering,
    cancelGathering,
    claimGatheringRewards,
    requestCraftPreview,
    craftItem,
    requestEconomySync,
    claimPendingCraft,
    claimPendingResources,
    createHeroDesire,
    cancelHeroDesire,
    claimArmoryItem,
    setOnCombatEvent,
  } = useGameSocket(token, initialChar.id, initialChar);

  const char = liveChar || initialChar;

  // Notifica o App.tsx para atualizar a label superior do header em tempo real quando o nível mudar
  useEffect(() => {
    if (char && onCharacterUpdate) {
      onCharacterUpdate(char);
    }
    if (char?.id) {
      SkinRegistryService.setCharacterId(char.id);
    }
  }, [char, onCharacterUpdate]);

  // Curva e percentual são enviados pelo backend autoritativo.
  const safeXP = Math.max(0, char?.experience || 0);
  const xpNextLevel = Math.max(1, char?.xp_required || 250);
  const rawXpPercent = char?.xp_percent ?? ((safeXP / xpNextLevel) * 100);
  const xpPercent = Math.max(0, Math.min(100, Math.floor(rawXpPercent)));

  const selectCombatRegionSafely = (region: string) => {
	if (region !== activeRegion && currentStage > 1) {
	  const confirmed = window.confirm(`Trocar de região reinicia somente o progresso da fase atual (${currentStage}/${maxStages}). Nível, XP, ouro, equipamentos, recursos, receitas e profissões são preservados. Deseja continuar?`);
	  if (!confirmed) return;
	}
	changeRegion(region);
  };

  // Capacidade total autoritativa (1000 + nível*10 + FOR*15 + mochila)
  const totalCapacity = derivedStats?.total_capacity || (char ? 1000 + char.level * 10 + (char.str || 5) * 15 : 1500);

  const isMagicArchetype = derivedStats?.primary_archetype === 'magic' || inventory.equipment?.mainhand?.weapon_type === 'wand' || (inventory.equipment?.mainhand?.magic_attack || 0) > 0;
  const isDistanceArchetype = derivedStats?.primary_archetype === 'distance' || inventory.equipment?.mainhand?.weapon_type === 'bow';

  return (
    <div className="p-4 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Painel Esquerdo: Equipamentos & Status do Aventureiro (3 Colunas) */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <TibiaEquipmentGrid
            character={char}
            derivedStats={derivedStats}
            equipment={inventory.equipment}
            backpack={inventory.backpack}
            cap={totalCapacity}
            totalAttack={totalAttack}
            totalDefense={totalDefense}
            health={char.health}
            maxHealth={char.max_health}
            mana={char.mana}
            maxMana={char.max_mana}
            storageUsed={camp?.storage_used || 0}
            storageCapacity={camp?.storage_capacity || 500}
            activeConstructionSlots={camp?.active_construction_slots || 0}
            maxConstructionSlots={camp?.max_construction_slots || 1}
            onOpenDepot={() => setIsDepotOpen(true)}
            onOpenCamp={() => setIsCampModalOpen(true)}
            onEquipItem={equipItem}
            onUnequipItem={unequipItem}
            onDiscardItem={discardItem}
            onBulkSell={bulkSell}
            onLearnBlueprint={learnBuildingBlueprint}
          />

          {/* Card de Status & Experiência Balanceada (Abaixo de Equipamentos) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl text-xs space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <h3 className="font-semibold text-amber-400 text-xs flex items-center gap-1.5">
                <span>📊 Dados do Aventureiro</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsSkinModalOpen(true)}
                  className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                  title="Personalizar Skin e Visual do Herói"
                >
                  <span>🎭 Skins</span>
                </button>
              </div>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">Nível Atual:</span>
              <span className="text-amber-300 font-bold">Nível {char.level}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>XP ({xpPercent}%)</span>
                <span>{safeXP.toLocaleString()} / {xpNextLevel.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${xpPercent}%` }}></div>
              </div>
            </div>

            {/* Atributos de Combate: Ataque e Defesa */}
            <div className="grid grid-cols-2 gap-2 font-mono pt-1.5 border-t border-slate-800 text-[11px]">
              <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">
                  {isMagicArchetype ? '🔮 Magia:' : isDistanceArchetype ? '🏹 Distância:' : '⚔️ Ataque:'}
                </span>
                <span className={`font-bold ${isMagicArchetype ? 'text-cyan-300' : isDistanceArchetype ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {totalAttack}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800">
                <span className="text-slate-400">🛡️ Defesa:</span>
                <span className="text-sky-300 font-bold">{totalDefense}</span>
              </div>
            </div>

            <div className="flex justify-between font-mono pt-1 text-[11px]">
              <span className="text-slate-400">Poder Ofensivo (DPS):</span>
              <span className="text-rose-400 font-bold">⚔️ {dps} DPS</span>
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
                <div
                  className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800"
                  title="FOR: +1.5 Ataque Físico Melee por ponto, +15 Capacidade (Cap) por ponto base."
                >
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
                <div
                  className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800"
                  title="DES: +1.5 Ataque à Distância, +Crítico assintótico com Diminishing Returns (até 50% Hard Cap)."
                >
                  <span className="text-slate-300">🏹 DES: <strong className="text-emerald-400">{char.dex || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('dex')}
                      className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition"
                      title="+1.5 Dano Distância, +Crítico Assintótico"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* INT / INT */}
                <div
                  className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800"
                  title="INT: +2.0 Ataque Mágico, +12 Max Mana, +Regeneração contínua de MP (até 6.0 MP/s)."
                >
                  <span className="text-slate-300">🔮 INT: <strong className="text-sky-400">{char.int_stat || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('int')}
                      className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition"
                      title="+2.0 Dano Mágico, +12 Max Mana, +Regen MP"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* VIT / VIT */}
                <div
                  className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800"
                  title="VIT: +25 Max HP, +0.5 Defesa Física por ponto base."
                >
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

        {/* Painel Central: Viewport de Combate 2D, Acampamento & Log de Batalha (6 Colunas) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          {/* Canvas PixiJS com a Arena em Pixel Art */}
          <GameCanvas
            setOnCombatEvent={setOnCombatEvent}
            character={char}
            derivedStats={derivedStats}
            skillCooldowns={skillCooldowns}
            attackCooldownRemaining={attackCooldownRemaining}
            mainHandItem={inventory.equipment?.mainhand}
            onToggleSkill={toggleSkill}
          />

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

			<button onClick={() => setIsEconomyOpen(true)} disabled={!connected} className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40">
			  🏘️ Assentamento, Trabalhos & Oficina
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

          {/* Seletor de Posturas Táticas com Botão de Ajuda de Estilos */}
          <TacticalStanceSelector
            currentStance={activeStance}
            onSelectStance={setStance}
            onOpenCombatHelp={() => setIsCombatHelpOpen(true)}
          />

          {/* Seletor de Regiões de Expedição por Nível */}
          <ExpeditionRegionSelector
            currentRegion={activeRegion}
            characterLevel={char.level}
            unlockedRegions={unlockedRegions || char.unlocked_regions}
            discoveredLoot={discoveredLoot}
            currentStage={currentStage}
            maxStages={maxStages}
            isBossStage={isBossStage}
			onSelectRegion={selectCombatRegionSafely}
          />

          {/* Barra de Maestrias por Uso & Livros de Habilidade */}
          <SkillBar 
            masteries={char.masteries} 
            learnedSkills={char.learned_skills} 
            activeSkills={char.active_skills} 
            skillCooldowns={skillCooldowns}
            primaryArchetype={derivedStats?.primary_archetype || 'melee'}
            onToggleSkill={toggleSkill} 
          />
        </div>
      </div>

      {/* Modal do Depósito de Recursos e Troféus */}
      {catalog && (
        <ResourceDepotModal
          isOpen={isDepotOpen}
          onClose={() => setIsDepotOpen(false)}
          resources={resources}
          camp={camp}
          pendingResources={economy?.pending_resources}
          catalogResources={catalog.resources || []}
          onDiscardResource={discardResource}
          onClaimPendingResources={claimPendingResources}
        />
      )}

      {/* Modal de Gestão do Acampamento & Construções */}
      {catalog && (
        <CampManagementModal
          isOpen={isCampModalOpen}
          onClose={() => setIsCampModalOpen(false)}
          camp={camp}
          buildingDefinitions={catalog.campBuildings || []}
          resourceDefinitions={catalog.resources || []}
          resources={resources}
          backpack={inventory.backpack}
          characterGold={char?.gold_bank || 0}
          salvagePreview={salvagePreview}
          onStartUpgrade={startBuildingUpgrade}
          onRequestSalvagePreview={requestSalvagePreview}
          onSalvageItem={salvageItem}
          onSalvageBatch={salvageBatch}
          onClearSalvagePreview={clearSalvagePreview}
        />
      )}

      {/* Modal de Customização de Skin / Visual do Herói */}
      <SkinSelectionModal
        isOpen={isSkinModalOpen}
        onClose={() => setIsSkinModalOpen(false)}
        characterId={char?.id}
      />

      <CombatStylesHelpModal
        isOpen={isCombatHelpOpen}
        onClose={() => setIsCombatHelpOpen(false)}
      />

	  {catalog && <EconomyHubModal
		isOpen={isEconomyOpen}
		onClose={() => setIsEconomyOpen(false)}
		catalog={catalog}
		economy={economy}
		resources={resources}
			craftPreview={craftPreview}
			craftBatchResult={lastCraftBatchResult}
		characterGold={char?.gold_bank || 0}
		onStartGathering={startGathering}
		onCancelGathering={cancelGathering}
		onClaimGathering={claimGatheringRewards}
		onPreviewCraft={requestCraftPreview}
		onCraft={craftItem}
		onSync={requestEconomySync}
		onClaimPendingCraft={claimPendingCraft}
		onClaimPendingResources={claimPendingResources}
		onCreateHeroDesire={createHeroDesire}
		onCancelHeroDesire={cancelHeroDesire}
		onClaimArmoryItem={claimArmoryItem}
	  />}
    </div>
  );
}
