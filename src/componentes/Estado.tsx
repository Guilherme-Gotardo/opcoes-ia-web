/**
 * Estados sem dado: vazio, erro e carregando.
 *
 * Vazio NÃO é falha, e a tela não trata os dois igual. "Nenhuma
 * recomendação hoje" é um resultado legítimo da avaliação — provavelmente o
 * mais comum — então merece explicação do porquê e um caminho para a
 * evidência, não um espaço em branco que parece bug.
 */
import type { ReactNode } from "react";

type Props = {
  icone?: ReactNode;
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
  tom?: "neutro" | "erro";
};

export function Estado({ icone, titulo, children, acao, tom = "neutro" }: Props) {
  return (
    <div className={`estado estado--${tom}`} role={tom === "erro" ? "alert" : undefined}>
      {icone && <span className="estado__icone">{icone}</span>}
      <p className="estado__titulo">{titulo}</p>
      {children && <div className="estado__texto">{children}</div>}
      {acao && <div className="estado__acao">{acao}</div>}
    </div>
  );
}

/** Esqueleto de carregamento — ocupa o espaço que o dado vai ocupar. */
export function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="esqueleto" aria-hidden>
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i} className="esqueleto__linha" />
      ))}
    </div>
  );
}
