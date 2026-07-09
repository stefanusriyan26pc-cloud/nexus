"use client";

import { useCurrencyDisplay } from "@/hooks/use-currency-display";
import type { MonthlyTrendPoint } from "@/lib/finance/analytics";
import { useId, useState } from "react";

const INCOME_COLOR = "#059669"; // emerald-600 — matches income styling app-wide
const EXPENSE_COLOR = "#dc2626"; // red-600 — matches expense styling app-wide
const BALANCE_COLOR = "#2563eb"; // blue-600 — matches "net balance" styling app-wide

const CHART_W = 480;
const CHART_H = 220;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 28;

/** Grouped bar chart: income vs. expense per month, single shared axis. */
export function MonthlyTrendChart({
  data,
  incomeLabel,
  expenseLabel,
}: {
  data: MonthlyTrendPoint[];
  incomeLabel: string;
  expenseLabel: string;
}) {
  const { formatDisplay } = useCurrencyDisplay();
  const [hover, setHover] = useState<{ i: number; series: "income" | "expense" } | null>(null);
  const gradId = useId();

  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;
  const groupW = plotW / data.length;
  const barW = Math.min(18, groupW / 3);
  const gap = 3;

  const yFor = (v: number) => PAD_T + plotH - (v / max) * plotH;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: INCOME_COLOR }} />
          {incomeLabel}
        </span>
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EXPENSE_COLOR }} />
          {expenseLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label={`${incomeLabel} vs ${expenseLabel} by month`}>
        <defs>
          <clipPath id={`${gradId}-clip`}>
            <rect x={0} y={0} width={CHART_W} height={CHART_H} />
          </clipPath>
        </defs>
        {/* Baseline */}
        <line x1={PAD_L} y1={PAD_T + plotH} x2={CHART_W - PAD_R} y2={PAD_T + plotH} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={1} />
        {data.map((d, i) => {
          const cx = PAD_L + groupW * i + groupW / 2;
          const incomeH = (d.income / max) * plotH;
          const expenseH = (d.expense / max) * plotH;
          return (
            <g key={d.key}>
              <rect
                x={cx - gap / 2 - barW}
                y={yFor(d.income)}
                width={barW}
                height={incomeH}
                rx={3}
                fill={INCOME_COLOR}
                opacity={hover && hover.i === i && hover.series !== "income" ? 0.4 : 1}
                onMouseEnter={() => setHover({ i, series: "income" })}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${d.label}: ${incomeLabel} ${formatDisplay(d.income)}`}</title>
              </rect>
              <rect
                x={cx + gap / 2}
                y={yFor(d.expense)}
                width={barW}
                height={expenseH}
                rx={3}
                fill={EXPENSE_COLOR}
                opacity={hover && hover.i === i && hover.series !== "expense" ? 0.4 : 1}
                onMouseEnter={() => setHover({ i, series: "expense" })}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${d.label}: ${expenseLabel} ${formatDisplay(d.expense)}`}</title>
              </rect>
              <text x={cx} y={CHART_H - 10} textAnchor="middle" className="fill-slate-400 text-[9px] dark:fill-slate-500">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          {data[hover.i].label} · {hover.series === "income" ? incomeLabel : expenseLabel}:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {formatDisplay(hover.series === "income" ? data[hover.i].income : data[hover.i].expense)}
          </span>
        </p>
      )}
    </div>
  );
}

/** Cumulative net balance (income − expense, running total) over the same months. */
export function CumulativeBalanceChart({
  data,
  label,
}: {
  data: MonthlyTrendPoint[];
  label: string;
}) {
  const { formatDisplay } = useCurrencyDisplay();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = data.reduce<number[]>((acc, d) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(prev + d.income - d.expense);
    return acc;
  }, []);
  const max = Math.max(1, ...points.map(Math.abs));
  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const yFor = (v: number) => PAD_T + plotH / 2 - (v / max) * (plotH / 2);
  const xFor = (i: number) => PAD_L + stepX * i;

  const linePath = points.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${yFor(0)} L ${xFor(0)} ${yFor(0)} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label={`${label} over time`}>
        {/* Zero baseline */}
        <line x1={PAD_L} y1={yFor(0)} x2={CHART_W - PAD_R} y2={yFor(0)} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={1} strokeDasharray="3 3" />
        <path d={areaPath} fill={BALANCE_COLOR} opacity={0.08} />
        <path d={linePath} fill="none" stroke={BALANCE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((v, i) => (
          <g key={data[i].key}>
            <circle
              cx={xFor(i)}
              cy={yFor(v)}
              r={hoverIdx === i ? 5 : 3.5}
              fill={BALANCE_COLOR}
              className="cursor-pointer transition-[r]"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <title>{`${data[i].label}: ${formatDisplay(v)}`}</title>
            </circle>
            <text x={xFor(i)} y={CHART_H - 10} textAnchor="middle" className="fill-slate-400 text-[9px] dark:fill-slate-500">
              {data[i].label}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
        {hoverIdx !== null ? (
          <>
            {data[hoverIdx].label} ·{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">{formatDisplay(points[hoverIdx])}</span>
          </>
        ) : (
          <>
            {label}:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">{formatDisplay(points[points.length - 1] ?? 0)}</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Ranked horizontal bars for top expense categories — single hue, direct-labeled. */
export function CategoryRankBars({
  data,
  total,
}: {
  data: { category: string; amount: number }[];
  total: number;
}) {
  const { formatDisplay } = useCurrencyDisplay();
  const max = Math.max(1, ...data.map((d) => d.amount));

  return (
    <ul className="space-y-3">
      {data.map(({ category, amount }) => {
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return (
          <li key={category}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-slate-700 dark:text-slate-300">{category}</span>
              <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">
                {formatDisplay(amount)} <span className="text-slate-400 dark:text-slate-500">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-red-500/80"
                style={{ width: `${(amount / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
