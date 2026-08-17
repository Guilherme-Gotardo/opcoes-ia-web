/**
 * Contexto quantitativo das opções avaliadas.
 *
 * O QUE ESTA TELA NÃO PODE FAZER PARECER
 * --------------------------------------
 * Que estes números decidiram alguma coisa. Não decidiram: quem aprova ou
 * reprova é `criterios_json`, que aparece em Recomendações e Acompanhamento.
 * Aqui é contexto — o que ajuda a entender uma sugestão, ou quão perto uma
 * reprovada estava. Por isso o cartão vive separado e o rodapé diz isso em
 * palavras, em vez de deixar a proximidade visual sugerir o contrário.
 *
 * A COLUNA QUE JUSTIFICA A TELA
 * -----------------------------
 * `mercado` vs `teórico` lado a lado. Separadas em duas telas, ninguém
 * compara; juntas, a diferença é a leitura mais acionável que existe aqui —
 * prêmio acima do modelo é o que interessa a quem VENDE coberta.
 *
 * POR QUE A DIFERENÇA NÃO É VERDE NEM VERMELHA
 * --------------------------------------------
 * Verde e vermelho são reservados para direção de preço (`--ganho` /
 * `--perda`). "Opção cara em relação ao modelo" é outra grandeza, e pintá-la
 * com o mesmo canal faria um prêmio gordo competir visualmente com um pregão
 * de alta. O sinal fica no número e no rótulo.
 *
 * RESSALVA NÃO É NOTA DE RODAPÉ
 * -----------------------------
 * É o que separa número calculado de número assumido — sem ela, "P(ITM) =
 * 54%" e "P(ITM) = 54%, mas sem contar exercício antecipado" são a mesma
 * coisa na tela. Ficam listadas, não escondidas atrás de um ícone.
 */
import { useState } from "react";
import type { Enriquecimento as EnriquecimentoDado, EnriquecimentoItem } from "../api/client";
import { Ausente } from "../componentes/Ausente";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import { IconeAlerta, IconeBussola, IconeInfo } from "../componentes/Icones";
import { data, idade, pct, preco } from "../lib/formato";

/** Diferença do teórico contra o mercado, em % do preço de mercado. */
function premioRelativo(i: EnriquecimentoItem): number | null {
  if (i.preco_teorico == null || i.preco_mercado == null || i.preco_mercado === 0) {
    return null;
  }
  return ((i.preco_mercado - i.preco_teorico) / i.preco_mercado) * 100;
}

const num = (v: number | null | undefined, casas = 4) =>
  v == null ? <Ausente>—</Ausente> : <span className="num">{v.toFixed(casas)}</span>;

function Linha({ i }: { i: EnriquecimentoItem }) {
  const relativo = premioRelativo(i);
  const semModelo = i.preco_teorico == null;

  return (
    <tr>
      <td>
        <span className="tabela__ticker">{i.codigo_opcao}</span>
        <span className="tabela__sub">
          {i.tipo ?? "—"} {i.strike != null ? preco(i.strike) : ""}
          {i.vencimento ? ` · ${data(i.vencimento)}` : ""}
        </span>
      </td>
      <td className="num">{i.preco_mercado != null ? preco(i.preco_mercado) : <Ausente>—</Ausente>}</td>
      <td className="num">
        {semModelo ? (
          <Selo tom="indisponivel" icone={<IconeAlerta />}>
            sem modelo
          </Selo>
        ) : (
          preco(i.preco_teorico)
        )}
      </td>
      <td className="num">
        {relativo == null ? (
          <Ausente>—</Ausente>
        ) : (
          <span className="num" title="Prêmio de mercado acima (+) ou abaixo (−) do modelo">
            {relativo >= 0 ? "+" : "−"}
            {Math.abs(relativo).toFixed(1)}%
          </span>
        )}
      </td>
      <td className="num">{num(i.delta_modelo)}</td>
      <td className="num">
        {i.prob_exercicio_vencimento == null ? (
          <Ausente>—</Ausente>
        ) : (
          pct(i.prob_exercicio_vencimento * 100, 1)
        )}
      </td>
      <td className="num">{num(i.theta_dia, 4)}</td>
      <td className="num">{num(i.vega_pp, 4)}</td>
      <td className="num">
        {i.iv_percentil_252d == null ? (
          <Ausente>—</Ausente>
        ) : (
          pct(i.iv_percentil_252d * 100, 0)
        )}
      </td>
      <td className="num">{num(i.skew_vs_cadeia, 4)}</td>
    </tr>
  );
}

type Props = {
  enriquecimento: EnriquecimentoDado | null;
  erro: string | null;
};

/**
 * Quantas linhas a tela mostra antes de pedir confirmação.
 *
 * Uma cadeia real tem dezenas de séries por vencimento, e o pipeline
 * enriquece TODA opção avaliada — não só as elegíveis. Sem corte, este
 * cartão viraria uma parede de centenas de linhas onde as duas que
 * importam somem. O corte é de tela: a API devolve tudo, porque o agente
 * da Fase 4 vai querer a lista inteira.
 */
const LINHAS_VISIVEIS = 12;

export function Enriquecimento({ enriquecimento, erro }: Props) {
  const [expandido, setExpandido] = useState(false);
  const itens = enriquecimento?.itens ?? [];
  const visiveis = expandido ? itens : itens.slice(0, LINHAS_VISIVEIS);
  const ocultas = itens.length - visiveis.length;
  // As ressalvas se repetem quase iguais em todas as linhas (a taxa, o
  // estilo). Repeti-las por linha viraria ruído; agrupá-las mantém cada uma
  // legível e continua mostrando todas.
  const ressalvas = [...new Set(itens.flatMap((i) => i.ressalvas ?? []))];
  const estilos = [...new Set(itens.map((i) => i.estilo_exercicio).filter(Boolean))];

  return (
    <Cartao
      id="enriquecimento"
      icone={<IconeBussola />}
      titulo="Contexto quantitativo"
      nota="Gregas, preço teórico e probabilidade de exercício das opções avaliadas. Não é critério: nada aqui aprovou ou reprovou operação nenhuma."
      acoes={
        enriquecimento?.modelo && (
          <>
            <Selo tom="neutro" titulo="Quantas opções foram contextualizadas">
              {itens.length} {itens.length === 1 ? "opção" : "opções"}
            </Selo>
            <Selo tom="neutro" titulo="Modelo usado no apreçamento">
              {enriquecimento.modelo}
            </Selo>
          </>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler o contexto">
          {erro}
        </Estado>
      ) : enriquecimento == null ? (
        <Estado titulo="Carregando…" />
      ) : !enriquecimento.disponivel ? (
        <Estado icone={<IconeAlerta />} titulo="Enriquecimento não existe neste banco">
          A migração 008 ainda não foi aplicada aqui. Aplique com{" "}
          <code>python -m src.db.bootstrap</code>.
        </Estado>
      ) : itens.length === 0 ? (
        <Estado icone={<IconeBussola />} titulo="Nenhuma opção para contextualizar">
          O enriquecimento roda sobre as opções coletadas, e a coleta de
          opções está bloqueada no plano Free da Brapi (403 em toda a cadeia).
          A camada está pronta e testada — ela liga sozinha no dia em que
          houver cadeia no banco.
        </Estado>
      ) : (
        <>
          <div className="tabela-rolagem">
            <table className="tabela tabela--compacta">
              <thead>
                <tr>
                  <th>opção</th>
                  <th className="num">mercado</th>
                  <th className="num">teórico</th>
                  <th className="num" title="Prêmio de mercado acima (+) ou abaixo (−) do modelo">
                    prêmio rel.
                  </th>
                  <th className="num">delta</th>
                  <th className="num" title="Risco-neutra, só no vencimento">
                    P(ITM)
                  </th>
                  <th className="num" title="Por dia corrido">
                    theta/d
                  </th>
                  <th className="num" title="Por ponto percentual de volatilidade">
                    vega/pp
                  </th>
                  <th className="num" title="Onde a IV de hoje cai na distribuição do ativo">
                    IV pct
                  </th>
                  <th className="num" title="IV desta opção menos a média da cadeia">
                    skew
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => (
                  <Linha key={i.codigo_opcao} i={i} />
                ))}
              </tbody>
            </table>
          </div>

          {(ocultas > 0 || expandido) && (
            <p className="tabela__ajuda">
              <button
                type="button"
                className="botao botao--discreto"
                onClick={() => setExpandido((v) => !v)}
              >
                {expandido
                  ? `Mostrar só as primeiras ${LINHAS_VISIVEIS}`
                  : `Mostrar as outras ${ocultas} opções`}
              </button>
            </p>
          )}

          {ressalvas.length > 0 && (
            <div className="ressalvas">
              <p className="ressalvas__titulo">
                <IconeInfo className="rodape__icone rodape__icone--neutro" /> Sob que
                premissas estes números valem
              </p>
              <ul>
                {ressalvas.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="cartao__rodape">
            <span>
              Apreçado por <strong>{enriquecimento.modelo}</strong>
              {estilos.length > 0 && <> · exercício {estilos.join(" e ")}</>}
              {enriquecimento.taxa_livre_risco != null && (
                <>
                  {" "}
                  · taxa livre de risco {pct(enriquecimento.taxa_livre_risco * 100, 2)} a.a.
                  {enriquecimento.taxa_observada_em && (
                    <> (BCB, {idade(enriquecimento.taxa_observada_em)})</>
                  )}
                </>
              )}
              {enriquecimento.executado_em && <> · execução de {idade(enriquecimento.executado_em)}</>}.
              Estes números <strong>não decidem nada</strong> — quem aprova ou
              reprova é o critério determinístico, em Recomendações.
            </span>
          </p>
        </>
      )}
    </Cartao>
  );
}
