/**
 * Painel do opcoes-ia.
 *
 * Uma página só, dez módulos, na ordem em que a pergunta costuma ser feita:
 * quanto eu tenho (patrimônio), o que o sistema sugere (recomendações), em
 * quê exatamente estou (investimentos), como registro o que tenho
 * (cadastro), como o preço se moveu (gráfico), onde isso está concentrado
 * (exposição), o que está sendo observado (tickers), por que a avaliação deu
 * no que deu (acompanhamento), o que pode travar a próxima (resultados) e se
 * a coleta que alimenta tudo isso está de pé (operação).
 *
 * Regras herdadas do projeto principal que valem em toda a tela:
 * preço médio é custo e nunca ocupa o lugar do preço de mercado; patrimônio
 * parcial é declarado, não disfarçado; e nenhuma sugestão é ordem — tudo
 * aqui é pendente de revisão humana. O cadastro escreve, mas escreve
 * ESCRITURAÇÃO: espelha o que já existe na corretora, sem mandar ordem.
 *
 * Nenhum critério de estratégia mora nesta interface. Ela exibe o resultado
 * e a justificativa numérica que a API entrega; não avalia, não pondera e
 * não decide.
 */
import { usePainel } from "./api/usePainel";
import { Cartao } from "./componentes/Cartao";
import { Esqueleto, Estado } from "./componentes/Estado";
import {
  IconeAlerta,
  IconeAtualizar,
  IconeBussola,
  IconeCalendario,
  IconeCarteira,
  IconeEtiqueta,
  IconeGrafico,
  IconeIdeia,
  IconeLista,
  IconeLua,
  IconeOk,
  IconeRaio,
  IconeSol,
  IconeX,
} from "./componentes/Icones";
import { Acompanhamento } from "./modulos/Acompanhamento";
import { Cadastro } from "./modulos/Cadastro";
import { Cotacoes } from "./modulos/Cotacoes";
import { Grafico } from "./modulos/Grafico";
import { Exposicao } from "./modulos/Exposicao";
import { Investimentos } from "./modulos/Investimentos";
import { Operacao } from "./modulos/Operacao";
import { Patrimonio } from "./modulos/Patrimonio";
import { Recomendacoes } from "./modulos/Recomendacoes";
import { Resultados } from "./modulos/Resultados";
import { useSecaoAtiva } from "./lib/useSecaoAtiva";
import { useTema } from "./lib/useTema";
import { dataHora, idade } from "./lib/formato";
import "./App.css";

/** A ordem do menu é a ordem da página — e a ordem em que a pergunta é feita. */
const SECOES = [
  { id: "patrimonio", rotulo: "Patrimônio", Icone: IconeCarteira },
  { id: "recomendacoes", rotulo: "Recomendações", Icone: IconeIdeia },
  { id: "investimentos", rotulo: "Investimentos", Icone: IconeLista },
  { id: "cadastro", rotulo: "Cadastro", Icone: IconeCarteira },
  { id: "grafico", rotulo: "Gráfico", Icone: IconeGrafico },
  { id: "exposicao", rotulo: "Exposição", Icone: IconeGrafico },
  { id: "tickers", rotulo: "Tickers", Icone: IconeEtiqueta },
  { id: "acompanhamento", rotulo: "Acompanhamento", Icone: IconeBussola },
  { id: "resultados", rotulo: "Resultados", Icone: IconeCalendario },
  { id: "operacao", rotulo: "Operação", Icone: IconeRaio },
] as const;

const IDS = SECOES.map((s) => s.id);

export default function App() {
  const painel = usePainel();
  const { escuro, alternar } = useTema();
  const ativa = useSecaoAtiva(IDS);

  const carteira = painel.carteira.dado;
  const primeiraCarga = painel.carregando && painel.buscadoEm == null;

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
        <nav className="menu" aria-label="Módulos do painel">
          <ul>
            {SECOES.map(({ id, rotulo, Icone }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`menu__item${ativa === id ? " menu__item--ativo" : ""}`}
                  aria-current={ativa === id ? "true" : undefined}
                >
                  <Icone />
                  {rotulo}
                </a>
              </li>
            ))}
          </ul>
          <p className="menu__aviso">
            Sugestão para revisão humana. Esta interface não executa ordem.
          </p>
        </nav>

        <main className="painel">
          {painel.apiFora ? (
            <Cartao
              icone={<IconeAlerta />}
              titulo="Sem contato com a API"
              nota="Todos os endpoints falharam — o problema é a conexão, não o dado."
            >
              <Estado tom="erro" icone={<IconeX />} titulo="A API do opcoes-ia não respondeu">
                <p>
                  Suba a API no repositório principal e atualize esta página:
                </p>
                <pre className="bloco">python -m src.api</pre>
                <p className="estado__detalhe">{painel.carteira.erro}</p>
              </Estado>
            </Cartao>
          ) : (
            <>
              {primeiraCarga ? (
                <Cartao titulo="Carregando carteira">
                  <Esqueleto linhas={4} />
                </Cartao>
              ) : painel.carteira.erro ? (
                <Cartao icone={<IconeAlerta />} titulo="Carteira indisponível">
                  <Estado
                    tom="erro"
                    icone={<IconeAlerta />}
                    titulo="Não foi possível ler a carteira"
                  >
                    {painel.carteira.erro}
                  </Estado>
                </Cartao>
              ) : (
                carteira && (
                  <Patrimonio
                    carteira={carteira}
                    executadoEm={painel.desfecho.dado?.executado_em ?? null}
                  />
                )
              )}

              <Recomendacoes
                sugestoes={primeiraCarga ? null : painel.sugestoes.dado}
                erro={painel.sugestoes.erro}
              />

              {carteira && !painel.carteira.erro && (
                <Investimentos carteira={carteira} />
              )}

              <Cadastro
                ativos={primeiraCarga ? null : painel.ativos.dado}
                posicoes={primeiraCarga ? null : painel.posicoesAbertas.dado}
                erro={painel.ativos.erro ?? painel.posicoesAbertas.erro}
                aoMudar={painel.atualizar}
              />

              <Grafico carteira={carteira} />

              {/* Os dois módulos compactos dividem uma linha; o resto ocupa a largura toda. */}
              <div className="grade">
                {carteira && !painel.carteira.erro && <Exposicao carteira={carteira} />}
                <Cotacoes
                  cotacoes={primeiraCarga ? null : painel.cotacoes.dado}
                  erro={painel.cotacoes.erro}
                  janelaHoras={
                    painel.parametros.dado?.cotacao_frescor_maximo_horas ?? null
                  }
                />
              </div>

              <Acompanhamento
                desfecho={primeiraCarga ? null : painel.desfecho.dado}
                erro={painel.desfecho.erro}
              />

              <Resultados
                resultados={primeiraCarga ? null : painel.resultados.dado}
                erro={painel.resultados.erro}
              />

              <Operacao
                operacao={primeiraCarga ? null : painel.operacao.dado}
                erro={painel.operacao.erro}
              />
            </>
          )}

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
              não pondera e não decide.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
