/** O que o sistema sugere, por que sugeriu, e o que pode travar a próxima. */
import { usePainelDaTela } from "../lib/telas";
import { Acompanhamento } from "../modulos/Acompanhamento";
import { Recomendacoes } from "../modulos/Recomendacoes";
import { Resultados } from "../modulos/Resultados";

export function Estrategia() {
  const painel = usePainelDaTela();
  const primeiraCarga = painel.carregando && painel.buscadoEm == null;

  return (
    <>
      <Recomendacoes
        sugestoes={primeiraCarga ? null : painel.sugestoes.dado}
        erro={painel.sugestoes.erro}
      />
      <Acompanhamento
        desfecho={primeiraCarga ? null : painel.desfecho.dado}
        erro={painel.desfecho.erro}
      />
      <Resultados
        resultados={primeiraCarga ? null : painel.resultados.dado}
        erro={painel.resultados.erro}
      />
    </>
  );
}
