"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface Preset {
  key: string;
  label: string;
  description: string;
  /** OKLCH parts */
  h: number;
  c: number;
  l: number;
  /** Foreground color paired with the brand fill (oklch lightness 0-100). */
  fgL: number;
}

const PRESETS: Preset[] = [
  {
    key: "lime",
    label: "Lime",
    description: "FlowMarket — playful, editorial",
    h: 130,
    c: 0.22,
    l: 90,
    fgL: 15,
  },
  {
    key: "blue",
    label: "Electric blue",
    description: "Stripe / Vercel — classic SaaS",
    h: 252,
    c: 0.2,
    l: 65,
    fgL: 98,
  },
  {
    key: "violet",
    label: "Violet",
    description: "Linear / Anthropic — modern AI",
    h: 290,
    c: 0.22,
    l: 65,
    fgL: 98,
  },
  {
    key: "coral",
    label: "Coral",
    description: "Warm, friendly, B2C-ish",
    h: 25,
    c: 0.18,
    l: 70,
    fgL: 98,
  },
  {
    key: "mint",
    label: "Mint",
    description: "Calm, fresh, healthtech",
    h: 165,
    c: 0.13,
    l: 70,
    fgL: 15,
  },
];

const STORAGE_KEY = "settings.brand_color_preset";

function applyPreset(p: Preset) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--brand-h", String(p.h));
  root.style.setProperty("--brand-c", String(p.c));
  root.style.setProperty("--brand-l", `${p.l}%`);
  root.style.setProperty("--color-brand-foreground", `oklch(${p.fgL}% 0 0)`);
}

export function BrandColorPicker() {
  const [active, setActive] = useState<string>(PRESETS[0]!.key);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const preset = PRESETS.find((p) => p.key === saved);
      if (preset) {
        setActive(preset.key);
        applyPreset(preset);
      }
    }
  }, []);

  const handlePick = (preset: Preset) => {
    setActive(preset.key);
    applyPreset(preset);
    window.localStorage.setItem(STORAGE_KEY, preset.key);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PRESETS.map((p) => {
        const swatch = `oklch(${p.l}% ${p.c} ${p.h})`;
        const isActive = active === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => handlePick(p)}
            className={cn(
              "lift flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
              isActive
                ? "border-foreground bg-foreground/[0.04]"
                : "border-foreground/10 bg-background hover:border-foreground/30",
            )}
          >
            <span
              aria-hidden
              className="border-foreground/15 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
              style={{ background: swatch }}
            >
              {isActive && <Check className="h-4 w-4" style={{ color: `oklch(${p.fgL}% 0 0)` }} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">{p.label}</p>
              <p className="text-foreground/55 truncate text-xs">{p.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
