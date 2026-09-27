import { create } from "zustand";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateId } from "@/lib/types";
import { useCharacterStore } from "./character-store";

export function getEffectiveCombatantStat(c: Combatant, stat: 'ac' | 'atk' | 'initiative' | 'hp' | 'maxHp'): number {
  const base = c[stat];
  let mod = 0;
  c.statusEffects?.forEach(se => {
    if (se.effectType === 'stat_mod') {
      if (se.stat === stat) mod += (se.value || 0); // legacy
      se.modifiers?.forEach(m => {
        if (m.stat === stat) mod += m.value;
      });
    }
  });
  return base + mod;
}

export interface CombatantStatus {
  id: string;
  name: string;
  duration: number; // turns remaining. -1 = infinite
  effectType: 'none' | 'damage' | 'stat_mod';
  value?: number; // legacy for single stat or damage
  stat?: 'hp' | 'maxHp' | 'ac' | 'atk' | 'initiative'; // legacy
  modifiers?: {
    stat: 'hp' | 'maxHp' | 'ac' | 'atk' | 'initiative';
    value: number;
  }[];
}

export interface CombatantSkill {
  id: string;
  name: string;
  description: string;
}

export interface Combatant {
  id: string;
  /** Link to a Character ID, or null if it's a monster/NPC */
  characterId: string | null;
  name: string;
  initiative: number;
  baseInitiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  atk: number; // Added ATK stat
  isEnemy: boolean;
  hasActed: boolean;
  statusEffects: CombatantStatus[];
  skills: CombatantSkill[];
}

export interface MonsterPreset {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  ac: number;
  atk: number;
  skills: CombatantSkill[];
}

const DEFAULT_PRESETS: MonsterPreset[] = [
  {
    id: "goblin-1",
    name: "Goblin Scrapper",
    initiative: 2,
    hp: 15,
    ac: 2,
    atk: 12,
    skills: [{ id: "s1", name: "Nimble Escape", description: "Can disengage easily." }]
  },
  {
    id: "orc-1",
    name: "Orc Brute",
    initiative: 1,
    hp: 35,
    ac: 4,
    atk: 16,
    skills: [{ id: "s2", name: "Aggressive", description: "Moves faster towards enemies." }]
  },
  {
    id: "dragon-1",
    name: "Young Shadow Drake",
    initiative: 4,
    hp: 120,
    ac: 8,
    atk: 20,
    skills: [{ id: "s3", name: "Shadow Breath (AoE)", description: "Hits all players. Base dmg 30." }]
  }
];

interface CombatStore {
  isActive: boolean;
  round: number;
  activeTurnId: string | null;
  combatants: Combatant[];
  monsterPresets: MonsterPreset[];

  // Combat Flow
  startCombat: (initialCombatants: Combatant[]) => void;
  endCombat: () => void;
  nextTurn: () => void;
  rollInitiativeAll: () => void;

  // Combatant Management
  addCombatant: (combatant: Omit<Combatant, "id">) => void;
  removeCombatant: (id: string) => void;
  updateCombatant: (id: string, updates: Partial<Combatant>) => void;
  updateInitiative: (id: string, newInitiative: number) => void;
  addStatusEffect: (id: string, status: Omit<CombatantStatus, 'id'>) => void;
  removeStatusEffect: (id: string, statusId: string) => void;

  // Presets
  saveMonsterPreset: (preset: Omit<MonsterPreset, "id">) => void;
  removeMonsterPreset: (id: string) => void;
}

export const useCombatStore = create<CombatStore & { initSync: () => () => void }>((set, get) => ({
  isActive: false,
  round: 0,
  activeTurnId: null,
  combatants: [],
  monsterPresets: [],

  startCombat: async (initialCombatants) => {
    const sorted = [...initialCombatants].sort((a, b) => b.initiative - a.initiative);
    await setDoc(doc(db, "campaign", "combat"), {
      isActive: true,
      round: 1,
      activeTurnId: sorted.length > 0 ? sorted[0].id : null,
      combatants: sorted,
    });
  },

  endCombat: async () => {
    await setDoc(doc(db, "campaign", "combat"), {
      isActive: false,
      round: 0,
      activeTurnId: null,
      combatants: [],
    });
  },

  nextTurn: async () => {
    const { combatants, activeTurnId, round } = get();
    if (combatants.length === 0) return;

    const currentIndex = combatants.findIndex((c) => c.id === activeTurnId);
    
    let nextIndex = currentIndex;
    let nextRound = round;
    let found = false;
    let crossedBoundary = false;
    
    // Find next ALIVE combatant
    for (let i = 1; i <= combatants.length; i++) {
      nextIndex = (currentIndex + i) % combatants.length;
      if (nextIndex <= currentIndex) crossedBoundary = true;
      if (combatants[nextIndex].hp > 0) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      nextIndex = (currentIndex + 1) % combatants.length;
      crossedBoundary = true;
    }

    if (crossedBoundary || currentIndex === -1) {
      nextRound += 1;
    }

    let nextActiveId = combatants[nextIndex].id;

    // Apply status effects for the CURRENT active turn (tick duration)
    // Apply damage per turn for the NEW active turn
    
    let updatedCombatants = [...combatants];
    
    if (activeTurnId) {
      // Tick duration for current combatant
      updatedCombatants = updatedCombatants.map(c => {
        if (c.id === activeTurnId) {
          const newStatuses = (c.statusEffects || [])
            .map(se => se.duration === -1 ? se : { ...se, duration: se.duration - 1 })
            .filter(se => se.duration !== 0);
          return { ...c, statusEffects: newStatuses };
        }
        return c;
      });
    }

    // Apply damage effects to the NEW active combatant
    updatedCombatants = updatedCombatants.map(c => {
      if (c.id === nextActiveId) {
        let hpChange = 0;
        (c.statusEffects || []).forEach(se => {
          if (se.effectType === 'damage' && se.value) {
            hpChange += se.value;
          }
        });
        if (hpChange > 0) {
          return { ...c, hp: Math.max(0, c.hp - hpChange) };
        }
      }
      return c;
    });

    await updateDoc(doc(db, "campaign", "combat"), { 
      activeTurnId: nextActiveId, 
      round: nextRound,
      combatants: updatedCombatants
    });
  },

  rollInitiativeAll: async () => {
    const state = get();
    const rolled = state.combatants.map(c => ({
      ...c,
      initiative: Math.floor(Math.random() * 20) + 1 + (c.baseInitiative ?? 0)
    })).sort((a, b) => b.initiative - a.initiative);
    
    await updateDoc(doc(db, "campaign", "combat"), {
      combatants: rolled,
      activeTurnId: state.isActive && rolled.length > 0 ? rolled[0].id : state.activeTurnId
    });
  },

  addCombatant: async (combatant) => {
    const state = get();
    // Default baseInitiative if not provided
    const newCombatant = { id: generateId(), ...combatant, baseInitiative: combatant.baseInitiative ?? combatant.initiative };
    const updated = [...state.combatants, newCombatant].sort((a, b) => b.initiative - a.initiative);
    const activeId = state.isActive && !state.activeTurnId ? updated[0].id : state.activeTurnId;

    await updateDoc(doc(db, "campaign", "combat"), {
      combatants: updated,
      activeTurnId: activeId,
    });
  },

  removeCombatant: async (id) => {
    const state = get();
    const updated = state.combatants.filter((c) => c.id !== id);
    let newActiveId = state.activeTurnId;
    if (state.activeTurnId === id) {
      const currentIndex = state.combatants.findIndex((c) => c.id === id);
      if (updated.length === 0) {
        newActiveId = null;
      } else if (currentIndex >= updated.length) {
        newActiveId = updated[0].id;
      } else {
        newActiveId = updated[currentIndex].id;
      }
    }

    await updateDoc(doc(db, "campaign", "combat"), {
      combatants: updated,
      activeTurnId: newActiveId,
    });
  },

  updateCombatant: async (id, updates) => {
    const state = get();
    const updatedCombatants = state.combatants.map((c) => {
      if (c.id === id) {
        const updatedC = { ...c, ...updates };
        if (updatedC.characterId && updates.hp !== undefined) {
          // Keep character store updated too
          useCharacterStore.getState().setHp(updatedC.characterId, updatedC.hp, updatedC.maxHp);
        }
        return updatedC;
      }
      return c;
    });
    await updateDoc(doc(db, "campaign", "combat"), { combatants: updatedCombatants });
  },

  updateInitiative: async (id, newInitiative) => {
    const state = get();
    const updated = state.combatants.map((c) => 
      c.id === id ? { ...c, initiative: newInitiative } : c
    ).sort((a, b) => b.initiative - a.initiative);
    
    await updateDoc(doc(db, "campaign", "combat"), { combatants: updated });
  },

  addStatusEffect: async (id, status) => {
    const state = get();
    const updated = state.combatants.map(c => 
      c.id === id ? { ...c, statusEffects: [...c.statusEffects, { ...status, id: generateId() }] } : c
    );
    await updateDoc(doc(db, "campaign", "combat"), { combatants: updated });
  },

  removeStatusEffect: async (id, statusId) => {
    const state = get();
    const updated = state.combatants.map(c => 
      c.id === id ? { ...c, statusEffects: c.statusEffects.filter(s => s.id !== statusId) } : c
    );
    await updateDoc(doc(db, "campaign", "combat"), { combatants: updated });
  },

  saveMonsterPreset: async (preset) => {
    const newPreset = { ...preset, id: generateId() };
    await setDoc(doc(db, "monsterPresets", newPreset.id), newPreset);
  },

  removeMonsterPreset: async (id) => {
    await deleteDoc(doc(db, "monsterPresets", id));
  },

  // ─── Initialization / Listener ───
  initSync: () => {
    // 1. Listen to combat state
    const unsubCombat = onSnapshot(doc(db, "campaign", "combat"), (docSnap) => {
      if (docSnap.exists()) {
        set(docSnap.data());
      } else {
        // Init empty
        setDoc(doc(db, "campaign", "combat"), {
          isActive: false,
          round: 0,
          activeTurnId: null,
          combatants: [],
        });
      }
    });

    // 2. Listen to monster presets
    const unsubPresets = onSnapshot(collection(db, "monsterPresets"), (snapshot) => {
      const presets: MonsterPreset[] = [];
      snapshot.forEach(doc => presets.push(doc.data() as MonsterPreset));
      // Fallback to default if empty (just to give some initial data)
      if (presets.length === 0) {
        DEFAULT_PRESETS.forEach(p => {
          setDoc(doc(db, "monsterPresets", p.id), p);
        });
      } else {
        set({ monsterPresets: presets });
      }
    });

    return () => {
      unsubCombat();
      unsubPresets();
    };
  }
}));
