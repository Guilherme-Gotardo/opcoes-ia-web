/**
 * Carrega todos os recursos do painel de uma vez.
 *
 * Cada recurso carrega o próprio erro. Isso é deliberado: se `/desfecho`
 * falhar, a carteira continua na tela e só o módulo de acompanhamento avisa
 * que está sem dado. Um `Promise.all` faria o inverso — a falha mais boba
 * apagaria a tela inteira.
 *
 * Só quando TODOS falham a tela conclui que a API está fora, porque aí a
 * causa provável é a única que o usuário pode resolver: a API não está no ar.
 */
import { useCallback, useEffect, useState } from "react";
import {
  api,
  type Carteira,
  type Cotacao,
  type Desfecho,
  type Enriquecimento,
  type Ativo,
  type Caixa,
  type Operacoes,
  type SaudeColeta,
  type Parametros,
  type PosicaoAberta,
  type Resultados,
  type Watchlist,
  type Sugestao,
} from "./client";

export type Recurso<T> = {
  dado: T | null;
  erro: string | null;
};

const vazio = <T,>(): Recurso<T> => ({ dado: null, erro: null });

async function resolver<T>(p: Promise<T>): Promise<Recurso<T>> {
  try {
    return { dado: await p, erro: null };
  } catch (e) {
    return { dado: null, erro: e instanceof Error ? e.message : String(e) };
  }
}

export type Painel = {
  carteira: Recurso<Carteira>;
  cotacoes: Recurso<Cotacao[]>;
  sugestoes: Recurso<Sugestao[]>;
  desfecho: Recurso<Desfecho>;
  resultados: Recurso<Resultados>;
  saudeColeta: Recurso<SaudeColeta>;
  operacoes: Recurso<Operacoes>;
  parametros: Recurso<Parametros>;
  ativos: Recurso<Ativo[]>;
  watchlist: Recurso<Watchlist>;
  caixa: Recurso<Caixa>;
  enriquecimento: Recurso<Enriquecimento>;
  posicoesAbertas: Recurso<PosicaoAberta[]>;
  /** Quando a tela buscou — não quando o dado foi coletado na origem. */
  buscadoEm: Date | null;
  carregando: boolean;
  /** Todos os recursos falharam: a API provavelmente não está no ar. */
  apiFora: boolean;
  atualizar: () => void;
};

export function usePainel(): Painel {
  const [carteira, setCarteira] = useState<Recurso<Carteira>>(vazio);
  const [cotacoes, setCotacoes] = useState<Recurso<Cotacao[]>>(vazio);
  const [sugestoes, setSugestoes] = useState<Recurso<Sugestao[]>>(vazio);
  const [desfecho, setDesfecho] = useState<Recurso<Desfecho>>(vazio);
  const [resultados, setResultados] = useState<Recurso<Resultados>>(vazio);
  const [saudeColeta, setSaudeColeta] = useState<Recurso<SaudeColeta>>(vazio);
  const [operacoes, setOperacoes] = useState<Recurso<Operacoes>>(vazio);
  const [parametros, setParametros] = useState<Recurso<Parametros>>(vazio);
  const [ativos, setAtivos] = useState<Recurso<Ativo[]>>(vazio);
  const [watchlist, setWatchlist] = useState<Recurso<Watchlist>>(vazio);
  const [caixa, setCaixa] = useState<Recurso<Caixa>>(vazio);
  const [enriquecimento, setEnriquecimento] = useState<Recurso<Enriquecimento>>(vazio);
  const [posicoesAbertas, setPosicoesAbertas] = useState<Recurso<PosicaoAberta[]>>(vazio);
  const [buscadoEm, setBuscadoEm] = useState<Date | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizar = useCallback(() => {
    let cancelado = false;
    setCarregando(true);

    void Promise.all([
      resolver(api.carteira()),
      resolver(api.cotacoes()),
      resolver(api.sugestoes()),
      resolver(api.desfecho()),
      resolver(api.resultados()),
      resolver(api.saudeColeta()),
      resolver(api.operacoes()),
      resolver(api.parametros()),
      resolver(api.ativos()),
      resolver(api.posicoes()),
      resolver(api.watchlist()),
      resolver(api.caixa()),
      resolver(api.enriquecimento()),
    ]).then(([c, q, s, d, r, o, ops, p, at, pa, wl, cx, en]) => {
      if (cancelado) return;
      setCarteira(c);
      setCotacoes(q);
      setSugestoes(s);
      setDesfecho(d);
      setResultados(r);
      setSaudeColeta(o);
      setOperacoes(ops);
      setParametros(p);
      setAtivos(at);
      setPosicoesAbertas(pa);
      setWatchlist(wl);
      setCaixa(cx);
      setEnriquecimento(en);
      setBuscadoEm(new Date());
      setCarregando(false);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => atualizar(), [atualizar]);

  return {
    carteira,
    cotacoes,
    sugestoes,
    desfecho,
    resultados,
    saudeColeta,
    operacoes,
    parametros,
    ativos,
    posicoesAbertas,
    watchlist,
    caixa,
    enriquecimento,
    buscadoEm,
    carregando,
    apiFora:
      buscadoEm != null &&
      [carteira, cotacoes, sugestoes, desfecho, resultados, saudeColeta,
       operacoes, parametros, ativos, posicoesAbertas, watchlist,
       caixa, enriquecimento].every((r) => r.erro != null),
    atualizar,
  };
}
