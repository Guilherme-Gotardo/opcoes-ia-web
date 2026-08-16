/**
 * Acompanhamento das operações de opção.
 *
 * O QUE ESTA TELA NÃO CONSEGUE MOSTRAR, E POR QUÊ
 * ----------------------------------------------
 * Não há marcação a mercado da opção. O ETL de opções está bloqueado no
 * plano do provedor, `opcoes` fica vazia, e sem preço não existe "quanto
 * vale agora". A alternativa seria estimar — proibido pela regra 1 do
 * projeto, e perigoso justamente aqui, onde o número vira decisão de
 * recomprar ou deixar correr.
 *
 * O que dá para responder com honestidade, e responde a maior parte da
 * pergunta: **a ação passou do strike?** Essa comparação usa a cotação do
 * ATIVO-OBJETO, que existe. Para uma venda coberta é quase tudo que
 * importa — o risco é ser exercido, e o gatilho do exercício é o preço da
 * ação, não o da opção.
 *
 * OPERAÇÃO ABERTA NÃO TEM LUCRO REALIZADO
 * ---------------------------------------
 * Enquanto está aberta, o prêmio já entrou mas o resultado ainda não
 * existe: pode virar pó (prêmio inteiro) ou ser exercida (prêmio mais o
 * resultado da venda ao strike). Por isso a tela mostra CENÁRIOS, não um
 * "lucro atual" — que seria um número inventado.
 *
 * TODO VALOR LÍQUIDO É ESTIMATIVA
 * -------------------------------
 * A apuração de verdade é mensal, consolida operações e carrega prejuízo.
 * O aviso não é rodapé decorativo: é o que impede alguém usar este número
 * como valor de DARF.
 */
import type { Operacao, Operacoes as OperacoesDado } from "../api/client";
import { Ausente } from "../componentes/Ausente";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo, type Tom } from "../componentes/Selo";
import {
  IconeAlerta,
  IconeInfo,
  IconeOk,
  IconeRelogio,
} from "../componentes/Icones";
import { brl, brlAssinado, data, mesAno, numero, pct, pctAssinado } from "../lib/formato";

const MOTIVO: Record<string, { rotulo: string; tom: Tom }> = {
  expirada: { rotulo: "expirou sem exercício", tom: "ok" },
  recomprada: { rotulo: "recomprada", tom: "neutro" },
  exercida: { rotulo: "exercida", tom: "bloqueado" },
  encerrada: { rotulo: "encerrada", tom: "neutro" },
};

function Prazo({ dias }: { dias: number | null }) {
  if (dias == null) return <Ausente>sem vencimento registrado</Ausente>;
  if (dias < 0) return <span className="operacao__prazo">vencida</span>;
  return (
    <span className={`operacao__prazo${dias <= 7 ? " operacao__prazo--curto" : ""}`}>
      {dias === 0 ? "vence hoje" : `${numero(dias)} ${dias === 1 ? "dia" : "dias"}`}
    </span>
  );
}

function Aberta({ o }: { o: Operacao }) {
  const dentro = o.dentro_do_dinheiro;

  return (
    <article className="operacao">
      <header className="operacao__topo">
        <div className="operacao__identidade">
          <span className="operacao__codigo">{o.codigo}</span>
          {o.ticker_objeto && (
            <span className="operacao__objeto">sobre {o.ticker_objeto}</span>
          )}
          <span className="etiqueta etiqueta--lancada">
            {o.quantidade < 0 ? "lançada" : "comprada"}
          </span>
        </div>
        <Prazo dias={o.dias_para_vencimento} />
      </header>

      <dl className="operacao__numeros">
        <div>
          <dt>Prêmio recebido</dt>
          <dd>{brl(Math.abs(o.quantidade) * o.premio_unitario)}</dd>
          <dd className="operacao__sub">
            {numero(Math.abs(o.quantidade))} × {brl(o.premio_unitario)}
          </dd>
        </div>
        <div>
          <dt>Strike</dt>
          <dd>{o.strike == null ? <Ausente>não registrado</Ausente> : brl(o.strike)}</dd>
          {o.vencimento && (
            <dd className="operacao__sub">vence {data(o.vencimento)}</dd>
          )}
        </div>
        <div>
          <dt>Cotação do objeto</dt>
          <dd>
            {o.preco_objeto == null ? (
              <Ausente>sem cotação</Ausente>
            ) : (
              brl(o.preco_objeto)
            )}
          </dd>
          {o.distancia_do_strike_pct != null && (
            <dd className="operacao__sub">
              {pctAssinado(o.distancia_do_strike_pct)} do strike
            </dd>
          )}
        </div>
      </dl>

      {/*
        O estado que define o risco da venda coberta. Tom de dado bloqueado
        (não vermelho) porque estar dentro do dinheiro NÃO é prejuízo: numa
        call coberta significa que a ação subiu e você provavelmente será
        exercido no lucro. Pintar de vermelho contaria a história errada.
      */}
      {dentro != null && (
        <p className={`operacao__estado operacao__estado--${dentro ? "itm" : "otm"}`}>
          {dentro ? <IconeAlerta /> : <IconeOk />}
          <span>
            {dentro
              ? "Dentro do dinheiro — a ação passou do strike, o exercício é provável"
              : "Fora do dinheiro — a ação está abaixo do strike"}
          </span>
        </p>
      )}

      {o.cenarios.length > 0 && (
        <div className="cenarios">
          <p className="cenarios__titulo">Como termina</p>
          <ul>
            {o.cenarios.map((c) => (
              <li key={c.nome}>
                <span className="cenarios__nome">{c.nome}</span>
                <span className="cenarios__descricao">{c.descricao}</span>
                <span
                  className={`num valor--${c.resultado_liquido >= 0 ? "ganho" : "perda"}`}
                >
                  {brlAssinado(c.resultado_liquido)}
                </span>
              </li>
            ))}
          </ul>
          <p className="cenarios__nota">
            Líquido de custos e imposto estimados. A apuração real é mensal e
            consolida suas operações.
          </p>
        </div>
      )}
    </article>
  );
}

function Encerrada({ o }: { o: Operacao }) {
  const motivo = MOTIVO[o.motivo_fechamento ?? ""] ?? {
    rotulo: o.motivo_fechamento ?? "encerrada",
    tom: "neutro" as Tom,
  };
  const direcao = o.resultado_liquido >= 0 ? "ganho" : "perda";

  return (
    <article className="operacao operacao--encerrada">
      <header className="operacao__topo">
        <div className="operacao__identidade">
          <span className="operacao__codigo">{o.codigo}</span>
          {o.ticker_objeto && (
            <span className="operacao__objeto">sobre {o.ticker_objeto}</span>
          )}
          <Selo tom={motivo.tom}>{motivo.rotulo}</Selo>
        </div>
        <span className={`operacao__liquido valor--${direcao}`}>
          {brlAssinado(o.resultado_liquido)}
        </span>
      </header>

      <table className="tabela tabela--compacta">
        <thead>
          <tr>
            <th scope="col">Perna</th>
            <th scope="col" className="num">Bruto</th>
            <th scope="col" className="num">Custos</th>
            <th scope="col" className="num">Imposto</th>
            <th scope="col" className="num">Líquido</th>
          </tr>
        </thead>
        <tbody>
          {o.pernas.map((p) => (
            <tr key={p.nome}>
              <th scope="row">
                {p.nome}
                <span className="tabela__sub">{pct(p.aliquota_pct, 0)}</span>
              </th>
              <td className="num">{brlAssinado(p.resultado_bruto)}</td>
              <td className="num num--custo">{brl(p.custos)}</td>
              <td className="num num--custo">{brl(p.imposto)}</td>
              <td className={`num valor--${p.resultado_liquido >= 0 ? "ganho" : "perda"}`}>
                {brlAssinado(p.resultado_liquido)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Duas pernas = call exercida. A separação é fiscal, não cosmética. */}
      {o.pernas.length > 1 && (
        <p className="operacao__nota">
          <IconeInfo className="rodape__icone rodape__icone--neutro" />
          <span>
            Duas categorias fiscais separadas: prêmio da opção e venda da ação ao
            strike têm tratamentos diferentes, então o imposto é calculado por perna
            e não sobre o total.
          </span>
        </p>
      )}

      {o.ressalvas.map((r) => (
        <p key={r} className="operacao__nota operacao__nota--ressalva">
          <IconeAlerta className="rodape__icone" />
          <span>{r}</span>
        </p>
      ))}
    </article>
  );
}

/**
 * Encerradas agrupadas por MÊS, não por dia.
 *
 * A razão é de domínio, não de layout: a apuração do imposto é mensal, e é
 * nessa unidade que os resultados começam a somar em algo comparável ao que
 * o fisco pede. Por dia fragmentaria — raramente há dois encerramentos no
 * mesmo dia — e não corresponderia a nenhuma regra.
 *
 * A lista também não pode crescer para sempre na tela: uma carteira ativa
 * fecha dezenas de operações por ano, e mostrar todas em sequência
 * transformaria a informação útil (o que está ABERTO) em rolagem.
 */
type GrupoMensal = {
  chave: string;
  rotulo: string;
  operacoes: Operacao[];
  liquido: number;
};

function agruparPorMes(encerradas: Operacao[]): GrupoMensal[] {
  const grupos = new Map<string, GrupoMensal>();

  for (const o of encerradas) {
    if (!o.fechada_em) continue;
    const d = new Date(o.fechada_em);
    // Chave ordenável (AAAA-MM); o rótulo é que vira legível.
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const grupo = grupos.get(chave) ?? {
      chave,
      rotulo: mesAno(o.fechada_em),
      operacoes: [],
      liquido: 0,
    };
    grupo.operacoes.push(o);
    grupo.liquido += o.resultado_liquido;
    grupos.set(chave, grupo);
  }

  // Mês mais recente primeiro: é o que está em aberto na cabeça de quem lê.
  return [...grupos.values()].sort((a, b) => b.chave.localeCompare(a.chave));
}

type Props = {
  operacoes: OperacoesDado | null;
  erro: string | null;
};

export function Operacoes({ operacoes, erro }: Props) {
  const abertas = (operacoes?.operacoes ?? []).filter((o) => o.fechada_em == null);
  const encerradas = (operacoes?.operacoes ?? []).filter((o) => o.fechada_em != null);
  const liquidoRealizado = encerradas.reduce((t, o) => t + o.resultado_liquido, 0);

  return (
    <Cartao
      id="operacoes"
      icone={<IconeRelogio />}
      titulo="Operações"
      nota="Vendas cobertas e demais posições em opção, com resultado líquido estimado. Estimativa para conferência — não é apuração fiscal."
      acoes={
        encerradas.length > 0 && (
          <Selo tom={liquidoRealizado >= 0 ? "ganho" : "perda"}>
            {brlAssinado(liquidoRealizado)} realizado
          </Selo>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler as operações">
          {erro}
        </Estado>
      ) : operacoes == null ? (
        <Estado titulo="Carregando…" />
      ) : operacoes.operacoes.length === 0 ? (
        <Estado icone={<IconeRelogio />} titulo="Nenhuma operação em opção">
          Registre uma posição em opção no cadastro — com strike, vencimento e o
          ativo-objeto — e ela passa a ser acompanhada aqui.
        </Estado>
      ) : (
        <>
          {operacoes.tem_cotacao_de_opcao === false && (
            <p className="aviso aviso--obsoleto" role="note">
              <IconeInfo className="aviso__icone" />
              <span>
                Sem cotação de opção no banco, não há marcação a mercado da posição:
                o que se compara é a cotação da AÇÃO com o strike. Para uma venda
                coberta isso responde o essencial — o gatilho do exercício é o preço
                da ação.
              </span>
            </p>
          )}

          {abertas.length > 0 && (
            <section className="operacoes__grupo">
              <h3 className="operacoes__titulo">
                Em aberto <span className="operacoes__contagem">{numero(abertas.length)}</span>
              </h3>
              <div className="operacoes__lista">
                {abertas.map((o) => (
                  <Aberta key={o.posicao_id} o={o} />
                ))}
              </div>
            </section>
          )}

          {encerradas.length > 0 && (
            <section className="operacoes__grupo">
              <h3 className="operacoes__titulo">
                Encerradas{" "}
                <span className="operacoes__contagem">{numero(encerradas.length)}</span>
              </h3>

              {agruparPorMes(encerradas).map((mes, i) => (
                <details
                  key={mes.chave}
                  className="mes"
                  /* O mês corrente vem aberto; os anteriores ficam a um
                     clique. Sem isso a tela volta a ser rolagem. */
                  open={i === 0}
                >
                  <summary className="mes__cabeca">
                    <span className="mes__rotulo">{mes.rotulo}</span>
                    <span className="mes__contagem">
                      {numero(mes.operacoes.length)}{" "}
                      {mes.operacoes.length === 1 ? "operação" : "operações"}
                    </span>
                    <span
                      className={`num mes__liquido valor--${
                        mes.liquido >= 0 ? "ganho" : "perda"
                      }`}
                    >
                      {brlAssinado(mes.liquido)}
                    </span>
                  </summary>
                  <div className="operacoes__lista mes__lista">
                    {mes.operacoes.map((o) => (
                      <Encerrada key={o.posicao_id} o={o} />
                    ))}
                  </div>
                </details>
              ))}

              <p className="operacoes__nota-mes">
                <IconeInfo className="rodape__icone rodape__icone--neutro" />
                <span>
                  O total do mês soma as estimativas das operações fechadas nele.
                  <strong> Não é a apuração</strong>: ela compensa prejuízo de meses
                  anteriores, separa as categorias e desconta o IRRF retido.
                </span>
              </p>
            </section>
          )}
        </>
      )}
    </Cartao>
  );
}
