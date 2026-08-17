import { authConfig } from "./config";

const CHAVE_PENDENTE = "opcoes-ia.auth.pending";
const CHAVE_SESSAO = "opcoes-ia.auth.session";
export const EVENTO_SESSAO_ENCERRADA = "opcoes-ia:session-ended";

type TransacaoPendente = {
  verifier: string;
  state: string;
  returnTo: string;
};

type Sessao = {
  accessToken: string;
  expiresAt: number;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

function base64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function aleatorio(tamanho: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(tamanho)));
}

function caminhoInterno(caminho: string | null): string {
  return caminho?.startsWith("/") && !caminho.startsWith("//") ? caminho : "/";
}

async function desafio(verifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(verifier);
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

export async function iniciarLogin(returnTo: string): Promise<void> {
  const verifier = aleatorio(64);
  const state = aleatorio(32);
  const pendente: TransacaoPendente = {
    verifier,
    state,
    returnTo: caminhoInterno(returnTo),
  };
  sessionStorage.setItem(CHAVE_PENDENTE, JSON.stringify(pendente));

  const parametros = new URLSearchParams({
    response_type: "code",
    client_id: authConfig.clientId,
    redirect_uri: authConfig.redirectUri,
    scope: authConfig.scope,
    code_challenge_method: "S256",
    code_challenge: await desafio(verifier),
    state,
  });
  window.location.assign(`${authConfig.domain}/oauth2/authorize?${parametros}`);
}

export async function concluirLogin(busca: string): Promise<string> {
  const parametros = new URLSearchParams(busca);
  const erro = parametros.get("error");
  if (erro) {
    throw new Error(parametros.get("error_description") || erro);
  }

  const code = parametros.get("code");
  const state = parametros.get("state");
  const bruto = sessionStorage.getItem(CHAVE_PENDENTE);
  if (!code || !state || !bruto) throw new Error("Resposta de login incompleta.");

  let pendente: TransacaoPendente;
  try {
    pendente = JSON.parse(bruto) as TransacaoPendente;
  } catch {
    throw new Error("Estado local do login inválido.");
  }
  if (state !== pendente.state) throw new Error("Estado do login não confere.");
  sessionStorage.removeItem(CHAVE_PENDENTE);

  const resposta = await fetch(`${authConfig.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: authConfig.clientId,
      redirect_uri: authConfig.redirectUri,
      code,
      code_verifier: pendente.verifier,
    }),
  });
  if (!resposta.ok) throw new Error(`Cognito recusou o código (${resposta.status}).`);

  const token = (await resposta.json()) as TokenResponse;
  if (!token.access_token || !token.expires_in || token.token_type !== "Bearer") {
    throw new Error("Cognito devolveu uma sessão incompleta.");
  }
  const sessao: Sessao = {
    accessToken: token.access_token,
    expiresAt: Date.now() + Math.max(0, token.expires_in - 30) * 1000,
  };
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  return caminhoInterno(pendente.returnTo);
}

export function sessaoAtual(): Sessao | null {
  const bruto = sessionStorage.getItem(CHAVE_SESSAO);
  if (!bruto) return null;
  try {
    const sessao = JSON.parse(bruto) as Sessao;
    if (!sessao.accessToken || sessao.expiresAt <= Date.now()) {
      encerrarSessaoLocal();
      return null;
    }
    return sessao;
  } catch {
    encerrarSessaoLocal();
    return null;
  }
}

export function accessToken(): string | null {
  return sessaoAtual()?.accessToken ?? null;
}

export function encerrarSessaoLocal(): void {
  sessionStorage.removeItem(CHAVE_SESSAO);
  sessionStorage.removeItem(CHAVE_PENDENTE);
}

export function invalidarSessao(): void {
  encerrarSessaoLocal();
  window.dispatchEvent(new Event(EVENTO_SESSAO_ENCERRADA));
}

export function urlLogout(): string {
  const parametros = new URLSearchParams({
    client_id: authConfig.clientId,
    logout_uri: authConfig.logoutUri,
  });
  return `${authConfig.domain}/logout?${parametros}`;
}
