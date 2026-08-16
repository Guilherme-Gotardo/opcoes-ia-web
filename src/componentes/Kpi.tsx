/**
 * Ladrilho de indicador.
 *
 * Números grandes usam figuras proporcionais (o padrão da fonte);
 * `tabular-nums` fica reservado para colunas de tabela, onde os dígitos
 * precisam alinhar na vertical. Em tamanho de display, tabular deixa o
 * número frouxo.
 *
 * `apoio` é obrigatório na prática: um valor sem a base sobre a qual foi
 * calculado é fácil de ler errado.
 */
import type { ReactNode } from "react";

type Props = {
  rotulo: string;
  valor: ReactNode;
  apoio?: ReactNode;
  /** Variação já formatada, com o tom indicando direção. */
  delta?: ReactNode;
  /** O número que o painel lidera — um só por tela. */
  heroi?: boolean;
};

export function Kpi({ rotulo, valor, apoio, delta, heroi }: Props) {
  return (
    <div className={`kpi${heroi ? " kpi--heroi" : ""}`}>
      <span className="kpi__rotulo">{rotulo}</span>
      <span className="kpi__valor">{valor}</span>
      {delta && <span className="kpi__delta">{delta}</span>}
      {apoio && <span className="kpi__apoio">{apoio}</span>}
    </div>
  );
}
