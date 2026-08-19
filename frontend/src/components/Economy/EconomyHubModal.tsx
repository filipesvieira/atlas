import { useEffect, useMemo, useState } from 'react';
import type { GatheringExpeditionDefinition, GameCatalogData, RecipeDefinition } from '../../game/GameCatalog';
import type { CraftBatchResult, CraftPreview, EconomyState, ResourceAmount, SettlementResident } from '../../hooks/useGameSocket';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  catalog: GameCatalogData;
  economy: EconomyState | null;
  resources: ResourceAmount[];
  craftPreview: CraftPreview | null;
  craftBatchResult: CraftBatchResult | null;
  characterGold: number;
  onStartGathering: (key: string, duration: number) => void;
  onCancelGathering: (activityId: string) => void;
  onClaimGathering: (activityId: string) => void;
  onPreviewCraft: (recipeKey: string, catalystKey?: string) => void;
  onCraft: (recipeKey: string, catalystKey?: string, previewRevision?: number, quantity?: number) => void;
  onSync: () => void;
  onClaimPendingCraft: (itemId: string) => void;
  onClaimPendingResources: () => void;
  onCreateHeroDesire: (recipeKey: string, targetRarity: string, catalystKey: string, maxAttempts: number, priority: number) => void;
  onCancelHeroDesire: (desireId: string) => void;
  onClaimArmoryItem: (armoryId: string) => void;
}

type Tab = 'work' | 'ambitions' | 'crafting' | 'residents';
const rarityLabel: Record<string, string> = { common: 'Comum', uncommon: 'Incomum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário', Comum: 'Comum', Incomum: 'Incomum', Raro: 'Raro', 'Épico': 'Épico', 'Lendário': 'Lendário' };
const rarityClass: Record<string, string> = { common: 'text-slate-300', uncommon: 'text-emerald-300', rare: 'text-sky-300', epic: 'text-fuchsia-300', legendary: 'text-amber-300', Comum: 'text-slate-300', Incomum: 'text-emerald-300', Raro: 'text-sky-300', 'Épico': 'text-fuchsia-300', 'Lendário': 'text-amber-300' };
const rarityKeys = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const canonicalRarityAliases: Record<string, string> = { Comum: 'common', Incomum: 'uncommon', Raro: 'rare', 'Épico': 'epic', Lendário: 'legendary' };
const canonicalRarityKey = (rarity?: string) => canonicalRarityAliases[rarity || ''] || rarity || 'common';
const raritiesForRecipe = (recipe?: RecipeDefinition) => {
  if (!recipe) return [] as string[];
  const minimum = Math.max(0, rarityKeys.indexOf(canonicalRarityKey(recipe.minimum_rarity) as typeof rarityKeys[number]));
  const maximumIndex = rarityKeys.indexOf(canonicalRarityKey(recipe.maximum_rarity) as typeof rarityKeys[number]);
  const maximum = maximumIndex >= 0 ? maximumIndex : rarityKeys.length - 1;
  return rarityKeys.slice(minimum, maximum + 1) as unknown as string[];
};
const durationLabel = (seconds: number) => seconds < 3600 ? `${seconds / 60} min` : `${seconds / 3600} h`;

export const professionLabels: Record<string, string> = {
  miner: 'Minerador',
  tracker: 'Rastreador',
  fisher: 'Pescador',
  lumberjack: 'Lenhador',
  blacksmith: 'Ferreiro',
  jeweler: 'Joalheiro',
  woodworker: 'Marceneiro',
  alchemist: 'Alquimista',
  herbalist: 'Herbalista',
  farmer: 'Agricultor',
  tailor: 'Alfaiate',
  leatherworker: 'Coureiro',
};

export const buildingLabels: Record<string, string> = {
  workbench: 'Bancada de Trabalho',
  warehouse: 'Armazém de Recursos',
  campfire: 'Fogueira do Acampamento',
  adventurer_hut: 'Cabana do Aventureiro',
  arcane_spring: 'Fonte Arcana',
};

export const catalystLabels: Record<string, string> = {
  prismatic_core: '✨ Núcleo Prismático',
  quality_dust: '✨ Pó de Qualidade',
  alchemical_catalyst: '🧪 Catalisador Alquímico',
  ancient_amber: '🪨 Âmbar Ancestral',
};

export const slotLabels: Record<string, { label: string; icon: string }> = {
  head: { label: 'Elmo', icon: '🪖' },
  chest: { label: 'Armadura', icon: '🥋' },
  legs: { label: 'Calças', icon: '👖' },
  boots: { label: 'Botas', icon: '🥾' },
  mainhand: { label: 'Arma', icon: '⚔️' },
  offhand: { label: 'Escudo / Secundário', icon: '🛡️' },
  necklace: { label: 'Colar / Amuleto', icon: '📿' },
  ring: { label: 'Anel', icon: '💍' },
  ammo: { label: 'Munição', icon: '🏹' },
  bag: { label: 'Mochila', icon: '🎒' },
};

export const CRAFT_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '🎒' },
  { id: 'weapons', label: 'Armas', icon: '⚔️' },
  { id: 'shields', label: 'Escudos', icon: '🛡️' },
  { id: 'helmets', label: 'Elmos', icon: '🪖' },
  { id: 'armors', label: 'Armaduras', icon: '🥋' },
  { id: 'legs', label: 'Calças', icon: '👖' },
  { id: 'boots', label: 'Botas', icon: '🥾' },
  { id: 'accessories', label: 'Acessórios', icon: '📿' },
  { id: 'bags', label: 'Mochilas', icon: '🎒' },
  { id: 'processing', label: 'Processamento', icon: '🧱' },
];

export const formatProfession = (key?: string) => professionLabels[key || ''] || key || 'Geral';
export const formatBuilding = (key?: string) => buildingLabels[key || ''] || key || 'Estrutura';
export const formatCatalyst = (key?: string) => catalystLabels[key || ''] || key || 'Nenhum';

export const formatBlockedReason = (reason?: string, resourceDefs?: Record<string, { name?: string }>) => {
  if (!reason) return '';
  let formatted = reason;
  Object.entries(buildingLabels).forEach(([key, name]) => {
    formatted = formatted.split(key).join(name);
  });
  Object.entries(professionLabels).forEach(([key, name]) => {
    formatted = formatted.split(key).join(name);
  });
  if (resourceDefs) {
    Object.entries(resourceDefs).forEach(([key, def]) => {
      if (def.name) {
        formatted = formatted.split(key).join(def.name);
      }
    });
  }
  return formatted;
};

export function EquipmentStatsCard({ recipe }: { recipe: RecipeDefinition }) {
  if (recipe.kind !== 'equipment') return null;
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
          <span>{slotLabels[recipe.slot_type || '']?.icon || '🛡️'}</span>
          <span>{slotLabels[recipe.slot_type || '']?.label || 'Equipamento'}</span>
          {recipe.hands === 2 && (
            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[10px] font-bold">
              ⚔️ 2 Mãos
            </span>
          )}
          {recipe.hands === 1 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
              🗡️ 1 Mão
            </span>
          )}
        </span>
        {recipe.required_level !== undefined && recipe.required_level > 1 ? (
          <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[10px] font-mono font-bold">
            🔒 Requer Nv. {recipe.required_level}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 text-[10px] font-mono">
            Nv. 1+
          </span>
        )}
      </div>

      {/* Atributos Básicos de Combate */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-mono mb-2">
        {recipe.base_atk !== undefined && recipe.base_atk > 0 && (
          <div className="bg-slate-950/80 p-1.5 rounded border border-rose-950 text-rose-400 font-bold flex justify-between">
            <span>⚔️ Ataque:</span>
            <span>+{recipe.base_atk}</span>
          </div>
        )}
        {recipe.base_magic !== undefined && recipe.base_magic > 0 && (
          <div className="bg-slate-950/80 p-1.5 rounded border border-cyan-950 text-cyan-300 font-bold flex justify-between">
            <span>🔮 Magia:</span>
            <span>+{recipe.base_magic}</span>
          </div>
        )}
        {recipe.base_def !== undefined && recipe.base_def > 0 && (
          <div className="bg-slate-950/80 p-1.5 rounded border border-sky-950 text-sky-400 font-bold flex justify-between">
            <span>🛡️ Defesa:</span>
            <span>+{recipe.base_def}</span>
          </div>
        )}
        {recipe.base_weight !== undefined && recipe.base_weight > 0 && (
          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 text-slate-400 flex justify-between">
            <span>⚖️ Peso:</span>
            <span>{recipe.base_weight.toFixed(1)} oz</span>
          </div>
        )}
      </div>

      {/* Bônus de Atributos Secundários */}
      <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
        {recipe.base_str !== undefined && recipe.base_str > 0 && (
          <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
            💪 STR: +{recipe.base_str}
          </span>
        )}
        {recipe.base_dex !== undefined && recipe.base_dex > 0 && (
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
            🏃 DEX: +{recipe.base_dex}
          </span>
        )}
        {recipe.base_int !== undefined && recipe.base_int > 0 && (
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
            🧠 INT: +{recipe.base_int}
          </span>
        )}
        {recipe.base_hp !== undefined && recipe.base_hp > 0 && (
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
            ❤️ HP: +{recipe.base_hp}
          </span>
        )}
        {recipe.base_mp !== undefined && recipe.base_mp > 0 && (
          <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/50">
            💧 MP: +{recipe.base_mp}
          </span>
        )}
        {recipe.crit_chance !== undefined && recipe.crit_chance > 0 && (
          <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/50">
            ⚡ Crítico: +{recipe.crit_chance.toFixed(1)}%
          </span>
        )}
        {recipe.lifesteal !== undefined && recipe.lifesteal > 0 && (
          <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
            🩸 Vampirismo: +{recipe.lifesteal.toFixed(1)}%
          </span>
        )}
        {recipe.mana_regen !== undefined && recipe.mana_regen > 0 && (
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
            💧 Regen MP: +{recipe.mana_regen}/s
          </span>
        )}
      </div>
    </div>
  );
}

function countdown(iso: string | undefined, now: number) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
  return seconds <= 0 ? 'pronto' : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function estimateGathering(expedition: GatheringExpeditionDefinition, duration: number, resources: Record<string, { storage_weight?: number }>) {
  const totalWeight = expedition.nodes.reduce((sum, node) => sum + node.weight, 0) || 1;
  const averageCycle = expedition.nodes.reduce((sum, node) => sum + node.cycle_seconds * node.weight / totalWeight, 0) || 60;
  const cycles = duration / averageCycle;
  let units = 0;
  let storage = 0;
  expedition.nodes.forEach((node) => node.rewards.forEach((reward) => {
    const expected = cycles * node.weight / totalWeight * reward.chance * (reward.min_quantity + reward.max_quantity) / 2;
    units += expected;
    storage += expected * (resources[reward.resource_key]?.storage_weight || 1);
  }));
  return { units: Math.max(1, Math.round(units)), storage: Math.max(1, Math.round(storage)) };
}

function residentSkill(resident: SettlementResident, skillKey: string) {
  return resident.skills.find((skill) => skill.skill_key === skillKey);
}

function pendingSourceLabel(sourceKind: string) {
  switch (sourceKind) {
    case 'offline_monster_drop': return 'Expedição de combate offline';
    case 'monster_drop': return 'Caçada de monstros';
    case 'gathering_claim': return 'Expedição de coleta';
    case 'crafting': return 'Produção da oficina';
    case 'pending_retry': return 'Carga antiga preservada';
    default: return sourceKind.replace(/_/g, ' ');
  }
}

export function EconomyHubModal(props: Props) {
  const [tab, setTab] = useState<Tab>('work');
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState('');
  const [craftCategory, setCraftCategory] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDefinition | null>(null);
  const [catalyst, setCatalyst] = useState('');
  const [desireRecipe, setDesireRecipe] = useState('');
  const [targetRarity, setTargetRarity] = useState('uncommon');
  const [desireCatalyst, setDesireCatalyst] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [priority, setPriority] = useState(50);

  useEffect(() => {
    if (!props.isOpen) return;
    props.onSync();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const syncTimer = window.setInterval(() => props.onSync(), 5000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(syncTimer);
    };
  }, [props.isOpen]);

  const settlement = props.economy?.settlement;
  const residents = settlement?.residents || [];
  const activities = props.economy?.active_gatherings || (props.economy?.active_gathering ? [props.economy.active_gathering] : []);
  const professionByKey = useMemo(() => Object.fromEntries((props.economy?.professions || []).map((p) => [p.profession_key, p])), [props.economy]);
  const resourcesByKey = useMemo(() => Object.fromEntries(props.resources.map((r) => [r.key, r.quantity])), [props.resources]);
  const resourceDefinitions = useMemo(() => Object.fromEntries(props.catalog.resources.map((r) => [r.key, r])), [props.catalog.resources]);
  const recipesByKey = useMemo(() => Object.fromEntries(props.catalog.recipes.map((r) => [r.key, r])), [props.catalog.recipes]);
  const unlocked = useMemo(() => new Set(props.economy?.unlocked_recipes || []), [props.economy]);

  const recipes = useMemo(() => {
    return props.catalog.recipes.filter((recipe) => {
      if (!unlocked.has(recipe.key)) return false;
      if (search && !recipe.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (craftCategory === 'all') return true;
      if (craftCategory === 'processing') return recipe.kind === 'processing';
      if (craftCategory === 'weapons') return recipe.kind === 'equipment' && recipe.slot_type === 'mainhand';
      if (craftCategory === 'shields') return recipe.kind === 'equipment' && recipe.slot_type === 'offhand';
      if (craftCategory === 'helmets') return recipe.kind === 'equipment' && recipe.slot_type === 'head';
      if (craftCategory === 'armors') return recipe.kind === 'equipment' && recipe.slot_type === 'chest';
      if (craftCategory === 'legs') return recipe.kind === 'equipment' && recipe.slot_type === 'legs';
      if (craftCategory === 'boots') return recipe.kind === 'equipment' && recipe.slot_type === 'boots';
      if (craftCategory === 'accessories') return recipe.kind === 'equipment' && (recipe.slot_type === 'necklace' || recipe.slot_type === 'ring' || recipe.slot_type === 'ammo');
      if (craftCategory === 'bags') return recipe.kind === 'equipment' && recipe.slot_type === 'bag';
      return true;
    });
  }, [props.catalog.recipes, unlocked, search, craftCategory]);

  const equipmentRecipes = props.catalog.recipes.filter((recipe) => unlocked.has(recipe.key) && recipe.kind === 'equipment');
  const selectedDesireRecipe = equipmentRecipes.find((recipe) => recipe.key === desireRecipe);
  const allowedDesireRarities = raritiesForRecipe(selectedDesireRecipe);
  const busyResidents = useMemo(() => new Set(activities.filter((activity) => activity.state === 'running' || activity.state === 'claimable').map((activity) => activity.resident_id).filter(Boolean)), [activities]);
  const nextResidentProsperity = settlement?.next_resident_prosperity || 0;
  const prosperityProgress = nextResidentProsperity > 0 ? Math.min(100, (settlement?.prosperity || 0) * 100 / nextResidentProsperity) : 100;

  useEffect(() => {
    if (!allowedDesireRarities.length || allowedDesireRarities.includes(targetRarity)) return;
    setTargetRarity(allowedDesireRarities.includes('uncommon') ? 'uncommon' : allowedDesireRarities[0]);
  }, [desireRecipe, allowedDesireRarities.join('|'), targetRarity]);

  if (!props.isOpen) return null;

  const selectRecipe = (recipe: RecipeDefinition) => {
    setSelectedRecipe(recipe);
    setCatalyst('');
    props.onPreviewCraft(recipe.key, '');
  };
  const selectCatalyst = (value: string) => {
    setCatalyst(value);
    if (selectedRecipe) props.onPreviewCraft(selectedRecipe.key, value);
  };

  const tabs: Array<[Tab, string]> = [
    ['work', '🧑‍🌾 Ordens de Trabalho'], ['ambitions', '⭐ Ambições & Arsenal'],
    ['crafting', '⚒️ Oficina Manual'], ['residents', '🏘️ Moradores'],
  ];

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
    <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div><h2 className="font-black text-amber-400">🏘️ {settlement?.name || 'Assentamento do Aventureiro'}</h2><p className="text-xs text-slate-400">O herói combate e decide o crescimento. Moradores coletam e produzem em nome da comunidade.</p></div>
        <div className="flex items-center gap-2.5">{settlement && (
          <div className="flex items-center gap-2">
            <span
              className="cursor-help rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-xs font-bold text-sky-300 shadow-sm transition hover:border-sky-400"
              title={`👥 População: ${settlement.population} moradores ativos de ${settlement.population_capacity} vagas. A Cabana define o teto; Prosperidade atrai chegadas automaticamente. ${settlement.growth_blocked_reason || ''}`}
            >
              👥 Moradores: {settlement.population}/{settlement.population_capacity}
            </span>
            <span
              className="cursor-help rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-sm transition hover:border-amber-400"
              title="✨ Prosperidade é o prestígio produtivo permanente da comunidade. Ela aumenta com obras concluídas, coletas entregues e crafts. Não é gasta nem diminui nesta versão; serve para atrair novos moradores quando existe vaga de moradia."
            >
              ✨ Prosperidade: {settlement.prosperity}
            </span>
          </div>
        )}<button onClick={props.onClose} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition">✕</button></div>
      </header>
      <nav className="grid grid-cols-2 border-b border-slate-800 bg-slate-950/40 p-2 lg:grid-cols-4">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-xs font-bold ${tab === key ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800'}`}>{label}</button>)}</nav>
      <main className="overflow-y-auto p-5">
        {!props.economy && <section className="rounded-xl border border-amber-500/35 bg-amber-950/20 p-4 text-xs text-amber-300">Sincronizando assentamento… <button onClick={props.onSync} className="ml-2 underline">tentar novamente</button></section>}

        {tab === 'work' && props.economy && <WorkOrders
          {...props} activities={activities} residents={residents} now={now}
          professionByKey={professionByKey} resourceDefinitions={resourceDefinitions} busyResidents={busyResidents}
        />}

        {tab === 'ambitions' && props.economy && <div className="space-y-4">
          <section className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/15 p-4 text-xs text-slate-300">
            <strong className="text-fuchsia-300">⭐ Desejo do Herói</strong>
            <p className="mt-1">Defina equipamento e raridade mínima. Cada tentativa consome os insumos de uma receita e <strong>sempre produz um item</strong>, guardado no Arsenal. “Não atingir a meta” significa apenas sair uma raridade menor; havendo tentativas e materiais, outro item será produzido depois.</p>
            <p className="mt-2 text-[10px] text-fuchsia-200/70">A mochila e a venda automática não interferem. Limpar uma Ambição concluída também não apaga os itens do Arsenal.</p>
          </section>
          <section className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/55 p-4 md:grid-cols-2 lg:grid-cols-5">
            <label title="Escolhe qual receita os artesãos tentarão produzir. Somente receitas já descobertas aparecem aqui." className="cursor-help text-xs text-slate-400 lg:col-span-2">Equipamento desejado ⓘ<select value={desireRecipe} onChange={(e) => setDesireRecipe(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"><option value="">Selecione…</option>{equipmentRecipes.map((recipe) => <option key={recipe.key} value={recipe.key}>{recipe.name}</option>)}</select></label>
            <label title="É a qualidade mínima que encerra a Ambição. Itens abaixo dela não são perdidos: vão para o Arsenal e contam como uma tentativa." className="cursor-help text-xs text-slate-400">Raridade mínima ⓘ<select value={targetRarity} disabled={!desireRecipe} onChange={(e) => setTargetRarity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100 disabled:opacity-40">{allowedDesireRarities.map((rarity) => <option key={rarity} value={rarity}>{rarityLabel[rarity]}</option>)}</select>{selectedDesireRecipe && <span className="mt-1 block text-[9px] text-slate-500">Limite da receita: {rarityLabel[canonicalRarityKey(selectedDesireRecipe.minimum_rarity)]} → {rarityLabel[canonicalRarityKey(selectedDesireRecipe.maximum_rarity)]}</span>}</label>
            <label title="Número máximo de itens que poderão ser produzidos tentando alcançar a raridade mínima. Cada tentativa exige novamente todos os materiais, ouro e catalisador." className="cursor-help text-xs text-slate-400">Tentativas ⓘ<input type="number" min={1} max={20} value={maxAttempts} onChange={(e) => setMaxAttempts(Math.max(1, Math.min(20, Number(e.target.value))))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"/></label>
            <label title="Define a ordem da fila: números maiores são atendidos primeiro quando há mais de uma Ambição aguardando. Prioridade NÃO aumenta raridade, velocidade ou chance." className="cursor-help text-xs text-slate-400">Prioridade ⓘ<input type="number" min={1} max={100} value={priority} onChange={(e) => setPriority(Math.max(1, Math.min(100, Number(e.target.value))))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"/><span className="mt-1 block text-[9px] text-slate-500">Só ordena a fila; 100 vem antes de 50.</span></label>
            <label title="Recurso opcional consumido em cada tentativa. Ele redistribui as chances para raridades melhores, sem garantir a meta." className="cursor-help text-xs text-slate-400 lg:col-span-2">Catalisador ⓘ<select value={desireCatalyst} onChange={(e) => setDesireCatalyst(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"><option value="">Sem catalisador</option><option value="quality_dust">Pó de Qualidade</option><option value="prismatic_core">Núcleo Prismático</option></select></label>
            <button title="Cria uma ordem automática. Materiais só são consumidos quando um artesão livre realmente inicia cada tentativa." disabled={!desireRecipe} onClick={() => props.onCreateHeroDesire(desireRecipe, targetRarity, desireCatalyst, maxAttempts, priority)} className="self-end rounded-lg bg-fuchsia-500 px-4 py-2 text-xs font-black text-white disabled:opacity-30 lg:col-span-3">Registrar ambição e autorizar produção</button>
            
            {/* Ficha Completa do Equipamento Desejado */}
            {selectedDesireRecipe && (
              <div className="col-span-full mt-2 space-y-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>📊</span> Ficha Técnica do Equipamento Selecionado:
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    💰 Custo por tentativa: <strong className="text-amber-400">{selectedDesireRecipe.gold_cost} gold</strong>
                  </span>
                </div>
                <EquipmentStatsCard recipe={selectedDesireRecipe} />
                
                {/* Insumos necessários por tentativa */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    Insumos por tentativa:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {selectedDesireRecipe.ingredients.map((ing) => {
                      const inStock = resourcesByKey[ing.key] || 0;
                      const isSatisfied = inStock >= ing.quantity;
                      const def = resourceDefinitions[ing.key];
                      return (
                        <div
                          key={ing.key}
                          className={`flex items-center justify-between px-2 py-1 rounded text-[11px] border ${
                            isSatisfied
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                              : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                          }`}
                        >
                          <span className="truncate mr-1">{def?.icon || '📦'} {def?.name || ing.key}</span>
                          <span className="font-mono font-bold whitespace-nowrap">{inStock}/{ing.quantity} {isSatisfied ? '✓' : '⚠️'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <DesireQueue
              settlement={settlement}
              now={now}
              resources={resourceDefinitions}
              recipesByKey={recipesByKey}
              currentResourceBalances={resourcesByKey}
              characterGold={props.characterGold}
              onCancel={props.onCancelHeroDesire}
            />
            <Armory settlement={settlement} onClaim={props.onClaimArmoryItem}/>
          </div>
        </div>}

        {tab === 'crafting' && props.economy && <div className="grid gap-4 lg:grid-cols-2">
          <section>
            {(props.economy.pending_craft_items?.length || 0) > 0 && (
              <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
                <p className="mb-2 text-xs font-bold text-amber-300">📦 Produção manual em carga segura</p>
                {props.economy.pending_craft_items!.map((item) => (
                  <button key={item.id} onClick={() => props.onClaimPendingCraft(item.id)} className="mr-2 rounded-lg border border-amber-500/30 px-2 py-1 text-[10px] text-amber-200">
                    Resgatar {item.name}
                  </button>
                ))}
              </div>
            )}

            {/* Filtros de Categoria */}
            <div className="mb-2.5 flex flex-wrap gap-1">
              {CRAFT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCraftCategory(cat.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border ${
                    craftCategory === cat.id
                      ? 'border-amber-400 bg-amber-500 font-bold text-slate-950 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-2">
              <input
                title="Filtra somente as receitas que o personagem já descobriu; não altera custos nem a fila."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar receita descoberta…"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
              <span title="Ouro disponível. Cada unidade do lote cobra o custo da receita separadamente." className="cursor-help whitespace-nowrap text-xs text-amber-300">
                💰 {props.characterGold} ⓘ
              </span>
            </div>

            <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {recipes.map((recipe) => (
                <button
                  key={recipe.key}
                  title="Seleciona a receita e pede ao servidor uma prévia autoritativa dos requisitos e das chances atuais."
                  onClick={() => selectRecipe(recipe)}
                  className={`w-full rounded-xl border p-3 text-left ${selectedRecipe?.key === recipe.key ? 'border-amber-400 bg-amber-500/10 shadow-sm' : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'}`}
                >
                  <div className="flex justify-between gap-2">
                    <strong className="text-xs text-slate-100 flex items-center gap-1.5">
                      <span>{recipe.kind === 'equipment' ? (slotLabels[recipe.slot_type || '']?.icon || '⚔️') : '🧱'}</span>
                      <span>{recipe.name}</span>
                      {recipe.hands === 2 && (
                        <span className="rounded bg-purple-950/80 px-1 py-0.2 text-[9px] font-bold text-purple-300 border border-purple-800/50">2H</span>
                      )}
                    </strong>
                    <span className="text-[10px] font-mono text-slate-400">Tier {recipe.tier}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
                    <span>{formatProfession(recipe.profession_key)} Nv. {recipe.required_profession_level}</span>
                    <span className="font-mono text-amber-300">{recipe.gold_cost} gold</span>
                  </div>
                </button>
              ))}
              {recipes.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">
                  Nenhuma receita encontrada para esta categoria ou busca.
                </p>
              )}
            </div>
          </section>

          <ManualCraft
            recipe={selectedRecipe}
            preview={props.craftPreview}
            batchResult={props.craftBatchResult}
            resources={resourcesByKey}
            definitions={resourceDefinitions}
            catalyst={catalyst}
            characterGold={props.characterGold}
            onCatalyst={selectCatalyst}
            onCraft={props.onCraft}
          />
        </div>}

        {tab === 'residents' && props.economy && <div className="space-y-4">
          <section className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 text-xs text-slate-300">
            <strong className="text-amber-300">🏘️ Como novos moradores chegam</strong>
            <p className="mt-1">A chegada é automática quando <strong>as duas condições</strong> são atendidas: existe uma vaga criada pela Cabana do Aventureiro e o refúgio alcançou o marco de Prosperidade do próximo morador.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className={`rounded-lg border p-3 ${settlement && settlement.population < settlement.population_capacity ? 'border-emerald-800 bg-emerald-950/25 text-emerald-300' : 'border-rose-900 bg-rose-950/25 text-rose-300'}`}>
                🏠 Moradia: {settlement?.population}/{settlement?.population_capacity} · {settlement && settlement.population < settlement.population_capacity ? 'há vaga' : 'lotada'}
              </div>
              <div className="rounded-lg border border-fuchsia-800 bg-fuchsia-950/25 p-3 text-fuchsia-200">
                ✨ Prosperidade: {settlement?.prosperity}{nextResidentProsperity > 0 ? ` / ${nextResidentProsperity}` : ' · etapa concluída'}
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full bg-fuchsia-500" style={{ width: `${prosperityProgress}%` }}/></div>
              </div>
            </div>
            {settlement?.growth_blocked_reason && <p className="mt-3 rounded-lg border border-slate-700 bg-slate-950/50 p-2 text-slate-300">📌 Próximo passo: {settlement.growth_blocked_reason}.</p>}
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">Prosperidade aumenta com <strong>obras concluídas</strong>, <strong>produção entregue por trabalhadores</strong>, <strong>craft manual</strong> e <strong>cada tentativa produzida de uma Ambição</strong>. Ela não é gasta nem diminui nesta versão. Construções continuam sendo decisão exclusiva do jogador.</p>
          </section>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{residents.map((resident) => <ResidentCard key={resident.id} resident={resident} catalog={props.catalog}/>)}</div>
        </div>}
      </main>
    </div>
  </div>;
}

interface WorkProps extends Props {
  activities: NonNullable<EconomyState['active_gatherings']>;
  residents: SettlementResident[];
  now: number;
  professionByKey: Record<string, { level: number }>;
  resourceDefinitions: Record<string, { name?: string; icon?: string; storage_weight?: number }>;
  busyResidents: Set<string | undefined>;
}

function WorkOrders(props: WorkProps) {
  const pendingBatches = props.economy?.pending_resource_batches || [];
  const pendingTotal = (props.economy?.pending_resources || []).reduce((total, resource) => total + resource.quantity, 0);
  return <div className="space-y-4"><section className="rounded-xl border border-sky-500/25 bg-sky-950/20 p-4 text-xs text-slate-300"><strong className="text-sky-300">🧭 O herói não abandona mais a expedição de combate</strong><p className="mt-1">Escolha o turno e um morador habilitado será enviado. Cada morador executa uma ordem por vez; trabalhadores diferentes coletam em paralelo, inclusive com o jogo fechado.</p><p className="mt-2 text-[10px] text-emerald-300">✓ Ao terminar, o morador volta sozinho e deposita o que couber. Com o jogo fechado, a entrega é conciliada automaticamente no próximo login. Apenas um excedente sem espaço permanece em carga segura.</p></section>
    {(props.economy?.pending_resources?.length || 0) > 0 && <section className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black text-amber-200">📦 Carga segura · {pendingTotal.toLocaleString('pt-BR')} unidades aguardando espaço</p><p className="mt-1 text-[10px] text-amber-100/70">Nada será perdido. Ao guardar, qualquer excedente permanece separado com sua origem original.</p></div><button onClick={props.onClaimPendingResources} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950">Tentar guardar tudo</button></div><div className="mt-3 grid gap-2 lg:grid-cols-2">{pendingBatches.length > 0 ? pendingBatches.map((batch) => <article key={`${batch.source_kind}:${batch.source_key}`} className="rounded-lg border border-amber-500/20 bg-slate-950/45 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-amber-200">{pendingSourceLabel(batch.source_kind)}</strong><span className="text-[10px] font-mono text-slate-400">{batch.quantity.toLocaleString('pt-BR')} un.</span></div><p className="mt-1 break-words text-[9px] font-mono text-slate-500">{batch.source_key}</p><p className="mt-2 text-[10px] leading-relaxed text-slate-300">{batch.resources.map((resource) => `${props.resourceDefinitions[resource.key]?.name || resource.key} x${resource.quantity}`).join(' · ')}</p></article>) : <article className="rounded-lg border border-amber-500/20 bg-slate-950/45 p-3 text-[10px] text-slate-300">Carga legada: {props.economy!.pending_resources!.map((resource) => `${props.resourceDefinitions[resource.key]?.name || resource.key} x${resource.quantity}`).join(' · ')}</article>}</div></section>}
    {props.activities.length > 0 && <section className="grid gap-3 lg:grid-cols-2">{props.activities.map((activity) => {
      const ready = new Date(activity.ends_at).getTime() <= props.now || activity.state === 'claimable';
      const pendingStorage = activity.state === 'pending_storage';
      return <article key={activity.id} className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
        <p className="text-[10px] uppercase tracking-wider text-emerald-400">{activity.resident_name || 'Trabalhador'} · {pendingStorage ? 'trabalhador livre' : ready ? 'entregando automaticamente' : 'em coleta'}</p>
        <h3 className="font-bold text-slate-100">{props.catalog.gatheringExpeditions.find((e) => e.key === activity.expedition_key)?.display_name || activity.expedition_key}</h3>
        <p className="mt-1 font-mono text-xs text-slate-400">{pendingStorage ? 'Parte da carga aguarda espaço no Depósito.' : `Retorno: ${countdown(activity.ends_at, props.now)}`}</p>
        {pendingStorage ? <button title="O morador já voltou e está livre. Este botão tenta guardar somente o excedente protegido." onClick={() => props.onClaimGathering(activity.id)} className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">Tentar guardar carga pendente</button>
          : ready ? <button title="A entrega acontece sozinha. Este botão apenas solicita uma sincronização imediata." onClick={props.onSync} className="mt-3 rounded-lg border border-emerald-500/50 bg-emerald-950 px-3 py-2 text-xs font-bold text-emerald-300">↻ Sincronizando entrega automática…</button>
          : <button title="Cancela a ordem antes do fim. Os ciclos completos já realizados são preservados e entregues." onClick={() => props.onCancelGathering(activity.id)} className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Cancelar e preservar ciclos</button>}
      </article>;
    })}</section>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{props.catalog.gatheringExpeditions.map((expedition) => {
      const eligible = props.residents.filter((resident) => resident.status === 'idle' && !props.busyResidents.has(resident.id) && (residentSkill(resident, expedition.profession_key)?.level || 0) >= expedition.required_profession_level);
      const reason = `Nenhum morador livre possui ${props.catalog.professions.find((p) => p.key === expedition.profession_key)?.name || expedition.profession_key} Nv. ${expedition.required_profession_level}.`;
      return <section key={expedition.key} className="rounded-xl border border-slate-700 bg-slate-950/55 p-4"><div className="flex gap-3"><span className="text-3xl">{expedition.icon}</span><div><h3 className="font-bold text-slate-100">{expedition.display_name}</h3><p className="text-[11px] text-sky-300">Conhecimento coletivo Nv. {props.professionByKey[expedition.profession_key]?.level || 1}</p></div></div><p className="my-3 min-h-[36px] text-xs text-slate-400">{expedition.description}</p><p className={`mb-2 text-[10px] ${eligible.length ? 'text-emerald-300' : 'text-rose-300'}`}>{eligible.length ? `Disponível: ${eligible.map((r) => r.name).join(', ')}` : `🔒 ${reason}`}</p><div className="grid grid-cols-2 gap-2">{expedition.allowed_durations.map((duration) => { const estimate = estimateGathering(expedition, duration, props.resourceDefinitions); return <button key={duration} disabled={!eligible.length} onClick={() => props.onStartGathering(expedition.key, duration)} title={eligible.length ? `Estimativa: ${estimate.units} recursos e ${estimate.storage} de depósito` : reason} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-2 text-[11px] font-bold text-amber-300 disabled:opacity-30"><span className="block">Enviar · {durationLabel(duration)}</span><span className="block text-[9px] font-normal text-slate-400">~{estimate.units} rec. · ~{estimate.storage} esp.</span></button>; })}</div></section>;
    })}</div>
  </div>;
}

function DesireQueue({
  settlement,
  now,
  resources,
  recipesByKey,
  currentResourceBalances,
  characterGold,
  onCancel,
}: {
  settlement: EconomyState['settlement'];
  now: number;
  resources: Record<string, { name?: string; icon?: string }>;
  recipesByKey?: Record<string, RecipeDefinition>;
  currentResourceBalances?: Record<string, number>;
  characterGold?: number;
  onCancel: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const desires = (settlement?.hero_desires || []).filter((d) => d.state !== 'cancelled');

  const renderStateBadge = (state: string) => {
    switch (state) {
      case 'crafting':
        return <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">🔨 Fabricando</span>;
      case 'blocked':
        return <span className="rounded border border-rose-800 bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300">🔒 Bloqueado</span>;
      case 'completed':
        return <span className="rounded border border-sky-700 bg-sky-950 px-2 py-0.5 text-[10px] font-bold text-sky-300">✨ Concluído</span>;
      case 'exhausted':
        return <span className="rounded border border-amber-700 bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-300">⚠️ Tentativas encerradas</span>;
      case 'queued':
      default:
        return <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">⏳ Na Fila</span>;
    }
  };

  return (
    <section>
      <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Fila de ambições</h3>
      <div className="space-y-2">
        {desires.map((desire) => {
          const isExpanded = expandedId === desire.id;
          const targetRecipe = recipesByKey ? recipesByKey[desire.recipe_key] : null;

          return (
            <article
              key={desire.id}
              onClick={() => setExpandedId(isExpanded ? null : desire.id)}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-950/55 p-3 transition hover:border-slate-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <strong className="text-sm font-bold text-slate-100">{desire.recipe_name}</strong>
                  <p className={`text-xs ${rarityClass[desire.target_rarity] || 'text-slate-400'}`}>
                    Meta: {rarityLabel[desire.target_rarity] || desire.target_rarity} · tentativa {desire.attempts_completed}/{desire.max_attempts}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStateBadge(desire.state)}
                  <span className="text-xs text-slate-500">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {desire.assigned_resident_name && (
                <p className="mt-2 text-xs text-sky-300 font-mono">
                  🔨 {desire.assigned_resident_name} · {countdown(desire.current_order_ready_at, now)}
                </p>
              )}

              {desire.blocked_reason && (
                <p className="mt-2 rounded bg-rose-950/40 border border-rose-900/50 p-2 text-[11px] font-medium text-rose-300">
                  ⚠️ {formatBlockedReason(desire.blocked_reason, resources)}
                </p>
              )}

              {/* Receita Completa de Insumos da Ambição */}
              {targetRecipe && (
                <div className="mt-2.5 rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>📋 Insumos da receita (por tentativa):</span>
                    <span className={(characterGold || 0) >= targetRecipe.gold_cost ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                      💰 {targetRecipe.gold_cost} gold
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {targetRecipe.ingredients.map((ing) => {
                      const inStock = currentResourceBalances ? (currentResourceBalances[ing.key] || 0) : 0;
                      const isSatisfied = inStock >= ing.quantity;
                      const def = resources[ing.key];
                      return (
                        <div
                          key={ing.key}
                          className={`flex items-center justify-between px-2 py-1 rounded text-[11px] border ${
                            isSatisfied
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                              : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                          }`}
                        >
                          <span className="truncate mr-1">
                            {def?.icon || '📦'} {def?.name || ing.key}
                          </span>
                          <span className="font-mono font-bold whitespace-nowrap">
                            {inStock}/{ing.quantity} {isSatisfied ? '✓' : '⚠️'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="mt-3 border-t border-slate-800 pt-3 text-xs space-y-1.5 text-slate-300 bg-slate-900/60 p-2.5 rounded-lg">
                  <p><strong className="text-amber-300">Receita:</strong> {desire.recipe_name}</p>
                  <p title="Quanto maior o número, antes esta Ambição entra em produção. Não altera chance, raridade nem velocidade." className="cursor-help"><strong className="text-amber-300">Prioridade ⓘ:</strong> {desire.priority} / 100 · somente ordem da fila</p>
                  <p><strong className="text-amber-300">Catalisador:</strong> {formatCatalyst(desire.catalyst_key)}</p>
                  {(desire.reserved_resources?.length || 0) > 0 && (
                    <p className="text-amber-300">
                      <strong>Insumos Reservados:</strong> {desire.reserved_resources!.map((r) => `${resources[r.key]?.name || r.key} x${r.quantity}`).join(' · ')} · {desire.reserved_gold || 0} gold
                    </p>
                  )}
                </div>
              )}

              {['completed', 'exhausted'].includes(desire.state) && (
                <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-[11px] font-medium text-sky-300">✓ Todos os resultados produzidos estão guardados no Arsenal</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(desire.id);
                    }}
                    className="rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-200 border border-slate-600 transition"
                    title="Remover somente esta ficha da fila. Nenhum item do Arsenal será apagado."
                  >
                    ✕ Limpar
                  </button>
                </div>
              )}

              {['queued', 'blocked'].includes(desire.state) && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(desire.id);
                    }}
                    className="text-[11px] font-medium text-rose-300 hover:text-rose-200 underline"
                  >
                    Cancelar ambição
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {desires.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">
            Nenhuma ambição ativa registrada.
          </p>
        )}
      </div>
    </section>
  );
}

function Armory({ settlement, onClaim }: { settlement: EconomyState['settlement']; onClaim: (id: string) => void }) {
  const armory = settlement?.armory || [];
  return <section><h3 className="mb-2 text-xs font-black uppercase text-slate-400">Arsenal do assentamento</h3><div className="space-y-2">{armory.map((entry) => <article key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/55 p-3"><div><strong className={`text-sm ${rarityClass[entry.item.rarity] || 'text-slate-100'}`}>{entry.item.name}</strong><p className="text-[10px] text-slate-500">{rarityLabel[entry.item.rarity] || entry.item.rarity} · guardado em segurança</p></div><button onClick={() => onClaim(entry.id)} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950">Levar à mochila</button></article>)}{armory.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-500">O arsenal ainda está vazio.</p>}</div></section>;
}

function ManualCraft({ recipe, preview, batchResult, resources, definitions, catalyst, characterGold, onCatalyst, onCraft }: {
  recipe: RecipeDefinition | null;
  preview: CraftPreview | null;
  batchResult: CraftBatchResult | null;
  resources: Record<string, number>;
  definitions: Record<string, { name?: string; icon?: string }>;
  catalyst: string;
  characterGold: number;
  onCatalyst: (value: string) => void;
  onCraft: Props['onCraft'];
}) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const ingredientLimits = recipe?.ingredients.map((ingredient) => Math.floor((resources[ingredient.key] || 0) / Math.max(1, ingredient.quantity))) || [];
  const catalystLimit = catalyst ? Math.floor((resources[catalyst] || 0) / Math.max(1, preview?.catalyst_cost || 1)) : 50;
  const goldLimit = recipe?.gold_cost ? Math.floor(characterGold / recipe.gold_cost) : 50;
  const maxAffordable = Math.max(0, Math.min(50, catalystLimit, goldLimit, ...(ingredientLimits.length ? ingredientLimits : [50])));

  useEffect(() => {
    if (!batchResult || !recipe || batchResult.recipe_key !== recipe.key) return;
    setIsProcessing(false);
  }, [batchResult, recipe?.key]);

  useEffect(() => {
    if (!isProcessing) return;
    const timeout = window.setTimeout(() => setIsProcessing(false), 20000);
    return () => window.clearTimeout(timeout);
  }, [isProcessing]);

  const handleProcessCraft = () => {
    if (!recipe || isProcessing) return;
    const count = Math.max(1, Math.min(50, quantity));
    setIsProcessing(true);
    onCraft(recipe.key, catalyst, preview?.preview_revision || 0, count);
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/55 p-4">
      {!recipe ? (
        <div className="flex h-full min-h-[260px] items-center justify-center text-center text-sm text-slate-500">
          Selecione uma receita para produzir pessoalmente.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-amber-300 text-base flex items-center gap-2">
                <span>{recipe.kind === 'equipment' ? (slotLabels[recipe.slot_type || '']?.icon || '⚔️') : '🧱'}</span>
                <span>{recipe.name}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                Tier {recipe.tier}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{recipe.description}</p>
          </div>

          {/* Card com Atributos do Equipamento */}
          <EquipmentStatsCard recipe={recipe} />

          <div className="rounded-lg border border-sky-800/60 bg-sky-950/25 p-3 text-[10px] leading-relaxed text-sky-200">
            ℹ️ <strong>Não existe falha aleatória total no craft manual.</strong> Cada unidade aceita pelo servidor produz um resultado. Em equipamentos, o sorteio define apenas a <strong>raridade</strong>. Um lote pode parar antes do fim se acabarem materiais, ouro, catalisador ou espaço; o resumo abaixo informa exatamente quantas unidades foram concluídas e o motivo da parada.
          </div>

          {/* Grade de Insumos da Receita */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
              <span>📋 Insumos da Receita ({quantity > 1 ? `Lote de ${quantity}x` : '1 unidade'}):</span>
              <span className={characterGold >= recipe.gold_cost * quantity ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                💰 {recipe.gold_cost * quantity} gold ({characterGold} disponível)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recipe.ingredients.map((ingredient) => {
                const required = ingredient.quantity * quantity;
                const inStock = resources[ingredient.key] || 0;
                const isSatisfied = inStock >= required;
                return (
                  <div
                    key={ingredient.key}
                    className={`rounded-lg border p-2 text-xs flex items-center justify-between ${isSatisfied ? 'border-emerald-800/70 bg-emerald-950/20 text-emerald-300' : 'border-rose-900/70 bg-rose-950/20 text-rose-300'}`}
                  >
                    <span className="truncate mr-1">
                      {definitions[ingredient.key]?.icon || '📦'} {definitions[ingredient.key]?.name || ingredient.key}
                    </span>
                    <strong className="font-mono whitespace-nowrap">
                      {inStock}/{required} {isSatisfied ? '✓' : '⚠️'}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label title="Quantidade máxima que o servidor tentará produzir em sequência. Custos são cobrados por unidade e o lote para com segurança ao faltar algum requisito." className="block cursor-help text-xs font-semibold text-slate-300">
              Quantidade de produção em lote ⓘ:
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {[1, 5, 10, 25, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setQuantity(num)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${quantity === num ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'} disabled:opacity-50`}
                  >
                    {num}x
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={isProcessing}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-xs font-bold text-slate-100 disabled:opacity-50"
                />
              </div>
              <span className={`mt-1.5 block text-[10px] ${quantity <= maxAffordable ? 'text-emerald-300' : 'text-amber-300'}`}>
                Capacidade estimada com os saldos atuais: {maxAffordable} unidade(s). {quantity > maxAffordable && 'O servidor produzirá o que for possível e explicará onde parou.'}
              </span>
            </label>
          </div>

          {recipe.kind === 'equipment' && (
            <label title="Consumido uma vez por unidade. Melhora a distribuição de raridades, mas não garante uma raridade específica." className="block cursor-help text-xs text-slate-400">
              Catalisador opcional ⓘ
              <select
                value={catalyst}
                disabled={isProcessing}
                onChange={(e) => onCatalyst(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100 disabled:opacity-50"
              >
                <option value="">Sem catalisador</option>
                <option value="quality_dust">Pó de Qualidade</option>
                <option value="prismatic_core">Núcleo Prismático</option>
              </select>
            </label>
          )}

          {preview?.recipe_key === recipe.key && (
            <div className="space-y-2 rounded-lg bg-slate-900 p-3 text-xs">
              <p className={preview.can_craft ? 'text-emerald-300' : 'text-rose-300'}>
                {preview.can_craft ? '✓ Requisitos atendidos' : preview.missing_requirements.map((req) => formatBlockedReason(req, definitions)).join(' · ')}
              </p>
              <p className="text-slate-400">Custo por unidade: {recipe.gold_cost} gold{preview.catalyst_cost ? ` · ${preview.catalyst_cost} catalisador` : ''}. O lote de {quantity} solicita até {recipe.gold_cost * quantity} gold.</p>
              {recipe.kind === 'equipment' && preview.rarity_chances && <div title="Probabilidades por unidade, calculadas com profissão, estação e catalisador atuais." className="cursor-help border-t border-slate-800 pt-2"><strong className="text-amber-300">Chances de raridade por item ⓘ</strong><div className="mt-1 flex flex-wrap gap-1">{Object.entries(preview.rarity_chances).filter(([, chance]) => chance > 0).map(([rarity, chance]) => <span key={rarity} className={`rounded border border-slate-700 px-2 py-1 ${rarityClass[rarity] || 'text-slate-300'}`}>{rarityLabel[rarity] || rarity}: {(chance * 100).toFixed(1)}%</span>)}</div></div>}
            </div>
          )}

          {batchResult?.recipe_key === recipe.key && (
            <div className={`rounded-xl border p-3 text-xs shadow-md ${batchResult.completed === batchResult.requested ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-200' : 'border-amber-500/50 bg-amber-950/50 text-amber-200'}`}>
              <p className="font-black">🔨 Resultado real do lote: {batchResult.completed}/{batchResult.requested} concluído(s)</p>
              <p className="mt-1">Falhas aleatórias totais: {batchResult.random_failures}.</p>
              {batchResult.rarity_counts && Object.keys(batchResult.rarity_counts).length > 0 && <p className="mt-1">Raridades: {Object.entries(batchResult.rarity_counts).map(([rarity, count]) => `${rarity} x${count}`).join(' · ')}</p>}
              {batchResult.pending_count > 0 && <p className="mt-1">📦 {batchResult.pending_count} item(ns) foram para a carga segura porque a mochila não comportou.</p>}
              {batchResult.stop_reason && <p className="mt-2 rounded bg-slate-950/40 p-2 text-amber-100">Motivo da parada: {formatBlockedReason(batchResult.stop_reason, definitions)}</p>}
            </div>
          )}

          <button
            disabled={!preview?.can_craft || preview.recipe_key !== recipe.key || isProcessing || maxAffordable < 1}
            onClick={handleProcessCraft}
            className="w-full rounded-xl bg-amber-500 py-3 text-xs font-black text-slate-950 hover:bg-amber-400 disabled:opacity-30 transition flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>🔨 Servidor processando o lote de {quantity}…</span>
            ) : (
              <span>Produzir {quantity > 1 ? `${quantity}x ` : ''}manualmente</span>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function ResidentCard({ resident, catalog }: { resident: SettlementResident; catalog: GameCatalogData }) {
  const statusLabels: Record<string, string> = {
    idle: 'Disponível no refúgio',
    collecting: 'Em expedição de coleta',
    crafting: 'Produzindo na oficina',
  };
  const statusHelp: Record<string, string> = {
    idle: 'Pode assumir uma nova ordem de coleta ou produção.',
    collecting: 'Retornará e depositará a produção automaticamente ao concluir.',
    crafting: 'Está atendendo uma Ambição do Herói e ficará livre quando a tentativa terminar.',
  };

  const isPioneer = ['tonho_three_axes', 'jurema_net_pull', 'cida_suspicious_tea', 'alencastro_forge', 'barnabe_wood', 'aurora_alchemy', 'elena_gems'].includes(resident.resident_key);
  const isLegendary = resident.traits.some((t) => t.toLowerCase().includes('lendario') || t.toLowerCase().includes('mestre')) || resident.title.includes('Grão-Mestre');
  const isEpic = resident.traits.some((t) => t.toLowerCase().includes('epico')) || resident.title.includes('Habilidoso');
  const isRare = resident.traits.some((t) => t.toLowerCase().includes('raro') || t.toLowerCase().includes('dupla')) || resident.skills.length >= 2 && !isPioneer;

  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-950/65 p-4 shadow-sm hover:border-slate-600 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-4xl select-none">{resident.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm">{resident.name}</h3>
              {isLegendary && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-950/90 border border-amber-500/80 text-amber-300">
                  🟡 Lendário
                </span>
              )}
              {isEpic && !isLegendary && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-950/90 border border-purple-500/80 text-purple-300">
                  🟣 Épico
                </span>
              )}
              {isPioneer && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-950/60 border border-amber-600/70 text-amber-300">
                  ⭐ Pioneiro
                </span>
              )}
              {isRare && !isPioneer && !isEpic && !isLegendary && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-sky-950/90 border border-sky-500/80 text-sky-300">
                  🔵 Raro
                </span>
              )}
              {!isLegendary && !isEpic && !isRare && !isPioneer && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-800 text-slate-400">
                  🟢 Comum
                </span>
              )}
            </div>
            <p className="text-xs text-amber-300/90 font-medium">{resident.title}</p>
            <span
              title={statusHelp[resident.status] || resident.status}
              className={`mt-1 inline-block cursor-help rounded px-2 py-0.5 text-[10px] font-medium ${
                resident.status === 'idle'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : resident.status === 'crafting'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                  : 'bg-sky-950 text-sky-300 border border-sky-800/60'
              }`}
            >
              {statusLabels[resident.status] || resident.status} ⓘ
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {resident.traits
          .filter((t) => !t.toLowerCase().startsWith('raridade:'))
          .map((trait) => (
            <span key={trait} className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-700/50">
              {trait}
            </span>
          ))}
      </div>

      <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-2.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profissões & Especialidades:</span>
        {resident.skills.map((skill) => {
          const profession = catalog.professions.find((entry) => entry.key === skill.skill_key);
          const pct = Math.min(100, (skill.experience * 100) / Math.max(1, skill.xp_required));
          return (
            <div key={skill.skill_key} className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold text-slate-200">
                <span className="flex items-center gap-1">
                  <span>{profession?.icon || '🛠️'}</span>
                  <span>{profession?.name || professionLabels[skill.skill_key] || skill.skill_key}</span>
                </span>
                <span className="font-mono text-emerald-400">Nv. {skill.level}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
                <div className="h-full bg-emerald-500 rounded transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
