import React, { useState, useMemo } from 'react';
import { Item } from '../../hooks/useGameSocket';
import { ResourceAmount } from '../../hooks/useGameSocket';
import { ResourceDefinition } from '../../game/GameCatalog';
import { ItemIcon, getRarityStyle } from '../Inventory/ItemIcon';
import { formatQuantity } from '../../utils/formatters';

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

  // Filtra itens desmontáveis (não permite livros de habilidade nem manuais de construção)
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

  // Cálculo estimativo de materiais para o lote selecionado
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

      // Material principal e secundário aproximados por slot
      let priKey = 'iron';
      let secKey = 'stone';
      if (it.slot_type === 'mainhand') {
        if (it.weapon_type === 'wand') {
          priKey = 'arcane_essence';
          secKey = 'wood';
        } else if (it.weapon_type === 'bow') {
          priKey = 'wood';
          secKey = 'fiber';
        }
      } else if (it.slot_type === 'boots' || it.slot_type === 'bag') {
        priKey = 'fiber';
        secKey = 'iron';
      }

      map.set(priKey, (map.get(priKey) || 0) + pri);
      map.set(secKey, (map.get(secKey) || 0) + sec);
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

    if (selectedIds.length === 1 && onSalvageItem) {
      onSalvageItem(selectedIds[0]);
    } else if (onSalvageBatch) {
      onSalvageBatch(selectedIds, safeMode);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">⚒️</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-amber-400">Bancada de Desmontagem</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                  Nível {workbenchLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Desmonte equipamentos para recuperar matérias-primas nobres. Rendimento:{' '}
                <strong className="text-emerald-400 font-mono">+{efficiencyPercent}%</strong> • Lote Máx:{' '}
                <strong className="text-amber-300 font-mono">{maxBatchSize} itens</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 text-lg p-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Corpo Modal em 2 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 flex-1 overflow-hidden">
          {/* Coluna da Esquerda: Seleção de Itens e Ações Rápidas */}
          <div className="flex flex-col space-y-2 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-1 shrink-0">
              <h4 className="text-xs font-bold text-slate-300">
                Mochila ({salvageableItems.length} desmontáveis):
              </h4>
              <div className="flex gap-1">
                <button
                  onClick={() => handleSelectByRarity('Comum')}
                  className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                  title="Selecionar todos os itens comuns"
                >
                  +Comuns
                </button>
                <button
                  onClick={() => handleSelectByRarity('Incomum')}
                  className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded border border-emerald-700/60 transition"
                  title="Selecionar itens incomuns"
                >
                  +Incomuns
                </button>
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/40 font-bold transition"
                >
                  {selectedIds.length > 0 ? `Limpar (${selectedIds.length})` : `+Tudo (${Math.min(salvageableItems.length, maxBatchSize)})`}
                </button>
              </div>
            </div>

            {selectedIds.length >= maxBatchSize && salvageableItems.length > maxBatchSize && (
              <div className="p-1.5 px-2 bg-amber-950/50 border border-amber-500/40 rounded-lg text-[10px] text-amber-300 flex items-center gap-1.5 font-mono shadow-sm">
                <span>⚠️</span>
                <span>Lote máximo de {maxBatchSize} itens atingido (Aprimore a Bancada ao Nv. {workbenchLevel + 1} para expandir o limite).</span>
              </div>
            )}

            {/* Lista com Checkboxes e Chance de Sucesso */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
              {salvageableItems.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
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
                      className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                          : `${style.bg} ${style.border} hover:brightness-110`
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 h-3.5 w-3.5"
                        />
                        <ItemIcon name={it.name} slotType={it.slot_type} weaponType={it.weapon_type} size="sm" />
                        <div className="truncate">
                          <p className={`text-xs font-semibold truncate ${style.text}`}>{it.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Tier {it.tier || 1} • {it.rarity}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
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
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 min-h-0 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-300">
                  Resumo do Desmonte ({selectedIds.length}/{maxBatchSize} itens)
                </h4>
                {isSafeModeUnlocked && (
                  <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={safeMode}
                      onChange={(e) => setSafeMode(e.target.checked)}
                      className="rounded border-amber-500 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-bold">🛡️ Modo Seguro (100%)</span>
                  </label>
                )}
              </div>

              {selectedIds.length > 0 ? (
                <div className="space-y-3">
                  {selectedIds.length === 1 && inspectedItem && (
                    <div className="flex items-center gap-3 p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                      <ItemIcon name={inspectedItem.name} slotType={inspectedItem.slot_type} weaponType={inspectedItem.weapon_type} size="md" />
                      <div>
                        <p className={`text-xs font-bold ${getRarityStyle(inspectedItem.rarity).text}`}>
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
                    <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span>✨ Materiais obtidos na desmontagem:</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(selectedIds.length === 1 && salvagePreview?.yield && Array.isArray(salvagePreview.yield) ? salvagePreview.yield : estimatedMaterials).map((m) => {
                        const def = defMap.get(m.key);
                        return (
                          <div
                            key={m.key}
                            className="flex items-center justify-between p-2 bg-slate-900 border border-emerald-500/30 rounded-lg text-xs"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span>{def?.icon || '📦'}</span>
                              <span className="text-slate-200 truncate">{def?.name || m.key}</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-400 shrink-0 ml-1">+{formatQuantity(m.quantity)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alerta de Capacidade do Armazém */}
                  {!hasStorageSpace ? (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-500/60 rounded-lg text-[10px] text-rose-300 leading-relaxed space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <span>⚠️</span> Espaço Insuficiente no Armazém!
                      </p>
                      <p>
                        Necessário: <strong>{totalMaterialNeeded}</strong> materiais livres. Disponível:{' '}
                        <strong>{availableStorage}</strong> unidades. Descarte itens no depósito antes de desmontar.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-lg text-[10px] text-amber-200 leading-relaxed space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <span>⚠️</span> Risco de Perda em Falha:
                      </p>
                      <p>
                        Se a desmontagem falhar na bancada, o item correspondente será consumido sem gerar matérias-primas.
                        {workbenchLevel < 3 && ' Aprimore a Bancada ao Nível 3 para liberar o Modo Seguro.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-slate-500 space-y-2">
                  <span className="text-3xl block">⚒️</span>
                  <span>Selecione um ou mais equipamentos da lista ao lado para desmontar em lote.</span>
                </div>
              )}
            </div>

            {/* Footer com Botão de Confirmação */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono text-slate-400">
                Armazém: {storageUsed}/{storageCapacity} ({availableStorage} livres)
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleConfirmSalvage}
                  disabled={selectedIds.length === 0 || !hasStorageSpace}
                  className={`px-5 py-1.5 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 ${
                    selectedIds.length > 0 && hasStorageSpace
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <span>⚒️</span>
                  <span>
                    {!hasStorageSpace
                      ? 'Armazém Cheio'
                      : selectedIds.length > 1
                      ? `Desmontar ${selectedIds.length} Itens em Lote`
                      : 'Desmontar Equipamento'}
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
