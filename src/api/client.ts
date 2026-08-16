/**
 * Cliente tipado da API de leitura do opcoes-ia.
 *
 * Os tipos vêm de `schema.d.ts`, GERADO do OpenAPI que o FastAPI publica
 * (`npm run gerar-tipos`) — nunca escritos à mão. É o que faz um campo
 * renomeado no Python quebrar o `tsc` daqui, em vez de quebrar em runtime.
 *
 * Esta camada não decide nada: os critérios de estratégia são
 * determinísticos e vivem no repositório principal. Aqui só se busca e
 * tipa.
 */
import type { components } from "./schema";

export type Carteira = components["schemas"]["CarteiraResposta"];
export type Posicao = components["schemas"]["PosicaoResposta"];
export type Cotacao = components["schemas"]["CotacaoResposta"];
export type Sugestao = components["schemas"]["SugestaoResposta"];
export type Desfecho = components["schemas"]["DesfechoResposta"];
export type MotivoDesfecho = components["schemas"]["MotivoDesfechoResposta"];

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function buscar<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`);
  if (!resposta.ok) {
    throw new Error(`API respondeu ${resposta.status} em ${caminho}`);
  }
  return (await resposta.json()) as T;
}

export const api = {
  carteira: () => buscar<Carteira>("/carteira"),
  cotacoes: () => buscar<Cotacao[]>("/cotacoes"),
  sugestoes: () => buscar<Sugestao[]>("/sugestoes"),
  desfecho: () => buscar<Desfecho>("/desfecho"),
};
