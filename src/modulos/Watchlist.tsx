/**
 * Watchlist — ações vigiadas sem ter posição.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * Até a migração 006 o universo de análise era a CARTEIRA: os ETLs e a
 * avaliação partiam de posições abertas. Correto para venda coberta —
 * "coberta" quer dizer que as ações já são suas — e fechado para a
 * pergunta oposta: em que ativo que eu AINDA NÃO tenho vale lançar uma
 * put? Vigiar é o que abre essa porta.
 *
 * VIGIAR TEM CUSTO, E O CUSTO FICA NA TELA
 * ----------------------------------------
 * Cada vigiado consome requests do orçamento diário. O teto aparece junto
 * da lista de propósito: sem ele, o limite só apareceria no dia em que a
 * coleta da carteira falhasse no fim do orçamento — e ninguém ligaria uma
 * coisa à outra.
 *
 * VIGIAR NÃO CADASTRA
 * -------------------
 * Só entra na watchlist o que já está em `ativos`. Cadastrar aqui exigiria
 * inventar o nome do ativo, o que a regra 1 do projeto proíbe — por isso o
 * campo é um select do que existe, com o cadastro ao lado na mesma tela.
 */
import { useCallback, useState } from "react";
import { api, type Ativo, type Watchlist as WatchlistDado } from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import {
  IconeAlerta,
  IconeCarteira,
  IconeEtiqueta,
  IconeInfo,
  IconeOk,
  IconeX,
} from "../componentes/Icones";
import { data, numero, pct } from "../lib/formato";

type Props = {
  watchlist: WatchlistDado | null;
  ativos: Ativo[] | null;
  erro: string | null;
  aoMudar: () => void;
};

type Aviso = { tom: "ok" | "erro"; texto: string } | null;

export function Watchlist({ watchlist, ativos, erro, aoMudar }: Props) {
  const [ticker, setTicker] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const vigiados = watchlist?.vigiados ?? [];
  const universo = watchlist?.universo ?? [];
  const teto = watchlist?.tickers_suportados ?? 0;
  const usoPct = teto > 0 ? Math.min(100, (universo.length / teto) * 100) : 0;
  const apertado = usoPct >= 80;

  // Só oferece o que ainda não está sendo vigiado — repetir o que já está
  // na lista só produziria um "já vigiado" evitável.
  const jaVigiados = new Set(vigiados.map((v) => v.ticker));
  const candidatos = (ativos ?? []).filter((a) => !jaVigiados.has(a.ticker));
  // Candidato que já está no universo sem estar vigiado só pode ter entrado
  // pela carteira. Vigiá-lo registra a intenção e o motivo, mas não
  // acrescenta ticker à coleta nem consome orçamento novo — dizer isso no
  // rótulo é mais barato que descobrir depois que a barra não se moveu.
  const noUniverso = new Set(universo);

  const adicionar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEnviando(true);
      setAviso(null);
      try {
        await api.vigiar(ticker, motivo.trim() === "" ? null : motivo);
        setAviso({ tom: "ok", texto: `${ticker.toUpperCase()} entrou na watchlist.` });
        setTicker("");
        setMotivo("");
        aoMudar();
      } catch (err) {
        setAviso({ tom: "erro", texto: err instanceof Error ? err.message : String(err) });
      } finally {
        setEnviando(false);
      }
    },
    [ticker, motivo, aoMudar],
  );

  const remover = useCallback(
    async (t: string) => {
      setRemovendo(t);
      setAviso(null);
      try {
        await api.pararDeVigiar(t);
        setAviso({ tom: "ok", texto: `${t} saiu da watchlist (segue cadastrado).` });
        aoMudar();
      } catch (err) {
        setAviso({ tom: "erro", texto: err instanceof Error ? err.message : String(err) });
      } finally {
        setRemovendo(null);
      }
    },
    [aoMudar],
  );

  return (
    <Cartao
      id="watchlist"
      icone={<IconeEtiqueta />}
      titulo="Watchlist"
      nota="Ações vigiadas para procurar oportunidade de lançamento de put — sem precisar ter posição nelas."
      acoes={
        watchlist && (
          <Selo tom={apertado ? "obsoleto" : "neutro"}>
            {numero(universo.length)} de {numero(teto)} no orçamento
          </Selo>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler a watchlist">
          {erro}
        </Estado>
      ) : watchlist == null ? (
        <Estado titulo="Carregando…" />
      ) : (
        /*
          `pilha` separa os blocos internos. Sem ela o formulário encostava
          na lista, e a lista no orçamento: três assuntos diferentes lidos
          como um só parágrafo visual.
        */
        <div className="pilha">
          <div className="bloco">
            <form className="form form--linha" onSubmit={adicionar}>
              <label className="form__campo">
                <span>Vigiar ação</span>
                <select
                  className="campo"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  required
                >
                  <option value="">Selecione um ativo cadastrado…</option>
                  {candidatos.map((a) => (
                    <option key={a.ticker} value={a.ticker}>
                      {a.ticker} — {a.nome}
                      {noUniverso.has(a.ticker) && " (já em carteira)"}
                    </option>
                  ))}
                </select>
                <span className="form__ajuda">
                  {candidatos.length === 0
                    ? "Todos os ativos cadastrados já estão vigiados — cadastre um novo ativo para vigiá-lo."
                    : "Só entra o que já está cadastrado: vigiar não cria ativo."}
                </span>
              </label>

              <label className="form__campo">
                <span>
                  Motivo <span className="form__opcional">recomendado</span>
                </span>
                <input
                  className="campo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="liquidez alta em opções"
                />
                <span className="form__ajuda">
                  Por que este ticker entrou — a pergunta que aparece meses depois.
                </span>
              </label>

              <div className="form__acoes">
                <button
                  className="botao botao--primario"
                  type="submit"
                  disabled={enviando || ticker === ""}
                >
                  {enviando ? "Adicionando…" : "Vigiar"}
                </button>
              </div>
            </form>

            {aviso && (
              <p className={`form__aviso form__aviso--${aviso.tom}`} role="status">
                {aviso.tom === "ok" ? <IconeOk /> : <IconeAlerta />}
                <span>{aviso.texto}</span>
              </p>
            )}
          </div>

          <div className="bloco">
            <h3 className="bloco__titulo">
              Ações vigiadas
              {vigiados.length > 0 && (
                <span className="bloco__contagem">{numero(vigiados.length)}</span>
              )}
            </h3>
            {vigiados.length === 0 ? (
              <Estado icone={<IconeEtiqueta />} titulo="Nenhuma ação vigiada">
                Sem watchlist, a coleta e a leitura do dia só alcançam o que você
                já tem em carteira — e lançar put é justamente sobre ativos que
                você aceitaria comprar.
              </Estado>
            ) : (
              <ul className="vigiados">
                {vigiados.map((v) => (
                  <li key={v.ticker}>
                    <div className="vigiados__id">
                      <span className="tabela__ticker">{v.ticker}</span>
                      {v.em_carteira && (
                        <Selo tom="neutro" icone={<IconeCarteira />}>
                          já em carteira
                        </Selo>
                      )}
                    </div>
                    <p className="vigiados__nome">{v.nome}</p>
                    {/*
                      O motivo era gravado e nunca mostrado: a tela pedia a
                      resposta e depois escondia justamente a pergunta que
                      ela existe para responder.
                    */}
                    <p className="vigiados__motivo">
                      {v.motivo || <em>sem motivo registrado</em>}
                    </p>
                    <div className="vigiados__rodape">
                      <span className="vigiados__desde">
                        {v.desde ? `vigiado desde ${data(v.desde)}` : "sem data"}
                      </span>
                      <button
                        type="button"
                        className="botao botao--discreto"
                        onClick={() => remover(v.ticker)}
                        disabled={removendo === v.ticker}
                      >
                        <IconeX />
                        {removendo === v.ticker ? "Removendo…" : "Parar de vigiar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/*
            O orçamento não é detalhe de infraestrutura: é o que limita o
            tamanho da watchlist, e descobri-lo tarde significa a coleta da
            carteira falhando no fim do dia.
          */}
          <div className="bloco orcamento">
            <div className="orcamento__topo">
              <span className="orcamento__rotulo">Universo coletado por dia</span>
              <span className="orcamento__numeros">
                <span className="orcamento__gasto">{numero(universo.length)}</span>
                <span className="orcamento__limite"> / {numero(teto)}</span>
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
              <IconeInfo className="rodape__icone rodape__icone--neutro" /> Carteira
              ∪ vigiados, a {numero(watchlist.requests_por_ticker_dia)} requests por
              ticker ao dia ({pct(usoPct, 0)} de {numero(watchlist.orcamento_diario)}
              ). Ativo em carteira entra mesmo sem estar vigiado — senão parar de
              vigiar deixaria a posição sem preço.
            </p>
          </div>
        </div>
      )}
    </Cartao>
  );
}
