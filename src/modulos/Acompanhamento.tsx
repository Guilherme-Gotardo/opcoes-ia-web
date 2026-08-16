/**
 * Acompanhamento — por que (não) saiu sugestão.
 *
 * Este módulo é o par do de recomendações: quando a lista de sugestões vem
 * vazia, é aqui que a ausência ganha explicação, critério a critério. Sem
 * ele, "nenhuma recomendação" seria indistinguível de "a avaliação não
 * rodou".
 *
 * Duas coisas que a tela precisa dizer com todas as letras:
 *
 * - Ela LÊ o desfecho que a avaliação gravou; não roda avaliação nenhuma.
 *   Sem registro significa que a avaliação não rodou — não que passou e não
 *   achou nada.
 * - A soma das contagens por critério PODE exceder a quantidade avaliada,
 *   porque uma opção reprovada em dois critérios conta nos dois. Sem esse
 *   aviso, os números parecem inconsistentes.
 */
import type { Desfecho, MotivoDesfecho } from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Comando } from "../componentes/Comando";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import { IconeAlerta, IconeBussola, IconeInfo, IconeRelogio } from "../componentes/Icones";
import { dataHora, idade, numero, rotuloChave, valorCriterio } from "../lib/formato";

function Motivo({ m }: { m: MotivoDesfecho }) {
  const criterios = Object.entries(m.criterios_contagem).sort((a, b) => b[1] - a[1]);
  const maior = criterios.reduce((topo, [, n]) => Math.max(topo, n), 0);
  const soma = criterios.reduce((t, [, n]) => t + n, 0);
  const amostra = Object.entries(m.amostra ?? {});

  return (
    <article className="motivo">
      <header className="motivo__topo">
        <div>
          <span className="motivo__ticker">{m.ticker_objeto}</span>
          <p className="motivo__texto">{m.motivo}</p>
        </div>
        <Selo tom="neutro">
          {numero(m.quantidade)} {m.quantidade === 1 ? "opção" : "opções"}
        </Selo>
      </header>

      {criterios.length > 0 && (
        <>
          <ul className="criterio-barras">
            {criterios.map(([chave, n]) => (
              <li key={chave} className="criterio-barra">
                <span className="criterio-barra__rotulo">{rotuloChave(chave)}</span>
                <div className="criterio-barra__trilho">
                  <div
                    className="criterio-barra__preenchimento"
                    style={{ inlineSize: `${maior > 0 ? (n / maior) * 100 : 0}%` }}
                  />
                </div>
                <span className="criterio-barra__valor">{numero(n)}</span>
              </li>
            ))}
          </ul>
          {soma > m.quantidade && (
            <p className="motivo__nota">
              <IconeInfo className="rodape__icone" />
              <span>
                A soma ({numero(soma)}) passa da quantidade avaliada (
                {numero(m.quantidade)}) porque uma opção reprovada em mais de um
                critério conta em cada um.
              </span>
            </p>
          )}
        </>
      )}

      {amostra.length > 0 && (
        <details className="criterios">
          <summary>Amostra do que foi avaliado</summary>
          <dl className="criterios__lista">
            {amostra.map(([chave, valor]) => (
              <div key={chave}>
                <dt>{rotuloChave(chave)}</dt>
                <dd className="mono">{valorCriterio(valor)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </article>
  );
}

type Props = {
  desfecho: Desfecho | null;
  erro: string | null;
};

export function Acompanhamento({ desfecho, erro }: Props) {
  return (
    <Cartao
      id="acompanhamento"
      icone={<IconeBussola />}
      titulo="Acompanhamento da avaliação"
      nota="Desfecho da execução mais recente: por que saiu — ou não saiu — sugestão."
      acoes={
        desfecho?.executado_em ? (
          <Selo tom="neutro" icone={<IconeRelogio />} titulo={dataHora(desfecho.executado_em)}>
            executada {idade(desfecho.executado_em)}
          </Selo>
        ) : undefined
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler o desfecho">
          {erro}
        </Estado>
      ) : desfecho == null ? (
        <Estado titulo="Carregando…" />
      ) : !desfecho.ha_registro ? (
        <Estado
          icone={<IconeRelogio />}
          titulo="Nenhuma avaliação registrada"
          acao={<Comando>python -m src.report.daily</Comando>}
        >
          Esta tela lê o desfecho que a avaliação gravou — ela não roda a avaliação, e
          nenhum endpoint da API dispara nada. Sem registro, o que se sabe é que a
          avaliação não rodou; não que ela rodou e não encontrou nada.
        </Estado>
      ) : desfecho.motivos.length === 0 ? (
        <Estado icone={<IconeInfo />} titulo="Avaliação registrada, sem motivos de descarte">
          A execução de {dataHora(desfecho.executado_em)} não registrou nenhuma opção
          descartada.
        </Estado>
      ) : (
        <div className="motivos">
          {desfecho.motivos.map((m) => (
            <Motivo key={`${m.ticker_objeto}-${m.motivo}`} m={m} />
          ))}
        </div>
      )}
    </Cartao>
  );
}
