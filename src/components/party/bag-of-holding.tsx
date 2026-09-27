"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Backpack,
  Plus,
  Minus,
  Sparkles,
  ArrowRightLeft,
  Trash2,
  Gift,
  Pencil,
  Swords,
  X,
  Droplet
} from "lucide-react";
import { clsx } from "clsx";
import { RARITY_COLORS, type EquipmentItem, type StatModifier, generateId } from "@/lib/types";
import { useCharacterStore } from "@/stores/character-store";
import { useAuthStore } from "@/stores/auth-store";

const ITEM_TYPES = ["weapon", "armor", "shield", "accessory", "consumable", "misc"] as const;
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
const STAT_OPTIONS = ["atk", "int", "cha", "hp", "ac", "init"];

export default function BagOfHolding() {
  const store = useCharacterStore();
  const { user } = useAuthStore();
  const parts = user?.displayName?.split("|") || [];
  const role = parts[0] || "Player";
  const customId = parts[1] || "";
  const myCharacter = store.characters.find(c => 
    (c.ownerId && c.ownerId === user?.uid) ||
    (c.ownerName && c.ownerName.toLowerCase() === customId.toLowerCase())
  );
  const [goldDelta, setGoldDelta] = useState("");
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "consumable" as EquipmentItem["type"],
    rarity: "common" as EquipmentItem["rarity"],
    description: "",
    quantity: 1,
    skillText: "",
    stats: { atk: 0, int: 0, cha: 0, hp: 0, ac: 0, init: 0 },
    effectType: "none" as "none" | "heal" | "status_effect",
    healAmount: 0,
    statusEffect: { name: "", remainingTurns: -1, description: "", modifiers: [] as any[] }
  });

  function handleGoldChange(action: "add" | "sub") {
    const amount = parseInt(goldDelta);
    if (isNaN(amount) || amount <= 0) return;
    if (action === "sub" && store.partyGold < amount) {
      alert("Not enough party gold!");
      return;
    }
    store.adjustPartyGold(action === "add" ? amount : -amount);
    setGoldDelta("");
  }

  function handleDistributeGold() {
    const amount = parseInt(goldDelta);
    if (isNaN(amount) || amount <= 0 || store.partyGold < amount) return;

    const chars = store.characters;
    if (chars.length === 0) return;

    const split = Math.floor(amount / chars.length);
    store.adjustPartyGold(-amount);
    chars.forEach(c => store.adjustCharGold(c.id, split));
    setGoldDelta("");
    alert(`Distributed ${split}g to each of the ${chars.length} players!`);
  }

  function openAddModal() {
    setFormData({
      name: "", type: "consumable", rarity: "common", description: "", quantity: 1, skillText: "",
      stats: { atk: 0, int: 0, cha: 0, hp: 0, ac: 0, init: 0 },
      effectType: "none", healAmount: 0, statusEffect: { name: "", remainingTurns: -1, description: "", modifiers: [] }
    });
    setEditItemId(null);
    setShowModal(true);
  }

  function openEditModal(item: EquipmentItem) {
    const stats = { atk: 0, int: 0, cha: 0, hp: 0, ac: 0, init: 0 };
    item.modifiers.forEach(m => {
      if (m.targetStatId in stats) {
        (stats as any)[m.targetStatId] = m.value;
      }
    });
    
    // Attempt to extract skill from description if we appended it.
    let desc = item.description;
    let skillText = "";
    if (desc.includes("\n\nSkill: ")) {
      const parts = desc.split("\n\nSkill: ");
      desc = parts[0];
      skillText = parts[1];
    }

    let effectType = "none" as "none" | "heal" | "status_effect";
    let healAmount = 0;
    let statusEffect: any = { name: "", remainingTurns: -1, description: "", modifiers: [] };
    if (item.onUseEffect) {
      effectType = item.onUseEffect.type;
      healAmount = item.onUseEffect.value || 0;
      if (item.onUseEffect.statusEffect) statusEffect = item.onUseEffect.statusEffect;
    }

    setFormData({
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      description: desc,
      quantity: item.quantity,
      skillText,
      stats,
      effectType,
      healAmount,
      statusEffect
    });
    setEditItemId(item.id);
    setShowModal(true);
  }

  function saveItem() {
    if (!formData.name.trim()) return;

    const isEquipment = ["weapon", "armor", "shield", "accessory"].includes(formData.type);
    
    const modifiers: StatModifier[] = [];
    if (isEquipment) {
      STAT_OPTIONS.forEach(stat => {
        const val = (formData.stats as any)[stat];
        if (val !== 0) {
          modifiers.push({
            id: generateId(),
            targetStatId: stat,
            value: val,
            source: "equipment",
            sourceLabel: formData.name
          });
        }
      });
    }

    let finalDesc = formData.description;
    if (isEquipment && formData.skillText.trim()) {
      finalDesc += `\n\nSkill: ${formData.skillText.trim()}`;
    }

    let onUseEffect: any = undefined;
    if (!isEquipment && formData.effectType !== "none") {
      onUseEffect = {
        type: formData.effectType,
        value: formData.effectType === "heal" ? formData.healAmount : undefined,
        statusEffect: formData.effectType === "status_effect" ? { ...formData.statusEffect, id: generateId() } : undefined
      };
    }

    const itemPayload = {
      name: formData.name,
      type: formData.type,
      rarity: formData.rarity,
      description: finalDesc,
      quantity: isEquipment ? 1 : Math.min(20, Math.max(1, formData.quantity)),
      isEquipped: false,
      modifiers,
      onUseEffect
    };

    if (editItemId) {
      store.updateItemInBagOfHolding(editItemId, itemPayload);
    } else {
      store.addToBagOfHolding(itemPayload);
    }

    setShowModal(false);
  }

  return (
    <div className="rounded-xl arcane-glass overflow-hidden flex flex-col h-full max-h-[calc(100vh-7rem)] border border-tertiary/20">
      
      {/* Header */}
      <div className="p-5 border-b border-outline-variant/20 bg-tertiary/5 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-tertiary/20 to-primary/20 flex items-center justify-center">
            <Backpack className="w-6 h-6 text-tertiary" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-on-surface">Bag of Holding</h2>
            <p className="text-sm text-on-surface-variant">Shared Party Inventory</p>
          </div>
        </div>

        {/* Party Gold */}
        <div className="bg-surface-container/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-tertiary" />
              <span className="text-sm font-semibold text-on-surface">Party Gold</span>
            </div>
            <span className="text-lg font-mono font-bold tabular-nums text-tertiary">
              {store.partyGold} g
            </span>
          </div>

          {role === "GM" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  value={goldDelta}
                  onChange={(e) => setGoldDelta(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-sm font-mono placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-tertiary/40 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => handleGoldChange("sub")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/10 text-error text-sm font-medium hover:bg-error/20 transition-colors border border-error/20"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleGoldChange("add")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <button 
                onClick={handleDistributeGold}
                className="w-full py-1.5 rounded-lg bg-tertiary/10 text-tertiary text-xs font-bold hover:bg-tertiary/20 transition-colors border border-tertiary/20"
              >
                Distribute Amount to Players
              </button>
            </>
          )}
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-on-surface-variant">Shared Items</h3>
          {role === "GM" && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          )}
        </div>

        {store.bagOfHolding.length === 0 && (
          <div className="text-center py-10">
            <Sparkles className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-2" />
            <p className="text-sm text-on-surface-variant">The bag is empty</p>
          </div>
        )}

        {store.bagOfHolding.map((item) => (
          <div key={item.id} className="bg-surface-container/40 border border-outline-variant/10 rounded-lg p-3 group relative">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={clsx("text-sm font-medium", RARITY_COLORS[item.rarity])}>
                    {item.name}
                  </span>
                  {item.quantity > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono">
                      ×{item.quantity}
                    </span>
                  )}
                  {["consumable", "misc"].includes(item.type) && role === "Player" && myCharacter && (
                    <button 
                      onClick={() => store.consumeItemFromBagOfHolding(item.id, myCharacter.id)}
                      className="ml-2 flex items-center gap-1 text-[10px] font-bold bg-primary/20 text-primary hover:bg-primary/30 px-2 py-0.5 rounded transition-colors"
                      title={`Use on ${myCharacter.name}`}
                    >
                      <Droplet className="w-3 h-3" /> Use
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-tight whitespace-pre-wrap">{item.description}</p>
                {item.modifiers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.modifiers.map(m => (
                      <span key={m.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {m.targetStatId.toUpperCase()} {m.value >= 0 ? '+' : ''}{m.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {role === "GM" && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 hover:bg-surface-container-highest rounded transition-colors text-on-surface-variant hover:text-on-surface"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => store.removeFromBagOfHolding(item.id)}
                    className="p-1.5 hover:bg-error/10 rounded transition-colors text-error/40 hover:text-error"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Transfer Control (GM) */}
            {role === "GM" && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-outline-variant/10 flex-wrap">
                <select
                  value={transferTargets[item.id] || ""}
                  onChange={e => setTransferTargets(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="flex-1 min-w-[130px] bg-surface-container-highest border border-outline-variant/20 rounded px-2 py-1 text-xs text-on-surface focus:outline-none"
                >
                  <option value="">Give to Character...</option>
                  {store.characters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.ownerName ? `(${c.ownerName})` : "(Unassigned)"}
                    </option>
                  ))}
                </select>

                {item.quantity > 1 && (
                  <div className="flex items-center gap-1 bg-surface-container-highest/80 rounded px-1.5 py-0.5 border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant font-mono">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={itemQuantities[item.id] || 1}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        setItemQuantities(prev => ({
                          ...prev,
                          [item.id]: Math.min(item.quantity, Math.max(1, val))
                        }));
                      }}
                      className="w-12 text-center bg-surface-container-lowest text-xs font-mono font-bold rounded px-1 py-0.5 border border-outline-variant/20 focus:outline-none text-on-surface"
                    />
                    <span className="text-[10px] text-on-surface-variant/60 font-mono">/{item.quantity}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    const targetId = transferTargets[item.id];
                    if (targetId) {
                      const qty = item.quantity > 1 ? (itemQuantities[item.id] || 1) : 1;
                      store.transferItemToChar(item.id, targetId, true, qty);
                      setTransferTargets(prev => ({ ...prev, [item.id]: "" }));
                      setItemQuantities(prev => ({ ...prev, [item.id]: 1 }));
                    }
                  }}
                  disabled={!transferTargets[item.id]}
                  className="px-3 py-1 bg-primary/15 text-primary hover:bg-primary/25 rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <ArrowRightLeft className="w-3 h-3" /> Give{item.quantity > 1 ? ` (${itemQuantities[item.id] || 1})` : ''}
                </button>
              </div>
            )}

            {/* Transfer Control (Player) */}
            {role === "Player" && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-outline-variant/10 flex-wrap">
                {myCharacter ? (
                  <>
                    {item.quantity > 1 && (
                      <div className="flex items-center gap-1 bg-surface-container-highest/80 rounded px-1.5 py-0.5 border border-outline-variant/20">
                        <button
                          onClick={() => {
                            const cur = itemQuantities[item.id] || 1;
                            setItemQuantities(prev => ({ ...prev, [item.id]: Math.max(1, cur - 1) }));
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface-variant transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={itemQuantities[item.id] || 1}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 1;
                            setItemQuantities(prev => ({
                              ...prev,
                              [item.id]: Math.min(item.quantity, Math.max(1, val))
                            }));
                          }}
                          className="w-10 text-center bg-surface-container-lowest text-xs font-mono font-bold rounded py-0.5 border border-outline-variant/20 focus:outline-none text-on-surface"
                        />
                        <button
                          onClick={() => {
                            const cur = itemQuantities[item.id] || 1;
                            setItemQuantities(prev => ({ ...prev, [item.id]: Math.min(item.quantity, cur + 1) }));
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface-variant transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => {
                            setItemQuantities(prev => ({ ...prev, [item.id]: item.quantity }));
                          }}
                          className="text-[10px] px-1 text-primary hover:underline font-mono font-bold ml-0.5"
                          title="Take all"
                        >
                          Max
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const qty = item.quantity > 1 ? (itemQuantities[item.id] || 1) : 1;
                        store.transferItemToChar(item.id, myCharacter.id, false, qty);
                        setItemQuantities(prev => ({ ...prev, [item.id]: 1 }));
                      }}
                      className="px-3 py-1 bg-secondary/15 text-secondary hover:bg-secondary/25 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      title={`Take to ${myCharacter.name}'s inventory`}
                    >
                      <Backpack className="w-3.5 h-3.5" /> Take{item.quantity > 1 ? ` (${itemQuantities[item.id] || 1})` : ''} to {myCharacter.name}
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-on-surface-variant/60 italic">
                    Link a character in Party Hub to take items
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Item Modal (GM Only) */}
      <AnimatePresence>
        {showModal && role === "GM" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-surface-container border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-md max-h-full overflow-y-auto flex flex-col"
            >
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between sticky top-0 bg-surface-container z-10">
                <h3 className="font-serif font-bold text-lg text-on-surface">
                  {editItemId ? "Edit Item" : "Add Item"}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase">Item Name</label>
                    <input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase">Type</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    >
                      {ITEM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase">Rarity</label>
                    <select
                      value={formData.rarity}
                      onChange={e => setFormData({ ...formData, rarity: e.target.value as any })}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    >
                      {RARITIES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none min-h-[60px]"
                  />
                </div>

                {["weapon", "armor", "shield", "accessory"].includes(formData.type) ? (
                  <div className="bg-surface-container-highest rounded-lg p-3 border border-outline-variant/10 space-y-3">
                    <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5" /> Equipment Stats (Quantity locked to 1)
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {STAT_OPTIONS.map(stat => (
                        <div key={stat} className="flex flex-col gap-0.5">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase">{stat}</label>
                          <input
                            type="number"
                            value={(formData.stats as any)[stat]}
                            onChange={e => setFormData({ ...formData, stats: { ...formData.stats, [stat]: parseInt(e.target.value) || 0 } })}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-2 py-1 text-sm font-mono text-on-surface focus:border-primary focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase">Special Skill (Optional)</label>
                      <input
                        value={formData.skillText}
                        onChange={e => setFormData({ ...formData, skillText: e.target.value })}
                        placeholder="e.g. Cleave: Attack 2 enemies"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-1.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase">Quantity (Max 20)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase">On Use Effect</label>
                      <select
                        value={formData.effectType}
                        onChange={e => setFormData({ ...formData, effectType: e.target.value as any })}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                      >
                        <option value="none">None</option>
                        <option value="heal">Heal HP</option>
                        <option value="status_effect">Apply Status Effect</option>
                      </select>
                    </div>

                    {formData.effectType === "heal" && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface-variant uppercase">Heal Amount</label>
                        <input
                          type="number"
                          value={formData.healAmount}
                          onChange={e => setFormData({ ...formData, healAmount: parseInt(e.target.value) || 0 })}
                          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                        />
                      </div>
                    )}

                    {formData.effectType === "status_effect" && (
                      <div className="space-y-2 border border-outline-variant/20 p-2 rounded-lg bg-surface-container-highest">
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Effect Name" value={formData.statusEffect.name} onChange={e => setFormData({ ...formData, statusEffect: { ...formData.statusEffect, name: e.target.value }})} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-2 py-1 text-sm text-on-surface focus:border-primary focus:outline-none" />
                          <input type="number" placeholder="Duration (Turns, -1 = infinite)" value={formData.statusEffect.remainingTurns} onChange={e => setFormData({ ...formData, statusEffect: { ...formData.statusEffect, remainingTurns: parseInt(e.target.value) || -1 }})} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-2 py-1 text-sm text-on-surface focus:border-primary focus:outline-none" />
                        </div>
                        <input placeholder="Effect Description" value={formData.statusEffect.description} onChange={e => setFormData({ ...formData, statusEffect: { ...formData.statusEffect, description: e.target.value }})} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded px-2 py-1 text-sm text-on-surface focus:border-primary focus:outline-none" />
                        
                        <div className="text-[10px] text-on-surface-variant font-bold uppercase mt-2">Modifiers (Optional)</div>
                        <div className="space-y-1">
                          {formData.statusEffect.modifiers.map((mod: any, i: number) => (
                            <div key={i} className="flex gap-2 items-center">
                              <select value={mod.stat} onChange={e => {
                                const newMods = [...formData.statusEffect.modifiers];
                                newMods[i].stat = e.target.value;
                                setFormData({ ...formData, statusEffect: { ...formData.statusEffect, modifiers: newMods } });
                              }} className="bg-surface-container-lowest border border-outline-variant/20 rounded px-1 py-1 text-xs">
                                {["hp", "maxHp", "ac", "atk", "initiative"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <input type="number" value={mod.value} onChange={e => {
                                const newMods = [...formData.statusEffect.modifiers];
                                newMods[i].value = parseInt(e.target.value) || 0;
                                setFormData({ ...formData, statusEffect: { ...formData.statusEffect, modifiers: newMods } });
                              }} className="w-16 bg-surface-container-lowest border border-outline-variant/20 rounded px-1 py-1 text-xs" />
                              <button onClick={() => {
                                const newMods = formData.statusEffect.modifiers.filter((_: any, idx: number) => idx !== i);
                                setFormData({ ...formData, statusEffect: { ...formData.statusEffect, modifiers: newMods } });
                              }} className="text-error"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <button onClick={() => setFormData({ ...formData, statusEffect: { ...formData.statusEffect, modifiers: [...formData.statusEffect.modifiers, { stat: "ac", value: 0 }] }})} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3"/> Add Modifier</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-outline-variant/10 bg-surface-container-lowest mt-auto flex justify-end gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors">
                  Cancel
                </button>
                <button onClick={saveItem} disabled={!formData.name.trim()} className="px-4 py-2 text-sm font-bold bg-primary text-on-primary rounded-lg hover:brightness-110 transition-all disabled:opacity-50">
                  {editItemId ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

