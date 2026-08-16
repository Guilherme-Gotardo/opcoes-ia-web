/** O que estou operando, e o que registro. */
import { usePainelDaTela } from "../lib/telas";
import { Cadastro } from "../modulos/Cadastro";
import { Operacoes as ModuloOperacoes } from "../modulos/Operacoes";

export function OperacoesPagina() {
  const painel = usePainelDaTela();
  const primeiraCarga = painel.carregando && painel.buscadoEm == null;

  return (
    <>
      <ModuloOperacoes
        operacoes={primeiraCarga ? null : painel.operacoes.dado}
        erro={painel.operacoes.erro}
      />
      <Cadastro
        ativos={primeiraCarga ? null : painel.ativos.dado}
        posicoes={primeiraCarga ? null : painel.posicoesAbertas.dado}
        erro={painel.ativos.erro ?? painel.posicoesAbertas.erro}
        aoMudar={painel.atualizar}
      />
    </>
  );
}
