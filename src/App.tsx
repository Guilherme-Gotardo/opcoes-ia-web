/**
 * Casca do painel: barra superior, menu de rotas e a tela ativa.
 *
 * POR QUE ROTAS, DEPOIS DE UMA PÁGINA SÓ
 * --------------------------------------
 * A página única funcionou até onze módulos. Passou disso e virou rolagem:
 * chegar ao acompanhamento exigia atravessar tudo, e "onde eu estou" tinha
 * que ser respondido por um scrollspy. Rota resolve os dois — a tela ativa é
 * o endereço, o botão voltar funciona, e cada tela tem link próprio.
 *
 * O AGRUPAMENTO SEGUE A PERGUNTA, NÃO A FONTE DE DADO
 * ---------------------------------------------------
 * Cada tela junta o que se olha ao mesmo tempo, mesmo vindo de endpoints
 * diferentes: quanto eu tenho (carteira), o que estou operando (operações),
 * o que o sistema sugere e por quê (estratégia), e como o preço se move e se
 * a coleta está de pé (mercado).
 *
 * UM FETCH SÓ PARA TODAS AS TELAS
 * -------------------------------
 * `usePainel` fica AQUI, e as telas recebem os dados pelo contexto do
 * `Outlet`. Buscar por tela recarregaria a carteira a cada navegação — e
 * como um mesmo recurso alimenta módulos de telas diferentes (`/carteira`
 * aparece em três), seriam requisições repetidas para mostrar o mesmo
 * número.
 *
 * Regras herdadas do projeto principal que valem em toda a interface:
 * preço médio é custo e nunca ocupa o lugar do preço de mercado; patrimônio
 * parcial é declarado, não disfarçado; nenhuma sugestão é ordem; e o
 * cadastro escreve ESCRITURAÇÃO — espelha o que já existe na corretora, sem
 * mandar ordem para lugar nenhum.
 */
import { NavLink, Outlet } from "react-router-dom";
import { usePainel } from "./api/usePainel";
import { useAuth } from "./auth/AuthContext";
import {
  IconeAtualizar,
  IconeLua,
  IconeOk,
  IconeSol,
  IconeX,
} from "./componentes/Icones";
import { TELAS } from "./lib/telas";
import { useTema } from "./lib/useTema";
import { dataHora, idade } from "./lib/formato";
import "./App.css";

export default function App() {
  const painel = usePainel();
  const { sair } = useAuth();
  const { escuro, alternar } = useTema();

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="cabecalho__marca">
          <span className="cabecalho__logo" aria-hidden>
            oi
          </span>
          <div>
            <p className="cabecalho__nome">opcoes-ia</p>
            <p className="cabecalho__sub">Painel da carteira · B3</p>
          </div>
        </div>

        <div className="cabecalho__direita">
          <span
            className={`pulso ${painel.apiFora ? "pulso--fora" : "pulso--ok"}`}
            title={
              painel.buscadoEm
                ? `Última busca: ${dataHora(painel.buscadoEm.toISOString())}`
                : undefined
            }
          >
            {painel.apiFora ? <IconeX /> : <IconeOk />}
            <span className="pulso__texto">
              {painel.apiFora
                ? "API fora do ar"
                : painel.buscadoEm
                  ? `atualizado ${idade(painel.buscadoEm.toISOString())}`
                  : "conectando…"}
            </span>
          </span>

          <button
            type="button"
            className="botao"
            onClick={painel.atualizar}
            disabled={painel.carregando}
          >
            <IconeAtualizar className={painel.carregando ? "girando" : undefined} />
            {painel.carregando ? "Atualizando…" : "Atualizar"}
          </button>

          <button type="button" className="botao" onClick={sair}>
            Sair
          </button>

          <button
            type="button"
            className="botao botao--icone"
            onClick={alternar}
            aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
            title={escuro ? "Usar tema claro" : "Usar tema escuro"}
          >
            {escuro ? <IconeSol /> : <IconeLua />}
          </button>
        </div>
      </header>

      <div className="tela">
        <nav className="menu" aria-label="Telas do painel">
          <ul>
            {TELAS.map(({ caminho, rotulo, Icone }) => (
              <li key={caminho}>
                <NavLink
                  to={caminho}
                  end={caminho === "/"}
                  className={({ isActive }) =>
                    `menu__item${isActive ? " menu__item--ativo" : ""}`
                  }
                >
                  <Icone />
                  {rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="menu__aviso">
            Sugestão para revisão humana. Esta interface não executa ordem.
          </p>
        </nav>

        <main className="painel">
          <Outlet context={painel} />

          <footer className="rodape">
            <p>
              Esta plataforma <strong>nunca executa ordens</strong>. Todo output de
              estratégia é uma sugestão registrada no banco — não é recomendação de
              investimento.
            </p>
            <p>
              Os critérios são determinísticos e vivem no repositório principal. Os
              valores vêm do banco populado pelo ETL: a interface exibe o resultado e a
              justificativa numérica, e <strong>não estima nada</strong> — não avalia,
              não pondera e não decide. Resultado de operação é{" "}
              <strong>estimativa para conferência</strong>, nunca apuração fiscal.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
