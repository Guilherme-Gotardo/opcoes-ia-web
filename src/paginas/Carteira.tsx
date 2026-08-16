/**
 * Visão consolidada: quanto vale a carteira e onde está concentrada.
 *
 * As posições, uma a uma, moram nas telas de Ações e Opções — aqui fica só
 * o que atravessa as duas classes.
 */
import { usePainelDaTela } from "../lib/telas";
import { Cartao } from "../componentes/Cartao";
import { Esqueleto, Estado } from "../componentes/Estado";
import { IconeAlerta, IconeX } from "../componentes/Icones";
import { Exposicao } from "../modulos/Exposicao";
import { Patrimonio } from "../modulos/Patrimonio";

export function Carteira() {
  const painel = usePainelDaTela();
  const carteira = painel.carteira.dado;
  const primeiraCarga = painel.carregando && painel.buscadoEm == null;

  if (painel.apiFora) {
    return (
      <Cartao
        icone={<IconeAlerta />}
        titulo="Sem contato com a API"
        nota="Todos os endpoints falharam — o problema é a conexão, não o dado."
      >
        <Estado tom="erro" icone={<IconeX />} titulo="A API do opcoes-ia não respondeu">
          <p>Suba a API no repositório principal e atualize esta página:</p>
          <pre className="bloco">python -m src.api</pre>
          <p className="estado__detalhe">{painel.carteira.erro}</p>
        </Estado>
      </Cartao>
    );
  }

  if (primeiraCarga) {
    return (
      <Cartao titulo="Carregando carteira">
        <Esqueleto linhas={4} />
      </Cartao>
    );
  }

  if (painel.carteira.erro || !carteira) {
    return (
      <Cartao icone={<IconeAlerta />} titulo="Carteira indisponível">
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler a carteira">
          {painel.carteira.erro}
        </Estado>
      </Cartao>
    );
  }

  return (
    <>
      <Patrimonio
        carteira={carteira}
        executadoEm={painel.desfecho.dado?.executado_em ?? null}
      />
      <Exposicao carteira={carteira} />
    </>
  );
}
