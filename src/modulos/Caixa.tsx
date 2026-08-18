/**
 * Caixa/garantia — o que torna uma PUT coberta, coberta.
 *
 * `avaliar()` no repositório principal exige `caixa_disponivel` para
 * avaliar covered put: sem garantia para honrar o exercício ao strike, a
 * operação não é coberta — é put descoberta, com risco que o projeto não
 * aceita. Enquanto não havia onde registrar esse caixa, nenhuma put era
 * avaliada contra a carteira real.
 *
 * SALDO ZERO NÃO É NEUTRO
 * -----------------------
 * É o que faz a avaliação recusar toda put. A tela diz isso em vez de
 * mostrar "R$ 0,00" como se fosse um estado qualquer — a diferença entre
 * "não tenho garantia" e "a análise está quebrada" é o que o usuário
 * precisa saber para agir.
 *
 * LANÇAMENTOS, NÃO SALDO
 * ----------------------
 * O saldo é a soma. O extrato fica visível porque é o "como se chegou até
 * aqui" que explica, meses depois, por que uma avaliação de uma data
 * aceitou ou recusou uma operação.
 */
import { useCallback, useState } from "react";
import { api, type Caixa as CaixaDado } from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Estado } from "../componentes/Estado";
import { Selo } from "../componentes/Selo";
import { IconeAlerta, IconeCarteira, IconeOk } from "../componentes/Icones";
import { brl, brlAssinado, dataHora } from "../lib/formato";

type Props = {
  caixa: CaixaDado | null;
  erro: string | null;
  aoMudar: () => void;
};

type Aviso = { tom: "ok" | "erro"; texto: string } | null;

export function Caixa({ caixa, erro, aoMudar }: Props) {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [sentido, setSentido] = useState<"aporte" | "retirada">("aporte");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  const lancar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEnviando(true);
      setAviso(null);
      // O sinal vem do botão, nunca do que foi digitado — mesma razão da
      // direção comprada/lançada no cadastro de posição.
      const magnitude = Math.abs(Number(valor));
      const assinado = sentido === "retirada" ? -magnitude : magnitude;
      try {
        await api.lancarCaixa(assinado, descricao.trim() === "" ? null : descricao);
        setAviso({ tom: "ok", texto: `Lançamento de ${brlAssinado(assinado)} registrado.` });
        setValor("");
        setDescricao("");
        aoMudar();
      } catch (err) {
        setAviso({ tom: "erro", texto: err instanceof Error ? err.message : String(err) });
      } finally {
        setEnviando(false);
      }
    },
    [valor, sentido, descricao, aoMudar],
  );

  return (
    <Cartao
      id="caixa"
      icone={<IconeCarteira />}
      titulo="Caixa e garantia"
      nota="É o que torna uma put coberta. Sem garantia para honrar o exercício ao strike, a avaliação recusa a operação."
      acoes={
        caixa && (
          <Selo
            tom={caixa.garante_put ? "ok" : "obsoleto"}
            icone={caixa.garante_put ? <IconeOk /> : <IconeAlerta />}
          >
            {caixa.garante_put ? brl(caixa.saldo) : "sem garantia"}
          </Selo>
        )
      }
    >
      {erro ? (
        <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler o caixa">
          {erro}
        </Estado>
      ) : caixa == null ? (
        <Estado titulo="Carregando…" />
      ) : (
        /*
          Mesma `pilha` da watchlist: aviso, formulário e extrato são três
          assuntos, e sem espaçamento entre eles a leitura vira um bloco só.
        */
        <div className="pilha">
          {!caixa.garante_put && (
            <p className="aviso aviso--obsoleto" role="note">
              <IconeAlerta className="aviso__icone" />
              <span>
                Sem saldo registrado, <strong>nenhuma put é avaliada</strong> — a
                avaliação a trata como descoberta e recusa. Registre a garantia
                disponível abaixo.
              </span>
            </p>
          )}

          <div className="bloco">
            <form className="form form--linha" onSubmit={lancar}>
              <div className="form__campo">
                <span>Tipo</span>
                <div className="filtros" role="group" aria-label="Sentido do lançamento">
                  {(["aporte", "retirada"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`filtro${sentido === s ? " filtro--ativo" : ""}`}
                      aria-pressed={sentido === s}
                      onClick={() => setSentido(s)}
                    >
                      {s === "aporte" ? "Aporte" : "Retirada"}
                    </button>
                  ))}
                </div>
                <span className="form__ajuda">
                  O sinal vem do botão, nunca do valor digitado.
                </span>
              </div>

              <label className="form__campo">
                <span>Valor</span>
                <input
                  className="campo"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="20000.00"
                  required
                />
                <span className="form__ajuda">Sempre positivo.</span>
              </label>

              <label className="form__campo">
                <span>
                  Descrição <span className="form__opcional">opcional</span>
                </span>
                <input
                  className="campo"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="aporte para garantia de put"
                />
                <span className="form__ajuda">
                  De onde veio ou para onde foi.
                </span>
              </label>

              <div className="form__acoes">
                <button className="botao botao--primario" type="submit" disabled={enviando}>
                  {enviando ? "Registrando…" : "Registrar"}
                </button>
              </div>
            </form>

            {aviso && (
              <p className={`form__aviso form__aviso--${aviso.tom}`} role="status">
                {aviso.tom === "ok" ? <IconeOk /> : <IconeAlerta />}
                <span>{aviso.texto}</span>
              </p>
            )}
          </div>

          <div className="bloco">
            <h3 className="bloco__titulo">
              Extrato
              {caixa.lancamentos.length > 0 && (
                <span className="bloco__contagem">
                  {caixa.lancamentos.length} · saldo {brl(caixa.saldo)}
                </span>
              )}
            </h3>
            {caixa.lancamentos.length === 0 ? (
              <Estado icone={<IconeCarteira />} titulo="Nenhum lançamento">
                O saldo é a soma dos lançamentos — sem nenhum, ele é zero, e zero
                recusa toda put.
              </Estado>
            ) : (
              <ul className="lancamentos">
                {caixa.lancamentos.map((l) => (
                  <li key={l.id}>
                    <span className="lancamentos__quando">{dataHora(l.ocorrido_em)}</span>
                    <span className="lancamentos__descricao">
                      {l.descricao || "sem descrição"}
                    </span>
                    <span
                      className={`num valor--${l.valor >= 0 ? "ganho" : "perda"}`}
                    >
                      {brlAssinado(l.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="cartao__rodape">
            <span>
              O saldo é a <strong>soma</strong> dos lançamentos, nunca um número
              sobrescrito: é o histórico que explica, meses depois, por que uma
              avaliação aceitou ou recusou uma operação.
            </span>
          </p>
        </div>
      )}
    </Cartao>
  );
}
