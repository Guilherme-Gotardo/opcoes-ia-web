/**
 * Opções: as operações e as posições lançadas.
 *
 * Separada de ações porque são grandezas diferentes — quantidade aqui é
 * contrato lançado e "preço" é prêmio recebido — e porque estas posições
 * NÃO entram no patrimônio: o valor delas deriva das mesmas ações já
 * contadas, e somar seria contagem dupla.
 */
import { usePainelDaTela } from "../lib/telas";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { IconeAlerta } from "../componentes/Icones";
import { Cadastro } from "../modulos/Cadastro";
import { Caixa } from "../modulos/Caixa";
import { Investimentos } from "../modulos/Investimentos";
import { Operacoes } from "../modulos/Operacoes";

export function Opcoes() {
  const painel = usePainelDaTela();
  const carteira = painel.carteira.dado;
  const primeiraCarga = painel.carregando && painel.buscadoEm == null;

  return (
    <>
      <Operacoes
        operacoes={primeiraCarga ? null : painel.operacoes.dado}
        erro={painel.operacoes.erro}
      />

      {carteira && !painel.carteira.erro ? (
        <Investimentos carteira={carteira} tipo="OPCAO" />
      ) : painel.carteira.erro ? (
        <Cartao icone={<IconeAlerta />} titulo="Posições indisponíveis">
          <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler a carteira">
            {painel.carteira.erro}
          </Estado>
        </Cartao>
      ) : null}

      <Cadastro
        tipo="OPCAO"
        ativos={primeiraCarga ? null : painel.ativos.dado}
        posicoes={primeiraCarga ? null : painel.posicoesAbertas.dado}
        erro={painel.ativos.erro ?? painel.posicoesAbertas.erro}
        aoMudar={painel.atualizar}
      />

      {/* Caixa vive aqui porque é o que torna uma PUT coberta: sem
          garantia, a avaliação recusa a operação. */}
      <Caixa
        caixa={primeiraCarga ? null : painel.caixa.dado}
        erro={painel.caixa.erro}
        aoMudar={painel.atualizar}
      />
    </>
  );
}
