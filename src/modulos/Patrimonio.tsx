/**
 * Módulo de patrimônio — a faixa que o painel lidera.
 *
 * Duas regras herdadas do projeto principal moldam esta tela:
 *
 * 1. Patrimônio parcial é DECLARADO. Quando falta cotação, o aviso fica ao
 *    lado do número, não num rodapé — o total deixa de cobrir a carteira
 *    inteira e quem lê precisa saber disso antes de usar o valor.
 * 2. Resultado só compara o comparável. Ele é apurado sobre as posições que
 *    têm cotação, e o apoio do indicador diz exatamente sobre quantas.
 *
 * O selo de última execução separa duas datas que a tela antes confundia:
 * quando a PÁGINA buscou (topo, e é sempre "agora") e quando a AVALIAÇÃO
 * rodou. Buscar dado fresco de uma avaliação velha não torna a avaliação
 * nova, e só a segunda data diz se o que está na tela ainda vale.
 */
import type { Carteira } from "../api/client";
import { Kpi } from "../componentes/Kpi";
import { Selo } from "../componentes/Selo";
import {
  IconeAlerta,
  IconeDesceu,
  IconeEstavel,
  IconeOk,
  IconeRelogio,
  IconeSubiu,
} from "../componentes/Icones";
import { metricas } from "../lib/derivar";
import { brl, brlAssinado, dataHora, idade, numero, pct, pctAssinado } from "../lib/formato";

type Props = {
  carteira: Carteira;
  /** `executado_em` do desfecho — null quando a avaliação nunca rodou. */
  executadoEm: string | null;
};

export function Patrimonio({ carteira, executadoEm }: Props) {
  // Só AÇÃO: `total_patrimonio` conta só ação (o valor da opção deriva das
  // mesmas ações), então o custo e o resultado exibidos ao lado dele
  // precisam cobrir a mesma coisa. Misturado, o prêmio de opção lançada era
  // subtraído do custo das ações.
  const m = metricas(carteira, "ACAO");
  const parcial = carteira.patrimonio_parcial;

  const direcao =
    m.resultado == null || m.resultado === 0
      ? "estavel"
      : m.resultado > 0
        ? "ganho"
        : "perda";

  const IconeDirecao =
    direcao === "ganho" ? IconeSubiu : direcao === "perda" ? IconeDesceu : IconeEstavel;

  return (
    <section id="patrimonio" className="patrimonio" aria-labelledby="patrimonio-titulo">
      <div className="patrimonio__principal">
        <h2 id="patrimonio-titulo" className="patrimonio__rotulo">
          Patrimônio a preço de mercado
        </h2>
        <p className="patrimonio__valor">{brl(carteira.total_patrimonio)}</p>
        <div className="patrimonio__meta">
          <span>
            {numero(m.posicoes)} {m.posicoes === 1 ? "posição" : "posições"} ·{" "}
            {numero(m.ativosObjeto)}{" "}
            {m.ativosObjeto === 1 ? "ativo-objeto" : "ativos-objeto"}
          </span>
          {parcial ? (
            <Selo tom="obsoleto" icone={<IconeAlerta />}>
              Cobertura parcial
            </Selo>
          ) : (
            <Selo tom="ok" icone={<IconeOk />}>
              Carteira inteira precificada
            </Selo>
          )}
          {executadoEm ? (
            <Selo
              tom="neutro"
              icone={<IconeRelogio />}
              titulo={`Avaliação executada em ${dataHora(executadoEm)}`}
            >
              avaliação {idade(executadoEm)}
            </Selo>
          ) : (
            <Selo tom="bloqueado" icone={<IconeRelogio />}>
              avaliação nunca executada
            </Selo>
          )}
        </div>
      </div>

      <div className="patrimonio__indicadores">
        <Kpi
          rotulo="Custo total (base)"
          valor={brl(m.custoTotal)}
          apoio="Preço médio × quantidade, todas as posições"
        />
        <Kpi
          rotulo="Resultado não realizado"
          valor={
            <span className={`valor--${direcao}`}>{brlAssinado(m.resultado)}</span>
          }
          delta={
            m.resultadoPct == null ? undefined : (
              <span className={`delta delta--${direcao}`}>
                <IconeDirecao />
                {pctAssinado(m.resultadoPct)}
              </span>
            )
          }
          apoio={
            m.comCotacao === 0
              ? "Nenhuma posição com cotação para apurar"
              : parcial
                ? `Sobre ${numero(m.comCotacao)} de ${numero(m.posicoes)} posições — as que têm cotação`
                : "Sobre a carteira inteira"
          }
        />
        <Kpi
          rotulo="Maior concentração"
          valor={
            m.maiorExposicao ? (
              <>
                <span className="kpi__ticker">{m.maiorExposicao.ativo}</span>{" "}
                <span className="kpi__secundario">{pct(m.maiorExposicao.pct)}</span>
              </>
            ) : (
              "—"
            )
          }
          apoio="Maior fatia do patrimônio num só ativo-objeto"
        />
      </div>

      {parcial && (
        <div className="aviso aviso--obsoleto" role="alert">
          <IconeAlerta className="aviso__icone" />
          <div>
            <p className="aviso__titulo">
              O total acima não cobre a carteira inteira.
            </p>
            <p>
              Sem cotação utilizável para{" "}
              <strong>{carteira.tickers_sem_cotacao.join(", ")}</strong>. Essas
              posições entram no custo, mas ficam fora do patrimônio a mercado e do
              resultado.
            </p>
            {carteira.motivos_sem_cotacao.length > 0 && (
              <ul className="aviso__motivos">
                {carteira.motivos_sem_cotacao.map((motivo) => (
                  <li key={motivo}>{motivo}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
