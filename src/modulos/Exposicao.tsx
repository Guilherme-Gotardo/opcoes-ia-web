/**
 * Exposição por ativo-objeto.
 *
 * Uma série só (a fatia de cada ativo no patrimônio), então uma cor só e
 * nenhuma legenda: a cor não distingue nada aqui, e pintar cada barra de um
 * tom diferente sugeriria uma categoria que não existe. As barras vêm
 * ordenadas da maior para a menor porque a leitura é de ranking.
 *
 * A tela mostra a concentração; ela NÃO diz se está alta demais. Esse tipo
 * de julgamento é critério de estratégia e vive no repositório principal.
 */
import type { Carteira } from "../api/client";
import { Ausente } from "../componentes/Ausente";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { IconeGrafico } from "../componentes/Icones";
import { exposicoesOrdenadas } from "../lib/derivar";
import { brl, pct } from "../lib/formato";

export function Exposicao({ carteira }: { carteira: Carteira }) {
  const linhas = exposicoesOrdenadas(carteira);

  return (
    <Cartao
      id="exposicao"
      icone={<IconeGrafico />}
      titulo="Exposição por ativo-objeto"
      nota="Fatia de cada ativo-objeto no patrimônio a preço de mercado."
    >
      {linhas.length === 0 ? (
        <Estado titulo="Sem exposição para exibir">
          A carteira não tem posição precificada — sem patrimônio a mercado, não há
          fatia a calcular.
        </Estado>
      ) : (
        <ul className="barras">
          {linhas.map(({ ativo, pct: fatia }) => (
            <li
              key={ativo}
              className="barra"
              tabIndex={0}
              title={`${ativo}: ${pct(fatia, 2)} do patrimônio · ${brl(
                (fatia / 100) * carteira.total_patrimonio,
              )}`}
            >
              <div className="barra__cabeca">
                <span className="barra__ticker">{ativo}</span>
                <span className="barra__dinheiro">
                  {brl((fatia / 100) * carteira.total_patrimonio)}
                </span>
              </div>
              <div className="barra__linha">
                <div className="barra__trilho">
                  <div
                    className="barra__preenchimento"
                    style={{ inlineSize: `${Math.max(fatia, 0.6)}%` }}
                  />
                </div>
                <span className="barra__pct">{pct(fatia)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/*
        Quem ficou de fora aparece na lista, marcado, em vez de sumir. As
        fatias somam 100% do que foi possível precificar — sem esta linha,
        esse 100% pareceria a carteira inteira.
      */}
      {carteira.tickers_sem_cotacao.length > 0 && (
        <div className="excluidos">
          <p className="excluidos__titulo">Fora do cálculo</p>
          <ul>
            {carteira.tickers_sem_cotacao.map((ticker) => (
              <li key={ticker}>
                <span className="barra__ticker">{ticker}</span>
                <Ausente>sem cotação para valorizar</Ausente>
              </li>
            ))}
          </ul>
          <p className="excluidos__nota">
            As fatias acima somam 100% do que tem cotação, não da carteira inteira.
          </p>
        </div>
      )}
    </Cartao>
  );
}
