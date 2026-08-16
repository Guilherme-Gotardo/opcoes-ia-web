/**
 * Ações: as posições que formam o patrimônio, e como registrá-las.
 *
 * O cadastro de ATIVO mora aqui e não na tela de opções porque `ativos`
 * guarda ação, FII e BDR — o código de uma opção não é linha lá, e nunca
 * será: `posicoes.ticker` de uma opção guarda o código, que não tem
 * cadastro próprio.
 */
import { usePainelDaTela } from "../lib/telas";
import { Cartao } from "../componentes/Cartao";
import { Esqueleto, Estado } from "../componentes/Estado";
import { IconeAlerta } from "../componentes/Icones";
import { Cadastro } from "../modulos/Cadastro";
import { Investimentos } from "../modulos/Investimentos";

export function Acoes() {
  const painel = usePainelDaTela();
  const carteira = painel.carteira.dado;
  const primeiraCarga = painel.carregando && painel.buscadoEm == null;

  return (
    <>
      {primeiraCarga ? (
        <Cartao titulo="Carregando posições">
          <Esqueleto linhas={4} />
        </Cartao>
      ) : painel.carteira.erro || !carteira ? (
        <Cartao icone={<IconeAlerta />} titulo="Carteira indisponível">
          <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler a carteira">
            {painel.carteira.erro}
          </Estado>
        </Cartao>
      ) : (
        <Investimentos carteira={carteira} tipo="ACAO" />
      )}

      <Cadastro
        tipo="ACAO"
        comCadastroDeAtivo
        ativos={primeiraCarga ? null : painel.ativos.dado}
        posicoes={primeiraCarga ? null : painel.posicoesAbertas.dado}
        erro={painel.ativos.erro ?? painel.posicoesAbertas.erro}
        aoMudar={painel.atualizar}
      />
    </>
  );
}
