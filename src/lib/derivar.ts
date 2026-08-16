/**
 * Números derivados da carteira.
 *
 * Aqui só há ARITMÉTICA sobre o que a API devolveu — soma, subtração,
 * razão. Nenhum critério de estratégia mora aqui, e nenhum deve: eles são
 * determinísticos e vivem em `src/strategy/` no repositório principal.
 *
 * A regra que molda este arquivo: resultado só compara o que é comparável.
 * Posição sem cotação entra no custo, mas fica FORA do resultado — senão o
 * ganho apareceria calculado contra um valor de mercado que não existe. O
 * custo total (todas as posições) e o custo das posições com cotação são
 * expostos separados justamente para que a tela possa mostrar os dois e não
 * disfarçar a diferença.
 */
import type { Carteira, Posicao } from "../api/client";

export type ResultadoPosicao = {
  custo: number;
  valor: number;
  ganho: number;
  /** Null quando o custo não é base válida para razão (zero ou vendido). */
  pct: number | null;
};

/** Null quando a posição não tem cotação — não há resultado a apurar. */
export function resultadoDaPosicao(p: Posicao): ResultadoPosicao | null {
  if (p.preco_mercado == null || p.valor == null) return null;
  const custo = p.quantidade * p.preco_medio;
  const ganho = p.valor - custo;
  return { custo, valor: p.valor, ganho, pct: custo > 0 ? (ganho / custo) * 100 : null };
}

export type Metricas = {
  /** Custo de TODAS as posições, inclusive as sem cotação. */
  custoTotal: number;
  /** Custo apenas das posições que entraram no patrimônio a mercado. */
  custoComCotacao: number;
  /** Igual a `total_patrimonio`: soma dos valores a mercado disponíveis. */
  valorComCotacao: number;
  /** Null quando nenhuma posição tem cotação. */
  resultado: number | null;
  resultadoPct: number | null;
  posicoes: number;
  comCotacao: number;
  semCotacao: number;
  /** Percentual do maior ativo-objeto — leitura de concentração. */
  maiorExposicao: { ativo: string; pct: number } | null;
  ativosObjeto: number;
};

/**
 * `tipo` restringe a apuração a uma classe de ativo.
 *
 * Sem ele, custo e resultado somavam ação com opção — grandezas que não se
 * somam. O prêmio de uma opção LANÇADA entra com quantidade negativa, então
 * ele era SUBTRAÍDO do custo das ações, e o total aparecia menor do que é.
 * E as opções, que não têm cotação enquanto o ETL está bloqueado, entravam
 * na contagem de "posições sem cotação" — um aviso sobre ações que na
 * verdade falava de opções.
 *
 * O patrimônio já é só de ações no backend (o valor da opção deriva das
 * mesmas ações, e somar seria contagem dupla); esta função passa a
 * acompanhar essa decisão em vez de contrariá-la.
 */
export function metricas(
  carteira: Carteira,
  tipo?: "ACAO" | "OPCAO",
): Metricas {
  const posicoesDoTipo = tipo
    ? carteira.posicoes.filter((p) => p.tipo_ativo === tipo)
    : carteira.posicoes;

  let custoTotal = 0;
  let custoComCotacao = 0;
  let valorComCotacao = 0;
  let comCotacao = 0;

  for (const p of posicoesDoTipo) {
    const custo = p.quantidade * p.preco_medio;
    custoTotal += custo;

    const r = resultadoDaPosicao(p);
    if (r) {
      custoComCotacao += r.custo;
      valorComCotacao += r.valor;
      comCotacao += 1;
    }
  }

  const resultado = comCotacao > 0 ? valorComCotacao - custoComCotacao : null;

  const exposicoes = Object.entries(carteira.exposicao_pct_por_ativo);
  const maior = exposicoes.reduce<{ ativo: string; pct: number } | null>(
    (topo, [ativo, pct]) => (topo == null || pct > topo.pct ? { ativo, pct } : topo),
    null,
  );

  return {
    custoTotal,
    custoComCotacao,
    valorComCotacao,
    resultado,
    resultadoPct:
      resultado != null && custoComCotacao > 0
        ? (resultado / custoComCotacao) * 100
        : null,
    posicoes: posicoesDoTipo.length,
    comCotacao,
    semCotacao: posicoesDoTipo.length - comCotacao,
    maiorExposicao: maior,
    ativosObjeto: exposicoes.length,
  };
}

/** Exposições ordenadas da maior para a menor — ordem de leitura de um ranking. */
export function exposicoesOrdenadas(
  carteira: Carteira,
): { ativo: string; pct: number }[] {
  return Object.entries(carteira.exposicao_pct_por_ativo)
    .map(([ativo, pct]) => ({ ativo, pct }))
    .sort((a, b) => b.pct - a.pct);
}

/**
 * Janela de frescor usada quando `/parametros` não respondeu.
 *
 * A fonte da verdade é `cotacao_frescor_maximo_horas`, que a API publica —
 * este número existe só para a tela não ficar sem escala se aquele recurso
 * falhar, e quem usa deve dizer que está no padrão. Antes disso a constante
 * era uma cópia silenciosa do valor do backend: mudá-lo lá não mudava nada
 * aqui e a tela passava a mentir sem avisar.
 */
export const FRESCOR_PADRAO_HORAS = 72;

/**
 * Frescor da cotação — leitura de apresentação, não critério. Nada aqui
 * decide se a cotação é utilizável: `tem_cotacao` já é a resposta da API.
 *
 * `janelaHoras` é o limite que dá SIGNIFICADO a "obsoleta": não é "parece
 * velho", é "passou da janela em que a avaliação aceita o preço".
 */
export type Frescor = "recente" | "do-dia" | "na-janela" | "obsoleta" | "ausente";

export function frescor(
  horas: number | null,
  janelaHoras: number = FRESCOR_PADRAO_HORAS,
): Frescor {
  if (horas == null) return "ausente";
  if (horas < 1) return "recente";
  if (horas < 24 && horas < janelaHoras) return "do-dia";
  if (horas < janelaHoras) return "na-janela";
  return "obsoleta";
}
