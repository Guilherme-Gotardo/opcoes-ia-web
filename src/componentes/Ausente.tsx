/**
 * Marca de dado ausente.
 *
 * Um traço solto ("—") diz que não há número, mas não diz por quê nem o que
 * a ausência custou. Este componente troca o traço por um rótulo curto e
 * específico do lugar: "sem cotação" numa célula de preço, "não valorizado"
 * numa de valor, "fora do cálculo" numa lista de exposição. O leitor
 * entende a consequência sem precisar deduzir.
 *
 * Usa o tom de dado indisponível, nunca vermelho: ausência de dado não é
 * prejuízo, e pintá-la de vermelho a faria parecer uma queda.
 */
type Props = {
  /** O que a ausência significa NESTE lugar. */
  children?: string;
  /** Detalhe da API, quando houver — vira o title do elemento. */
  motivo?: string | null;
};

export function Ausente({ children = "sem dado", motivo }: Props) {
  return (
    <span className="ausente" title={motivo ?? undefined}>
      <span className="ausente__traco" aria-hidden />
      {children}
    </span>
  );
}
