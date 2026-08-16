/**
 * Cartão de módulo — a moldura de toda seção do painel.
 *
 * `nota` não é decoração: é onde cada módulo declara a premissa do próprio
 * número (o que entra na conta, o que ficou de fora). Um painel financeiro
 * que mostra total sem dizer o que ele cobre obriga o leitor a supor.
 */
import type { ReactNode } from "react";

type Props = {
  id?: string;
  icone?: ReactNode;
  titulo: string;
  nota?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
};

export function Cartao({ id, icone, titulo, nota, acoes, children }: Props) {
  return (
    <section
      id={id}
      className="cartao"
      aria-labelledby={id ? `${id}-titulo` : undefined}
    >
      <header className="cartao__topo">
        <div className="cartao__identidade">
          {icone && <span className="cartao__icone">{icone}</span>}
          <div>
            <h2 id={id ? `${id}-titulo` : undefined} className="cartao__titulo">
              {titulo}
            </h2>
            {nota && <p className="cartao__nota">{nota}</p>}
          </div>
        </div>
        {acoes && <div className="cartao__acoes">{acoes}</div>}
      </header>
      <div className="cartao__corpo">{children}</div>
    </section>
  );
}
