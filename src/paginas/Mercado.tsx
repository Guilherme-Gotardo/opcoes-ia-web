/** Como o preço se move, o que está sendo observado e se a coleta está de pé. */
import { usePainelDaTela } from "../lib/telas";
import { Automacao } from "../modulos/Automacao";
import { Cotacoes } from "../modulos/Cotacoes";
import { Grafico } from "../modulos/Grafico";
import { SaudeColeta } from "../modulos/SaudeColeta";

export function Mercado() {
  const painel = usePainelDaTela();
  const primeiraCarga = painel.carregando && painel.buscadoEm == null;

  return (
    <>
      <Grafico carteira={painel.carteira.dado} />
      <Cotacoes
        cotacoes={primeiraCarga ? null : painel.cotacoes.dado}
        erro={painel.cotacoes.erro}
        janelaHoras={painel.parametros.dado?.cotacao_frescor_maximo_horas ?? null}
      />
      <SaudeColeta
        saude={primeiraCarga ? null : painel.saudeColeta.dado}
        erro={painel.saudeColeta.erro}
      />
      {/* Depois da saúde da coleta de propósito: quem abre esta tela quer
          primeiro saber se HÁ dado, e só então se o pipeline que o consome
          rodou. A ordem inversa mostraria "não rodou hoje" antes de dizer
          que a coleta também não entregou nada. */}
      <Automacao
        automacao={primeiraCarga ? null : painel.saudeColeta.dado?.automacao}
        erro={painel.saudeColeta.erro}
      />
    </>
  );
}
