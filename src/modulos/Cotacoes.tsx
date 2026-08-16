/**
 * Tickers acompanhados.
 *
 * A API devolve de propósito os ativos SEM cotação em vez de omiti-los, e a
 * tela honra isso: um ticker sem preço aparece na grade, marcado, e não
 * simplesmente some. Ticker ausente e ticker sem preço são situações
 * diferentes; esconder a segunda faria as duas parecerem iguais.
 *
 * A idade da coleta fica visível em todo card. Preço velho é preço — só não
 * é preço de agora, e quem lê decide o que fazer com isso.
 */
import { useState } from "react";
import type { Cotacao } from "../api/client";
import { Ausente } from "../componentes/Ausente";
import { Cartao } from "../componentes/Cartao";
import { Comando } from "../componentes/Comando";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import { IconeAlerta, IconeEtiqueta, IconeOk, IconeRelogio } from "../componentes/Icones";
import { FRESCOR_PADRAO_HORAS, frescor } from "../lib/derivar";
import { dataHora, horasDesde, idade, numero, preco } from "../lib/formato";

type Filtro = "todas" | "com" | "sem";

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "com", rotulo: "Com cotação" },
  { chave: "sem", rotulo: "Sem cotação" },
];

function CardCotacao({ c, janelaHoras }: { c: Cotacao; janelaHoras: number }) {
  const estado = frescor(horasDesde(c.coletado_em), janelaHoras);

  return (
    <li className={`cotacao cotacao--${c.tem_cotacao ? estado : "ausente"}`}>
      <div className="cotacao__topo">
        <span className="cotacao__ticker">{c.ticker}</span>
        {!c.tem_cotacao ? (
          <Selo tom="indisponivel" icone={<IconeAlerta />}>
            sem cotação
          </Selo>
        ) : estado === "obsoleta" ? (
          <Selo
            tom="obsoleto"
            icone={<IconeRelogio />}
            titulo={`Passou da janela de ${janelaHoras}h — a avaliação trataria como dado insuficiente`}
          >
            obsoleta
          </Selo>
        ) : estado === "na-janela" ? (
          <Selo tom="neutro" icone={<IconeRelogio />}>
            na janela
          </Selo>
        ) : (
          <Selo tom="ok" icone={<IconeOk />}>
            {estado === "recente" ? "recente" : "do dia"}
          </Selo>
        )}
      </div>
      <p className="cotacao__preco">
        {c.preco == null ? <Ausente>sem preço coletado</Ausente> : preco(c.preco)}
      </p>
      <p className="cotacao__idade" title={dataHora(c.coletado_em)}>
        {c.coletado_em ? `coletada ${idade(c.coletado_em)}` : "nunca coletada"}
      </p>
    </li>
  );
}

type Props = {
  cotacoes: Cotacao[] | null;
  erro: string | null;
  /** Vem de `/parametros`; null quando aquele recurso falhou. */
  janelaHoras: number | null;
};

export function Cotacoes({ cotacoes, erro, janelaHoras }: Props) {
  const janela = janelaHoras ?? FRESCOR_PADRAO_HORAS;
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const com = cotacoes?.filter((c) => c.tem_cotacao).length ?? 0;
  const total = cotacoes?.length ?? 0;
  const visiveis = (cotacoes ?? []).filter((c) =>
    filtro === "todas" ? true : filtro === "com" ? c.tem_cotacao : !c.tem_cotacao,
  );

  return (
    <Cartao
      id="tickers"
      icone={<IconeEtiqueta />}
      titulo="Tickers acompanhados"
      nota={
        `Cotação mais recente de cada ativo cadastrado — inclusive os sem preço. ` +
        `A janela de frescor da avaliação é de ${janela}h` +
        (janelaHoras == null ? " (padrão — a API não informou)." : ".")
      }
      acoes={
        total > 0 && (
          <div className="filtros" role="group" aria-label="Filtrar tickers">
            {FILTROS.map((f) => (
              <button
                key={f.chave}
                type="button"
                className={`filtro${filtro === f.chave ? " filtro--ativo" : ""}`}
                aria-pressed={filtro === f.chave}
                onClick={() => setFiltro(f.chave)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler as cotações">
          {erro}
        </Estado>
      ) : cotacoes == null ? (
        <Estado titulo="Carregando…" />
      ) : total === 0 ? (
        <Estado
          titulo="Nenhum ativo cadastrado"
          acao={
            <Comando>
              python -m src.assets.manage add PETR4 "Petrobras PN" acao --cnpj-raiz
              33000167
            </Comando>
          }
        >
          O cadastro de ativos é pré-requisito de tudo: sem ele o ETL recusa o ticker
          e não há cotação a coletar.
        </Estado>
      ) : (
        <>
          <p className="cobertura">
            <strong>
              {numero(com)} de {numero(total)}
            </strong>{" "}
            {" "}
            {total === 1 ? "ativo cadastrado" : "ativos cadastrados"} com cotação
            utilizável
            {com < total && (
              <>
                {" "}
                — {numero(total - com)} sem preço. Estar cadastrado não é estar na
                carteira: só os que têm posição afetam o patrimônio, e aí ele fica
                parcial.
              </>
            )}
          </p>
          {visiveis.length === 0 ? (
            <Estado titulo="Nenhum ticker neste filtro" />
          ) : (
            <ul className="cotacoes">
              {visiveis.map((c) => (
                <CardCotacao key={c.ticker} c={c} janelaHoras={janela} />
              ))}
            </ul>
          )}
        </>
      )}
    </Cartao>
  );
}
