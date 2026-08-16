/**
 * Marca no menu a seção que está sendo lida.
 *
 * A regra é a de qualquer sumário: **a seção ativa é a última cujo topo já
 * passou da linha de leitura.** Seções abaixo da linha ainda não começaram e
 * não competem.
 *
 * Isso substitui uma tentativa anterior com IntersectionObserver que escolhia,
 * entre as seções visíveis, a de menor `top`. Parecia razoável e estava
 * errado: uma seção longa quase toda rolada para cima tem `top` bem negativo,
 * então ela vencia a seção que o leitor tinha acabado de alcançar — na
 * prática, o menu ficava preso em "Acompanhamento" enquanto se lia
 * "Resultados". Comparar posição contra uma linha fixa não tem esse modo de
 * falha, e é trivial de conferir a olho.
 *
 * O fim da página é caso especial declarado: a última seção pode ser curta
 * demais para o topo dela alcançar a linha, e sem isso ela nunca ficaria
 * ativa por mais que se rolasse.
 */
import { useEffect, useState } from "react";

/** Distância do topo da viewport que conta como "onde a leitura está". */
export const LINHA_DE_LEITURA = 140;

/**
 * A decisão, isolada do DOM para poder ser conferida com uma lista de
 * números em vez de uma captura de tela.
 *
 * `tops` é a posição de cada seção relativa à viewport, na ordem da página.
 */
export function escolherSecao(
  tops: { id: string; top: number }[],
  noFim: boolean,
  linha: number = LINHA_DE_LEITURA,
): string | null {
  if (tops.length === 0) return null;
  if (noFim) return tops[tops.length - 1].id;

  let atual = tops[0].id;
  for (const { id, top } of tops) {
    if (top <= linha) atual = id;
  }
  return atual;
}

export function useSecaoAtiva(ids: string[]): string | null {
  const [ativa, setAtiva] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    let agendado = 0;

    const calcular = () => {
      agendado = 0;

      const tops = ids
        .map((id) => ({ id, el: document.getElementById(id) }))
        .filter((x): x is { id: string; el: HTMLElement } => x.el != null)
        .map(({ id, el }) => ({ id, top: el.getBoundingClientRect().top }));

      const noFim =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;

      setAtiva(escolherSecao(tops, noFim));
    };

    // rAF em vez de rodar a cada evento: o scroll dispara dezenas de vezes
    // por segundo e a conta só precisa acontecer uma vez por quadro.
    const agendar = () => {
      if (agendado === 0) agendado = requestAnimationFrame(calcular);
    };

    calcular();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      if (agendado !== 0) cancelAnimationFrame(agendado);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, [ids]);

  return ativa;
}
