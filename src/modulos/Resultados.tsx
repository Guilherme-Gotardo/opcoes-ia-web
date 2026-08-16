/**
 * Calendário de divulgação de resultado.
 *
 * Duas invariantes do domínio que esta tela precisa deixar visíveis, porque
 * são exatamente onde um erro sai caro:
 *
 * 1. **Estimativa nunca sobrescreve confirmação.** Quando as duas datas
 *    existem e divergem, a tela mostra as DUAS — a confirmada como a que
 *    vale e a estimada ao lado, marcada como divergente. Apagar a estimativa
 *    esconderia que houve discordância entre fontes.
 * 2. **Registrar não é consolidar.** Uma data em `earnings_manual_entries`
 *    que ninguém promoveu com o `ingest` não existe para o motor de opções:
 *    a avaliação segue bloqueada como se não houvesse data. Esse estado vem
 *    primeiro na tela, com o comando que o resolve, porque é silencioso e
 *    caro — o banco tem a data, e mesmo assim nada sai.
 *
 * Nada aqui julga se a data é boa o bastante para liberar uma operação.
 * Quem faz isso é o `EarningsRiskService`, no repositório principal.
 */
import type { EventoResultado, Resultados as ResultadosDado } from "../api/client";
import { Ausente } from "../componentes/Ausente";
import { Cartao } from "../componentes/Cartao";
import { Comando } from "../componentes/Comando";
import { Estado } from "../componentes/Estado";
import { Selo, type Tom } from "../componentes/Selo";
import {
  IconeAlerta,
  IconeCalendario,
  IconeOk,
  IconeRelogio,
} from "../componentes/Icones";
import { data, diasAte, numero } from "../lib/formato";

const SESSAO: Record<string, string> = {
  BEFORE_OPEN: "antes da abertura",
  DURING_SESSION: "durante o pregão",
  AFTER_CLOSE: "após o fechamento",
  UNKNOWN: "sessão desconhecida",
};

/**
 * `UNKNOWN` recebe tom de estado obsoleto, não neutro: sessão desconhecida
 * não é detalhe cosmético — ela AMPLIA a janela de risco, porque a mesma
 * divulgação pode cair em dois dias diferentes.
 */
const STATUS: Record<string, { rotulo: string; tom: Tom }> = {
  CONFIRMED: { rotulo: "confirmado", tom: "ok" },
  RELEASED: { rotulo: "divulgado", tom: "acento" },
  ESTIMATED: { rotulo: "estimado", tom: "obsoleto" },
  RESCHEDULED: { rotulo: "remarcado", tom: "bloqueado" },
};

function Quando({ iso }: { iso: string | null }) {
  const dias = diasAte(iso);
  if (!iso || dias == null) return <Ausente>sem data</Ausente>;
  return (
    <>
      <span className="num">{data(iso)}</span>
      <span className="evento__sub">
        {dias < 0
          ? `há ${numero(Math.abs(dias))} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
          : dias === 0
            ? "hoje"
            : `em ${numero(dias)} ${dias === 1 ? "dia" : "dias"}`}
      </span>
    </>
  );
}

function Evento({ e }: { e: EventoResultado }) {
  const status = STATUS[e.status] ?? { rotulo: e.status, tom: "neutro" as Tom };
  // Só é divergência quando as duas datas existem E discordam. Estimada
  // ausente não é conflito, e igual às duas não merece ruído na tela.
  const divergente =
    e.data_estimada != null &&
    e.data_confirmada != null &&
    e.data_estimada !== e.data_confirmada;

  return (
    <li className="evento">
      <div className="evento__identidade">
        <span className="evento__ticker">{e.ticker}</span>
        <span className="evento__periodo">{e.periodo_fiscal}</span>
        {e.empresa && <span className="evento__empresa">{e.empresa}</span>}
      </div>

      <div className="evento__quando">
        <Quando iso={e.data_efetiva} />
        {divergente && (
          <span className="evento__divergencia" title="Fontes discordaram; a confirmada prevalece">
            estimada era {data(e.data_estimada)}
          </span>
        )}
      </div>

      <span className="evento__sessao">
        {SESSAO[e.sessao] ?? e.sessao}
        {e.sessao === "UNKNOWN" && (
          <span className="evento__sub">amplia a janela de risco</span>
        )}
      </span>

      <div className="evento__estado">
        <Selo tom={status.tom} icone={e.confirmado ? <IconeOk /> : <IconeRelogio />}>
          {status.rotulo}
        </Selo>
        <span className="evento__confianca" title={`Faixa: ${e.faixa_confianca}`}>
          confiança <span className="num">{numero(e.confianca)}</span>
        </span>
      </div>

      {e.fontes.length > 0 && (
        <details className="criterios evento__fontes">
          <summary>
            {numero(e.fontes.length)}{" "}
            {e.fontes.length === 1 ? "fonte consultada" : "fontes consultadas"}
          </summary>
          <ul className="fontes">
            {e.fontes.map((f, i) => (
              <li key={`${f.provedor}-${i}`}>
                <span className="fontes__provedor">{f.provedor}</span>
                <span className="num">{data(f.data_reportada)}</span>
                <span className="fontes__status">{f.status ?? "—"}</span>
                <span className="num fontes__confianca">{numero(f.confianca)}</span>
                {f.url && (
                  <a href={f.url} target="_blank" rel="noreferrer noopener">
                    origem
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

type Props = {
  resultados: ResultadosDado | null;
  erro: string | null;
};

export function Resultados({ resultados, erro }: Props) {
  const pendentes = resultados?.pendentes_consolidacao ?? [];
  const eventos = resultados?.eventos ?? [];

  return (
    <Cartao
      id="resultados"
      icone={<IconeCalendario />}
      titulo="Calendário de resultados"
      nota="Data de divulgação por ativo. Estimativa nunca sobrescreve confirmação — quando as duas existem, as duas aparecem."
      acoes={
        resultados && (
          <Selo tom={resultados.politica_resultado_desconhecido === "bloquear" ? "bloqueado" : "obsoleto"}>
            sem data: {resultados.politica_resultado_desconhecido}
          </Selo>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler o calendário">
          {erro}
        </Estado>
      ) : resultados == null ? (
        <Estado titulo="Carregando…" />
      ) : (
        <>
          {/*
            Vem antes da lista de propósito: é o estado que parece resolvido
            e não está. A data existe no banco, o motor não a enxerga, e a
            avaliação segue bloqueada sem dizer por quê.
          */}
          {pendentes.length > 0 && (
            <div className="aviso aviso--bloqueado" role="alert">
              <IconeAlerta className="aviso__icone aviso__icone--bloqueado" />
              <div>
                <p className="aviso__titulo">
                  {numero(pendentes.length)}{" "}
                  {pendentes.length === 1 ? "data registrada" : "datas registradas"} que o
                  motor ainda não enxerga
                </p>
                <p>
                  Registrar não é consolidar: <code>manage add</code> gravou a data, mas
                  só o <code>ingest</code> a promove para a tabela que a avaliação
                  consulta. Até lá o ativo segue bloqueado como se não houvesse data.
                </p>
                <ul className="pendentes">
                  {pendentes.map((p) => (
                    <li key={`${p.ticker}-${p.periodo_fiscal}`}>
                      <div className="pendentes__cabeca">
                        <span className="evento__ticker">{p.ticker}</span>
                        <span className="evento__periodo">{p.periodo_fiscal}</span>
                        <span className="num">{data(p.data_resultado)}</span>
                        {p.origem && (
                          <a href={p.origem} target="_blank" rel="noreferrer noopener">
                            origem
                          </a>
                        )}
                      </div>
                      <Comando>{p.comando_para_consolidar}</Comando>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {eventos.length === 0 ? (
            <Estado
              icone={<IconeCalendario />}
              titulo="Nenhum evento de resultado consolidado"
              acao={<Comando>python -m src.earnings.ingest</Comando>}
            >
              Sem data consolidada, a política vigente é{" "}
              <strong>{resultados.politica_resultado_desconhecido}</strong> — a avaliação
              trata o ativo como sem data em vez de seguir às cegas.
            </Estado>
          ) : (
            <ul className="eventos">
              {eventos.map((e) => (
                <Evento key={`${e.ticker}-${e.periodo_fiscal}`} e={e} />
              ))}
            </ul>
          )}
        </>
      )}
    </Cartao>
  );
}
