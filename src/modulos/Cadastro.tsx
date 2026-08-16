/**
 * Cadastro da carteira — o que antes só entrava por CLI.
 *
 * ISTO NÃO É UMA MESA DE OPERAÇÕES. O que se registra aqui é o espelho do
 * que você JÁ tem na corretora; nada é enviado para lugar nenhum. É a mesma
 * escrituração que `portfolio.manage` faz, com formulário no lugar do
 * terminal.
 *
 * DUAS DECISÕES DE INTERFACE QUE VÊM DO DOMÍNIO
 * ---------------------------------------------
 * 1. **Comprada / lançada é botão, não sinal digitado.** No banco, posição
 *    vendida é quantidade negativa. Pedir que o usuário digite "-100" é
 *    convidar ao erro mais caro possível nesta tela: um sinal trocado
 *    inverte a operação inteira. O formulário pergunta a direção e aplica o
 *    sinal.
 * 2. **Ativo é pré-requisito, e a tela diz isso antes de falhar.** Registrar
 *    posição em ação de ticker não cadastrado é recusado pelo domínio;
 *    então o campo é um select do que existe, com o cadastro de ativo ao
 *    lado. Para OPÇÃO o campo é livre: ali o ticker é o CÓDIGO da opção
 *    (PETRI450), que não é linha em `ativos` — e não deve ser.
 */
import { useCallback, useState } from "react";
import {
  api,
  type Ativo,
  type PosicaoAberta,
} from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import {
  IconeAlerta,
  IconeCarteira,
  IconeOk,
  IconeX,
} from "../componentes/Icones";
import { brl, dataHora, numero } from "../lib/formato";

type Props = {
  ativos: Ativo[] | null;
  posicoes: PosicaoAberta[] | null;
  erro: string | null;
  /** Recarrega o painel inteiro: gravar posição muda patrimônio e exposição. */
  aoMudar: () => void;
};

type Aviso = { tom: "ok" | "erro"; texto: string } | null;

const TIPOS_ATIVO = [
  { valor: "acao", rotulo: "Ação" },
  { valor: "fii", rotulo: "FII" },
  { valor: "bdr", rotulo: "BDR" },
];

function Mensagem({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return (
    <p className={`form__aviso form__aviso--${aviso.tom}`} role="status">
      {aviso.tom === "ok" ? <IconeOk /> : <IconeAlerta />}
      <span>{aviso.texto}</span>
    </p>
  );
}

function FormAtivo({ aoMudar }: { aoMudar: () => void }) {
  const [ticker, setTicker] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("acao");
  const [cnpj, setCnpj] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEnviando(true);
      setAviso(null);
      try {
        await api.cadastrarAtivo({
          ticker,
          nome,
          tipo,
          cnpj_raiz: cnpj.trim() === "" ? null : cnpj,
        });
        setAviso({ tom: "ok", texto: `${ticker.toUpperCase()} cadastrado.` });
        setTicker("");
        setNome("");
        setCnpj("");
        aoMudar();
      } catch (err) {
        setAviso({ tom: "erro", texto: err instanceof Error ? err.message : String(err) });
      } finally {
        setEnviando(false);
      }
    },
    [ticker, nome, tipo, cnpj, aoMudar],
  );

  return (
    <form className="form" onSubmit={enviar}>
      <h3 className="form__titulo">Cadastrar ativo</h3>
      <p className="form__nota">
        Pré-requisito de tudo: cotação, opção e notícia referenciam o ativo.
        Regravar o mesmo ticker corrige o cadastro, não duplica.
      </p>

      <div className="form__linha">
        <label className="form__campo">
          <span>Ticker</span>
          <input
            className="campo"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="PETR4"
            required
          />
        </label>
        <label className="form__campo form__campo--largo">
          <span>Nome</span>
          <input
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Petrobras PN"
            required
          />
        </label>
      </div>

      <div className="form__linha">
        <label className="form__campo">
          <span>Tipo</span>
          <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_ATIVO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="form__campo form__campo--largo">
          <span>
            CNPJ raiz <span className="form__opcional">opcional</span>
          </span>
          <input
            className="campo"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="33000167"
            inputMode="numeric"
          />
          <span className="form__ajuda">
            8 dígitos. É o que liga o ativo ao dump da CVM para datas de resultado.
          </span>
        </label>
      </div>

      <div className="form__acoes">
        <button className="botao botao--primario" type="submit" disabled={enviando}>
          {enviando ? "Cadastrando…" : "Cadastrar ativo"}
        </button>
      </div>
      <Mensagem aviso={aviso} />
    </form>
  );
}

function FormPosicao({ ativos, aoMudar }: { ativos: Ativo[] | null; aoMudar: () => void }) {
  const [tipoAtivo, setTipoAtivo] = useState<"ACAO" | "OPCAO">("ACAO");
  const [direcao, setDirecao] = useState<"comprada" | "lancada">("comprada");
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoMedio, setPrecoMedio] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEnviando(true);
      setAviso(null);

      // O sinal vem do botão de direção, nunca do que foi digitado: é o
      // erro mais caro desta tela e não deveria depender de atenção.
      const magnitude = Math.abs(Number(quantidade));
      const qtd = direcao === "lancada" ? -magnitude : magnitude;

      try {
        await api.registrarPosicao({
          ticker,
          tipo_ativo: tipoAtivo,
          quantidade: qtd,
          preco_medio: Number(precoMedio),
        });
        setAviso({
          tom: "ok",
          texto: `Posição registrada: ${numero(qtd)} de ${ticker.toUpperCase()}.`,
        });
        setTicker("");
        setQuantidade("");
        setPrecoMedio("");
        aoMudar();
      } catch (err) {
        setAviso({ tom: "erro", texto: err instanceof Error ? err.message : String(err) });
      } finally {
        setEnviando(false);
      }
    },
    [ticker, tipoAtivo, direcao, quantidade, precoMedio, aoMudar],
  );

  return (
    <form className="form" onSubmit={enviar}>
      <h3 className="form__titulo">Registrar posição</h3>
      <p className="form__nota">
        Escrituração do que você já tem. Nada é enviado para a corretora.
      </p>

      <div className="form__linha">
        <div className="form__campo">
          <span>O que é</span>
          <div className="filtros" role="group" aria-label="Tipo da posição">
            {(["ACAO", "OPCAO"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`filtro${tipoAtivo === t ? " filtro--ativo" : ""}`}
                aria-pressed={tipoAtivo === t}
                onClick={() => setTipoAtivo(t)}
              >
                {t === "ACAO" ? "Ação" : "Opção"}
              </button>
            ))}
          </div>
        </div>

        <div className="form__campo">
          <span>Direção</span>
          <div className="filtros" role="group" aria-label="Direção da posição">
            {(["comprada", "lancada"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`filtro${direcao === d ? " filtro--ativo" : ""}`}
                aria-pressed={direcao === d}
                onClick={() => setDirecao(d)}
              >
                {d === "comprada" ? "Comprada" : "Lançada (vendida)"}
              </button>
            ))}
          </div>
          <span className="form__ajuda">
            Lançada grava quantidade negativa — é como a venda coberta entra.
          </span>
        </div>
      </div>

      <div className="form__linha">
        <label className="form__campo">
          <span>{tipoAtivo === "ACAO" ? "Ticker" : "Código da opção"}</span>
          {tipoAtivo === "ACAO" ? (
            <select
              className="campo"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {(ativos ?? []).map((a) => (
                <option key={a.ticker} value={a.ticker}>
                  {a.ticker} — {a.nome}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="campo"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="PETRI450"
              required
            />
          )}
          {tipoAtivo === "OPCAO" && (
            <span className="form__ajuda">
              Aqui vai o código da opção, que não é cadastrado como ativo.
            </span>
          )}
        </label>

        <label className="form__campo">
          <span>Quantidade</span>
          <input
            className="campo"
            type="number"
            min="1"
            step="1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="100"
            required
          />
        </label>

        <label className="form__campo">
          <span>Preço médio</span>
          <input
            className="campo"
            type="number"
            min="0"
            step="0.01"
            value={precoMedio}
            onChange={(e) => setPrecoMedio(e.target.value)}
            placeholder="32.50"
            required
          />
          <span className="form__ajuda">Base de custo, não valor de mercado.</span>
        </label>
      </div>

      <div className="form__acoes">
        <button className="botao botao--primario" type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : "Registrar posição"}
        </button>
      </div>
      <Mensagem aviso={aviso} />
    </form>
  );
}

function ListaPosicoes({
  posicoes,
  aoMudar,
}: {
  posicoes: PosicaoAberta[] | null;
  aoMudar: () => void;
}) {
  const [encerrando, setEncerrando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  const encerrar = useCallback(
    async (p: PosicaoAberta) => {
      setEncerrando(p.id);
      setAviso(null);
      try {
        await api.encerrarPosicao(p.id);
        setAviso({ tom: "ok", texto: `Posição ${p.ticker} encerrada.` });
        aoMudar();
      } catch (err) {
        setAviso({ tom: "erro", texto: err instanceof Error ? err.message : String(err) });
      } finally {
        setEncerrando(null);
      }
    },
    [aoMudar],
  );

  if (posicoes == null) return <Estado titulo="Carregando…" />;
  if (posicoes.length === 0) {
    return (
      <Estado titulo="Nenhuma posição em aberto">
        Registre a primeira no formulário acima.
      </Estado>
    );
  }

  return (
    <>
      <ul className="posicoes-abertas">
        {posicoes.map((p) => (
          <li key={p.id}>
            <div className="posicoes-abertas__id">
              <span className="tabela__ticker">{p.ticker}</span>
              <span className="etiqueta">{p.tipo_ativo}</span>
              {p.quantidade < 0 && (
                <span className="etiqueta etiqueta--lancada">lançada</span>
              )}
            </div>
            <span className="num">{numero(p.quantidade)}</span>
            <span className="num num--custo">{brl(p.preco_medio)}</span>
            <span className="posicoes-abertas__desde" title={dataHora(p.aberta_em)}>
              desde {dataHora(p.aberta_em).split(" ")[0]}
            </span>
            <button
              type="button"
              className="botao botao--discreto"
              onClick={() => encerrar(p)}
              disabled={encerrando === p.id}
            >
              <IconeX />
              {encerrando === p.id ? "Encerrando…" : "Encerrar"}
            </button>
          </li>
        ))}
      </ul>
      <Mensagem aviso={aviso} />
      <p className="cartao__rodape">
        <span>
          Encerrar marca a data de fechamento — a linha nunca é apagada, porque o
          histórico é o que permite explicar uma decisão passada meses depois.
        </span>
      </p>
    </>
  );
}

export function Cadastro({ ativos, posicoes, erro, aoMudar }: Props) {
  return (
    <Cartao
      id="cadastro"
      icone={<IconeCarteira />}
      titulo="Cadastro da carteira"
      nota="Espelho do que você já tem na corretora. Esta tela não envia ordem — registrar posição é escrituração."
      acoes={
        posicoes && (
          <Selo tom="neutro">
            {numero(posicoes.length)}{" "}
            {posicoes.length === 1 ? "posição aberta" : "posições abertas"}
          </Selo>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler o cadastro">
          {erro}
        </Estado>
      ) : (
        <div className="cadastro">
          <div className="cadastro__formularios">
            <FormAtivo aoMudar={aoMudar} />
            <FormPosicao ativos={ativos} aoMudar={aoMudar} />
          </div>
          <div className="cadastro__lista">
            <h3 className="form__titulo">Posições em aberto</h3>
            <ListaPosicoes posicoes={posicoes} aoMudar={aoMudar} />
          </div>
        </div>
      )}
    </Cartao>
  );
}
