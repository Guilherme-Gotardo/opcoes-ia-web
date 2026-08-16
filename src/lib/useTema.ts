/**
 * Tema claro/escuro.
 *
 * Começa em "auto" (segue o sistema) e só grava preferência quando o usuário
 * escolhe — assim quem nunca tocou no botão continua acompanhando o sistema,
 * inclusive se ele mudar de dia para noite com a aba aberta.
 */
import { useCallback, useEffect, useState } from "react";

export type Tema = "auto" | "claro" | "escuro";
const CHAVE = "opcoes-ia:tema";

function lido(): Tema {
  const v = localStorage.getItem(CHAVE);
  return v === "claro" || v === "escuro" ? v : "auto";
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(lido);
  const [sistemaEscuro, setSistemaEscuro] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches);
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "auto") {
      delete raiz.dataset.tema;
      localStorage.removeItem(CHAVE);
    } else {
      raiz.dataset.tema = tema;
      localStorage.setItem(CHAVE, tema);
    }
  }, [tema]);

  const escuro = tema === "auto" ? sistemaEscuro : tema === "escuro";
  const alternar = useCallback(() => setTema(escuro ? "claro" : "escuro"), [escuro]);

  return { escuro, alternar };
}
