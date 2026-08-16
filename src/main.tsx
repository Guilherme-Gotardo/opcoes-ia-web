import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.tsx";
import { Carteira } from "./paginas/Carteira";
import { Estrategia } from "./paginas/Estrategia";
import { Mercado } from "./paginas/Mercado";
import { OperacoesPagina } from "./paginas/Operacoes";
import "./index.css";

/*
 * Rotas aninhadas sob `App`, que é a casca: barra, menu e o `Outlet` onde a
 * tela entra. O painel é buscado uma vez em `App` e chega às telas pelo
 * contexto do Outlet — ver a nota em `App.tsx`.
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Carteira /> },
      { path: "operacoes", element: <OperacoesPagina /> },
      { path: "estrategia", element: <Estrategia /> },
      { path: "mercado", element: <Mercado /> },
      // Endereço desconhecido cai na carteira em vez de tela em branco.
      { path: "*", element: <Carteira /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
