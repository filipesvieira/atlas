import { useState, useEffect, useRef } from 'react';
import { GameCanvas } from '../Viewport/GameCanvas';
import { TibiaEquipmentGrid } from '../Inventory/TibiaEquipmentGrid';
import { ExpeditionRegionSelector } from '../Expedition/ExpeditionRegionSelector';
import { SkillBar } from '../Skills/SkillBar';
import { CampManagementModal } from '../Camp/CampManagementModal';
import { ResourceDepotModal } from '../Camp/ResourceDepotModal';
import { SkinSelectionModal } from '../Skins/SkinSelectionModal';
import { SkinRegistryService } from '../../game/registries/SkinRegistry';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useGameCatalog } from '../../hooks/useGameCatalog';
import { EconomyHubModal } from '../Economy/EconomyHubModal';
import type { ImportantNotification } from '../../types/notifications';
import { CommunicationConsole } from '../Social/CommunicationConsole';
import { PlayerInteractionLayer } from '../Social/PlayerInteractionLayer';

interface DashboardGridProps {
  token: string;
  character: any;
  onCharacterUpdate?: (char: any) => void;
  onImportantNotification?: (notification: ImportantNotification) => void;
}

export function DashboardGrid({ token, character: initialChar, onCharacterUpdate, onImportantNotification }: DashboardGridProps) {
  const [isDepotOpen, setIsDepotOpen] = useState(false);
  const legacySkinMigrationRef = useRef<Set<string>>(new Set());
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [isSkinModalOpen, setIsSkinModalOpen] = useState(false);
  const [isEconomyOpen, setIsEconomyOpen] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [isWorldFocusMode, setIsWorldFocusMode] = useState(false);
  const [backpackOpenRequest, setBackpackOpenRequest] = useState(0);
  const [mapOpenRequest, setMapOpenRequest] = useState(0);
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
		autoPotionSettings,
		autoPotionState,
    economy,
    activeBuffs,
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
    attackCooldownRemaining,
    logs,
    connected,
    chatMessages,
    onlineCount,
    socialError,
    sendWorldChat,
    blockChatCharacter,
    reportChatMessage,
    requestPublicProfile,
    lastPublicProfile,
    clearPublicProfile,
		pendingDuelChallenges,
		pvpMatchNotice,
		pvpArenaWaiting,
		pvpCombat,
        pvpHistory,
        pvpReplay,
        pvpMatchmaking,
		createDuelChallenge,
		respondDuelChallenge,
		confirmPvPMatch,
        requestPvPHistory,
        requestPvPReplay,
        joinPvPMatchmaking,
        leavePvPMatchmaking,
        requestPvPMatchmakingStatus,
        clearPvPReplay,
		setEquippedSkin,
    moveHero,
    toggleExpedition,
    setAutoResumeExpedition,
    equipItem,
    unequipItem,
    discardResource,
    changeRegion,
    setStance,
    toggleSkill,
    allocateStat,
    bulkSell,
    startBuildingUpgrade,
    moveCampBuilding,
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
    consumeFood,
    requestEconomySync,
    claimPendingCraft,
    claimPendingResources,
    createHeroDesire,
    cancelHeroDesire,
    claimArmoryItem,
    transferTreasuryGold,
    updateTreasuryPolicy,
		updateAutoPotionSettings,
    setOnCombatEvent,
    setOnImportantNotification,
  } = useGameSocket(token, initialChar.id, initialChar);

  const char = liveChar || initialChar;

  useEffect(() => { if (connected) requestPvPMatchmakingStatus(); }, [connected]);

  // Notifica o App.tsx para atualizar a label superior do header em tempo real quando o nível mudar
  useEffect(() => {
    if (char && onCharacterUpdate) {
      onCharacterUpdate(char);
    }
    if (char?.id) {
      SkinRegistryService.setCharacterId(char.id, char.equipped_skin_key);
      // Migração transparente: personagens existentes tinham a skin somente no
      // localStorage. O sentinel vazio da migration 000027 permite promovê-la
      // uma única vez para o backend sem sobrescrever a escolha do jogador.
      if (!char.equipped_skin_key && connected && !legacySkinMigrationRef.current.has(char.id)) {
        legacySkinMigrationRef.current.add(char.id);
        setEquippedSkin(SkinRegistryService.getActiveSkinId(char.id));
      }
    }
  }, [char, connected, onCharacterUpdate, setEquippedSkin]);

  useEffect(() => {
    setOnImportantNotification(onImportantNotification || (() => undefined));
    return () => setOnImportantNotification(() => undefined);
  }, [onImportantNotification, setOnImportantNotification]);

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
    <div className="p-2.5 xl:p-3 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 xl:gap-3">
        {/* Painel Esquerdo: Equipamentos & Status do Aventureiro (3 Colunas) */}
        <div className="md:col-span-3 xl:col-span-2 flex flex-col gap-2.5 xl:gap-3">
          <TibiaEquipmentGrid
            compact
            character={char}
            derivedStats={derivedStats}
            equipment={inventory.equipment}
            backpack={inventory.backpack}
            cap={totalCapacity}
            totalAttack={totalAttack}
            totalDefense={totalDefense}
            storageUsed={camp?.storage_used || 0}
            storageCapacity={camp?.storage_capacity || 500}
            activeConstructionSlots={camp?.active_construction_slots || 0}
            maxConstructionSlots={camp?.max_construction_slots || 1}
            onOpenDepot={() => setIsDepotOpen(true)}
            onOpenCamp={() => setIsCampModalOpen(true)}
            onEquipItem={equipItem}
            onUnequipItem={unequipItem}
            onBulkSell={bulkSell}
            onLearnBlueprint={learnBuildingBlueprint}
            openBackpackRequest={backpackOpenRequest}
          />

          {/* Card de Status & Experiência Balanceada (Abaixo de Equipamentos) */}
          <div className="pixel-card rounded-xl p-2.5 text-xs space-y-2">
            <div className="pixel-card-header">
              <h3 className="font-pixel-heading text-xs text-amber-400 flex items-center gap-1.5">
                <span>📊 Dados do Aventureiro</span>
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAdvancedStats((value) => !value)}
                  className="pixel-btn pixel-btn-dark px-1.5 py-0.5 text-[9px]"
                  title="Mostrar ou ocultar atributos primários"
                >
                  {showAdvancedStats ? 'Menos' : 'Detalhes'}
                </button>
                <button
                  onClick={() => setIsSkinModalOpen(true)}
                  className="pixel-btn pixel-btn-purple px-2 py-0.5 text-[10px]"
                  title="Personalizar Skin e Visual do Herói"
                >
                  <span>🎭 Skins</span>
                </button>
              </div>
            </div>
            <div className="flex justify-between font-pixel-body">
              <span className="text-slate-400">Nível Atual:</span>
              <span className="text-amber-300 font-bold font-pixel-heading text-[11px]">Nível {char.level}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-pixel-body text-slate-400">
                <span>XP ({xpPercent}%)</span>
                <span>{safeXP.toLocaleString()} / {xpNextLevel.toLocaleString()}</span>
              </div>
              <div className="w-full pixel-bar-bg rounded h-3 overflow-hidden">
                <div className="pixel-bar-xp h-full transition-all duration-300" style={{ width: `${xpPercent}%` }}></div>
              </div>
            </div>

            {/* Atributos de Combate: Ataque e Defesa */}
            <div className="grid grid-cols-2 gap-2 font-pixel-body pt-1.5 border-t border-slate-800/80 text-[11px]">
              <div className="flex justify-between items-center bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1">
                  {isMagicArchetype ? <PixelItemSprite weaponType="wand" size="sm" /> : isDistanceArchetype ? <PixelItemSprite weaponType="bow" size="sm" /> : <PixelItemSprite weaponType="sword" size="sm" />}
                  <span>{isMagicArchetype ? 'Magia:' : isDistanceArchetype ? 'Distância:' : 'Ataque:'}</span>
                </span>
                <span className={`font-bold font-pixel-heading text-xs ${isMagicArchetype ? 'text-cyan-300' : isDistanceArchetype ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {totalAttack}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1">
                  <PixelItemSprite slotType="offhand" size="sm" />
                  <span>Defesa:</span>
                </span>
                <span className="text-sky-300 font-bold font-pixel-heading text-xs">{totalDefense}</span>
              </div>
            </div>

            {/* Painel de Atributos Primários & Pontos Disponíveis */}
            <div className={`${showAdvancedStats ? 'block' : 'hidden'} pt-2 border-t border-slate-800/80 space-y-1.5`}>
              <div className="flex justify-between items-center text-[11px] font-pixel-body">
                <span className="text-slate-300 font-bold font-pixel-heading text-[10px]">Atributos Primários</span>
                <span className={`font-bold font-pixel-heading px-1.5 py-0.5 rounded text-[10px] ${char.unspent_points > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                  {char.unspent_points || 0} Pontos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-pixel-body">
                {/* FOR / STR */}
                <div
                  className="flex justify-between items-center bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800"
                  title="FOR: +1.5 Ataque Físico Melee por ponto, +15 Capacidade (Cap) por ponto base."
                >
                  <span className="text-slate-300 flex items-center gap-1">⚔️ FOR: <strong className="text-amber-400 font-pixel-heading text-[11px]">{char.str || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('str')}
                      className="pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px]"
                      title="+1.5 Dano Melee, +15 Cap"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* DES / DEX */}
                <div
                  className="flex justify-between items-center bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800"
                  title="DES: +1.5 Ataque à Distância, +Crítico assintótico com Diminishing Returns (até 50% Hard Cap)."
                >
                  <span className="text-slate-300 flex items-center gap-1">🏹 DES: <strong className="text-emerald-400 font-pixel-heading text-[11px]">{char.dex || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('dex')}
                      className="pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px]"
                      title="+1.5 Dano Distância, +Crítico Assintótico"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* INT / INT */}
                <div
                  className="flex justify-between items-center bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800"
                  title="INT: +2.0 Ataque Mágico, +12 Max Mana, +Regeneração contínua de MP (até 6.0 MP/s)."
                >
                  <span className="text-slate-300 flex items-center gap-1">🔮 INT: <strong className="text-sky-400 font-pixel-heading text-[11px]">{char.int_stat || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('int')}
                      className="pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px]"
                      title="+2.0 Dano Mágico, +12 Max Mana, +Regen MP"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* VIT / VIT */}
                <div
                  className="flex justify-between items-center bg-slate-950/80 px-2 py-1.5 rounded border border-slate-800"
                  title="VIT: +25 Max HP, +0.5 Defesa Física por ponto base."
                >
                  <span className="text-slate-300 flex items-center gap-1">❤️ VIT: <strong className="text-rose-400 font-pixel-heading text-[11px]">{char.vit || 5}</strong></span>
                  {char.unspent_points > 0 && (
                    <button
                      onClick={() => allocateStat('vit')}
                      className="pixel-btn pixel-btn-gold px-2 py-0.5 text-[10px]"
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

        {/* Painel Central: Viewport de Combate 2D, Acampamento & Notificações (6 Colunas) */}
        <div className="md:col-span-6 xl:col-span-8 flex flex-col gap-2.5 xl:gap-3">
          {/* Canvas PixiJS com a Arena em Pixel Art e Barra de Ação/Posturas */}
          <GameCanvas
            setOnCombatEvent={setOnCombatEvent}
            character={char}
            derivedStats={derivedStats}
            activeBuffs={activeBuffs}
			autoPotionSettings={autoPotionSettings}
			autoPotionState={autoPotionState}
            skillCooldowns={skillCooldowns}
            attackCooldownRemaining={attackCooldownRemaining}
            mainHandItem={inventory.equipment?.mainhand}
            onToggleSkill={toggleSkill}
            currentStance={activeStance}
            onSelectStance={setStance}
			onUpdateAutoPotionSettings={updateAutoPotionSettings}
            onMoveHero={moveHero}
            onMoveCampBuilding={moveCampBuilding}
            isWorldFocusMode={isWorldFocusMode}
            onWorldFocusModeChange={setIsWorldFocusMode}
            onOpenBackpack={() => setBackpackOpenRequest((request) => request + 1)}
            onOpenDepot={() => setIsDepotOpen(true)}
            onOpenCamp={() => setIsCampModalOpen(true)}
            onOpenSettlement={() => setIsEconomyOpen(true)}
            onOpenWorldMap={() => setMapOpenRequest((request) => request + 1)}
            onToggleExpedition={toggleExpedition}
            isExpeditionActive={isExpeditionActive}
            isConnected={connected}
            pvpCombat={pvpCombat}
          />

          <CommunicationConsole
            selfCharacterId={char.id}
            logs={logs}
            worldMessages={chatMessages}
            onlineCount={onlineCount}
            error={socialError}
            onSendWorldMessage={sendWorldChat}
            onBlock={blockChatCharacter}
            onReport={reportChatMessage}
            onInspect={requestPublicProfile}
          />
        </div>

        {/* Painel Direito: Controles & Estatísticas do Personagem (3 Colunas) */}
        <div className="md:col-span-3 xl:col-span-2 flex flex-col gap-2.5 xl:gap-3">
          {/* Card de Ação Principal: Controle da Expedição */}
          <div className="pixel-card-gold rounded-xl p-2.5 space-y-1.5">
            <div className="pixel-card-header pixel-card-header-gold">
              <h3 className="font-pixel-heading text-xs text-amber-400 flex items-center gap-1.5">
                <span>🚀 Controle de Expedição</span>
              </h3>
              <span className={connected ? 'text-emerald-400 font-pixel-heading text-[10px]' : 'text-rose-400 font-pixel-heading text-[10px]'}>
                {connected ? '● ON' : '○ OFF'}
              </span>
            </div>

            <button
              onClick={toggleExpedition}
              disabled={!connected}
              title={isExpeditionActive ? 'Encerrar a visualização da expedição e retornar ao acampamento.' : 'Iniciar uma nova expedição na região selecionada.'}
              className={`w-full py-2 pixel-btn text-[11px] ${
                isExpeditionActive ? 'pixel-btn-crimson' : 'pixel-btn-gold'
              }`}
            >
              {isExpeditionActive ? '⛺ Voltar ao Acampamento' : '⚔️ Iniciar Expedição'}
            </button>

			<button onClick={() => setIsEconomyOpen(true)} disabled={!connected} title="Administrar moradores, trabalhos, receitas, tesouraria e arsenal." className="w-full py-2 pixel-btn pixel-btn-emerald text-[11px] disabled:opacity-40">
			  🏘️ Gerenciar Assentamento & Trabalhos
			</button>

            {/* Toggle de Auto-Retorno Pós-Derrota no Acampamento */}
            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-lg p-2 mt-1.5">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 font-pixel-body">Retorno automático</span>
                <span className="text-[10px] text-slate-400 font-pixel-body">Ao recuperar 100% no acampamento</span>
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

          {/* Seletor de Regiões de Expedição por Nível */}
          <ExpeditionRegionSelector
            currentRegion={activeRegion}
            characterLevel={char.level}
            unlockedRegions={unlockedRegions || char.unlocked_regions}
            discoveredLoot={discoveredLoot}
            currentStage={currentStage}
            maxStages={maxStages}
            isBossStage={isBossStage}
            compact
			openMapRequest={mapOpenRequest}
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
            compact
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
        onEquipSkin={setEquippedSkin}
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
		onConsumeFood={consumeFood}
		onSync={requestEconomySync}
		onClaimPendingCraft={claimPendingCraft}
		onClaimPendingResources={claimPendingResources}
		onCreateHeroDesire={createHeroDesire}
		onCancelHeroDesire={cancelHeroDesire}
		onClaimArmoryItem={claimArmoryItem}
		onTransferTreasuryGold={transferTreasuryGold}
		onUpdateTreasuryPolicy={updateTreasuryPolicy}
	  />}
      <PlayerInteractionLayer
        pendingDuelChallenges={pendingDuelChallenges}
        pvpMatchNotice={pvpMatchNotice}
        pvpArenaWaiting={pvpArenaWaiting}
        matchmaking={pvpMatchmaking}
        history={pvpHistory}
        replay={pvpReplay}
        onRespondDuelChallenge={respondDuelChallenge}
        onConfirmPvPMatch={confirmPvPMatch}
        onJoinQueue={joinPvPMatchmaking}
        onLeaveQueue={leavePvPMatchmaking}
        onRequestHistory={requestPvPHistory}
        onRequestReplay={requestPvPReplay}
        onClearReplay={clearPvPReplay}
      />
      {lastPublicProfile && (
        <div className="fixed bottom-[330px] right-3 md:bottom-3 md:right-[410px] z-40 w-64 rounded-lg border border-amber-500/40 bg-slate-950/95 p-3 text-xs shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-pixel-heading text-amber-300">{lastPublicProfile.name}</div>
              <div className="mt-1 text-slate-400">Nível {lastPublicProfile.level} · Rating PvP {lastPublicProfile.rating}</div>
              <div className="mt-1 text-slate-500">Vitórias {lastPublicProfile.wins} · Derrotas {lastPublicProfile.losses}</div>
              {lastPublicProfile.region && <div className="mt-1 text-slate-500">Região: {lastPublicProfile.region}</div>}
            </div>
            <button type="button" onClick={clearPublicProfile} className="text-slate-500 hover:text-slate-200">×</button>
          </div>
		  {lastPublicProfile.character_id !== char.id && (
			<div className="mt-3 rounded border border-amber-700/50 bg-amber-950/20 p-2">
			  <div className="text-[10px] text-amber-100/70">Duelo amistoso: nenhum ouro, item ou recurso fica em risco.</div>
			  <div className="mt-1 text-[9px] text-slate-500">O convite persistente prepara a arena PvP, ainda em construção.</div>
			  <button type="button" onClick={() => createDuelChallenge(lastPublicProfile.character_id)} className="pixel-btn pixel-btn-gold mt-2 w-full px-2 py-1.5 text-[10px]">
				⚔️ Enviar desafio de duelo
			  </button>
			</div>
		  )}
        </div>
      )}
    </div>
  );
}
