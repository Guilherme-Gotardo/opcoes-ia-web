/**
 * Comando que destrava um estado.
 *
 * A ideia é simples e vale muito numa ferramenta de um usuário só: quando a
 * tela está vazia porque falta um passo no repositório principal, ela mostra
 * O COMANDO exato daquele passo em vez de descrever o passo em prosa. Some
 * a tradução mental entre "falta cadastrar o ativo" e o que digitar.
 *
 * O botão de copiar existe porque o alvo é o terminal ao lado — copiar é o
 * gesto seguinte em 100% dos casos.
 */
import { useCallback, useEffect, useState } from "react";
import { IconeCopiar, IconeOk } from "./Icones";

export function Comando({ children }: { children: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  const copiar = useCallback(() => {
    // `clipboard` não existe em contexto inseguro; sem ele o comando segue
    // legível na tela, que é o essencial — o botão é conveniência.
    void navigator.clipboard?.writeText(children).then(() => setCopiado(true));
  }, [children]);

  return (
    <div className="comando">
      <code className="comando__texto">
        <span className="comando__cifrao" aria-hidden>
          ${" "}
        </span>
        {children}
      </code>
      <button
        type="button"
        className="comando__copiar"
        onClick={copiar}
        aria-label={`Copiar comando: ${children}`}
      >
        {copiado ? <IconeOk /> : <IconeCopiar />}
        {copiado ? "copiado" : "copiar"}
      </button>
    </div>
  );
}
