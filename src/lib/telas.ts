/**
 * As telas do painel e o acesso aos dados dentro delas.
 *
 * Fica fora de `App.tsx` porque exportar constante e hook junto com o
 * componente quebra o fast refresh do Vite — o arquivo deixa de ser
 * recarregável isoladamente.
 */
import type { Painel } from "../api/usePainel";
import {
  IconeBussola,
  IconeCarteira,
  IconeGrafico,
  IconeRelogio,
} from "../componentes/Icones";
import { useOutletContext } from "react-router-dom";

/** A ordem do menu é a ordem da pergunta: tenho → opero → o sistema sugere → mercado. */
export const TELAS = [
  { caminho: "/", rotulo: "Carteira", Icone: IconeCarteira },
  { caminho: "/operacoes", rotulo: "Operações", Icone: IconeRelogio },
  { caminho: "/estrategia", rotulo: "Estratégia", Icone: IconeBussola },
  { caminho: "/mercado", rotulo: "Mercado", Icone: IconeGrafico },
] as const;

/**
 * O painel é buscado uma vez na casca e chega às telas por aqui — buscar
 * por tela recarregaria a carteira a cada navegação, e o mesmo recurso
 * alimenta módulos de telas diferentes.
 */
export function usePainelDaTela(): Painel {
  return useOutletContext<Painel>();
}
