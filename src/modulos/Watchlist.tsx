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
  IconeEtiqueta,
  IconeInfo,
  IconeOk,
  IconeX,
} from "../componentes/Icones";
import { numero, pct } from "../lib/formato";

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
  const candidatos = (ativos ?? []).filter((a) => !vigiados.includes(a.ticker));

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
        <>
          <form className="form form--linha" onSubmit={adicionar}>
            <label className="form__campo form__campo--largo">
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
                  </option>
                ))}
              </select>
              {candidatos.length === 0 && (
                <span className="form__ajuda">
                  Todos os ativos cadastrados já estão vigiados. Cadastre um novo
                  ativo acima para vigiá-lo.
                </span>
              )}
            </label>

            <label className="form__campo form__campo--largo">
              <span>
                Motivo <span className="form__opcional">recomendado</span>
              </span>
              <input
                className="campo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="liquidez alta em opções; quero comprar abaixo de 30"
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

          {vigiados.length === 0 ? (
            <Estado icone={<IconeEtiqueta />} titulo="Nenhuma ação vigiada">
              Sem watchlist, a análise só olha o que você já tem — e lançar put é
              justamente sobre ativos que você aceitaria comprar.
            </Estado>
          ) : (
            <ul className="vigiados">
              {vigiados.map((t) => (
                <li key={t}>
                  <span className="tabela__ticker">{t}</span>
                  <button
                    type="button"
                    className="botao botao--discreto"
                    onClick={() => remover(t)}
                    disabled={removendo === t}
                  >
                    <IconeX />
                    {removendo === t ? "Removendo…" : "Parar de vigiar"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/*
            O orçamento não é detalhe de infraestrutura: é o que limita o
            tamanho da watchlist, e descobri-lo tarde significa a coleta da
            carteira falhando no fim do dia.
          */}
          <div className="orcamento">
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
        </>
      )}
    </Cartao>
  );
}
