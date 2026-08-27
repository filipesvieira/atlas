import React, { useState, useMemo } from 'react';
import { Item } from '../../hooks/useGameSocket';
import { ResourceAmount } from '../../hooks/useGameSocket';
import { ResourceDefinition } from '../../game/GameCatalog';
import { ItemIcon, getRarityStyle } from '../Inventory/ItemIcon';
import { formatQuantity } from '../../utils/formatters';
import { PixelResourceSprite } from '../../game/registries/PixelResourceRegistry';

interface SalvageModalProps {
  isOpen: boolean;
  onClose: () => void;
  backpack: Item[];
  salvagePreview: { item: Item; yield: ResourceAmount[] } | null;
  definitions?: ResourceDefinition[];
  workbenchLevel?: number;
  efficiencyPercent?: number;
  storageUsed?: number;
  storageCapacity?: number;
  onRequestPreview: (itemId: string) => void;
  onSalvageItem: (itemId: string) => void;
  onSalvageBatch?: (itemIds: string[], safeMode?: boolean) => void;
  onClearPreview: () => void;
}

export const SalvageModal: React.FC<SalvageModalProps> = ({
  isOpen,
  onClose,
  backpack = [],
  salvagePreview,
  definitions = [],
  workbenchLevel = 1,
  efficiencyPercent = 0,
  storageUsed = 0,
  storageCapacity = 500,
  onRequestPreview,
  onSalvageItem,
  onSalvageBatch,
  onClearPreview,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [safeMode, setSafeMode] = useState<boolean>(false);
  const [lastInspectedId, setLastInspectedId] = useState<string | null>(null);

  const safeDefinitions = Array.isArray(definitions) ? definitions.filter(Boolean) : [];
  const defMap = new Map(safeDefinitions.map((d) => [d.key || (d as any).Key || '', d]));
  const safeBackpack = Array.isArray(backpack) ? backpack.filter((it): it is Item => Boolean(it && it.id)) : [];

  // Tamanho máximo do lote por nível da Bancada
  const maxBatchSize = workbenchLevel >= 3 ? 50 : workbenchLevel === 2 ? 15 : 5;
  const isSafeModeUnlocked = workbenchLevel >= 3;

  // Filtra itens desmontáveis
  const salvageableItems = safeBackpack.filter((it) => {
    if (!it) return false;
    const slot = (it.slot_type || '').toLowerCase();
    const kind = ((it as any).item_kind || '').toLowerCase();
    return slot !== 'skill_book' && slot !== 'manual' && kind !== 'skill_book' && kind !== 'construction_manual';
  });

  // Cálculo da chance de sucesso determinística
  const calculateItemChance = (item?: Item | null): number => {
    if (!item) return 50;
    if (safeMode && isSafeModeUnlocked) return 100;
    let base = 65;
    if (workbenchLevel === 2) base = 80;
    if (workbenchLevel >= 3) base = 92;

    let mod = 0;
    switch (item.rarity) {
      case 'Comum':
        mod = 5;
        break;
      case 'Incomum':
        mod = 3;
        break;
      case 'Raro':
        mod = 0;
        break;
      case 'Épico':
        mod = -4;
        break;
      case 'Lendário':
      case 'Mítico':
      case 'Divino':
        mod = -8;
        break;
    }
    const finalVal = base + mod;
    return Math.max(50, Math.min(97, finalVal));
  };

  const handleToggleSelect = (item: Item) => {
    if (!item || !item.id) return;
    setLastInspectedId(item.id);
    if (onRequestPreview) onRequestPreview(item.id);

    setSelectedIds((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      }
      if (prev.length >= maxBatchSize) {
        return prev;
      }
      return [...prev, item.id];
    });
  };

  const handleSelectByRarity = (rarity: string) => {
    const matching = salvageableItems.filter((it) => it && it.rarity === rarity).map((it) => it.id);
    setSelectedIds((prev) => {
      const merged = Array.from(new Set([...prev, ...matching]));
      return merged.slice(0, maxBatchSize);
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(salvageableItems.slice(0, maxBatchSize).map((it) => it.id));
    }
  };

  const selectedItems = useMemo(
    () => salvageableItems.filter((it) => it && selectedIds.includes(it.id)),
    [salvageableItems, selectedIds]
  );

  const inspectedItem = (lastInspectedId ? salvageableItems.find((it) => it.id === lastInspectedId) : null) || selectedItems[0] || null;

  // Replica a composição autoritativa do backend para manter a prévia do lote
  // consistente. O resultado real ainda pode ser menor quando algum item
  // falhar na rolagem de sucesso durante a desmontagem.
  const estimatedMaterials = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of selectedItems) {
      if (!it) continue;
      const tier = Math.max(1, it.tier || 1);
      let rarityMult = 1.0;
      switch (it.rarity) {
        case 'Incomum':
          rarityMult = 1.2;
          break;
        case 'Raro':
          rarityMult = 1.6;
          break;
        case 'Épico':
          rarityMult = 2.2;
          break;
        case 'Lendário':
          rarityMult = 3.0;
          break;
        case 'Mítico':
          rarityMult = 4.0;
          break;
        case 'Divino':
          rarityMult = 5.0;
          break;
      }
      const effBonus = 1.0 + (efficiencyPercent || 0) / 100.0;
      const total = Math.max(1, Math.floor((2 + tier * 2) * rarityMult * effBonus));
      const pri = Math.max(1, Math.ceil(total * 0.6));
      const sec = Math.max(1, total - pri);

      const slotType = (it.slot_type || '').toLowerCase();
      const weaponType = (it.weapon_type || '').toLowerCase();
      const itemName = (it.name || '').toLowerCase();
      let priKey = 'metal_scrap';
      let secKey = 'cloth_scrap';

      if (slotType === 'mainhand') {
        if (weaponType === 'wand') {
          priKey = 'arcane_scrap';
          secKey = 'metal_scrap';
        } else if (weaponType === 'bow') {
          priKey = 'cloth_scrap';
          secKey = 'metal_scrap';
        }
      } else if (slotType === 'offhand') {
        if (itemName.includes('livro') || itemName.includes('orbe')) {
          priKey = 'arcane_scrap';
          secKey = 'metal_scrap';
        }
      } else if (slotType === 'head' || slotType === 'chest' || slotType === 'legs') {
        if (itemName.includes('robe') || itemName.includes('saiote')) {
          priKey = 'cloth_scrap';
          secKey = 'arcane_scrap';
        }
      } else if (slotType === 'boots' || slotType === 'bag') {
        priKey = 'cloth_scrap';
        secKey = 'metal_scrap';
      } else if (slotType === 'necklace' || slotType === 'ring') {
        priKey = 'metal_scrap';
        secKey = 'arcane_scrap';
      } else if (slotType === 'ammo') {
        priKey = 'metal_scrap';
        secKey = 'cloth_scrap';
      }

      map.set(priKey, (map.get(priKey) || 0) + pri);
      map.set(secKey, (map.get(secKey) || 0) + sec);

      if (tier >= 4 && it.rarity !== 'Comum') {
        map.set('glacial_crystal', (map.get('glacial_crystal') || 0) + 1);
      }
      if (tier >= 5 && (it.rarity === 'Épico' || it.rarity === 'Lendário')) {
        map.set('abyssal_ember', (map.get('abyssal_ember') || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([key, quantity]) => ({ key, quantity }));
  }, [selectedItems, efficiencyPercent]);

  const totalMaterialNeeded = estimatedMaterials.reduce((acc, m) => {
    const def = defMap.get(m.key);
    if (!def || def.counts_toward_storage !== false) {
      return acc + m.quantity;
    }
    return acc;
  }, 0);

  const availableStorage = Math.max(0, storageCapacity - storageUsed);
  const hasStorageSpace = availableStorage >= totalMaterialNeeded;

  const handleConfirmSalvage = () => {
    if (selectedIds.length === 0 || !hasStorageSpace) return;

    // O fluxo em lote também é o autoritativo para um único item: ele aplica
    // a chance da bancada e o modo seguro exibidos nesta tela.
    if (onSalvageBatch) {
      onSalvageBatch(selectedIds, safeMode);
    } else if (selectedIds.length === 1 && onSalvageItem) {
      // Compatibilidade com consumidores antigos que ainda não suportam lote.
      onSalvageItem(selectedIds[0]);
    }
    setSelectedIds([]);
    if (onClearPreview) onClearPreview();
    onClose();
  };

  const handleClose = () => {
    setSelectedIds([]);
    if (onClearPreview) onClearPreview();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-pixel-body">
      <div className="pixel-card-gold rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="pixel-card-header pixel-card-header-gold pb-3 shrink-0 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 pixel-slot rounded bg-slate-950 border-amber-500/40">⚒️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-pixel-heading text-sm text-amber-400">Bancada de Desmontagem</h3>
                <span className="px-2 py-0.5 text-[9px] font-pixel-heading bg-amber-950 text-amber-300 border border-amber-500/40 rounded">
                  Nv. {workbenchLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Desmonte equipamentos para recuperar matérias-primas nobres. Rendimento:{' '}
                <strong className="text-emerald-400 font-pixel-heading">+{efficiencyPercent}%</strong> • Lote:{' '}
                <strong className="text-amber-300 font-pixel-heading">{maxBatchSize} itens</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-xs"
          >
            ✕
          </button>
        </div>

        {/* Corpo Modal em 2 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 flex-1 overflow-hidden">
          {/* Coluna da Esquerda: Seleção de Itens e Ações Rápidas */}
          <div className="flex flex-col space-y-2 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-1 shrink-0">
              <h4 className="text-xs font-pixel-heading text-slate-300">
                Mochila ({salvageableItems.length}):
              </h4>
              <div className="flex gap-1 text-[9px] font-pixel-heading">
                <button
                  onClick={() => handleSelectByRarity('Comum')}
                  className="pixel-btn pixel-btn-dark px-2 py-0.5"
                  title="Selecionar todos os itens comuns"
                >
                  +Comuns
                </button>
                <button
                  onClick={() => handleSelectByRarity('Incomum')}
                  className="pixel-btn pixel-btn-dark px-2 py-0.5 text-emerald-300"
                  title="Selecionar itens incomuns"
                >
                  +Incomuns
                </button>
                <button
                  onClick={handleSelectAll}
                  className="pixel-btn pixel-btn-gold px-2 py-0.5 text-slate-950 font-bold"
                >
                  {selectedIds.length > 0 ? `Limpar (${selectedIds.length})` : `+Tudo (${Math.min(salvageableItems.length, maxBatchSize)})`}
                </button>
              </div>
            </div>

            {selectedIds.length >= maxBatchSize && salvageableItems.length > maxBatchSize && (
              <div className="p-1.5 px-2 pixel-slot rounded text-[10px] text-amber-300 flex items-center gap-1.5 bg-amber-950/40 border-amber-500/40">
                <span>⚠️</span>
                <span>Lote máximo de {maxBatchSize} itens atingido.</span>
              </div>
            )}

            {/* Lista com Checkboxes e Chance de Sucesso */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pixel-slot rounded-xl p-2.5 bg-slate-950/90">
              {salvageableItems.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 font-pixel-body">
                  Nenhum equipamento desmontável na mochila.
                </div>
              ) : (
                salvageableItems.map((it) => {
                  const style = getRarityStyle(it.rarity);
                  const isSelected = selectedIds.includes(it.id);
                  const chance = calculateItemChance(it);

                  return (
                    <div
                      key={it.id}
                      onClick={() => handleToggleSelect(it)}
                      className={`w-full text-left p-2 rounded pixel-slot transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-400 ring-1 ring-amber-400'
                          : `${style.bg} ${style.border}`
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 h-3.5 w-3.5"
                        />
                        <ItemIcon name={it.name} slotType={it.slot_type} weaponType={it.weapon_type} templateKey={(it as any).template_key} visualKey={(it as any).visual_key} setKey={(it as any).set_key} rarity={it.rarity} size="sm" />
                        <div className="truncate">
                          <p className={`text-xs font-semibold truncate ${style.text}`}>{it.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Tier {it.tier || 1} • {it.rarity}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[9px] font-pixel-heading px-1.5 py-0.5 rounded border ${
                            chance >= 80
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : chance >= 65
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {chance}% Êxito
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna da Direita: Preview do Lote / Modo Seguro / Confirmação */}
          <div className="pixel-slot rounded-xl p-4 flex flex-col justify-between space-y-3 min-h-0 overflow-y-auto bg-slate-950/90">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-pixel-heading text-slate-300">
                  Resumo ({selectedIds.length}/{maxBatchSize} un.)
                </h4>
                {isSafeModeUnlocked && (
                  <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={safeMode}
                      onChange={(e) => setSafeMode(e.target.checked)}
                      className="rounded border-amber-500 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-pixel-heading text-[10px]">🛡️ Seguro (100%)</span>
                  </label>
                )}
              </div>

              {selectedIds.length > 0 ? (
                <div className="space-y-3">
                  {selectedIds.length === 1 && inspectedItem && (
                    <div className="flex items-center gap-3 p-2 pixel-slot rounded bg-slate-900/90 border-slate-800">
                      <ItemIcon name={inspectedItem.name} slotType={inspectedItem.slot_type} weaponType={inspectedItem.weapon_type} templateKey={(inspectedItem as any).template_key} visualKey={(inspectedItem as any).visual_key} setKey={(inspectedItem as any).set_key} rarity={inspectedItem.rarity} size="md" />
                      <div>
                        <p className={`text-xs font-pixel-heading ${getRarityStyle(inspectedItem.rarity).text}`}>
                          {inspectedItem.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Tier {inspectedItem.tier || 1} • {inspectedItem.rarity} • {inspectedItem.slot_type}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Materiais Estimados ou Preview Exato */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-emerald-400 font-pixel-heading flex items-center gap-1">
                      <span>
                        ✨ {selectedIds.length > 1 ? 'Materiais estimados (se todos tiverem sucesso):' : 'Materiais obtidos:'}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(selectedIds.length === 1 && salvagePreview?.yield && Array.isArray(salvagePreview.yield) ? salvagePreview.yield : estimatedMaterials).map((m) => {
                        const def = defMap.get(m.key);
                        return (
                          <div
                            key={m.key}
                            className="flex items-center justify-between p-2 pixel-slot rounded text-xs bg-slate-900 border-emerald-500/40"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <PixelResourceSprite resourceKey={m.key} name={def?.name || m.key} size="sm" />
                              <span className="text-slate-200 truncate">{def?.name || m.key}</span>
                            </span>
                            <span className="font-pixel-heading text-emerald-400 shrink-0 ml-1">+{formatQuantity(m.quantity)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alerta de Capacidade do Armazém */}
                  {!hasStorageSpace ? (
                    <div className="pixel-alert-frame pixel-alert-critical p-2.5 rounded text-[10px] text-rose-300 leading-relaxed space-y-1">
                      <p className="font-pixel-heading flex items-center gap-1">
                        <span>⚠️</span> Espaço Insuficiente no Armazém!
                      </p>
                      <p>
                        Necessário: <strong>{totalMaterialNeeded}</strong> materiais livres. Disponível:{' '}
                        <strong>{availableStorage}</strong> un.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded text-[10px] text-amber-200 leading-relaxed space-y-1">
                      <p className="font-pixel-heading flex items-center gap-1">
                        <span>⚠️</span> Risco de Perda em Falha:
                      </p>
                      <p>
                        Se a desmontagem falhar, o item será consumido sem gerar matérias-primas.
                        {workbenchLevel < 3 && ' Aprimore a Bancada ao Nível 3 para liberar o Modo Seguro.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-slate-500 space-y-2">
                  <span className="text-3xl block">⚒️</span>
                  <span>Selecione equipamentos da lista para desmontar em lote.</span>
                </div>
              )}
            </div>

            {/* Footer com Botão de Confirmação */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-400 font-pixel-body">
                Armazém: {storageUsed}/{storageCapacity} ({availableStorage} livres)
              </span>

              <div className="flex gap-2 font-pixel-heading">
                <button
                  onClick={handleClose}
                  className="pixel-btn pixel-btn-dark px-3.5 py-1.5 text-xs"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleConfirmSalvage}
                  disabled={selectedIds.length === 0 || !hasStorageSpace}
                  className={`px-4 py-1.5 text-xs flex items-center gap-1.5 ${
                    selectedIds.length > 0 && hasStorageSpace
                      ? 'pixel-btn pixel-btn-crimson'
                      : 'pixel-btn pixel-btn-dark opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span>⚒️</span>
                  <span>
                    {!hasStorageSpace
                      ? 'Armazém Cheio'
                      : selectedIds.length > 1
                      ? `Desmontar ${selectedIds.length} Itens`
                      : 'Desmontar Item'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};