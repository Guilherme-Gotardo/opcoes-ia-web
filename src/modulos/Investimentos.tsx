/**
 * Posições em carteira, uma a uma, de UM tipo de ativo.
 *
 * Ação e opção são grandezas diferentes o bastante para não dividirem
 * tabela: numa, quantidade é lote e preço é cotação; na outra, quantidade
 * é contrato lançado e "preço" é prêmio recebido. Misturadas, a coluna
 * "valor a mercado" somava coisas que não se somam — e o próprio backend
 * já separa, contando só ação no patrimônio para não fazer contagem dupla
 * (o valor da opção deriva das mesmas ações).
 *
 * A regra mais importante desta tabela: **preço médio é custo e aparece AO
 * LADO do preço de mercado, nunca no lugar dele.** As duas colunas coexistem
 * e o cabeçalho diz qual é qual, porque trocar uma pela outra transforma
 * base de custo em valor — o erro de leitura mais caro que uma tela de
 * carteira pode induzir.
 *
 * Posição sem cotação não é escondida nem zerada: ela aparece, marcada, com
 * o motivo que a API deu. Some da conta de patrimônio, não da tela.
 */
import { useMemo, useState } from "react";
import type { Carteira, Posicao } from "../api/client";
import { Ausente } from "../componentes/Ausente";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { IconeAlerta, IconeLista } from "../componentes/Icones";
import { metricas, resultadoDaPosicao } from "../lib/derivar";
import { brl, brlAssinado, numero, pct, pctAssinado, preco } from "../lib/formato";

type Campo =
  | "ticker"
  | "tipo_ativo"
  | "quantidade"
  | "preco_medio"
  | "preco_mercado"
  | "valor"
  | "resultado"
  | "participacao";

type Ordem = { campo: Campo; desc: boolean };

/** Null sempre por último: "sem dado" não compete por posição no ranking. */
function comparar(a: number | string | null, b: number | string | null, desc: boolean) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const base = typeof a === "string" ? a.localeCompare(String(b), "pt-BR") : Number(a) - Number(b);
  return desc ? -base : base;
}

function valorDoCampo(p: Posicao, campo: Campo, total: number): number | string | null {
  const r = resultadoDaPosicao(p);
  switch (campo) {
    case "ticker":
      return p.ticker;
    case "tipo_ativo":
      return p.tipo_ativo;
    case "quantidade":
      return p.quantidade;
    case "preco_medio":
      return p.preco_medio;
    case "preco_mercado":
      return p.preco_mercado;
    case "valor":
      return p.valor;
    case "resultado":
      return r?.ganho ?? null;
    case "participacao":
      return p.valor == null || total <= 0 ? null : (p.valor / total) * 100;
  }
}

const COLUNAS: { campo: Campo; rotulo: string; ajuda?: string; num?: boolean }[] = [
  { campo: "ticker", rotulo: "Ticker" },
  { campo: "tipo_ativo", rotulo: "Tipo" },
  { campo: "quantidade", rotulo: "Qtd", num: true },
  {
    campo: "preco_medio",
    rotulo: "Preço médio",
    ajuda: "Base de custo — nunca usada como valor",
    num: true,
  },
  { campo: "preco_mercado", rotulo: "Preço de mercado", num: true },
  { campo: "valor", rotulo: "Valor a mercado", num: true },
  { campo: "resultado", rotulo: "Resultado", num: true },
  { campo: "participacao", rotulo: "% carteira", num: true },
];

type PropsInvestimentos = {
  carteira: Carteira;
  /** Qual classe esta tabela mostra. Sem isto ela mistura as duas. */
  tipo: "ACAO" | "OPCAO";
};

export function Investimentos({ carteira, tipo }: PropsInvestimentos) {
  const [ordem, setOrdem] = useState<Ordem>({ campo: "valor", desc: true });
  const [busca, setBusca] = useState("");
  const m = metricas(carteira, tipo);
  const total = carteira.total_patrimonio;
  const doTipo = useMemo(
    () => carteira.posicoes.filter((p) => p.tipo_ativo === tipo),
    [carteira.posicoes, tipo],
  );

  const posicoes = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return doTipo
      .filter((p) => termo === "" || p.ticker.toUpperCase().includes(termo))
      .slice()
      .sort((a, b) =>
        comparar(
          valorDoCampo(a, ordem.campo, total),
          valorDoCampo(b, ordem.campo, total),
          ordem.desc,
        ),
      );
  }, [doTipo, ordem, busca, total]);

  const alternar = (campo: Campo) =>
    setOrdem((o) => ({ campo, desc: o.campo === campo ? !o.desc : true }));

  return (
    <Cartao
      id={tipo === "ACAO" ? "posicoes-acoes" : "posicoes-opcoes"}
      icone={<IconeLista />}
      titulo={tipo === "ACAO" ? "Posições em ação" : "Posições em opção"}
      nota={
        tipo === "ACAO"
          ? "Preço médio é custo e fica ao lado do preço de mercado — nunca no lugar dele."
          : "Quantidade negativa é posição lançada. Estas posições NÃO entram no patrimônio: o valor delas deriva das mesmas ações já contadas."
      }
      acoes={
        doTipo.length > 4 && (
          <input
            className="campo"
            type="search"
            value={busca}
            placeholder="Filtrar ticker…"
            aria-label="Filtrar posições por ticker ou tipo"
            onChange={(e) => setBusca(e.target.value)}
          />
        )
      }
    >
      {doTipo.length === 0 ? (
        <Estado
          titulo={
            tipo === "ACAO"
              ? "Nenhuma posição em ação"
              : "Nenhuma posição em opção"
          }
        >
          Registre no cadastro abaixo e ela aparece aqui.
        </Estado>
      ) : posicoes.length === 0 ? (
        <Estado titulo={`Nenhuma posição corresponde a "${busca}"`}>
          Limpe o filtro para ver as {numero(doTipo.length)} posições.
        </Estado>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <caption className="visualmente-oculto">
              Posições da carteira com custo, preço de mercado e resultado não
              realizado
            </caption>
            <thead>
              <tr>
                {COLUNAS.map((c) => (
                  <th
                    key={c.campo}
                    scope="col"
                    className={c.num ? "num" : undefined}
                    aria-sort={
                      ordem.campo === c.campo
                        ? ordem.desc
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="tabela__ordenar"
                      onClick={() => alternar(c.campo)}
                      title={c.ajuda}
                    >
                      {c.rotulo}
                      {c.ajuda && <span className="tabela__ajuda"> (custo)</span>}
                      <span className="tabela__seta" aria-hidden>
                        {ordem.campo === c.campo ? (ordem.desc ? "▼" : "▲") : ""}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posicoes.map((p) => {
                const r = resultadoDaPosicao(p);
                const direcao =
                  r == null || r.ganho === 0 ? "neutro" : r.ganho > 0 ? "ganho" : "perda";
                return (
                  <tr key={p.ticker} className={r == null ? "linha--sem-cotacao" : undefined}>
                    <th scope="row" className="tabela__ticker">
                      {p.ticker}
                    </th>
                    <td>
                      <span className="etiqueta">{p.tipo_ativo}</span>
                      {/* Quantidade negativa é posição lançada (vendida) — o
                          sinal sozinho passa despercebido numa coluna de
                          números, e numa carteira de venda coberta essa é a
                          distinção que mais importa. */}
                      {p.quantidade < 0 && (
                        <span className="etiqueta etiqueta--lancada">lançada</span>
                      )}
                    </td>
                    <td className="num">{numero(p.quantidade)}</td>
                    <td className="num num--custo">{preco(p.preco_medio)}</td>
                    <td className="num">
                      {p.preco_mercado == null ? (
                        <Ausente motivo={p.motivo_sem_cotacao}>sem cotação</Ausente>
                      ) : (
                        preco(p.preco_mercado)
                      )}
                    </td>
                    <td className="num">
                      {p.valor == null ? (
                        <Ausente motivo={p.motivo_sem_cotacao}>não valorizado</Ausente>
                      ) : (
                        brl(p.valor)
                      )}
                    </td>
                    <td className={`num valor--${direcao}`}>
                      {r == null ? (
                        <Ausente>não apurado</Ausente>
                      ) : (
                        <>
                          {brlAssinado(r.ganho)}
                          <span className="tabela__sub">{pctAssinado(r.pct)}</span>
                        </>
                      )}
                    </td>
                    <td className="num">
                      {p.valor == null || total <= 0 ? (
                        <Ausente>fora do total</Ausente>
                      ) : (
                        pct((p.valor / total) * 100)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/*
              A linha de total só existe para AÇÃO. Em opção não há o que
              somar: "valor a mercado" e "% carteira" ficam vazios porque
              opção não entra no patrimônio, e repetir o total das ações
              aqui — que foi o que aconteceu antes desta guarda — mostrava
              o número de outra classe como se fosse desta.
            */}
            {tipo === "ACAO" && (
            <tfoot>
              {/*
                Só somam as colunas que fazem sentido somar. Quantidade e preço
                (médio ou de mercado) são por unidade e de ativos diferentes —
                um total ali seria um número sem significado. O custo total da
                carteira é dinheiro, mas não pertence a uma coluna de preço
                unitário: ele fica no rodapé, com nome próprio.
              */}
              <tr>
                <th scope="row">Total</th>
                <td colSpan={4} />
                <td className="num">{brl(carteira.total_patrimonio)}</td>
                <td
                  className={`num valor--${
                    m.resultado == null || m.resultado === 0
                      ? "neutro"
                      : m.resultado > 0
                        ? "ganho"
                        : "perda"
                  }`}
                >
                  {brlAssinado(m.resultado)}
                  <span className="tabela__sub">{pctAssinado(m.resultadoPct)}</span>
                </td>
                <td className="num">{m.comCotacao > 0 ? "100%" : "—"}</td>
              </tr>
            </tfoot>
            )}
          </table>
        </div>
      )}

      {tipo === "ACAO" && doTipo.length > 0 && (
        <p className="cartao__rodape">
          <span>
            Custo total da carteira: <strong>{brl(m.custoTotal)}</strong> — soma de
            preço médio × quantidade em todas as posições.
          </span>
        </p>
      )}

      {tipo === "OPCAO" && doTipo.length > 0 && (
        <p className="cartao__rodape">
          <span>
            Prêmio total das posições em aberto:{" "}
            <strong>{brl(Math.abs(m.custoTotal))}</strong>. O detalhe de cada
            operação — strike, vencimento e desfechos — está em Operações, acima.
          </span>
        </p>
      )}

      {tipo === "ACAO" && m.semCotacao > 0 && (
        <p className="cartao__rodape cartao__rodape--obsoleto">
          <IconeAlerta className="rodape__icone" />
          <span>
            {numero(m.semCotacao)}{" "}
            {m.semCotacao === 1 ? "posição está" : "posições estão"} sem cotação: entram
            no custo total, mas não no valor a mercado nem no resultado.
          </span>
        </p>
      )}
    </Cartao>
  );
}
