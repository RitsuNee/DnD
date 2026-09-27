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
import {
  type Character,
  type CharacterStat,
  type SpecialSkill,
  type EquipmentItem,
  type StatusEffect,
  type StatModifier,
  type RegisteredUser,
  generateId,
  getCharacterMaxHp,
} from "@/lib/types";

/** Recursively strip `undefined` values so Firestore never rejects them. */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(stripUndefined) as T;
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    ) as T;
  }
  return obj;
}

/** Recalculate bonus values for all character stats based on active skills and equipped gear */
export function recalculateCharacterBonuses(
  char: Character,
  equipment: EquipmentItem[] = char.equipment || [],
  skills: SpecialSkill[] = char.specialSkills || []
): CharacterStat[] {
  const allModifiers: StatModifier[] = [];
  (skills || []).filter(sk => sk.isActive).forEach(sk => allModifiers.push(...(sk.modifiers || [])));
  (equipment || []).filter(eq => eq.isEquipped).forEach(eq => allModifiers.push(...(eq.modifiers || [])));

  return (char.stats || []).map(stat => {
    const statKey = (stat.id || "").toLowerCase();
    const statName = (stat.name || "").toLowerCase();
    const bonus = allModifiers
      .filter(m => {
        const target = (m.targetStatId || "").toLowerCase();
        return target === statKey || target === statName;
      })
      .reduce((sum, m) => sum + (m.value || 0), 0);
    return { ...stat, bonusValue: bonus };
  });
}

/* ═══════════════════════════════════════════════
   Character Store
   ═══════════════════════════════════════════════ */

interface CharacterStore {
  characters: Character[];
  selectedCharacterId: string | null;
  registeredUsers: RegisteredUser[];
  /** Stat template names the GM has defined for the campaign */
  statTemplates: { id: string; name: string }[];

  // ─── Selection ───
  selectCharacter: (id: string | null) => void;

  // ─── CRUD Characters ───
  addCharacter: (char: Omit<Character, "id">) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  assignCharacterOwner: (charId: string, ownerId: string | null, ownerName: string | null) => void;

  // ─── HP Management ───
  adjustHp: (charId: string, amount: number) => void;
  setHp: (charId: string, hp: number, maxHp?: number) => void;

  // ─── Stats ───
  addStat: (charId: string, stat: Omit<CharacterStat, "id" | "bonusValue">) => void;
  updateStat: (charId: string, statId: string, updates: Partial<CharacterStat>) => void;
  removeStat: (charId: string, statId: string) => void;
  addStatTemplate: (name: string) => void;
  removeStatTemplate: (id: string) => void;

  // ─── Special Skills ───
  addSpecialSkill: (charId: string, skill: Omit<SpecialSkill, "id">) => void;
  updateSpecialSkill: (charId: string, skillId: string, updates: Partial<SpecialSkill>) => void;
  removeSpecialSkill: (charId: string, skillId: string) => void;
  toggleSpecialSkill: (charId: string, skillId: string) => void;

  // ─── Equipment ───
  addEquipment: (charId: string, item: Omit<EquipmentItem, "id">) => void;
  updateEquipment: (charId: string, itemId: string, updates: Partial<EquipmentItem>) => void;
  removeEquipment: (charId: string, itemId: string) => void;
  toggleEquipment: (charId: string, itemId: string) => void;
  consumeEquipment: (charId: string, itemId: string) => void;

  // ─── Status Effects ───
  addStatusEffect: (charId: string, effect: Omit<StatusEffect, "id">) => void;
  removeStatusEffect: (charId: string, effectId: string) => void;
  tickStatusEffects: (charId: string) => void;

  // ─── Composite Stats ───
  toggleCompositeStats: (charId: string) => void;
  recalculateBonuses: (charId: string) => void;

  // ─── Bag of Holding & Gold ───
  partyGold: number;
  bagOfHolding: EquipmentItem[];
  setPartyGold: (amount: number) => void;
  adjustPartyGold: (amount: number) => void;
  adjustCharGold: (charId: string, amount: number) => void;
  addToBagOfHolding: (item: Omit<EquipmentItem, "id">) => void;
  removeFromBagOfHolding: (itemId: string) => void;
  transferItemToChar: (itemId: string, charId: string, autoEquip?: boolean, quantityToTransfer?: number) => void;
  transferItemToBag: (charId: string, itemId: string, quantityToTransfer?: number) => void;
  updateItemInBagOfHolding: (itemId: string, updates: Partial<EquipmentItem>) => void;
  consumeItemFromBagOfHolding: (itemId: string, charIdOrOwner?: string) => void;
}

export const useCharacterStore = create<CharacterStore & { initSync: () => () => void }>((set, get) => ({
  characters: [],
  selectedCharacterId: null,
  registeredUsers: [],
  statTemplates: [
    { id: "atk", name: "ATK" },
    { id: "dex", name: "DEX" },
    { id: "con", name: "CON" },
    { id: "int", name: "INT" },
    { id: "wis", name: "WIS" },
    { id: "cha", name: "CHA" },
  ],

  // ─── Selection ───
  selectCharacter: (id) => set({ selectedCharacterId: id }),

  // ─── CRUD ───
  addCharacter: async (char) => {
    const id = generateId();
    const charWithId: Character = {
      ...char,
      id,
      useCompositeStats: char.useCompositeStats ?? true,
      equipment: char.equipment || [],
      specialSkills: char.specialSkills || [],
      statusEffects: char.statusEffects || [],
      stats: char.stats || []
    };
    const updatedStats = recalculateCharacterBonuses(charWithId);
    await setDoc(doc(db, "characters", id), stripUndefined({ ...charWithId, stats: updatedStats }));
  },

  updateCharacter: async (id, updates) => {
    await updateDoc(doc(db, "characters", id), stripUndefined(updates));
  },

  removeCharacter: async (id) => {
    await deleteDoc(doc(db, "characters", id));
  },

  assignCharacterOwner: async (charId, ownerId, ownerName) => {
    await updateDoc(doc(db, "characters", charId), {
      ownerId: ownerId || null,
      ownerName: ownerName || null
    });
  },

  // ─── HP ───
  adjustHp: async (charId, amount) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const maxHp = getCharacterMaxHp(char);
    const newHp = Math.max(0, Math.min(maxHp, (char.hp || 0) + amount));
    await updateDoc(doc(db, "characters", charId), { hp: newHp });
  },

  setHp: async (charId, hp, maxHp) => {
    const updates: any = { hp };
    if (maxHp !== undefined) updates.maxHp = maxHp;
    await updateDoc(doc(db, "characters", charId), updates);
  },

  // ─── Stats ───
  addStat: async (charId, stat) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newStats = [...(char.stats || []), { ...stat, id: generateId(), bonusValue: 0 }];
    const updatedStats = recalculateCharacterBonuses({ ...char, stats: newStats });
    await updateDoc(doc(db, "characters", charId), { stats: stripUndefined(updatedStats) });
  },

  updateStat: async (charId, statId, updates) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newStats = (char.stats || []).map(st => st.id === statId ? { ...st, ...updates } : st);
    const updatedStats = recalculateCharacterBonuses({ ...char, stats: newStats });
    await updateDoc(doc(db, "characters", charId), { stats: stripUndefined(updatedStats) });
  },

  removeStat: async (charId, statId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newStats = (char.stats || []).filter(st => st.id !== statId);
    await updateDoc(doc(db, "characters", charId), { stats: stripUndefined(newStats) });
  },

  addStatTemplate: (name) =>
    set((s) => ({
      statTemplates: [...s.statTemplates, { id: generateId(), name }],
    })),

  removeStatTemplate: (id) =>
    set((s) => ({
      statTemplates: s.statTemplates.filter((t) => t.id !== id),
    })),

  // ─── Special Skills ───
  addSpecialSkill: async (charId, skill) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newSkills = [...(char.specialSkills || []), { ...skill, id: generateId() }];
    const updatedStats = recalculateCharacterBonuses(char, char.equipment, newSkills);
    await updateDoc(doc(db, "characters", charId), {
      specialSkills: stripUndefined(newSkills),
      stats: stripUndefined(updatedStats)
    });
  },

  updateSpecialSkill: async (charId, skillId, updates) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newSkills = (char.specialSkills || []).map(sk => sk.id === skillId ? { ...sk, ...updates } : sk);
    const updatedStats = recalculateCharacterBonuses(char, char.equipment, newSkills);
    await updateDoc(doc(db, "characters", charId), {
      specialSkills: stripUndefined(newSkills),
      stats: stripUndefined(updatedStats)
    });
  },

  removeSpecialSkill: async (charId, skillId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newSkills = (char.specialSkills || []).filter(sk => sk.id !== skillId);
    const updatedStats = recalculateCharacterBonuses(char, char.equipment, newSkills);
    await updateDoc(doc(db, "characters", charId), {
      specialSkills: stripUndefined(newSkills),
      stats: stripUndefined(updatedStats)
    });
  },

  toggleSpecialSkill: async (charId, skillId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newSkills = (char.specialSkills || []).map(sk => sk.id === skillId ? { ...sk, isActive: !sk.isActive } : sk);
    const updatedStats = recalculateCharacterBonuses(char, char.equipment, newSkills);
    await updateDoc(doc(db, "characters", charId), {
      specialSkills: stripUndefined(newSkills),
      stats: stripUndefined(updatedStats)
    });
  },

  // ─── Equipment ───
  addEquipment: async (charId, item) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newEq = [...(char.equipment || []), { ...item, id: generateId() }];
    const updatedStats = recalculateCharacterBonuses(char, newEq);
    await updateDoc(doc(db, "characters", charId), {
      equipment: stripUndefined(newEq),
      stats: stripUndefined(updatedStats)
    });
  },

  updateEquipment: async (charId, itemId, updates) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newEq = (char.equipment || []).map(eq => eq.id === itemId ? { ...eq, ...updates } : eq);
    const updatedStats = recalculateCharacterBonuses(char, newEq);
    await updateDoc(doc(db, "characters", charId), {
      equipment: stripUndefined(newEq),
      stats: stripUndefined(updatedStats)
    });
  },

  removeEquipment: async (charId, itemId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newEq = (char.equipment || []).filter(eq => eq.id !== itemId);
    const updatedStats = recalculateCharacterBonuses(char, newEq);
    await updateDoc(doc(db, "characters", charId), {
      equipment: stripUndefined(newEq),
      stats: stripUndefined(updatedStats)
    });
  },

  consumeEquipment: async (charId, itemId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const item = (char.equipment || []).find(eq => eq.id === itemId);
    if (!item) return;

    const updates: any = {};

    if (item.onUseEffect) {
      if (item.onUseEffect.type === 'heal' && item.onUseEffect.value) {
        updates.hp = Math.min(getCharacterMaxHp(char), (char.hp || 0) + item.onUseEffect.value);
      } else if (item.onUseEffect.type === 'status_effect' && item.onUseEffect.statusEffect) {
        updates.statusEffects = [...(char.statusEffects || []), { ...item.onUseEffect.statusEffect, id: generateId() }];
      }
    }

    let newEq = [...(char.equipment || [])];
    if (item.quantity > 1) {
      newEq = newEq.map(eq => eq.id === itemId ? { ...eq, quantity: eq.quantity - 1 } : eq);
    } else {
      newEq = newEq.filter(eq => eq.id !== itemId);
    }
    updates.equipment = stripUndefined(newEq);
    
    await updateDoc(doc(db, "characters", charId), updates);
  },

  toggleEquipment: async (charId, itemId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newEq = (char.equipment || []).map(eq => eq.id === itemId ? { ...eq, isEquipped: !eq.isEquipped } : eq);
    const updatedStats = recalculateCharacterBonuses(char, newEq);
    await updateDoc(doc(db, "characters", charId), {
      equipment: stripUndefined(newEq),
      stats: stripUndefined(updatedStats)
    });
  },

  // ─── Status Effects ───
  addStatusEffect: async (charId, effect) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newEffects = [...(char.statusEffects || []), { ...effect, id: generateId() }];
    await updateDoc(doc(db, "characters", charId), { statusEffects: stripUndefined(newEffects) });
  },

  removeStatusEffect: async (charId, effectId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newEffects = (char.statusEffects || []).filter(se => se.id !== effectId);
    await updateDoc(doc(db, "characters", charId), { statusEffects: stripUndefined(newEffects) });
  },

  tickStatusEffects: async (charId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const newEffects = (char.statusEffects || [])
      .map(se => se.remainingTurns === -1 ? se : { ...se, remainingTurns: se.remainingTurns - 1 })
      .filter(se => se.remainingTurns !== 0);
    await updateDoc(doc(db, "characters", charId), { statusEffects: stripUndefined(newEffects) });
  },

  // ─── Composite Stats ───
  toggleCompositeStats: async (charId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    await updateDoc(doc(db, "characters", charId), { useCompositeStats: !char.useCompositeStats });
  },

  recalculateBonuses: async (charId) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    const updatedStats = recalculateCharacterBonuses(char);
    await updateDoc(doc(db, "characters", charId), { stats: stripUndefined(updatedStats) });
  },

  // ─── Bag of Holding & Gold ───
  partyGold: 0,
  bagOfHolding: [],

  setPartyGold: async (amount) => {
    await setDoc(doc(db, "campaign", "party"), { partyGold: Math.max(0, amount) }, { merge: true });
  },
  
  adjustPartyGold: async (amount) => {
    const current = get().partyGold;
    await setDoc(doc(db, "campaign", "party"), { partyGold: Math.max(0, current + amount) }, { merge: true });
  },
  
  adjustCharGold: async (charId, amount) => {
    const char = get().characters.find(c => c.id === charId);
    if (!char) return;
    await updateDoc(doc(db, "characters", charId), { gold: Math.max(0, (char.gold || 0) + amount) });
  },

  addToBagOfHolding: async (item) => {
    const s = get();
    const existing = s.bagOfHolding.find(i => i.name === item.name);
    let newBag = [...s.bagOfHolding];
    if (existing && item.type === "consumable") {
      newBag = newBag.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i);
    } else {
      newBag.push({ ...item, id: generateId() });
    }
    await setDoc(doc(db, "campaign", "party"), { bagOfHolding: stripUndefined(newBag) }, { merge: true });
  },

  removeFromBagOfHolding: async (itemId) => {
    const newBag = get().bagOfHolding.filter(i => i.id !== itemId);
    await setDoc(doc(db, "campaign", "party"), { bagOfHolding: stripUndefined(newBag) }, { merge: true });
  },

  updateItemInBagOfHolding: async (itemId, updates) => {
    const newBag = get().bagOfHolding.map(i => i.id === itemId ? { ...i, ...updates } : i);
    await setDoc(doc(db, "campaign", "party"), { bagOfHolding: stripUndefined(newBag) }, { merge: true });
  },

  consumeItemFromBagOfHolding: async (itemId, charIdOrOwner) => {
    const s = get();
    const item = s.bagOfHolding.find(i => i.id === itemId);
    if (!item) return;
    
    if (charIdOrOwner && item.onUseEffect) {
      // Find character by ID, ownerId, or ownerName
      const char = s.characters.find(c => 
        c.id === charIdOrOwner || 
        c.ownerId === charIdOrOwner || 
        c.ownerName?.toLowerCase() === charIdOrOwner.toLowerCase()
      );
      if (char) {
        const updates: any = {};
        if (item.onUseEffect.type === 'heal' && item.onUseEffect.value) {
          updates.hp = Math.min(getCharacterMaxHp(char), (char.hp || 0) + item.onUseEffect.value);
        } else if (item.onUseEffect.type === 'status_effect' && item.onUseEffect.statusEffect) {
          updates.statusEffects = [...(char.statusEffects || []), { ...item.onUseEffect.statusEffect, id: generateId() }];
        }
        await updateDoc(doc(db, "characters", char.id), stripUndefined(updates));
      }
    }

    let newBag = [...s.bagOfHolding];
    if (item.quantity > 1) {
      newBag = newBag.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
    } else {
      newBag = newBag.filter(i => i.id !== itemId);
    }
    await setDoc(doc(db, "campaign", "party"), { bagOfHolding: stripUndefined(newBag) }, { merge: true });
  },

  transferItemToChar: async (itemId, charId, autoEquip, quantityToTransfer) => {
    const s = get();
    const item = s.bagOfHolding.find(i => i.id === itemId);
    const char = s.characters.find(c => c.id === charId);
    if (!item || !char) return;

    const available = item.quantity || 1;
    const qty = Math.min(available, Math.max(1, quantityToTransfer ?? (item.quantity > 1 ? 1 : 1)));

    let newBag: EquipmentItem[];
    if (qty >= available) {
      newBag = s.bagOfHolding.filter(i => i.id !== itemId);
    } else {
      newBag = s.bagOfHolding.map(i => i.id === itemId ? { ...i, quantity: i.quantity - qty } : i);
    }

    const isEquipment = ["weapon", "armor", "shield", "accessory"].includes(item.type);
    const shouldEquip = autoEquip !== undefined ? autoEquip : isEquipment;

    let newEq = [...(char.equipment || [])];
    const existingIndex = newEq.findIndex(e => e.name === item.name && e.type === item.type);
    if (existingIndex >= 0 && !isEquipment) {
      newEq = newEq.map((e, idx) => idx === existingIndex ? { ...e, quantity: (e.quantity || 1) + qty } : e);
    } else {
      newEq = [...newEq, { ...item, id: generateId(), quantity: qty, isEquipped: shouldEquip }];
    }

    const updatedStats = recalculateCharacterBonuses(char, newEq);
    
    await setDoc(doc(db, "campaign", "party"), { bagOfHolding: stripUndefined(newBag) }, { merge: true });
    await updateDoc(doc(db, "characters", charId), { 
      equipment: stripUndefined(newEq),
      stats: stripUndefined(updatedStats)
    });
  },

  transferItemToBag: async (charId, itemId, quantityToTransfer) => {
    const s = get();
    const char = s.characters.find(c => c.id === charId);
    if (!char) return;
    const item = (char.equipment || []).find(i => i.id === itemId);
    if (!item) return;

    const available = item.quantity || 1;
    const qty = Math.min(available, Math.max(1, quantityToTransfer ?? available));

    let newEq: EquipmentItem[];
    if (qty >= available) {
      newEq = (char.equipment || []).filter(i => i.id !== itemId);
    } else {
      newEq = (char.equipment || []).map(i => i.id === itemId ? { ...i, quantity: i.quantity - qty } : i);
    }

    let newBag = [...s.bagOfHolding];
    const isEquipment = ["weapon", "armor", "shield", "accessory"].includes(item.type);
    const existingIndex = newBag.findIndex(i => i.name === item.name && i.type === item.type);
    if (existingIndex >= 0 && !isEquipment) {
      newBag = newBag.map((i, idx) => idx === existingIndex ? { ...i, quantity: (i.quantity || 1) + qty } : i);
    } else {
      newBag = [...newBag, { ...item, id: generateId(), quantity: qty, isEquipped: false }];
    }

    const updatedStats = recalculateCharacterBonuses(char, newEq);

    await setDoc(doc(db, "campaign", "party"), { bagOfHolding: stripUndefined(newBag) }, { merge: true });
    await updateDoc(doc(db, "characters", charId), { 
      equipment: stripUndefined(newEq),
      stats: stripUndefined(updatedStats)
    });
  },

  // ─── Initialization / Listener ───
  initSync: () => {
    const unsubCharacters = onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
        const chars: Character[] = [];
        snapshot.forEach(doc => chars.push(doc.data() as Character));
        set({ characters: chars });
      },
      (error) => {
        console.warn("Firestore characters listener notice:", error.message);
      }
    );

    const unsubParty = onSnapshot(
      doc(db, "campaign", "party"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          set({ 
            partyGold: data.partyGold || 0,
            bagOfHolding: data.bagOfHolding || []
          });
        } else {
          setDoc(doc(db, "campaign", "party"), { partyGold: 500, bagOfHolding: [] });
        }
      },
      (error) => {
        console.warn("Firestore party listener notice:", error.message);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const users: RegisteredUser[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          users.push({
            uid: data.uid || docSnap.id,
            customId: data.customId || "Unknown",
            role: data.role || "Player"
          });
        });
        set({ registeredUsers: users });
      },
      (error) => {
        console.warn("Firestore users listener notice (rules restricted):", error.message);
      }
    );

    return () => {
      unsubCharacters();
      unsubParty();
      unsubUsers();
    };
  }
}));
