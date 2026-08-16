/**
 * Formatação pt-BR.
 *
 * Ausência de dado vira "—", nunca 0 e nunca string vazia: um preço que não
 * foi coletado é diferente de um preço que é zero, e a tela não pode borrar
 * essa diferença.
 */

const NADA = "—";

export const brl = (v: number | null | undefined): string =>
  v == null
    ? NADA
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Assinado com `+`/`−` explícito — para resultado, onde o sinal é a leitura. */
export const brlAssinado = (v: number | null | undefined): string => {
  if (v == null) return NADA;
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${brl(Math.abs(v))}`;
};

/** Recebe percentual já em pontos (22.78 = 22,78%), não fração. */
export const pct = (v: number | null | undefined, casas = 1): string =>
  v == null
    ? NADA
    : `${v.toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      })}%`;

export const pctAssinado = (v: number | null | undefined, casas = 2): string => {
  if (v == null) return NADA;
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${pct(Math.abs(v), casas)}`;
};

export const numero = (v: number | null | undefined): string =>
  v == null ? NADA : v.toLocaleString("pt-BR");

export const preco = (v: number | null | undefined): string =>
  v == null
    ? NADA
    : v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      });

export const dataHora = (iso: string | null | undefined): string => {
  if (!iso) return NADA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NADA;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** `YYYY-MM-DD` puro, sem parte de hora. */
const SO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Converte ISO em Date SEM deslocar o dia.
 *
 * `new Date("2026-10-22")` é lido como meia-noite UTC e, renderizado em
 * horário local do Brasil (UTC−3), vira 21/10 — um dia a menos. Num
 * calendário de divulgação de resultado isso não é detalhe cosmético: um dia
 * de erro é exatamente o erro que o módulo de earnings existe para evitar.
 * Data pura não tem fuso, então é construída como meia-noite LOCAL; valor
 * com hora (`...T...Z`) é instante de verdade e segue o caminho normal.
 */
const paraData = (iso: string): Date | null => {
  const puro = SO_DATA.exec(iso);
  const d = puro
    ? new Date(Number(puro[1]), Number(puro[2]) - 1, Number(puro[3]))
    : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const data = (iso: string | null | undefined): string => {
  if (!iso) return NADA;
  const d = paraData(iso);
  if (!d) return NADA;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * "Agosto de 2026" — rótulo de agrupamento mensal.
 *
 * A maiúscula é aplicada só na PRIMEIRA letra, aqui e não no CSS:
 * `text-transform: capitalize` maiúscula cada palavra e produz "Agosto De
 * 2026", que está errado em português.
 */
export const mesAno = (iso: string | null | undefined): string => {
  if (!iso) return NADA;
  const d = paraData(iso);
  if (!d) return NADA;
  const rotulo = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
};

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "há 3 h" — idade do dado. Cotação velha é informação, então é exibida. */
export const idade = (iso: string | null | undefined): string => {
  if (!iso) return NADA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NADA;
  const seg = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(seg);
  if (abs < 60) return "agora";
  if (abs < 3600) return relativo.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), "hour");
  return relativo.format(Math.round(seg / 86400), "day");
};

/** Horas desde a coleta — usado para classificar frescor, não para exibir. */
export const horasDesde = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 3_600_000;
};

/**
 * Dias corridos até uma data futura; negativo se já passou.
 *
 * Conta de meia-noite a meia-noite LOCAL, não de instante a instante: sem
 * isso, "amanhã" vira 0 ou 1 dia dependendo da hora em que a página é
 * aberta, e a mesma data de vencimento muda de contagem ao longo do dia.
 */
export const diasAte = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = paraData(iso);
  if (!d) return null;
  const alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo.getTime() - base.getTime()) / 86_400_000);
};

/** Rótulo legível para chaves de critério vindas do Python (`vol_implicita`). */
export const rotuloChave = (chave: string): string =>
  chave
    .replace(/[_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

/** Valor de critério: o snapshot é `unknown`, então formata sem inventar tipo. */
export const valorCriterio = (v: unknown): string => {
  if (v == null) return NADA;
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "number") {
    return Number.isInteger(v) ? numero(v) : v.toLocaleString("pt-BR", {
      maximumFractionDigits: 4,
    });
  }
  if (typeof v === "string") return v;
  return JSON.stringify(v);
};
