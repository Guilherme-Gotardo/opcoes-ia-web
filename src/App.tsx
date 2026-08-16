/**
 * Tela mínima de carteira — prova o contrato de ponta a ponta.
 *
 * Regras herdadas do projeto principal e que valem para qualquer tela
 * futura: preço médio é custo e aparece AO LADO do preço de mercado, nunca
 * no lugar dele; patrimônio parcial é declarado, não disfarçado; e toda
 * sugestão é pendente de revisão humana — nada aqui representa ordem.
 */
import { useEffect, useState } from "react";
import { api, type Carteira } from "./api/client";
import "./App.css";

const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function App() {
  const [carteira, setCarteira] = useState<Carteira | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .carteira()
      .then(setCarteira)
      .catch((e: Error) => setErro(e.message));
  }, []);

  if (erro) {
    return (
      <main>
        <h1>opcoes-ia</h1>
        <p>
          Não foi possível falar com a API: {erro}. Suba com{" "}
          <code>python -m src.api</code> no repositório principal.
        </p>
      </main>
    );
  }
  if (!carteira) {
    return (
      <main>
        <h1>opcoes-ia</h1>
        <p>Carregando carteira…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Carteira</h1>
      <p>
        Patrimônio total (a preço de mercado):{" "}
        <strong>{brl(carteira.total_patrimonio)}</strong>
      </p>
      {carteira.patrimonio_parcial && (
        <p role="alert">
          ⚠️ Patrimônio parcial: sem cotação utilizável para{" "}
          {carteira.tickers_sem_cotacao.join(", ")} — o total não cobre a
          carteira inteira.
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Tipo</th>
            <th>Qtd</th>
            <th>Preço médio (custo)</th>
            <th>Preço de mercado</th>
            <th>Valor a mercado</th>
          </tr>
        </thead>
        <tbody>
          {carteira.posicoes.map((p) => (
            <tr key={p.ticker}>
              <td>{p.ticker}</td>
              <td>{p.tipo_ativo}</td>
              <td>{p.quantidade}</td>
              <td>{brl(p.preco_medio)}</td>
              <td>{p.preco_mercado == null ? "sem cotação" : brl(p.preco_mercado)}</td>
              <td>{brl(p.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Exposição por ativo-objeto</h2>
      <ul>
        {Object.entries(carteira.exposicao_pct_por_ativo).map(([ativo, pct]) => (
          <li key={ativo}>
            {ativo}: {pct.toFixed(2)}% do patrimônio
          </li>
        ))}
      </ul>
    </main>
  );
}
