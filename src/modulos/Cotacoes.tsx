/**
 * Tickers acompanhados.
 *
 * A API devolve de propósito os ativos SEM cotação em vez de omiti-los, e a
 * tela honra isso: um ticker sem preço aparece na grade, marcado, e não
 * simplesmente some. Ticker ausente e ticker sem preço são situações
 * diferentes; esconder a segunda faria as duas parecerem iguais.
 *
 * CADASTRADO NÃO É ACOMPANHADO
 * ----------------------------
 * O que os ETLs coletam é o UNIVERSO — carteira ∪ vigiados —, não a tabela
 * de cadastro. Esta tela mostrava as duas coisas como uma só: um ativo
 * cadastrado e fora do universo aparecia com "sem cotação", indistinguível
 * de uma coleta que falhou. São opostos: um é coleta quebrada, o outro é o
 * comportamento correto de um ticker onde nenhum ETL vai — hoje nem amanhã,
 * até que ele entre na carteira ou na watchlist.
 *
 * Por isso cada card diz por qual porta o ticker entrou (carteira ou
 * watchlist), ou que não entrou por nenhuma.
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
import {
  IconeAlerta,
  IconeCarteira,
  IconeEtiqueta,
  IconeOk,
  IconeRelogio,
} from "../componentes/Icones";
import { FRESCOR_PADRAO_HORAS, frescor } from "../lib/derivar";
import { dataHora, horasDesde, idade, numero, preco } from "../lib/formato";

type Filtro = "todas" | "acompanhados" | "fora";

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todos" },
  { chave: "acompanhados", rotulo: "Acompanhados" },
  { chave: "fora", rotulo: "Fora do universo" },
];

function CardCotacao({ c, janelaHoras }: { c: Cotacao; janelaHoras: number }) {
  const estado = frescor(horasDesde(c.coletado_em), janelaHoras);

  return (
    <li
      className={`cotacao cotacao--${
        !c.acompanhado ? "fora" : c.tem_cotacao ? estado : "ausente"
      }`}
    >
      <div className="cotacao__topo">
        <span className="cotacao__ticker">{c.ticker}</span>
        {!c.acompanhado ? (
          <Selo
            tom="indisponivel"
            titulo="Fora de carteira ∪ vigiados: nenhum ETL coleta este ticker"
          >
            fora do universo
          </Selo>
        ) : !c.tem_cotacao ? (
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
      {/*
        Por qual porta o ticker entrou no universo. Um ativo só cadastrado
        não é uma coleta pendente: é um ticker que ninguém pediu para
        acompanhar, e a linha diz o que fazer a respeito.
      */}
      <p className="cotacao__origem">
        {c.em_carteira && c.vigiado ? (
          <>
            <IconeCarteira /> em carteira e vigiado
          </>
        ) : c.em_carteira ? (
          <>
            <IconeCarteira /> em carteira
          </>
        ) : c.vigiado ? (
          <span title={c.vigiado_motivo ?? undefined}>
            <IconeEtiqueta /> na watchlist
            {c.vigiado_motivo && ` — ${c.vigiado_motivo}`}
          </span>
        ) : (
          <Ausente>só cadastrado — vigie para coletar</Ausente>
        )}
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

  const total = cotacoes?.length ?? 0;
  const acompanhados = (cotacoes ?? []).filter((c) => c.acompanhado);
  // A cobertura só faz sentido DENTRO do universo: cobrar cotação de um
  // ticker que nenhum ETL visita mediria a coleta por um alvo que ela
  // nunca teve.
  const com = acompanhados.filter((c) => c.tem_cotacao).length;
  const fora = total - acompanhados.length;
  const visiveis = (cotacoes ?? []).filter((c) =>
    filtro === "todas" ? true : filtro === "acompanhados" ? c.acompanhado : !c.acompanhado,
  );

  return (
    <Cartao
      id="tickers"
      icone={<IconeEtiqueta />}
      titulo="Tickers acompanhados"
      nota={
        `O que é coletado é a CARTEIRA ∪ VIGIADOS, não a lista de cadastro: ` +
        `um ativo só cadastrado aparece aqui e nunca terá preço até entrar na ` +
        `watchlist. A janela de frescor da avaliação é de ${janela}h` +
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
              {numero(com)} de {numero(acompanhados.length)}
            </strong>{" "}
            {acompanhados.length === 1 ? "ticker acompanhado" : "tickers acompanhados"}{" "}
            com cotação utilizável
            {com < acompanhados.length && (
              <>
                {" "}
                — {numero(acompanhados.length - com)} sem preço, o que é falha de
                coleta.
              </>
            )}
            {fora > 0 && (
              <>
                {" "}
                Outros <strong>{numero(fora)}</strong> estão apenas cadastrados e{" "}
                <em>não são coletados</em>: entram na leitura do dia só depois de
                virarem posição ou entrarem na watchlist.
              </>
            )}
          </p>

          {/*
            Universo vazio é o caso em que a leitura do dia não tem sobre o
            que falar. É diferente de "nada foi sugerido hoje", e sem esta
            linha as duas situações chegam à tela iguais.
          */}
          {acompanhados.length === 0 && (
            <p className="aviso aviso--obsoleto" role="note">
              <IconeAlerta className="aviso__icone" />
              <span>
                <strong>Nenhum ticker no universo de coleta.</strong> Sem posição
                aberta em ação e sem watchlist, os ETLs não têm o que buscar e a
                leitura do dia sai vazia. Vigie um ativo na Watchlist para
                acompanhá-lo.
              </span>
            </p>
          )}
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
