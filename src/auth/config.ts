const producao = import.meta.env.PROD;

function configuracao(valor: string | undefined, padrao: string): string {
  return valor?.trim() || padrao;
}

export const authAtiva = producao || import.meta.env.VITE_AUTH_ENABLED === "true";

export const authConfig = {
  domain: configuracao(
    import.meta.env.VITE_COGNITO_DOMAIN,
    "https://opcoes-ia-prod.auth.sa-east-1.amazoncognito.com",
  ),
  clientId: configuracao(
    import.meta.env.VITE_COGNITO_CLIENT_ID,
    "309nvb4hd31qohcip68bf4tasi",
  ),
  redirectUri: configuracao(
    import.meta.env.VITE_COGNITO_REDIRECT_URI,
    producao
      ? "https://opcoes-ia-web.pages.dev/auth/callback"
      : "http://localhost:5173/auth/callback",
  ),
  logoutUri: configuracao(
    import.meta.env.VITE_COGNITO_LOGOUT_URI,
    producao ? "https://opcoes-ia-web.pages.dev/" : "http://localhost:5173/",
  ),
  scope: "openid email opcoes-ia/api",
} as const;
