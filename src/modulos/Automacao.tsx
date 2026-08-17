/**
 * Execução automática do pipeline de pregão.
 *
 * POR QUE É UM MÓDULO SEPARADO DE "SAÚDE DA COLETA"
 * -------------------------------------------------
 * Os dois escopos parecem o mesmo e não são, e juntá-los apagaria a única
 * coisa nova aqui:
 *
 * - Saúde da coleta responde "quando cada fonte entregou pela última vez".
 *   Não é log: `rastreia_falhas` continua `false`, porque sem entrega hoje
 *   pode ser fonte quebrada OU dia sem novidade, e o banco não distingue.
 * - Automação responde "o pipeline rodou, e no que deu". Isso É log: cada
 *   disparo abre uma linha antes de começar e a fecha com o desfecho.
 *
 * Misturar os dois faria a tela herdar o pior de cada um — ou vender o
 * silêncio da coleta como saúde, ou esconder que a execução agora é
 * auditável.
 *
 * TRÊS ESTADOS QUE NÃO PODEM VIRAR O MESMO CINZA
 * ----------------------------------------------
 * "pulou porque não era pregão" é o estado NORMAL na maior parte das horas
 * do ano e não merece alarme. "falhou" é acionável. "não rodou nenhuma vez
 * hoje" é o pior dos três — significa que o timer não disparou, e é
 * justamente o caso que nenhuma tela conseguia mostrar antes. Cada um tem
 * tom e rótulo próprios; nenhum depende só da cor.
 */
import type { ReactNode } from "react";
import type { Automacao as AutomacaoDado, Execucao } from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import type { Tom } from "../componentes/Selo";
import {
  IconeAlerta,
  IconeCalendario,
  IconeInfo,
  IconeOk,
  IconeRelogio,
} from "../componentes/Icones";
import { dataHora, idade, numero } from "../lib/formato";

/**
 * Status → tom e rótulo. Verde/vermelho ficam de fora por construção: são a
 * família de DIREÇÃO DE PREÇO, e um disparo que falhou não é prejuízo.
 */
const ESTADOS: Record<string, { tom: Tom; rotulo: string; icone: ReactNode }> = {
  executado: { tom: "ok", rotulo: "executado", icone: <IconeOk /> },
  pulado_fora_de_pregao: {
    tom: "indisponivel",
    rotulo: "fora de pregão",
    icone: <IconeRelogio />,
  },
  falhou: { tom: "obsoleto", rotulo: "falhou", icone: <IconeAlerta /> },
  executando: { tom: "bloqueado", rotulo: "em curso", icone: <IconeRelogio /> },
};

function estadoDe(status: string) {
  return (
    ESTADOS[status] ?? { tom: "neutro" as Tom, rotulo: status, icone: <IconeInfo /> }
  );
}

/** O texto curto que explica a linha: motivo do pulo, erro, ou o que saiu. */
function resumo(e: Execucao): string {
  const d = (e.detalhe ?? {}) as Record<string, never>;
  const erro = d.erro as { tipo?: string; mensagem?: string } | undefined;
  if (erro) return `${erro.tipo ?? "erro"}: ${erro.mensagem ?? "sem mensagem"}`;

  const janela = d.janela as { motivo?: string } | undefined;
  if (e.status === "pulado_fora_de_pregao") return janela?.motivo ?? "fora de pregão";

  const av = d.avaliacao as
    | { pares_avaliados?: number; sugestoes?: number }
    | undefined;
  if (av) {
    // `0 de 0` é o estado esperado enquanto o plano da Brapi não permitir
    // coletar cadeia de opções. Dizer isso é melhor que mostrar vazio: sem
    // esta linha, "nenhuma sugestão" e "nenhuma opção para avaliar" seriam
    // o mesmo silêncio.
    return `${numero(av.sugestoes ?? 0)} sugestão(ões) de ${numero(
      av.pares_avaliados ?? 0,
    )} par(es) avaliado(s)`;
  }
  return janela?.motivo ?? "—";
}

function LinhaExecucao({ e }: { e: Execucao }) {
  const { tom, rotulo, icone } = estadoDe(e.status);
  return (
    <li className="execucao">
      <div className="coleta__identidade">
        <span className="coleta__canal">{rotulo}</span>
        <span className="coleta__fonte">{e.gatilho}</span>
      </div>
      <span className="coleta__quando" title={dataHora(e.iniciado_em)}>
        {idade(e.iniciado_em)}
      </span>
      <span className="execucao__resumo">{resumo(e)}</span>
      <Selo tom={tom} icone={icone}>
        {e.duracao_s != null ? `${e.duracao_s.toFixed(1)}s` : "aberta"}
      </Selo>
    </li>
  );
}

type Props = {
  automacao: AutomacaoDado | null | undefined;
  erro: string | null;
};

export function Automacao({ automacao, erro }: Props) {
  const ultima = automacao?.ultima ?? null;
  const interrompidas = automacao?.interrompidas ?? [];
  const recentes = automacao?.recentes ?? [];
  const cal = automacao?.calendario ?? null;
  const derivados = cal?.anos_derivados ?? [];

  return (
    <Cartao
      id="automacao"
      icone={<IconeRelogio />}
      titulo="Execução automática"
      nota="Cada disparo do pipeline de pregão: se rodou, se pulou por não ser pregão, ou se falhou — e por quê."
      acoes={
        automacao?.disponivel && (
          <Selo
            tom={automacao.rodou_hoje ? "ok" : "obsoleto"}
            icone={automacao.rodou_hoje ? <IconeOk /> : <IconeAlerta />}
          >
            {automacao.rodou_hoje ? "rodou hoje" : "não rodou hoje"}
          </Selo>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler a automação">
          {erro}
        </Estado>
      ) : automacao == null ? (
        <Estado titulo="Carregando…" />
      ) : !automacao.disponivel ? (
        <Estado
          icone={<IconeAlerta />}
          titulo="Log de execução não existe neste banco"
        >
          A migração 007 ainda não foi aplicada aqui. Sem ela nada registra
          execução, e "pulou porque não era pregão" segue indistinguível de
          "falhou em silêncio". Aplique com{" "}
          <code>python -m src.db.bootstrap</code>.
        </Estado>
      ) : (
        <>
          {/* O pior estado primeiro: um processo que morreu no meio não
              aparece em nenhum outro lugar. */}
          {interrompidas.length > 0 && (
            <p className="aviso aviso--bloqueado" role="note">
              <IconeAlerta className="aviso__icone" />
              <span>
                <strong>{numero(interrompidas.length)}</strong> execução(ões)
                aberta(s) e nunca encerrada(s) — processo morto no meio (OOM,
                kill, máquina desligada). A mais antiga começou{" "}
                {idade(interrompidas[interrompidas.length - 1].iniciado_em)}.
              </span>
            </p>
          )}

          {!automacao.rodou_hoje && (
            <p className="aviso aviso--obsoleto" role="note">
              <IconeAlerta className="aviso__icone" />
              <span>
                Nenhum disparo hoje. Em dia útil isso significa que{" "}
                <strong>o timer não acordou</strong> — verifique com{" "}
                <code>systemctl --user status opcoes-ia-pregao.timer</code>.
              </span>
            </p>
          )}

          {ultima && (
            <p className="cartao__rodape">
              <span>
                Última execução concluída {idade(ultima.iniciado_em)}:{" "}
                <strong>{estadoDe(ultima.status).rotulo}</strong> — {resumo(ultima)}.
              </span>
            </p>
          )}

          {recentes.length === 0 ? (
            <Estado icone={<IconeRelogio />} titulo="Nenhuma execução registrada">
              O pipeline ainda não rodou nenhuma vez neste banco. Instale o timer
              conforme <code>docs/PREGAO.md</code>, ou dispare uma vez com{" "}
              <code>python -m scripts.rodar_pregao</code>.
            </Estado>
          ) : (
            <ul className="coletas">
              {recentes.map((e) => (
                <LinhaExecucao key={e.id} e={e} />
              ))}
            </ul>
          )}

          {cal && (
            <p className="orcamento__nota">
              <IconeCalendario className="rodape__icone rodape__icone--neutro" />{" "}
              Calendário de pregão vigente de {cal.vigencia_de} a {cal.vigencia_ate}
              {derivados.length > 0 && (
                <>
                  . <strong>{derivados.join(", ")}</strong>{" "}
                  {derivados.length > 1 ? "são derivados" : "é derivado"} das regras
                  e ainda não {derivados.length > 1 ? "foram" : "foi"} conferido
                  {derivados.length > 1 ? "s" : ""} contra a fonte oficial — as datas
                  funcionam, mas não têm o mesmo peso de {cal.anos_conferidos.join(", ")}
                </>
              )}
              . Fora da vigência o pipeline{" "}
              <strong>para em vez de supor</strong>: sem a lista, um feriado viraria
              dia normal e a carteira seria avaliada contra a cotação de outro dia.
            </p>
          )}

          {cal?.erro && (
            <p className="aviso aviso--bloqueado" role="note">
              <IconeAlerta className="aviso__icone" />
              <span>
                Calendário ilegível: {cal.erro} — nenhum disparo roda nesse estado.
              </span>
            </p>
          )}
        </>
      )}
    </Cartao>
  );
}
