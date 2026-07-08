"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

type NexumLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  variant?: "default" | "light";
};

const sizes = {
  sm: { icon: 28, text: "text-base" },
  md: { icon: 36, text: "text-lg" },
  lg: { icon: 48, text: "text-2xl" },
  xl: { icon: 64, text: "text-3xl" },
};

function NexusIcon({ size = 36 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const gId = `ng-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Blue-purple (bottom-left) → bright blue → teal-cyan (top-right) */}
        <linearGradient id={gId} x1="4" y1="60" x2="52" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="42%"  stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* N ribbon — thick stroke with round caps matching the logo mark */}
      <path
        d="M 10 54 L 10 10 L 46 54 L 46 10"
        stroke={`url(#${gId})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

export function NexumLogo({
  size = "md",
  showWordmark = true,
  className,
  variant = "default",
}: NexumLogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <NexusIcon size={icon} />
      {showWordmark && (
        <span
          className={cn(
            "font-bold tracking-tight",
            text,
            variant === "light" ? "text-white" : "text-slate-900 dark:text-white"
          )}
        >
          Nexus
        </span>
      )}
    </div>
  );
}

export function NexumMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span className={cn("shrink-0 inline-flex", className)}>
      <NexusIcon size={size} />
    </span>
  );
}
