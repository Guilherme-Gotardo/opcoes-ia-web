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
export type Resultados = components["schemas"]["ResultadosResposta"];
export type EventoResultado = components["schemas"]["EventoResultadoResposta"];
export type FonteResultado = components["schemas"]["FonteResultadoResposta"];
export type PendenteConsolidacao =
  components["schemas"]["PendenteConsolidacaoResposta"];
export type Operacao = components["schemas"]["OperacaoResposta"];
export type Coleta = components["schemas"]["ColetaResposta"];
export type Orcamento = components["schemas"]["OrcamentoResposta"];
export type Parametros = components["schemas"]["ParametrosResposta"];
export type Candles = components["schemas"]["CandlesResposta"];
export type Vela = components["schemas"]["VelaResposta"];
export type Ativo = components["schemas"]["AtivoResposta"];
export type AtivoEntrada = components["schemas"]["AtivoEntrada"];
export type PosicaoAberta = components["schemas"]["PosicaoAbertaResposta"];
export type PosicaoEntrada = components["schemas"]["PosicaoEntrada"];
export type PosicaoCriada = components["schemas"]["PosicaoCriada"];

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

/**
 * A API devolve `{"detail": "..."}` nos erros de domínio, e essa mensagem é
 * escrita para o usuário: ela diz o que corrigir e às vezes traz o comando.
 * Trocá-la por "erro 422" jogaria fora a única parte útil da resposta.
 */
async function erroDaResposta(resposta: Response, caminho: string): Promise<Error> {
  try {
    const corpo = await resposta.json();
    if (typeof corpo?.detail === "string") return new Error(corpo.detail);
    // 422 do próprio Pydantic vem como lista de problemas por campo.
    if (Array.isArray(corpo?.detail)) {
      const campos = corpo.detail
        .map((d: { loc?: unknown[]; msg?: string }) =>
          `${d.loc?.slice(1).join(".") ?? "campo"}: ${d.msg ?? "inválido"}`,
        )
        .join("; ");
      return new Error(campos);
    }
  } catch {
    // Resposta sem corpo JSON — cai no genérico abaixo.
  }
  return new Error(`API respondeu ${resposta.status} em ${caminho}`);
}

async function buscar<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE_URL}${caminho}`);
  if (!resposta.ok) throw await erroDaResposta(resposta, caminho);
  return (await resposta.json()) as T;
}

async function enviar<T>(caminho: string, corpo?: unknown): Promise<T | null> {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: "POST",
    headers: corpo === undefined ? {} : { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!resposta.ok) throw await erroDaResposta(resposta, caminho);
  // 204 (encerrar posição) não tem corpo.
  return resposta.status === 204 ? null : ((await resposta.json()) as T);
}

export const api = {
  carteira: () => buscar<Carteira>("/carteira"),
  cotacoes: () => buscar<Cotacao[]>("/cotacoes"),
  sugestoes: () => buscar<Sugestao[]>("/sugestoes"),
  desfecho: () => buscar<Desfecho>("/desfecho"),
  resultados: () => buscar<Resultados>("/resultados"),
  operacao: () => buscar<Operacao>("/operacao"),
  parametros: () => buscar<Parametros>("/parametros"),
  ativos: () => buscar<Ativo[]>("/ativos"),
  posicoes: () => buscar<PosicaoAberta[]>("/posicoes"),
  candles: (ticker: string, intervalo: string, limite = 200) =>
    buscar<Candles>(
      `/candles?ticker=${encodeURIComponent(ticker)}` +
        `&intervalo=${encodeURIComponent(intervalo)}&limite=${limite}`,
    ),

  /*
   * Escrita. Nada aqui manda ordem para corretora nenhuma: é escrituração
   * do que o usuário já tem, o mesmo que a CLI `portfolio.manage` grava.
   */
  cadastrarAtivo: (a: AtivoEntrada) => enviar<Ativo>("/ativos", a),
  registrarPosicao: (p: PosicaoEntrada) =>
    enviar<PosicaoCriada>("/posicoes", p),
  encerrarPosicao: (id: number) => enviar<null>(`/posicoes/${id}/encerrar`),
};
