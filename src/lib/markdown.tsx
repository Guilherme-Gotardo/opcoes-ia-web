/**
 * Renderizador mínimo de markdown, para o relatório do agente.
 *
 * POR QUE NÃO UMA BIBLIOTECA
 * --------------------------
 * O subconjunto que o prompt pede é pequeno e fechado: parágrafo, `##`,
 * `###`, lista com `-`, negrito e código inline. Uma biblioteca de markdown
 * traria dezenas de kB para cobrir tabelas, HTML embutido e referências que
 * este texto nunca vai ter.
 *
 * POR QUE NÃO `dangerouslySetInnerHTML`
 * -------------------------------------
 * Este é o único texto da interface que vem de um modelo de linguagem, e
 * modelo lê insumo que passou por busca web. Injetar HTML cru seria abrir
 * XSS num caminho que atravessa conteúdo de terceiros. Aqui o texto vira
 * ELEMENTOS React: o que não for reconhecido pela gramática abaixo aparece
 * como texto literal, nunca como marcação.
 *
 * O que a gramática não cobre sai como texto normal, o que é o degradar
 * certo — pior seria sumir da tela.
 */
import type { ReactNode } from "react";

/** Quebra uma linha em pedaços de texto, negrito e código inline. */
function inline(texto: string, chave: string): ReactNode[] {
  const pedacos: ReactNode[] = [];
  // Uma varredura só, alternando entre os dois marcadores. `[\s\S]` em vez
  // de `.` porque o conteúdo pode conter quebra de linha.
  const regex = /(\*\*[\s\S]+?\*\*|`[^`]+?`)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = regex.exec(texto)) !== null) {
    if (m.index > ultimo) pedacos.push(texto.slice(ultimo, m.index));
    const bruto = m[0];
    if (bruto.startsWith("**")) {
      pedacos.push(<strong key={`${chave}-b${i}`}>{bruto.slice(2, -2)}</strong>);
    } else {
      pedacos.push(<code key={`${chave}-c${i}`}>{bruto.slice(1, -1)}</code>);
    }
    ultimo = m.index + bruto.length;
    i += 1;
  }
  if (ultimo < texto.length) pedacos.push(texto.slice(ultimo));
  return pedacos;
}

/**
 * Converte markdown no subconjunto suportado para elementos React.
 *
 * Não começa em `<h1>`: o cartão já tem título, e um h1 no corpo quebraria
 * a hierarquia de cabeçalhos da página para leitor de tela.
 */
export function renderizarMarkdown(texto: string): ReactNode[] {
  const saida: ReactNode[] = [];
  const linhas = texto.split("\n");
  let itens: string[] = [];
  let paragrafo: string[] = [];

  const fecharLista = () => {
    if (itens.length === 0) return;
    saida.push(
      <ul key={`ul-${saida.length}`}>
        {itens.map((t, i) => (
          <li key={i}>{inline(t, `li-${saida.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    itens = [];
  };

  const fecharParagrafo = () => {
    if (paragrafo.length === 0) return;
    const t = paragrafo.join(" ");
    saida.push(<p key={`p-${saida.length}`}>{inline(t, `p-${saida.length}`)}</p>);
    paragrafo = [];
  };

  const fecharTudo = () => {
    fecharParagrafo();
    fecharLista();
  };

  for (const linha of linhas) {
    const l = linha.trim();

    if (l === "") {
      fecharTudo();
      continue;
    }
    // `###` antes de `##`: a verificação mais específica primeiro, senão
    // "### x" casaria como `##` e sobraria um "#" no texto.
    if (l.startsWith("### ")) {
      fecharTudo();
      saida.push(<h4 key={`h-${saida.length}`}>{inline(l.slice(4), `h${saida.length}`)}</h4>);
      continue;
    }
    if (l.startsWith("## ")) {
      fecharTudo();
      saida.push(<h3 key={`h-${saida.length}`}>{inline(l.slice(3), `h${saida.length}`)}</h3>);
      continue;
    }
    if (l.startsWith("# ")) {
      // O prompt pede para não usar h1, mas se vier, vira h3 — nunca some.
      fecharTudo();
      saida.push(<h3 key={`h-${saida.length}`}>{inline(l.slice(2), `h${saida.length}`)}</h3>);
      continue;
    }
    if (l.startsWith("- ") || l.startsWith("* ")) {
      fecharParagrafo();
      itens.push(l.slice(2));
      continue;
    }
    fecharLista();
    paragrafo.push(l);
  }
  fecharTudo();
  return saida;
}
