/* ═══════════════════════════════════════════════
   DnD Campaign Manager — Core Type Definitions
   ═══════════════════════════════════════════════ */

/** A single custom stat (e.g. "STR", "DEX") created by the GM */
export interface CharacterStat {
  id: string;
  name: string;
  baseValue: number;
  /** Computed at runtime: sum of all modifiers targeting this stat */
  bonusValue: number;
}

/** A passive modifier that alters a stat value */
export interface StatModifier {
  id: string;
  /** Which stat ID this modifier affects */
  targetStatId: string;
  /** Positive = bonus, negative = penalty */
  value: number;
  /** Where this modifier comes from */
  source: "skill" | "equipment" | "race" | "class" | "alignment" | "feat" | "other";
  /** Human-readable label, e.g. "Racial Bonus" */
  sourceLabel: string;
}

/** A special skill / feat */
export interface SpecialSkill {
  id: string;
  name: string;
  description: string;
  /** Optional stat modifiers this skill grants */
  modifiers: StatModifier[];
  /** Whether this skill is currently active */
  isActive: boolean;
}

/** An equipment item in a character's personal inventory */
export interface EquipmentItem {
  id: string;
  name: string;
  type: "weapon" | "armor" | "shield" | "accessory" | "consumable" | "misc";
  description: string;
  quantity: number;
  /** Whether the item is currently equipped/attuned */
  isEquipped: boolean;
  /** Optional stat modifiers this equipment grants when equipped */
  modifiers: StatModifier[];
  /** Optional effect when consumed */
  onUseEffect?: {
    type: 'heal' | 'status_effect';
    value?: number; // amount to heal or damage
    statusEffect?: StatusEffect;
  };
  /** Rarity for display color */
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

/** A status effect / condition on a character */
export interface StatusEffect {
  id: string;
  name: string;
  /** Remaining turns, -1 = indefinite */
  remainingTurns: number;
  description: string;
  /** Used by combat tracker or party hub to apply stat mods */
  modifiers?: {
    stat: 'hp' | 'maxHp' | 'ac' | 'atk' | 'initiative';
    value: number;
  }[];
}

/** Identity fields — all free text for homebrew flexibility */
export interface CharacterIdentity {
  race: string;
  class: string;
  alignment: string;
  level: number;
  background: string;
}

/** Full character data */
export interface Character {
  id: string;
  name: string;
  /** Firebase UID of the player who owns this character */
  ownerId?: string;
  /** Display name of the owner (for UI) */
  ownerName?: string;
  /** Optional avatar URL */
  avatarUrl?: string;
  identity: CharacterIdentity;
  /** Current Gold / Coins */
  gold: number;
  /** Current / Max HP */
  hp: number;
  maxHp: number;
  /** Armor Class */
  ac: number;
  /** Initiative modifier */
  initiative: number;
  /** Custom stats defined by the GM */
  stats: CharacterStat[];
  /** Special skills / feats */
  specialSkills: SpecialSkill[];
  /** Personal equipment inventory */
  equipment: EquipmentItem[];
  /** Active status effects */
  statusEffects: StatusEffect[];
  /** Notes field for free-form text */
  notes: string;
  /** Whether composite stat modifiers are enabled for this character */
  useCompositeStats: boolean;
}

/* ═══════════════════════════════════════════════
   Shared Inventory Types
   ═══════════════════════════════════════════════ */

export interface SharedInventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  description: string;
  modifiers?: StatModifier[];
  onUseEffect?: {
    type: 'heal' | 'status_effect';
    value?: number;
    statusEffect?: StatusEffect;
  };
}

/* ═══════════════════════════════════════════════
   Campaign Types
   ═══════════════════════════════════════════════ */

export interface Campaign {
  id: string;
  name: string;
  sessionNumber: number;
  roundNumber: number;
  /** GM user ID */
  gmId: string;
  /** Player user IDs */
  playerIds: string[];
  /** Template stats that get applied to new characters */
  statTemplates: { id: string; name: string }[];
}

/* ═══════════════════════════════════════════════
   Probability Engine Types
   ═══════════════════════════════════════════════ */

export interface DicePreset {
  id: string;
  label: string;
  /** e.g. "2d6+3" notation */
  formula: string;
  /** Which character/NPC/monster this preset belongs to */
  ownerId: string;
  ownerName: string;
}

export interface SlotColumn {
  id: string;
  items: SlotItem[];
}

export interface SlotItem {
  id: string;
  label: string;
  /** URL or emoji */
  icon: string;
  /** Weight (higher = more likely) */
  weight: number;
}

export interface SlotMachine {
  id: string;
  name: string;
  columns: SlotColumn[];
}

/* ═══════════════════════════════════════════════
   Utility Types & Helpers
   ═══════════════════════════════════════════════ */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "text-on-surface-variant",
  uncommon: "text-tertiary",
  rare: "text-secondary",
  epic: "text-primary",
  legendary: "text-primary-container",
};

export const RARITY_BG: Record<Rarity, string> = {
  common: "bg-on-surface-variant/10",
  uncommon: "bg-tertiary/10",
  rare: "bg-secondary/10",
  epic: "bg-primary/10",
  legendary: "bg-primary-container/10",
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface RegisteredUser {
  uid: string;
  customId: string;
  role: "GM" | "Player";
}

export function computeStatTotal(stat: CharacterStat, useComposite?: boolean): number {
  if (useComposite === false) return stat.baseValue;
  return stat.baseValue + (stat.bonusValue || 0);
}

export function getCharacterAC(char: Character): number {
  let ac = char.ac || 0;
  const activeMods = [
    ...(char.specialSkills || []).filter(s => s.isActive).flatMap(s => s.modifiers || []),
    ...(char.equipment || []).filter(e => e.isEquipped).flatMap(e => e.modifiers || [])
  ];
  ac += activeMods
    .filter(m => {
      const target = (m.targetStatId || "").toLowerCase();
      return target === 'ac' || target === 'armor';
    })
    .reduce((sum, m) => sum + (m.value || 0), 0);
  
  char.statusEffects?.forEach(se => {
    se.modifiers?.forEach(m => {
      if ((m.stat || "").toLowerCase() === 'ac') ac += (m.value || 0);
    });
  });
  return ac;
}

export function getCharacterInitiative(char: Character): number {
  let init = char.initiative || 0;
  const activeMods = [
    ...(char.specialSkills || []).filter(s => s.isActive).flatMap(s => s.modifiers || []),
    ...(char.equipment || []).filter(e => e.isEquipped).flatMap(e => e.modifiers || [])
  ];
  init += activeMods
    .filter(m => {
      const target = (m.targetStatId || "").toLowerCase();
      return target === 'init' || target === 'initiative';
    })
    .reduce((sum, m) => sum + (m.value || 0), 0);
  
  char.statusEffects?.forEach(se => {
    se.modifiers?.forEach(m => {
      const target = (m.stat || "").toLowerCase();
      if (target === 'initiative' || target === 'init') init += (m.value || 0);
    });
  });
  return init;
}

export function getCharacterMaxHp(char: Character): number {
  let hp = char.maxHp || 0;
  const activeMods = [
    ...(char.specialSkills || []).filter(s => s.isActive).flatMap(s => s.modifiers || []),
    ...(char.equipment || []).filter(e => e.isEquipped).flatMap(e => e.modifiers || [])
  ];
  hp += activeMods
    .filter(m => {
      const target = (m.targetStatId || "").toLowerCase();
      return target === 'hp' || target === 'maxhp';
    })
    .reduce((sum, m) => sum + (m.value || 0), 0);
  
  char.statusEffects?.forEach(se => {
    se.modifiers?.forEach(m => {
      const st = (m.stat || "").toLowerCase();
      if (st === 'maxhp' || st === 'hp') hp += (m.value || 0);
    });
  });
  return hp;
}

/** Calculate the damage multiplier from the 30-50 rule */
export function calculateDegreeOfSuccess(rollPercent: number): {
  zone: "hit" | "miss" | "blunder";
  multiplier: number;
  description: string;
} {
  if (rollPercent > 50) {
    // Map 51-100 → 1x-2x
    const multiplier = 1 + ((rollPercent - 50) / 50);
    return { zone: "hit", multiplier, description: `Hit! ${multiplier.toFixed(2)}× damage` };
  } else if (rollPercent >= 30) {
    return { zone: "miss", multiplier: 0, description: "Miss — no damage" };
  } else {
    // Map 29-0 → 0x-1x self-damage
    const multiplier = (30 - rollPercent) / 30;
    return { zone: "blunder", multiplier, description: `Blunder! ${multiplier.toFixed(2)}× self-damage` };
  }
}
