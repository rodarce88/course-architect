"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createPortal,
} from "react";
import { createPortal } from "react-dom";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReactionEmoji {
  id: number;
  src: string;
  label: string;
}

export interface ReactionPickerProps {
  onSelect: (emoji: ReactionEmoji) => void;
  trigger?: React.ReactNode;
  basePath?: string;
  count?: number;
  labels?: string[];
  /** "above" | "below" — auto-flips if no space (default: "above") */
  placement?: "above" | "below";
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const EMOJI_LABELS: string[] = [
  "Slightly smiling", "Slightly smiling", "LOL crying", "Angry",
  "Hugging face", "Thinking", "Saluting", "Grimacing", "Pleading",
  "Holding back tears", "Upside down", "Party", "Heart eyes", "In love",
  "Holding back tears", "Laughing", "Big smile", "XD",
  "Slightly smiling", "Slightly smiling",
  "Heart on fire", "Purple heart", "Red heart", "Party popper",
  "Glowing star", "Lightning", "Collision", "Fire",
  "See-no-evil monkey", "Space invader", "Alien", "Robot",
  "Jack-o-lantern", "Snowman", "Skull", "Ghost", "Poop", "Clown",
  "Sunglasses", "Nauseated",
  "Goose", "Eagle", "T-Rex", "Turtle", "Frog",
  "Praying hands", "Plant", "Plant", "Thumbs down", "Thumbs up",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEmojiList(
  basePath: string,
  count: number,
  labels: string[]
): ReactionEmoji[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    src: `${basePath}/emoji_${i + 1}.gif`,
    label: labels[i] ?? `Emoji ${i + 1}`,
  }));
}

// ─── EmojiButton ─────────────────────────────────────────────────────────────

function EmojiButton({
  emoji,
  isSelected,
  onSelect,
}: {
  emoji: ReactionEmoji;
  isSelected: boolean;
  onSelect: (e: ReactionEmoji) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !hovered) return;
    const src = img.src;
    img.src = "";
    img.src = src;
  }, [hovered]);

  return (
    <button
      onClick={() => onSelect(emoji)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={emoji.label}
      aria-label={emoji.label}
      aria-pressed={isSelected}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        cursor: "pointer",
        borderRadius: 10,
        padding: 4,
        background: isSelected
          ? "rgba(99,102,241,0.18)"
          : hovered
          ? "rgba(99,102,241,0.09)"
          : "transparent",
        outline: isSelected ? "2px solid #6366f1" : "none",
        outlineOffset: 1,
        transform: hovered ? "scale(1.3)" : "scale(1)",
        transition: "transform 0.12s ease, background 0.12s ease",
        aspectRatio: "1",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <img
        ref={imgRef}
        src={emoji.src}
        alt={emoji.label}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
        loading="lazy"
      />
    </button>
  );
}

// ─── Portal Panel ─────────────────────────────────────────────────────────────

function PickerPanel({
  emojis,
  selected,
  triggerRef,
  onSelect,
  onClose,
  placement,
}: {
  emojis: ReactionEmoji[];
  selected: ReactionEmoji | null;
  triggerRef: React.RefObject<HTMLElement | null>;
  onSelect: (e: ReactionEmoji) => void;
  onClose: () => void;
  placement: "above" | "below";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const PANEL_W = 360;
  const PANEL_H = 320; // approximate
  const GAP = 8;

  // ── Position relative to trigger ──
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const update = () => {
      const rect = trigger.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      const goAbove =
        placement === "above"
          ? spaceAbove >= PANEL_H || spaceAbove >= spaceBelow
          : spaceBelow < PANEL_H && spaceAbove > spaceBelow;

      let top = goAbove
        ? rect.top + window.scrollY - PANEL_H - GAP
        : rect.bottom + window.scrollY + GAP;

      // Clamp left so panel doesn't overflow viewport
      let left = rect.left + window.scrollX;
      if (left + PANEL_W > window.innerWidth - 8) {
        left = window.innerWidth - PANEL_W - 8;
      }
      if (left < 8) left = 8;

      setPos({ top, left });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [triggerRef, placement]);

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, triggerRef]);

  // ── Close on Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!pos) return null;

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Selector de reacciones"
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: PANEL_W,
        zIndex: 99999,
        background: "#fff",
        borderRadius: 18,
        boxShadow:
          "0 16px 64px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
        padding: "14px 12px 14px",
        animation: "rp-appear 0.15s cubic-bezier(0.34,1.4,0.64,1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#9ca3af",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          ¿Cómo reaccionas?
        </span>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "#9ca3af",
            padding: "2px 6px",
            borderRadius: 6,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, 1fr)",
          gap: 2,
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        {emojis.map((emoji) => (
          <EmojiButton
            key={emoji.id}
            emoji={emoji}
            isSelected={selected?.id === emoji.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Selected label */}
      {selected && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid #f3f4f6",
            fontSize: 12,
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <img
            src={selected.src}
            alt={selected.label}
            style={{ width: 16, height: 16, objectFit: "contain" }}
          />
          <strong>{selected.label}</strong>
        </div>
      )}
    </div>
  );

  // Render into document.body to escape any overflow:hidden parent
  return createPortal(panel, document.body);
}

// ─── ReactionPicker ───────────────────────────────────────────────────────────

export default function ReactionPicker({
  onSelect,
  trigger,
  basePath = "/emojis",
  count = 50,
  labels = EMOJI_LABELS,
  placement = "above",
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReactionEmoji | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const emojis = buildEmojiList(basePath, count, labels);

  const handleSelect = useCallback(
    (emoji: ReactionEmoji) => {
      setSelected(emoji);
      setOpen(false);
      onSelect(emoji);
    },
    [onSelect]
  );

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes rp-appear {
          from { opacity: 0; transform: scale(0.9) translateY(6px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
      `}</style>

      {/* Trigger */}
      <span
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-label="Abrir selector de reacciones"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
        style={{ cursor: "pointer", display: "inline-flex" }}
      >
        {trigger ?? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 14px",
              borderRadius: 999,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              color: "#374151",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              userSelect: "none",
              fontFamily: "inherit",
              gap: 6,
            }}
          >
            {selected ? (
              <img
                src={selected.src}
                alt={selected.label}
                style={{ width: 22, height: 22, objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontSize: 18, lineHeight: 1 }}>😄</span>
            )}
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {selected ? selected.label : "Reaccionar"}
            </span>
          </span>
        )}
      </span>

      {/* Portal panel — renders in <body>, never clipped */}
      {open && (
        <PickerPanel
          emojis={emojis}
          selected={selected}
          triggerRef={triggerRef}
          onSelect={handleSelect}
          onClose={handleClose}
          placement={placement}
        />
      )}
    </>
  );
}
