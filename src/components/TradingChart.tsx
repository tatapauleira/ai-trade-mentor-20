import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: { time?: string; day?: string; price?: number; equity?: number }[];
  dataKey?: "price" | "equity";
  xKey?: "time" | "day";
  tone?: "primary" | "bull" | "bear";
  height?: number;
}

const toneMap = {
  primary: { stroke: "var(--primary)",   fill: "url(#gPrimary)" },
  bull:    { stroke: "var(--bull)",      fill: "url(#gBull)" },
  bear:    { stroke: "var(--bear)",      fill: "url(#gBear)" },
};

export function TradingChart({ data, dataKey = "price", xKey = "time", tone = "primary", height = 280 }: Props) {
  const t = toneMap[tone];
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.74 0.16 195)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="oklch(0.74 0.16 195)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gBull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.74 0.18 152)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="oklch(0.74 0.18 152)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gBear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.23 25)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="oklch(0.65 0.23 25)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={["dataMin - 50", "dataMax + 50"]} width={56} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Area type="monotone" dataKey={dataKey} stroke={t.stroke} strokeWidth={2} fill={t.fill} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
