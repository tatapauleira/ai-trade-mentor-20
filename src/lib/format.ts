// Formatadores determinísticos (mesma saída no SSR e no cliente).
// Usar SEMPRE estes em vez de Number.prototype.toLocaleString() sem argumentos,
// para evitar mismatch de hidratação entre Node e o navegador do usuário.

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const usdInt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const fmtNum = (n: number) => numberFmt.format(n ?? 0);
export const fmtInt = (n: number) => intFmt.format(n ?? 0);
export const fmtUSD = (n: number) => usdFmt.format(n ?? 0);
export const fmtUSDInt = (n: number) => usdInt.format(n ?? 0);
