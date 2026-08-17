import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { authAtiva } from "./config";
import { AuthContext, useAuth } from "./AuthContext";
import {
  concluirLogin,
  encerrarSessaoLocal,
  EVENTO_SESSAO_ENCERRADA,
  iniciarLogin,
  sessaoAtual,
  urlLogout,
} from "./oauth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(!authAtiva || Boolean(sessaoAtual()));

  useEffect(() => {
    const encerrar = () => setAutenticado(false);
    window.addEventListener(EVENTO_SESSAO_ENCERRADA, encerrar);
    return () => window.removeEventListener(EVENTO_SESSAO_ENCERRADA, encerrar);
  }, []);

  async function entrar(returnTo = "/") {
    await iniciarLogin(returnTo);
  }

  function sair() {
    encerrarSessaoLocal();
    setAutenticado(false);
    window.location.assign(urlLogout());
  }

  function confirmarSessao() {
    setAutenticado(Boolean(sessaoAtual()));
  }

  return (
    <AuthContext.Provider value={{ autenticado, entrar, sair, confirmarSessao }}>
      {children}
    </AuthContext.Provider>
  );
}

export function ExigirLogin() {
  const { autenticado, entrar } = useAuth();
  const location = useLocation();
  if (!authAtiva || autenticado) return <Outlet />;

  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return (
    <main className="auth">
      <section className="auth__cartao">
        <span className="auth__marca" aria-hidden>oi</span>
        <p className="auth__sobretitulo">ACESSO PESSOAL</p>
        <h1>Carteira protegida</h1>
        <p className="auth__texto">
          Entre pelo Cognito com senha e autenticador TOTP. O painel não guarda
          senha e nunca envia ordem para corretora.
        </p>
        <button className="botao auth__acao" type="button" onClick={() => void entrar(returnTo)}>
          Entrar com Cognito
        </button>
      </section>
    </main>
  );
}

export function CallbackAuth() {
  const navigate = useNavigate();
  const { confirmarSessao } = useAuth();
  const executando = useRef(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (executando.current) return;
    executando.current = true;
    void concluirLogin(window.location.search)
      .then((returnTo) => {
        confirmarSessao();
        navigate(returnTo, { replace: true });
      })
      .catch((falha: unknown) => {
        setErro(falha instanceof Error ? falha.message : "Não foi possível concluir o login.");
      });
  }, [confirmarSessao, navigate]);

  if (erro) {
    return (
      <main className="auth">
        <section className="auth__cartao">
          <p className="auth__sobretitulo">LOGIN NÃO CONCLUÍDO</p>
          <h1>O Cognito recusou a sessão</h1>
          <p className="auth__texto">{erro}</p>
          <button className="botao auth__acao" type="button" onClick={() => navigate("/", { replace: true })}>
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }
  return (
    <main className="auth" aria-live="polite">
      <section className="auth__cartao">
        <p className="auth__sobretitulo">AUTENTICANDO</p>
        <h1>Validando o acesso…</h1>
        <p className="auth__texto">Trocando o código temporário por uma sessão protegida.</p>
      </section>
    </main>
  );
}
