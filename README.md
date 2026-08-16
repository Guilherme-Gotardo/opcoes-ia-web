# opcoes-ia-web

Interface web do [opcoes-ia](https://github.com/Guilherme-Gotardo/opcoes-ia) —
plataforma pessoal de acompanhamento de carteira de ações/opções na B3.

Substitui as CLIs de entrada manual (`assets.manage`, `portfolio.manage`,
`earnings.manage`) por telas, e mostra carteira, cotações e sugestões.

## O que este repositório NÃO é

- **Não tem lógica de decisão.** Todo critério de estratégia é determinístico
  e vive em `src/strategy/` no repositório principal. A interface exibe o
  resultado e a justificativa numérica; ela não avalia, não pondera e não
  decide.
- **Não fala com o banco.** Todo acesso a dado passa pela API do projeto
  principal. Não há string de conexão aqui.
- **Não executa ordem.** O sistema inteiro é de sugestão para revisão
  humana — a interface não pode ser a exceção.

## Contexto de uso

Ferramenta de **um usuário só**, rodando **na máquina do usuário**. Não há
cadastro, autenticação ou multi-tenancy, e isso é decisão deliberada: sem
exposição pública, o que protege os dados é a aplicação não ter porta aberta
para a internet. Se um dia isso mudar, vira uma change própria no
repositório principal, com o trade-off documentado.

## Stack

- React 19 + TypeScript
- Vite
- oxlint

## Rodando

Precisa da API do projeto principal no ar:

```bash
# no repositório opcoes-ia
python -m src.api          # (a criar — ver change `expose-portfolio-api`)

# aqui
npm install
npm run dev
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Type-check (`tsc -b`) e build de produção |
| `npm run lint` | oxlint |
| `npm run preview` | Serve o build local |

## Estado

Scaffold inicial. A API que ele consome ainda não existe — está sendo
planejada no repositório principal.
