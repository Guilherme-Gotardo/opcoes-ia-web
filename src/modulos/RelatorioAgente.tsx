/**
 * O relatório do dia, escrito pelo agente de IA.
 *
 * A ÚNICA COISA NESTA INTERFACE QUE UM MODELO ESCREVEU
 * ----------------------------------------------------
 * Todo o resto da tela vem de conta determinística: patrimônio, critérios,
 * gregas, desfecho. Este cartão é interpretação — e precisa parecer
 * interpretação, senão herda por proximidade a autoridade dos números ao
 * lado.
 *
 * Daí o selo com o nome do modelo no cabeçalho e a nota de rodapé: quem
 * abre a tela em seis meses precisa saber, sem procurar, qual parágrafo foi
 * calculado e qual foi redigido.
 *
 * FONTES SÃO PARTE DO CONTEÚDO, NÃO METADADO
 * ------------------------------------------
 * Quando o agente usa busca web, as URLs citadas ficam visíveis no cartão.
 * É o que permite conferir uma afirmação de contexto externo contra o
 * original — e foi a razão de a Fase 3 escolher a busca nativa, que devolve
 * citação, em vez de um MCP que não devolveria.
 *
 * RELATÓRIO VELHO É PIOR QUE RELATÓRIO AUSENTE
 * --------------------------------------------
 * A API devolve o mais recente, não o de hoje: se o pipeline não rodou,
 * mostrar vazio esconderia a última leitura disponível. Mas ler um texto de
 * três dias atrás como se fosse de hoje é o erro caro — por isso a idade
 * aparece, e vira aviso quando passa de um dia.
 */
import type { RelatorioAgente as RelatorioDado } from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import { IconeAlerta, IconeIdeia, IconeInfo } from "../componentes/Icones";
import { dataHora, horasDesde, idade } from "../lib/formato";
import { renderizarMarkdown } from "../lib/markdown";

type Props = {
  relatorio: RelatorioDado | null;
  erro: string | null;
};

export function RelatorioAgente({ relatorio, erro }: Props) {
  const horas = horasDesde(relatorio?.gerado_em);
  const velho = horas != null && horas >= 24;
  const fontes = relatorio?.fontes ?? [];

  return (
    <Cartao
      id="relatorio-agente"
      icone={<IconeIdeia />}
      titulo="Leitura do dia"
      nota="Texto escrito por modelo de linguagem a partir do que os módulos determinísticos apuraram."
      acoes={
        relatorio?.modelo && (
          <>
            {velho && (
              <Selo tom="obsoleto" icone={<IconeAlerta />}>
                de {idade(relatorio.gerado_em)}
              </Selo>
            )}
            <Selo tom="neutro" titulo="Modelo que escreveu este texto">
              {relatorio.modelo}
            </Selo>
          </>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler o relatório">
          {erro}
        </Estado>
      ) : relatorio == null ? (
        <Estado titulo="Carregando…" />
      ) : !relatorio.disponivel ? (
        <Estado icone={<IconeAlerta />} titulo="Relatório não existe neste banco">
          A migração 009 ainda não foi aplicada aqui. Aplique com{" "}
          <code>python -m src.db.bootstrap</code>.
        </Estado>
      ) : !relatorio.texto ? (
        <Estado icone={<IconeIdeia />} titulo="Nenhum relatório composto ainda">
          O agente escreve depois que a avaliação roda. Gere um com{" "}
          <code>python -m src.agente.relatorio</code> — precisa de{" "}
          <code>ANTHROPIC_API_KEY</code> no ambiente.
        </Estado>
      ) : (
        <>
          {velho && (
            <p className="aviso aviso--obsoleto" role="note">
              <IconeAlerta className="aviso__icone" />
              <span>
                Este texto é de <strong>{idade(relatorio.gerado_em)}</strong> e
                descreve o dia {relatorio.data} — não o de hoje. O pipeline não
                compôs relatório desde então.
              </span>
            </p>
          )}

          <div className="prosa">{renderizarMarkdown(relatorio.texto)}</div>

          {fontes.length > 0 && (
            <div className="ressalvas">
              <p className="ressalvas__titulo">
                <IconeInfo className="rodape__icone rodape__icone--neutro" /> Contexto
                externo consultado ({relatorio.buscas}{" "}
                {relatorio.buscas === 1 ? "busca" : "buscas"})
              </p>
              <ul>
                {fontes.map((f) => (
                  <li key={f}>
                    <a href={f} target="_blank" rel="noreferrer noopener">
                      {f}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="cartao__rodape">
            <span>
              Escrito por <strong>{relatorio.modelo}</strong> em{" "}
              {dataHora(relatorio.gerado_em)}, sobre{" "}
              {relatorio.insumo_resumo?.sugestoes ?? 0} sugestão(ões) e{" "}
              {relatorio.insumo_resumo?.desfecho ?? 0} linha(s) de desfecho. O
              modelo <em>não recalcula critério nem sugere operação</em> — os
              números vêm da avaliação determinística, e o texto só os
              interpreta.
              {/* `em`, não `strong`: `.cartao__rodape strong` é monoespaçado
                  por convenção, o que é certo para um identificador como o
                  nome do modelo e errado para uma frase — em mono ela passa
                  a parecer código. */}
            </span>
          </p>
        </>
      )}
    </Cartao>
  );
}
