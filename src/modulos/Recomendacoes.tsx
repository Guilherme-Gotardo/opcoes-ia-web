/**
 * Recomendações de carteira.
 *
 * O módulo inteiro é construído em torno de uma frase: **nada aqui é ordem.**
 * O sistema é de sugestão para revisão humana, e a interface não pode ser a
 * exceção — por isso não existe botão de executar, o aviso de revisão é
 * parte do cartão (não um rodapé opcional) e a linguagem é "sugerido", nunca
 * "comprado" ou "vendido".
 *
 * O snapshot de critérios fica junto e aberto a um clique. É a justificativa
 * numérica da sugestão: quem revisa precisa ver a base, não só a conclusão.
 * A interface exibe esses números; ela não os avalia nem os pondera.
 */
import type { Sugestao } from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import {
  IconeAlerta,
  IconeBussola,
  IconeIdeia,
  IconeRelogio,
  IconeSeta,
} from "../componentes/Icones";
import { brl, data, diasAte, numero, preco, rotuloChave, valorCriterio } from "../lib/formato";

function Vencimento({ iso }: { iso: string | null }) {
  const dias = diasAte(iso);
  if (!iso || dias == null) return <>—</>;
  return (
    <>
      {data(iso)}
      <span className="campo__sub">
        {dias < 0
          ? "vencida"
          : dias === 0
            ? "vence hoje"
            : `em ${numero(dias)} ${dias === 1 ? "dia" : "dias"}`}
      </span>
    </>
  );
}

function CartaoSugestao({ s }: { s: Sugestao }) {
  const criterios = Object.entries(s.criterios ?? {});

  return (
    <article className="sugestao">
      <header className="sugestao__topo">
        <div>
          <span className="sugestao__ticker">{s.ticker_objeto}</span>
          <span className="etiqueta etiqueta--acento">{s.tipo_operacao}</span>
        </div>
        <Selo tom="neutro">{s.status}</Selo>
      </header>

      <dl className="sugestao__campos">
        <div>
          <dt>Código da opção</dt>
          <dd className="mono">{s.codigo_opcao ?? "—"}</dd>
        </div>
        <div>
          <dt>Strike</dt>
          <dd>{preco(s.strike)}</dd>
        </div>
        <div>
          <dt>Vencimento</dt>
          <dd>
            <Vencimento iso={s.vencimento} />
          </dd>
        </div>
        <div>
          <dt>Prêmio estimado</dt>
          <dd>{brl(s.premio_estimado)}</dd>
        </div>
      </dl>

      {criterios.length > 0 && (
        <details className="criterios">
          <summary>
            <IconeSeta className="criterios__seta" />
            Critérios da avaliação
            <span className="criterios__contagem">{numero(criterios.length)}</span>
          </summary>
          <dl className="criterios__lista">
            {criterios.map(([chave, valor]) => (
              <div key={chave}>
                <dt>{rotuloChave(chave)}</dt>
                <dd className="mono">{valorCriterio(valor)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {s.pendente_revisao_humana && (
        <p className="sugestao__revisao">
          <IconeAlerta className="rodape__icone" />
          <span>Pendente de revisão humana — sugestão, não ordem. Nada foi executado.</span>
        </p>
      )}
    </article>
  );
}

type Props = {
  sugestoes: Sugestao[] | null;
  erro: string | null;
};

export function Recomendacoes({ sugestoes, erro }: Props) {
  return (
    <Cartao
      id="recomendacoes"
      icone={<IconeIdeia />}
      titulo="Recomendações de carteira"
      nota="Saída da avaliação determinística do repositório principal. Toda sugestão é pendente de revisão humana."
      acoes={
        sugestoes && sugestoes.length > 0 ? (
          <Selo tom="acento" icone={<IconeRelogio />}>
            {numero(sugestoes.length)} em aberto
          </Selo>
        ) : undefined
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler as sugestões">
          {erro}
        </Estado>
      ) : sugestoes == null ? (
        <Estado titulo="Carregando…" />
      ) : sugestoes.length === 0 ? (
        <Estado
          icone={<IconeBussola />}
          titulo="Nenhuma recomendação em aberto"
          acao={
            <a className="botao botao--fantasma" href="#acompanhamento">
              Ver o desfecho da avaliação
              <IconeSeta />
            </a>
          }
        >
          Silêncio não é resposta: a ausência tem motivo registrado. Nenhuma opção
          passou pelos critérios, e o módulo de acompanhamento mostra em qual deles
          cada uma parou.
        </Estado>
      ) : (
        <div className="sugestoes">
          {sugestoes.map((s, i) => (
            <CartaoSugestao key={`${s.ticker_objeto}-${s.codigo_opcao ?? i}`} s={s} />
          ))}
        </div>
      )}
    </Cartao>
  );
}
