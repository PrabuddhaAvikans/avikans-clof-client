import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/features/dashboard/lib/chartTheme";
import { formatCompactAmount, formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChartDataPoint } from "@/types/dashboard";

const PRIMARY = CHART_COLORS[0];
const SECONDARY = CHART_COLORS[3];

export function ChartCard({
  title,
  legend,
  children,
  className,
}: {
  title: string;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-lg border border-border bg-card p-3.5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {legend}
      </div>
      {children}
    </section>
  );
}

export function ChartKey({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex shrink-0 items-center gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 8,
  border: "1px solid var(--border)",
  boxShadow: "none",
} as const;

function ChartEmpty({ height = 148 }: { height?: number }) {
  return (
    <p
      className="flex items-center justify-center text-xs text-muted-foreground"
      style={{ height }}
    >
      No data
    </p>
  );
}

export function DashboardCompareTrend({
  primary,
  secondary,
  primaryName = "Sales",
  secondaryName = "Quotes",
  height = 168,
}: {
  primary: ChartDataPoint[];
  secondary: ChartDataPoint[];
  primaryName?: string;
  secondaryName?: string;
  height?: number;
}) {
  const data = primary.map((point, index) => ({
    label: point.label,
    primary: point.value,
    secondary: secondary[index]?.value ?? 0,
  }));

  if (!data.length || data.every((point) => point.primary === 0 && point.secondary === 0)) {
    return <ChartEmpty height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_TICK }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: CHART_TICK }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCompactAmount}
          width={36}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value ?? 0)),
            name === "primary" ? primaryName : secondaryName,
          ]}
          contentStyle={tooltipStyle}
        />
        <Line
          type="monotone"
          dataKey="primary"
          name="primary"
          stroke={PRIMARY}
          strokeWidth={2}
          dot={{ r: 2.5, fill: PRIMARY, strokeWidth: 0 }}
          activeDot={{ r: 3.5 }}
        />
        <Line
          type="monotone"
          dataKey="secondary"
          name="secondary"
          stroke={SECONDARY}
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={{ r: 2, fill: SECONDARY, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DashboardColumnChart({
  data,
  height = 148,
  formatValue = formatNumber,
  currency = false,
}: {
  data: ChartDataPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  currency?: boolean;
}) {
  const rows = data.slice(0, 6);
  if (!rows.length || rows.every((item) => item.value === 0)) {
    return <ChartEmpty height={height} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: CHART_TICK }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: CHART_TICK }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value) =>
            currency ? formatCurrency(Number(value ?? 0)) : formatValue(Number(value ?? 0))
          }
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="value" fill={PRIMARY} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardHBarChart({
  data,
  height = 168,
  formatValue = formatNumber,
}: {
  data: ChartDataPoint[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const rows = data.slice(0, 5);
  if (!rows.length) return <ChartEmpty height={height} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={{ fontSize: 10, fill: CHART_TICK }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(value) => formatValue(Number(value ?? 0))} contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill={PRIMARY} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
