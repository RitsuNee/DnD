"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Backpack,
  User,
  Coins,
  ArrowRightLeft,
  Droplet,
  Shield,
  Zap,
  Heart,
  Swords,
  Check,
  Sparkles,
  Lock,
  ChevronDown,
  Camera,
  Upload,
  ImageIcon
} from "lucide-react";
import { clsx } from "clsx";
import {
  type Character,
  type CharacterStat,
  RARITY_COLORS,
  computeStatTotal,
  getCharacterAC,
  getCharacterInitiative,
  getCharacterMaxHp
} from "@/lib/types";
import { useCharacterStore, recalculateCharacterBonuses } from "@/stores/character-store";
import { useAuthStore } from "@/stores/auth-store";
import { resizeImageToDataUrl } from "@/lib/image-utils";

interface CharacterSheetProps {
  character: Character;
  onClose: () => void;
}

export default function CharacterSheet({ character, onClose }: CharacterSheetProps) {
  const store = useCharacterStore();
  const { user } = useAuthStore();
  const role = user?.displayName?.split("|")[0] || "Player";
  const customId = user?.displayName?.split("|")[1] || "";

  // Ownership & Permissions
  const isOwner = Boolean(
    (character.ownerId && character.ownerId === user?.uid) ||
    (character.ownerName && character.ownerName.toLowerCase() === customId.toLowerCase())
  );
  const canManage = role === "GM" || isOwner;

  const [goldDelta, setGoldDelta] = useState("");
  const [showAssignOwner, setShowAssignOwner] = useState(false);

  // Avatar Modal State (GM Only)
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState(character.avatarUrl || "");
  const [avatarTab, setAvatarTab] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);

  // GM Full Character Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [customStatName, setCustomStatName] = useState("");
  const [editForm, setEditForm] = useState({
    name: character.name,
    level: character.identity.level || 1,
    race: character.identity.race || "",
    class: character.identity.class || "",
    alignment: character.identity.alignment || "Neutral",
    background: character.identity.background || "",
    hp: character.hp,
    maxHp: character.maxHp,
    ac: character.ac,
    initiative: character.initiative,
    stats: (character.stats || []).map(s => ({ ...s }))
  });

  const STANDARD_STAT_PRESETS = ["STR", "DEX", "CON", "INT", "WIS", "CHA", "ATK"];

  function handleOpenEdit() {
    setEditForm({
      name: character.name,
      level: character.identity.level || 1,
      race: character.identity.race || "",
      class: character.identity.class || "",
      alignment: character.identity.alignment || "Neutral",
      background: character.identity.background || "",
      hp: character.hp,
      maxHp: character.maxHp,
      ac: character.ac,
      initiative: character.initiative,
      stats: (character.stats || []).map(s => ({ ...s }))
    });
    setCustomStatName("");
    setShowEditModal(true);
  }

  function handleAddStat(statName: string, defaultValue = 10) {
    const trimmed = statName.trim().toUpperCase();
    if (!trimmed) return;
    if (editForm.stats.some(s => s.name.toUpperCase() === trimmed)) {
      alert(`Stat "${trimmed}" already exists.`);
      return;
    }
    const newStat: CharacterStat = {
      id: trimmed.toLowerCase().replace(/\s+/g, "_"),
      name: trimmed,
      baseValue: defaultValue,
      bonusValue: 0
    };
    setEditForm(prev => ({
      ...prev,
      stats: [...prev.stats, newStat]
    }));
  }

  function handleRemoveStat(statId: string) {
    setEditForm(prev => ({
      ...prev,
      stats: prev.stats.filter(s => s.id !== statId)
    }));
  }

  function handleStatValueChange(statId: string, val: number) {
    setEditForm(prev => ({
      ...prev,
      stats: prev.stats.map(s => s.id === statId ? { ...s, baseValue: val } : s)
    }));
  }

  function handleStatNameChange(statId: string, name: string) {
    setEditForm(prev => ({
      ...prev,
      stats: prev.stats.map(s => s.id === statId ? { ...s, name } : s)
    }));
  }

  function handleSaveEdit() {
    if (!editForm.name.trim()) {
      alert("Character name cannot be empty.");
      return;
    }

    const validStats = editForm.stats
      .filter(s => s.name.trim().length > 0)
      .map(s => ({
        id: s.id || s.name.trim().toLowerCase().replace(/\s+/g, "_"),
        name: s.name.trim(),
        baseValue: Number(s.baseValue) || 0,
        bonusValue: 0
      }));

    const previewChar: Character = {
      ...character,
      stats: validStats
    };
    const recalculatedStats = recalculateCharacterBonuses(previewChar);

    const finalMaxHp = Math.max(1, Number(editForm.maxHp) || 1);
    const finalHp = Math.max(0, Math.min(finalMaxHp, Number(editForm.hp) ?? character.hp));

    store.updateCharacter(character.id, {
      name: editForm.name.trim(),
      identity: {
        ...character.identity,
        level: Math.max(1, Number(editForm.level) || 1),
        race: editForm.race.trim() || "Unknown",
        class: editForm.class.trim() || "Adventurer",
        alignment: editForm.alignment.trim() || "Neutral",
        background: editForm.background.trim()
      },
      hp: finalHp,
      maxHp: finalMaxHp,
      ac: Number(editForm.ac) || 0,
      initiative: Number(editForm.initiative) || 0,
      stats: recalculatedStats
    });

    setShowEditModal(false);
  }

  const maxHpWithMods = getCharacterMaxHp(character);
  const acWithMods = getCharacterAC(character);
  const initWithMods = getCharacterInitiative(character);

  const previewCharForEdit: Character = {
    ...character,
    stats: editForm.stats.map(s => ({
      ...s,
      baseValue: Number(s.baseValue) || 0,
      bonusValue: 0
    }))
  };
  const recalculatedPreviewStats = recalculateCharacterBonuses(previewCharForEdit);
  const recalculatedPreviewMap = new Map(recalculatedPreviewStats.map(s => [s.id, s]));

  function handleGoldChange(action: "add" | "sub") {
    if (!canManage) return;
    const amount = parseInt(goldDelta);
    if (isNaN(amount) || amount <= 0) return;
    
    if (action === "sub" && character.gold < amount) {
      alert("Not enough gold!");
      return;
    }

    store.adjustCharGold(character.id, action === "add" ? amount : -amount);
    setGoldDelta("");
  }

  function handleDelete() {
    if (confirm(`Are you sure you want to delete ${character.name}?`)) {
      store.removeCharacter(character.id);
      onClose();
    }
  }

  function handleAssignOwner(uid: string, ownerName: string) {
    store.assignCharacterOwner(character.id, uid || null, ownerName || null);
    setShowAssignOwner(false);
  }

  function handleClaimCharacter() {
    if (!user) return;
    store.assignCharacterOwner(character.id, user.uid, customId);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const dataUrl = await resizeImageToDataUrl(file, 256, 0.85);
      setAvatarDraft(dataUrl);
    } catch (err: any) {
      alert(err.message || "Failed to process image.");
    } finally {
      setUploading(false);
    }
  }

  function handleSaveAvatar() {
    store.updateCharacter(character.id, {
      avatarUrl: avatarDraft.trim() || undefined
    });
    setShowAvatarModal(false);
  }

  function handleRemoveAvatar() {
    store.updateCharacter(character.id, {
      avatarUrl: undefined
    });
    setAvatarDraft("");
    setShowAvatarModal(false);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-xl arcane-glass overflow-hidden flex flex-col h-full max-h-[calc(100vh-7rem)] border border-primary/20"
      >
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/20 shrink-0 bg-surface-container/30">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 w-full">
              {/* Avatar with GM Camera Edit Overlay */}
              <div className="relative group shrink-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center overflow-hidden border border-primary/20 shadow-sm">
                  {character.avatarUrl ? (
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-serif font-bold text-primary">
                      {character.name[0]}
                    </span>
                  )}
                </div>

                {role === "GM" && (
                  <button
                    onClick={() => {
                      setAvatarDraft(character.avatarUrl || "");
                      setShowAvatarModal(true);
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center text-white text-[9px] font-bold"
                    title="Change Avatar (GM Only)"
                  >
                    <Camera className="w-4 h-4 mb-0.5 text-primary" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2 truncate">
                      {character.name}
                    </h2>
                    {role === "GM" && (
                      <div className="flex gap-1 ml-2 shrink-0">
                        <button
                          onClick={() => {
                            setAvatarDraft(character.avatarUrl || "");
                            setShowAvatarModal(true);
                          }}
                          className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-bold uppercase tracking-wider hover:bg-primary/30 transition-colors flex items-center gap-1"
                          title="Change Character Profile Picture"
                        >
                          <Camera className="w-3 h-3" /> Avatar
                        </button>
                        <button
                          onClick={handleOpenEdit}
                          className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-1 rounded font-bold uppercase tracking-wider hover:bg-tertiary/30 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="text-[10px] bg-error/20 text-error px-2 py-1 rounded font-bold uppercase tracking-wider hover:bg-error/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    Lv.{character.identity.level} · {character.identity.race} · {character.identity.class}
                    {character.identity.alignment && ` · ${character.identity.alignment}`}
                  </p>

                  {/* Owner Info & Assignment */}
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 text-[11px] bg-surface-container-highest/80 px-2 py-0.5 rounded-full border border-outline-variant/20">
                      <User className="w-3 h-3 text-primary" />
                      <span className="text-on-surface-variant">Owner:</span>
                      <span className="font-bold text-on-surface">
                        {character.ownerName || "Unassigned"}
                      </span>
                      {isOwner && (
                        <span className="ml-1 text-[9px] px-1 rounded bg-primary/20 text-primary font-bold">
                          YOU
                        </span>
                      )}
                    </div>

                    {role === "GM" && (
                      <div className="relative">
                        <button
                          onClick={() => setShowAssignOwner(!showAssignOwner)}
                          className="text-[10px] bg-secondary/15 text-secondary hover:bg-secondary/25 px-2 py-0.5 rounded flex items-center gap-0.5 font-medium transition-colors"
                        >
                          Assign <ChevronDown className="w-2.5 h-2.5" />
                        </button>

                        {showAssignOwner && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl p-1 z-30">
                            <button
                              onClick={() => handleAssignOwner("", "")}
                              className="w-full text-left px-2 py-1 text-xs hover:bg-surface-container-highest rounded text-on-surface-variant"
                            >
                              Unassign
                            </button>
                            {store.registeredUsers.map(u => (
                              <button
                                key={u.uid}
                                onClick={() => handleAssignOwner(u.uid, u.customId)}
                                className="w-full text-left px-2 py-1 text-xs hover:bg-surface-container-highest rounded flex items-center justify-between text-on-surface"
                              >
                                <span>{u.customId}</span>
                                <span className="text-[10px] text-on-surface-variant/60">({u.role})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!character.ownerId && !character.ownerName && role === "Player" && (
                      <button
                        onClick={handleClaimCharacter}
                        className="text-[10px] bg-primary/20 text-primary hover:bg-primary/30 px-2 py-0.5 rounded font-bold transition-colors"
                      >
                        Claim as My Character
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-3 items-end shrink-0">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

          {/* Combat Vitals (HP / AC / INIT) */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-surface-container/60 border border-outline-variant/10 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-tertiary">
                <Heart className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">HP</span>
              </div>
              <div className="font-mono text-sm font-bold text-on-surface mt-0.5">
                {character.hp} / {maxHpWithMods}
              </div>
            </div>
            <div className="bg-surface-container/60 border border-outline-variant/10 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-secondary">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">AC</span>
              </div>
              <div className="font-mono text-sm font-bold text-on-surface mt-0.5">
                {acWithMods}
              </div>
            </div>
            <div className="bg-surface-container/60 border border-outline-variant/10 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">INIT</span>
              </div>
              <div className="font-mono text-sm font-bold text-on-surface mt-0.5">
                {initWithMods >= 0 ? `+${initWithMods}` : initWithMods}
              </div>
            </div>
          </div>

          {/* Primary Stats Breakdown (ATK, INT, CHA, etc.) */}
          {character.stats && character.stats.length > 0 ? (
            <div className="mt-3 pt-3 border-t border-outline-variant/15">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <Swords className="w-3 h-3 text-primary" /> Attributes & Modifiers
                </span>
                <span className="text-[10px] text-on-surface-variant/60 font-mono">
                  Total (Base + Gear)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {character.stats.map(stat => {
                  const total = computeStatTotal(stat, character.useCompositeStats);
                  const bonus = stat.bonusValue || 0;
                  return (
                    <div
                      key={stat.id}
                      className="bg-surface-container/50 border border-outline-variant/10 rounded-lg p-2 text-center"
                    >
                      <div className="text-[10px] font-bold text-on-surface-variant uppercase truncate">
                        {stat.name}
                      </div>
                      <div className="text-base font-mono font-bold text-on-surface">
                        {total}
                      </div>
                      <div className="text-[10px] font-mono text-on-surface-variant">
                        {stat.baseValue}
                        {bonus !== 0 && (
                          <span className={clsx("font-bold ml-1", bonus > 0 ? "text-primary" : "text-error")}>
                            {bonus > 0 ? `+${bonus}` : bonus}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            role === "GM" && (
              <div className="mt-3 pt-3 border-t border-outline-variant/15 text-center p-3 rounded-lg bg-surface-container/30 border border-dashed border-outline-variant/20">
                <p className="text-[11px] text-on-surface-variant mb-1">No attributes configured for this character.</p>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Attributes
                </button>
              </div>
            )
          )}

          {/* Gold Section */}
          <div className="bg-surface-container/60 rounded-xl p-3 mt-3 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs font-semibold text-on-surface">Personal Gold</span>
              </div>
              <span className="text-sm font-mono font-bold tabular-nums text-secondary">
                {character.gold || 0} g
              </span>
            </div>

            {canManage ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={goldDelta}
                  onChange={(e) => setGoldDelta(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-mono placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-secondary/40 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => handleGoldChange("sub")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error/10 text-error text-xs font-medium hover:bg-error/20 transition-colors border border-error/20"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleGoldChange("add")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-tertiary/10 text-tertiary text-xs font-medium hover:bg-tertiary/20 transition-colors border border-tertiary/20"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-on-surface-variant/60 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Only owner or GM can adjust gold
              </div>
            )}
          </div>
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Backpack className="w-4 h-4 text-primary" />
              <h3 className="font-serif font-bold text-sm uppercase tracking-wider">Equipment & Inventory</h3>
            </div>
            {!canManage && (
              <span className="text-[10px] text-on-surface-variant/60 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Read-only
              </span>
            )}
          </div>

          {character.equipment.length === 0 && (
            <div className="text-center py-8 bg-surface-container/20 rounded-xl border border-dashed border-outline-variant/20">
              <Backpack className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
              <p className="text-xs text-on-surface-variant">Inventory is currently empty.</p>
              <p className="text-[11px] text-on-surface-variant/60 mt-1">
                Transfer items from the Bag of Holding to equip them.
              </p>
            </div>
          )}

          {character.equipment.map((item) => {
            const isConsumable = ["consumable", "misc"].includes(item.type);

            return (
              <div
                key={item.id}
                className={clsx(
                  "p-3 rounded-lg transition-all border",
                  item.isEquipped
                    ? "bg-primary/5 border-primary/25 shadow-sm shadow-primary/5"
                    : "bg-surface-container/40 border-outline-variant/15 hover:border-outline-variant/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx("text-sm font-semibold", RARITY_COLORS[item.rarity])}>
                        {item.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant uppercase font-mono">
                        {item.type}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono">
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-snug whitespace-pre-wrap">
                        {item.description}
                      </p>
                    )}

                    {/* Modifiers List */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.modifiers.map(m => (
                          <span
                            key={m.id}
                            className={clsx(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                              item.isEquipped
                                ? "bg-primary/15 text-primary border-primary/30 font-bold"
                                : "bg-surface-container-highest text-on-surface-variant border-outline-variant/20"
                            )}
                          >
                            {m.targetStatId.toUpperCase()} {m.value >= 0 ? '+' : ''}{m.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Equip / Use Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isConsumable && (
                      <button
                        onClick={() => {
                          if (canManage) store.toggleEquipment(character.id, item.id);
                        }}
                        disabled={!canManage}
                        className={clsx(
                          "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all",
                          item.isEquipped
                            ? "bg-primary text-on-primary hover:brightness-110 shadow-sm"
                            : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/20",
                          !canManage && "opacity-50 cursor-not-allowed"
                        )}
                        title={canManage ? (item.isEquipped ? "Click to Unequip" : "Click to Equip") : "Owner or GM only"}
                      >
                        {item.isEquipped ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Equipped
                          </>
                        ) : (
                          <>
                            <Swords className="w-3.5 h-3.5" /> Equip
                          </>
                        )}
                      </button>
                    )}

                    {isConsumable && (
                      <button
                        onClick={() => {
                          if (canManage) store.consumeEquipment(character.id, item.id);
                        }}
                        disabled={!canManage}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-tertiary/15 text-tertiary hover:bg-tertiary/25 flex items-center gap-1 transition-colors border border-tertiary/20 disabled:opacity-50"
                        title={canManage ? "Use Consumable" : "Owner or GM only"}
                      >
                        <Droplet className="w-3.5 h-3.5" /> Use
                      </button>
                    )}

                    {canManage && (
                      <>
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              const val = prompt(`Send how many ${item.name} back to Bag of Holding? (1 - ${item.quantity})`, "1");
                              if (val) {
                                const qty = parseInt(val);
                                if (!isNaN(qty) && qty > 0) {
                                  store.transferItemToBag(character.id, item.id, qty);
                                }
                              }
                            } else {
                              store.transferItemToBag(character.id, item.id);
                            }
                          }}
                          className="p-1.5 hover:bg-tertiary/10 rounded-md transition-colors text-tertiary/70 hover:text-tertiary"
                          title="Send back to Bag of Holding"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => store.removeEquipment(character.id, item.id)}
                          className="p-1.5 hover:bg-error/10 rounded-md transition-colors text-error/50 hover:text-error"
                          title="Discard Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* GM Custom Avatar Modal */}
      <AnimatePresence>
        {showAvatarModal && role === "GM" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowAvatarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-surface-container/95 border border-primary/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative arcane-glass text-on-surface"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-on-surface">Change Character Avatar</h3>
                    <p className="text-xs text-on-surface-variant">GM Special Feature · Realtime Sync</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview Circle */}
              <div className="text-center my-4">
                <div className="w-24 h-24 rounded-2xl mx-auto overflow-hidden border-2 border-primary/40 shadow-lg shadow-primary/10 bg-surface-container-highest flex items-center justify-center relative">
                  {avatarDraft ? (
                    <img src={avatarDraft} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-serif font-bold text-primary">{character.name[0]}</span>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-primary font-bold">
                      Processing...
                    </div>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-2 font-medium">{character.name}</p>
              </div>

              {/* Tabs: File Upload vs URL */}
              <div className="flex gap-2 mb-4 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setAvatarTab("upload")}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
                    avatarTab === "upload"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab("url")}
                  className={clsx(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
                    avatarTab === "url"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Image Link / URL
                </button>
              </div>

              {/* Tab Content */}
              {avatarTab === "upload" ? (
                <div className="mb-5">
                  <label className="border-2 border-dashed border-outline-variant/30 hover:border-primary/50 transition-colors rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-surface-container-lowest/50 group">
                    <Upload className="w-8 h-8 text-on-surface-variant/40 group-hover:text-primary transition-colors mb-2" />
                    <span className="text-xs font-semibold text-on-surface">Click to select an image from your device</span>
                    <span className="text-[10px] text-on-surface-variant mt-1">PNG, JPG, WebP (auto-optimized)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="mb-5">
                  <label className="text-xs text-on-surface-variant block mb-1.5 font-medium">Image Direct URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or Discord CDN"
                    value={avatarDraft}
                    onChange={e => setAvatarDraft(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                  />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Paste any direct link to an image file.</p>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                {character.avatarUrl ? (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs text-error hover:underline font-medium"
                  >
                    Reset to Default
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={uploading}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
                  >
                    Save Avatar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* GM Full Character Edit Modal */}
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-surface-container/95 border border-primary/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden arcane-glass text-on-surface"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-tertiary/15 border border-tertiary/30 flex items-center justify-center text-tertiary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-on-surface">
                      Edit Character Sheet
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Modify identity, combat vitals, base stats, and custom attributes for {character.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* 1. Identity & Profile */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 mb-3">
                    <User className="w-3.5 h-3.5 text-primary" /> Identity & Progression
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Character Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(s => ({ ...s, name: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                        placeholder="e.g. Roland Emberheart"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Level
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editForm.level}
                        onChange={e => setEditForm(s => ({ ...s, level: parseInt(e.target.value) || 1 }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Race
                      </label>
                      <input
                        type="text"
                        value={editForm.race}
                        onChange={e => setEditForm(s => ({ ...s, race: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                        placeholder="e.g. Human, Elf"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Class
                      </label>
                      <input
                        type="text"
                        value={editForm.class}
                        onChange={e => setEditForm(s => ({ ...s, class: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                        placeholder="e.g. Paladin, Mage"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Alignment
                      </label>
                      <input
                        type="text"
                        list="alignment-presets"
                        value={editForm.alignment}
                        onChange={e => setEditForm(s => ({ ...s, alignment: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                        placeholder="e.g. Lawful Good"
                      />
                      <datalist id="alignment-presets">
                        <option value="Lawful Good" />
                        <option value="Neutral Good" />
                        <option value="Chaotic Good" />
                        <option value="Lawful Neutral" />
                        <option value="True Neutral" />
                        <option value="Chaotic Neutral" />
                        <option value="Lawful Evil" />
                        <option value="Neutral Evil" />
                        <option value="Chaotic Evil" />
                      </datalist>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Background / Lore (Optional)
                      </label>
                      <input
                        type="text"
                        value={editForm.background}
                        onChange={e => setEditForm(s => ({ ...s, background: e.target.value }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                        placeholder="e.g. Noble knight of the Silver Vanguard"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Combat Vitals */}
                <div className="pt-4 border-t border-outline-variant/15">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 mb-3">
                    <Heart className="w-3.5 h-3.5 text-tertiary" /> Combat Vitals
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Current HP
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editForm.hp}
                        onChange={e => setEditForm(s => ({ ...s, hp: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Max HP
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editForm.maxHp}
                        onChange={e => setEditForm(s => ({ ...s, maxHp: parseInt(e.target.value) || 1 }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Armor Class (AC)
                      </label>
                      <input
                        type="number"
                        value={editForm.ac}
                        onChange={e => setEditForm(s => ({ ...s, ac: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
                        Initiative Mod
                      </label>
                      <input
                        type="number"
                        value={editForm.initiative}
                        onChange={e => setEditForm(s => ({ ...s, initiative: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Core Attributes & Custom Stats */}
                <div className="pt-4 border-t border-outline-variant/15">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5 text-primary" /> Character Attributes & Modifiers
                      </h4>
                      <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                        Edit base stats or add new attributes. Equipment & skill bonuses are added automatically.
                      </p>
                    </div>
                  </div>

                  {/* Quick Add Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3 p-2.5 rounded-lg bg-surface-container/50 border border-outline-variant/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant shrink-0">
                      Quick Add:
                    </span>
                    {STANDARD_STAT_PRESETS.map(preset => {
                      const exists = editForm.stats.some(s => s.name.toUpperCase() === preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={exists}
                          onClick={() => handleAddStat(preset, 10)}
                          className={clsx(
                            "px-2 py-0.5 rounded text-[11px] font-bold transition-all",
                            exists
                              ? "bg-surface-container-highest/40 text-on-surface-variant/40 cursor-not-allowed"
                              : "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 active:scale-95"
                          )}
                        >
                          + {preset}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stats Grid */}
                  {editForm.stats.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-outline-variant/30 text-center text-xs text-on-surface-variant">
                      No attributes added yet. Click one of the quick presets above or create a custom attribute below.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                      {editForm.stats.map(stat => {
                        // Calculate active bonus preview from equipment & skills
                        const previewStat = recalculatedPreviewMap.get(stat.id) || stat;
                        const bonus = previewStat.bonusValue || 0;
                        const total = (Number(stat.baseValue) || 0) + bonus;

                        return (
                          <div
                            key={stat.id}
                            className="p-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/15 flex items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={stat.name}
                                onChange={e => handleStatNameChange(stat.id, e.target.value)}
                                className="w-full bg-transparent font-bold text-xs uppercase tracking-wider text-on-surface border-b border-transparent hover:border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                                placeholder="Stat Name"
                              />
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  Base:
                                </span>
                                <input
                                  type="number"
                                  value={stat.baseValue}
                                  onChange={e => handleStatValueChange(stat.id, parseInt(e.target.value) || 0)}
                                  className="w-16 px-1.5 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/20 text-xs font-mono font-bold text-on-surface text-center focus:outline-none focus:border-primary"
                                />
                                {bonus !== 0 ? (
                                  <span className={clsx("text-[10px] font-mono font-bold", bonus > 0 ? "text-primary" : "text-error")}>
                                    {bonus > 0 ? `+${bonus}` : bonus} gear
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-on-surface-variant/40 font-mono">
                                    +0 gear
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-[9px] text-on-surface-variant block uppercase font-medium">
                                  Total
                                </span>
                                <span className="text-sm font-mono font-bold text-on-surface">
                                  {total}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveStat(stat.id)}
                                className="p-1 rounded text-on-surface-variant/60 hover:text-error hover:bg-error/10 transition-colors"
                                title={`Delete ${stat.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Custom Stat Input */}
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="text"
                      value={customStatName}
                      onChange={e => setCustomStatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (customStatName.trim()) {
                            handleAddStat(customStatName, 10);
                            setCustomStatName("");
                          }
                        }
                      }}
                      placeholder="Custom stat name (e.g. LUCK, SPEED, MANA)..."
                      className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customStatName.trim()) {
                          handleAddStat(customStatName, 10);
                          setCustomStatName("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/20 transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Stat
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-outline-variant/20 flex items-center justify-end gap-2 bg-surface-container/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-primary text-on-primary hover:brightness-110 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
