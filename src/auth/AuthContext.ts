import { createContext, useContext } from "react";

export type AuthContexto = {
  autenticado: boolean;
  entrar: (returnTo?: string) => Promise<void>;
  sair: () => void;
  confirmarSessao: () => void;
};

export const AuthContext = createContext<AuthContexto | null>(null);

export function useAuth(): AuthContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth exige AuthProvider");
  return contexto;
}
