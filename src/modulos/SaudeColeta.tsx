/**
 * Saúde da coleta e orçamento de requests.
 *
 * O que este módulo NÃO é: um painel de monitoramento. O projeto não grava
 * tentativa, erro nem duração de execução em lugar nenhum — a API declara
 * isso em `rastreia_falhas: false`, e a tela repete o limite em vez de
 * deixar o leitor supor.
 *
 * A diferença importa: "sem entrega hoje" aqui significa que nada foi
 * GRAVADO, o que pode ser fonte quebrada ou simplesmente dia sem novidade.
 * Pintar isso de verde ("tudo ok") seria apresentar silêncio como saúde;
 * pintar de vermelho seria inventar uma falha que ninguém observou. Por
 * isso o estado é factual — última entrega e quantidade — e não um veredito.
 *
 * O orçamento é honesto do mesmo jeito: não existe contagem de requests, ele
 * é estimado pelas linhas gravadas hoje e SUBESTIMA quando um request falha
 * antes de gravar. A API marca `e_aproximacao`, e a tela mostra a marca.
 */
import type { CanalColeta, SaudeColeta as SaudeColetaDado } from "../api/client";
import { Ausente } from "../componentes/Ausente";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import { IconeAlerta, IconeInfo, IconeRaio } from "../componentes/Icones";
import { dataHora, horasDesde, idade, numero } from "../lib/formato";

function LinhaColeta({ c }: { c: CanalColeta }) {
  const horas = horasDesde(c.ultima_entrega_em);

  return (
    <li className="coleta">
      <div className="coleta__identidade">
        <span className="coleta__canal">{c.canal}</span>
        <span className="coleta__fonte">{c.fonte}</span>
      </div>
      <span className="coleta__quando" title={dataHora(c.ultima_entrega_em)}>
        {c.ja_entregou ? (
          <>entregou {idade(c.ultima_entrega_em)}</>
        ) : (
          <Ausente>nunca entregou</Ausente>
        )}
      </span>
      <span className="coleta__hoje">
        {c.registros_hoje > 0 ? (
          <>
            <span className="num">{numero(c.registros_hoje)}</span> hoje
          </>
        ) : (
          <span className="coleta__zerado">nada hoje</span>
        )}
      </span>
      {/* Selo só quando há fato a nomear. Ausência de entrega não vira
          alerta: o banco não sabe se é falha ou dia sem novidade. */}
      {horas != null && horas >= 24 && (
        <Selo tom="obsoleto">última há {Math.floor(horas / 24)}d</Selo>
      )}
    </li>
  );
}

type Props = {
  saude: SaudeColetaDado | null;
  erro: string | null;
};

export function SaudeColeta({ saude, erro }: Props) {
  const orcamento = saude?.orcamento;
  const usoPct =
    orcamento && orcamento.limite_diario > 0
      ? Math.min(100, (orcamento.gastos_hoje / orcamento.limite_diario) * 100)
      : 0;
  const apertado = usoPct >= 80;

  return (
    <Cartao
      id="saude-coleta"
      icone={<IconeRaio />}
      titulo="Saúde da coleta"
      nota="Quando cada fonte entregou dado pela última vez e quanto do orçamento diário já foi gasto."
      acoes={
        saude?.ultima_avaliacao_em && (
          <Selo tom="neutro" titulo={dataHora(saude.ultima_avaliacao_em)}>
            avaliação {idade(saude.ultima_avaliacao_em)}
          </Selo>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler a saúde da coleta">
          {erro}
        </Estado>
      ) : saude == null ? (
        <Estado titulo="Carregando…" />
      ) : (
        <>
          {orcamento && (
            <div className="orcamento">
              <div className="orcamento__topo">
                <span className="orcamento__rotulo">
                  Orçamento diário · {orcamento.fonte}
                </span>
                <span className="orcamento__numeros">
                  <span className="orcamento__gasto">
                    {numero(orcamento.gastos_hoje)}
                  </span>
                  <span className="orcamento__limite">
                    {" "}
                    / {numero(orcamento.limite_diario)}
                  </span>
                </span>
              </div>
              <div className="orcamento__trilho">
                <div
                  className={`orcamento__preenchimento${
                    apertado ? " orcamento__preenchimento--apertado" : ""
                  }`}
                  style={{ inlineSize: `${Math.max(usoPct, 0.6)}%` }}
                />
              </div>
              <p className="orcamento__nota">
                Restam <span className="num">{numero(orcamento.restante_hoje)}</span>{" "}
                requests hoje.
                {orcamento.e_aproximacao && (
                  <>
                    {" "}
                    Número aproximado: não há contagem de requests, o gasto é estimado
                    pelas linhas gravadas — o real é igual ou maior.
                  </>
                )}
              </p>
            </div>
          )}

          {saude.coletas.length === 0 ? (
            <Estado titulo="Nenhuma coleta registrada">
              Nenhuma fonte gravou dado ainda. Rode um ETL e o rastro aparece aqui.
            </Estado>
          ) : (
            <ul className="coletas">
              {saude.coletas.map((c) => (
                <LinhaColeta key={`${c.canal}-${c.fonte}`} c={c} />
              ))}
            </ul>
          )}

          {saude.rastreia_falhas === false && (
            <p className="cartao__rodape">
              <IconeInfo className="rodape__icone rodape__icone--neutro" />
              <span>
                Isto não é monitoramento: o projeto não registra execução com erro.
                "Nada hoje" significa que nada foi gravado — pode ser fonte quebrada ou
                dia sem novidade, e o banco não distingue os dois.
              </span>
            </p>
          )}
        </>
      )}
    </Cartao>
  );
}
