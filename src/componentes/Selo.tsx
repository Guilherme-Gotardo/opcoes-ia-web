/**
 * Selo de estado.
 *
 * Os tons vêm em duas famílias que não se misturam:
 *
 * - `ganho` / `perda` — direção de preço, e só isso. Verde e vermelho são
 *   reservados; usá-los para "dado ok" faria um pregão vermelho competir com
 *   uma cotação ausente pelo mesmo sinal visual.
 * - `ok` / `obsoleto` / `bloqueado` / `indisponivel` — estado do dado, com
 *   hue próprio. Cotação velha não é prejuízo; ausência de dado não é queda.
 *
 * `tom` só escolhe a cor. O significado vem do ícone e do texto que vêm
 * junto — cor sozinha não é canal confiável, e um selo de status sem rótulo
 * é um selo que parte dos usuários não lê.
 */
import type { ReactNode } from "react";

export type Tom =
  | "neutro"
  | "acento"
  | "ok"
  | "obsoleto"
  | "bloqueado"
  | "indisponivel"
  | "ganho"
  | "perda";

type Props = {
  tom?: Tom;
  icone?: ReactNode;
  titulo?: string;
  children: ReactNode;
};

export function Selo({ tom = "neutro", icone, titulo, children }: Props) {
  return (
    <span className={`selo selo--${tom}`} title={titulo}>
      {icone}
      <span>{children}</span>
    </span>
  );
}
