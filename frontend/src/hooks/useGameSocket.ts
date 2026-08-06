import { useState, useEffect, useRef, useCallback } from 'react';

export interface Item {
  id: string;
  name: string;
  attack?: number;
  physical_attack?: number;
  magic_attack?: number;
  defense: number;
  weight: number;
  rarity: string;
  special_effect: string;
  required_level?: number;
  bonus_str?: number;
  bonus_dex?: number;
  bonus_int?: number;
  bonus_hp?: number;
  bonus_mp?: number;
  gold_bonus?: number;
  crit_chance?: number;
  lifesteal?: number;
  mana_regen?: number;
  weapon_type?: string;
  slot_type?: string;
}

export interface EquipmentSlots {
  head?: Item | null;
  necklace?: Item | null;
  chest?: Item | null;
  mainhand?: Item | null;
  offhand?: Item | null;
  legs?: Item | null;
  boots?: Item | null;
  ring?: Item | null;
}

export interface InventoryData {
  equipment: EquipmentSlots;
  backpack: Item[];
  cap: number;
}

export interface CombatMessage {
  type: string;
  timestamp: string;
  character: {
    id: string;
    name: string;
    level: number;
    health: number;
    max_health: number;
    mana: number;
    max_mana: number;
    experience: number;
    gold_bank: number;
    vocation: string;
    origin: string;
    masteries?: {
      sword_mastery?: number;
      axe_mastery?: number;
      shield_mastery?: number;
      distance_mastery?: number;
      magic_mastery?: number;
      club_mastery?: number;
    };
    learned_skills?: string[];
    active_skills?: string[];
    unlocked_regions?: string[];
  };
  inventory?: InventoryData;
  monster?: {
    name: string;
    level: number;
    health: number;
    max_health: number;
    attack: number;
  };
  damage_dealt?: number;
  damage_taken?: number;
  dps?: number;
  total_attack?: number;
  total_defense?: number;
  active_region?: string;
  active_stance?: string;
  current_stage?: number;
  max_stages?: number;
  is_boss_stage?: boolean;
  log_text: string;
  item_found?: Item;
  is_active: boolean;
}

export function useGameSocket(token: string, characterId: string) {
  const [character, setCharacter] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryData>({
    equipment: {},
    backpack: [],
    cap: 1500,
  });
  const [monster, setMonster] = useState<any>(null);
  const [totalAttack, setTotalAttack] = useState(15);
  const [totalDefense, setTotalDefense] = useState(5);
  const [activeRegion, setActiveRegion] = useState('forest');
  const [activeStance, setActiveStance] = useState('balanced');
  const [currentStage, setCurrentStage] = useState(1);
  const [maxStages, setMaxStages] = useState(5);
  const [isBossStage, setIsBossStage] = useState(false);
  const [unlockedRegions, setUnlockedRegions] = useState<string[]>(['forest', 'shereque', 'chapolin']);
  const [isExpeditionActive, setIsExpeditionActive] = useState(false);
  const [dps, setDps] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const onCombatEventRef = useRef<((event: CombatMessage) => void) | null>(null);

  const setOnCombatEvent = useCallback((cb: (event: CombatMessage) => void) => {
    onCombatEventRef.current = cb;
  }, []);

  useEffect(() => {
    if (!token || !characterId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:8080/ws?token=${encodeURIComponent(token)}&character_id=${encodeURIComponent(characterId)}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setLogs((prev) => ['Conectado ao servidor Go via WebSocket.', ...prev]);
    };

    ws.onmessage = (event) => {
      try {
        const msg: CombatMessage = JSON.parse(event.data);

        if (msg.character) {
          setCharacter(msg.character);
          if (msg.character.unlocked_regions && msg.character.unlocked_regions.length > 0) {
            setUnlockedRegions(msg.character.unlocked_regions);
          }
        }

        if (msg.inventory) {
          setInventory({
            equipment: msg.inventory.equipment || {},
            backpack: Array.isArray(msg.inventory.backpack) ? msg.inventory.backpack : [],
            cap: msg.inventory.cap || 1500,
          });
        }

        if (msg.total_attack !== undefined) {
          setTotalAttack(msg.total_attack);
        }
        if (msg.total_defense !== undefined) {
          setTotalDefense(msg.total_defense);
        }

        if (msg.active_region) {
          setActiveRegion(msg.active_region);
        }

        if (msg.current_stage !== undefined && msg.current_stage > 0) {
          setCurrentStage(msg.current_stage);
        }
        if (msg.max_stages !== undefined && msg.max_stages > 0) {
          setMaxStages(msg.max_stages);
        }
        if (msg.is_boss_stage !== undefined) {
          setIsBossStage(msg.is_boss_stage);
        }

        if (msg.dps !== undefined) {
          setDps(msg.dps);
        }

        if (msg.active_stance) {
          setActiveStance(msg.active_stance);
        }

        if (msg.monster !== undefined) {
          setMonster(msg.monster);
        }

        setIsExpeditionActive(msg.is_active);

        if (msg.log_text && msg.log_text.trim() !== '') {
          const timeStr = msg.timestamp ? `[${msg.timestamp}] ` : '';
          const fullLogMsg = `${timeStr}${msg.log_text}`;
          setLogs((prev) => {
            if (prev.length > 0 && prev[0].slice(11) === msg.log_text) {
              return prev;
            }
            return [fullLogMsg, ...prev.slice(0, 49)];
          });
        }

        if (onCombatEventRef.current) {
          onCombatEventRef.current(msg);
        }
      } catch (err) {
        console.error('Erro processando mensagem WebSocket:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Erro no WebSocket:', err);
    };

    ws.onclose = () => {
      console.log('Conexão WebSocket fechada');
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [token, characterId]);

  const toggleExpedition = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'TOGGLE_EXPEDITION' }));
    }
  };

  const changeRegion = (region: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CHANGE_REGION', region, region_id: region }));
    }
  };

  const setStance = (stance: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'SET_STANCE', stance }));
    }
  };

  const equipItem = (itemId: string, slot: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'EQUIP_ITEM', item_id: itemId, slot }));
    }
  };

  const unequipItem = (slot: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'UNEQUIP_ITEM', slot }));
    }
  };

  const discardItem = (itemId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'DISCARD_ITEM', item_id: itemId }));
    }
  };

  const toggleSkill = (skill: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'TOGGLE_SKILL', skill }));
    }
  };

  const allocateStat = (stat: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'ALLOCATE_STAT', stat }));
    }
  };

  const chooseStarterPack = (pack: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'CHOOSE_STARTER_PACK', pack }));
    }
  };

  const bulkSell = (itemIds: string[]) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'BULK_SELL', item_ids: itemIds }));
    }
  };

  return {
    character,
    inventory,
    monster,
    totalAttack,
    totalDefense,
    activeRegion,
    activeStance,
    currentStage,
    maxStages,
    isBossStage,
    unlockedRegions,
    isExpeditionActive,
    dps,
    logs,
    connected,
    toggleExpedition,
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
  };
}
