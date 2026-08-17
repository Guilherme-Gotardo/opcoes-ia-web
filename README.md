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

Ferramenta de **um usuário só**, publicada por CloudFront sobre bucket S3
privado. O bundle e publico, mas nenhum dado vem nele: Cognito exige
authorization code + PKCE, senha e TOTP antes de a API Gateway aceitar leitura
ou escrita. O browser guarda somente o access token e sua expiracao em
`sessionStorage`; nao existe client secret, credencial AWS ou string do banco
neste repositorio.

## Stack

- React 19 + TypeScript
- Vite
- oxlint

## Rodando

No modo local, Cognito fica desligado e a API continua em loopback:

```bash
# no repositório opcoes-ia
python -m src.api          # sobe em http://127.0.0.1:8000

# aqui
npm install
npm run dev                # http://localhost:5173
```

O build de producao usa as configuracoes publicas de `.env.production`: endpoint
regional `execute-api`, Hosted UI, app client sem secret, callback
`/auth/callback` e logout. Antes de publicar, a API e o app client precisam ter
exatamente a origem/callback `https://d1krzquhhr159h.cloudfront.net` e o escopo
`opcoes-ia/api`.

O workflow `deploy-aws.yml` usa OIDC, sem chave AWS permanente. Ele gera os
tipos contra o OpenAPI versionado do repositório principal, executa lint/build,
publica assets content-addressed com cache imutável, publica o shell sem cache e
invalida a distribuição somente depois do upload completo.

## Tipos gerados do contrato

`src/api/schema.d.ts` é GERADO do OpenAPI que a API publica — nunca edite à
mão. Quando o contrato mudar no Python:

```bash
# no repositório opcoes-ia
python -m src.api --schema openapi.json

# aqui
npm run gerar-tipos
npm run build              # um campo renomeado quebra AQUI, não em runtime
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Type-check (`tsc -b`) e build de produção |
| `npm run lint` | oxlint |
| `npm run preview` | Serve o build local |

## Estado

Painel em quatro telas com roteamento. A leitura consome nove endpoints; o
cadastro escreve por três.

| Tela | Módulos |
|---|---|
| `/` Carteira | Patrimônio, Exposição — o que atravessa as duas classes |
| `/acoes` Ações | Posições em ação, cadastro de ativo e de posição |
| `/opcoes` Opções | Operações, posições em opção, cadastro de opção |
| `/estrategia` Estratégia | Recomendações, Acompanhamento, Resultados |
| `/mercado` Mercado | Gráfico, Tickers, Saúde da coleta |

### Cadastro por busca, não por digitação

`add_ativo` exige nome e nunca o deriva do ticker (regra 1: o sistema não
inventa dado). A consequência era digitar nome e CNPJ à mão — e um dígito
trocado no CNPJ raiz quebra o vínculo com o dump da CVM em silêncio: o
calendário de resultados fica vazio para aquele ativo e nada aponta a
causa.

O cadastro busca no catálogo da B3 (`/catalogo`) e preenche nome, tipo e
CNPJ da fonte. Isso não afrouxa a regra — troca a ORIGEM do dado, de "o
que o usuário lembrou" para "o que o provedor publica". Os campos seguem
editáveis, porque a fonte erra também.

Três armadilhas da fonte que a tela trata em vez de repassar:

- **Nome igual ao ticker.** BDR e fundos voltam com `name` sendo o próprio
  código. Aceitar seria derivar o nome do ticker pela porta dos fundos.
- **Mercado fracionário** (`PETR4F`). Cadastrar criaria uma segunda
  entidade para a mesma empresa, com as posições divididas entre duas
  linhas que deveriam ser uma.
- **Tipos que não cabem.** ETF, FI-Infra, FI-Agro, FIP e FIDC são todos
  `fund` na fonte, e `ativos.tipo` só tem ação, FII e BDR. Mapear ETF para
  "fii" classificaria errado em silêncio.

Candidato com impedimento continua na lista, com o motivo — sumir sem
explicação faria o usuário procurar de novo pelo mesmo ticker.

### Ação e opção não dividem tabela

São grandezas diferentes: numa, quantidade é lote e preço é cotação; na
outra, quantidade é contrato lançado e "preço" é prêmio recebido. O backend
já as separa — `total_patrimonio` conta **só ação**, porque o valor de uma
opção deriva das mesmas ações e somar seria contagem dupla.

Misturadas na mesma tabela, dois números saíam errados e ninguém percebia: o
prêmio de opção lançada (quantidade negativa) era **subtraído** do custo das
ações, e as opções sem cotação entravam na contagem de "posições sem
cotação" — um aviso sobre ações que na verdade falava de opções. `metricas()`
passou a receber a classe.

O cadastro de ATIVO fica só em Ações: `ativos` guarda ação, FII e BDR, e o
código de uma opção não é linha lá — nem será.

O agrupamento segue a pergunta, não a fonte: cada tela junta o que se olha
ao mesmo tempo, mesmo vindo de endpoints diferentes. `usePainel` fica na
casca e os dados chegam às telas pelo contexto do `Outlet` — buscar por tela
recarregaria a carteira a cada navegação, e o mesmo recurso alimenta
módulos de telas diferentes.

| Módulo | Fonte | O que mostra |
|---|---|---|
| Patrimônio | `/carteira` | Total a mercado, custo, resultado não realizado e concentração |
| Recomendações | `/sugestoes` | Sugestões em aberto com o snapshot de critérios |
| Investimentos | `/carteira` | Posições, com preço médio ao lado do preço de mercado |
| Cadastro | `/ativos`, `/posicoes` | Cadastro de ativo e registro/encerramento de posição |
| Operações | `/operacoes` | Vendas cobertas com distância do strike, cenários e resultado líquido estimado |
| Gráfico | `/candles` | Velas OHLC com preço médio e cotação marcados |
| Exposição | `/carteira` | Fatia de cada ativo-objeto no patrimônio |
| Tickers | `/cotacoes` + `/parametros` | Cotação, idade da coleta e a janela de frescor vigente |
| Acompanhamento | `/desfecho` | Por que (não) saiu sugestão, critério a critério |
| Resultados | `/resultados` | Calendário de divulgação, com tier de confiança e o que está registrado mas não consolidado |
| Saúde da coleta | `/saude-coleta` | Última entrega de cada fonte e orçamento diário de requests |

Cada módulo carrega o próprio erro — `/desfecho` fora do ar não apaga a
carteira da tela. Só quando TODOS falham a interface conclui que a API
está fora.

Como as regras do projeto principal aparecem na interface:

- **Preço médio é custo.** Fica numa coluna própria, ao lado do preço de
  mercado, com peso visual menor. A linha de total não soma colunas de preço
  unitário; o custo total tem nome próprio no rodapé.
- **Patrimônio parcial é declarado.** O aviso fica junto do número, com os
  tickers e os motivos, e o resultado diz sobre quantas posições foi apurado.
- **Nada é ordem.** Não há botão de executar em lugar nenhum, e toda sugestão
  carrega o aviso de revisão humana.
- **Ausência de sugestão é resultado, não falha.** O estado vazio explica isso
  e leva ao acompanhamento, que mostra em qual critério cada opção parou.

### Duas famílias de cor que não se misturam

- **Direção de preço** (`--ganho` / `--perda`): verde e vermelho, exclusivos
  disto.
- **Estado do dado** (`--estado-ok`, `--estado-obsoleto`,
  `--estado-bloqueado`, `--estado-indisponivel`): hue próprio.

Cotação velha não é prejuízo e ausência de dado não é queda — se verde
significasse "dado ok" e "lucro" ao mesmo tempo, um pregão vermelho
competiria com uma cotação ausente pelo mesmo sinal. Todos os tons foram
validados para contraste AA de texto sobre as superfícies reais do app, nos
dois temas. Cor nunca é o único canal: todo selo de estado vem com ícone e
rótulo.

### Ausência de dado tem nome

Não existe `—` solto. O componente `Ausente` nomeia a consequência no lugar
onde ela aparece: "sem cotação" numa célula de preço, "não valorizado" numa
de valor, "não apurado" no resultado, "fora do total" na participação. O
`motivo_sem_cotacao` da API vira o `title`.

### Estado vazio mostra o comando que destrava

Quando falta um passo no repositório principal, a tela mostra o comando
exato — com botão de copiar — em vez de descrever o passo em prosa.

### Registrar não é consolidar, e a tela mostra isso

O módulo de resultados começa pelas datas que estão em
`earnings_manual_entries` e nunca foram promovidas por `earnings.ingest`.
É o estado mais caro do fluxo justamente por ser silencioso: a data existe
no banco, o motor de opções não a enxerga, e a avaliação segue bloqueada
como se não houvesse data. Cada pendência vem com o comando que a resolve.

### Data pura não tem fuso

`data()` em `src/lib/formato.ts` monta `YYYY-MM-DD` como meia-noite LOCAL em
vez de passar por `new Date(iso)`. O caminho ingênuo lê a string como
meia-noite UTC e, renderizada em UTC−3, ela vira o dia anterior — num
calendário de divulgação de resultado, um dia de erro é exatamente o erro
que o módulo de earnings existe para evitar. Foi um bug real, pego ao
renderizar o estado preenchido.

### O que a interface NÃO sabe sobre a coleta

O módulo de operação reporta última entrega e orçamento, e declara o próprio
limite: o projeto **não registra execução com erro** em lugar nenhum
(`rastreia_falhas: false` no contrato). "Nada hoje" significa que nada foi
gravado — pode ser fonte quebrada ou dia sem novidade, e o banco não
distingue. Uma timeline de agente de verdade exige instrumentar os ETLs para
gravar cada execução; até lá, a tela não finge saber.

O orçamento é aproximado pela mesma razão honesta: não há contagem de
requests, ele é estimado pelas linhas gravadas e SUBESTIMA quando um request
falha antes de gravar. A API marca `e_aproximacao` e a tela mostra a marca.

### Escrever aqui é escriturar, não operar

O cadastro grava o que você JÁ tem na corretora — a mesma coisa que
`portfolio.manage` faz, com formulário no lugar do terminal. Nada é enviado
para lugar nenhum, e a API não ganhou nenhum endpoint que dispare execução.
A superfície de escrita vive em `src/api/escrita.py`, separada, para que o
guardrail que prova "a leitura não escreve" continue possível de escrever.

Duas decisões de formulário que vêm do domínio: **comprada/lançada é botão**
(o sinal negativo da venda é aplicado pelo código, não digitado — um sinal
trocado inverte a operação inteira), e **ticker de ação é select** do que
está cadastrado, porque o domínio recusa posição em ativo desconhecido.

### O gráfico segue o dado, não o contrário

`/candles` devolve o intervalo junto com as velas e a lista de intervalos
disponíveis para aquele ticker. Passar o ETL a coletar 15m faz a interface
oferecer 15m sem nenhuma mudança no front — era o requisito.

A escala é a das velas. Um marcador distante (preço médio bem abaixo do
mercado, por exemplo) NÃO estica o eixo: ele é fixado na borda com uma seta
e o valor real no rótulo. Esticar espremia as velas numa faixa fina e
tornava ilegível justamente o dado principal.

Posição em opção não vira linha de strike: `posicoes` guarda o código da
opção, não o strike, e derivá-lo exigiria interpretar código B3 — que o
projeto não faz em lugar nenhum.

### Operação aberta não tem lucro realizado

Enquanto a venda coberta está aberta, o prêmio já entrou mas o resultado
ainda não existe: pode virar pó (prêmio inteiro) ou ser exercida (prêmio
mais o resultado da venda ao strike). A tela mostra os **cenários**, não um
"lucro atual" — que seria número inventado.

Não há marcação a mercado da opção: o ETL de opções está bloqueado no plano
do provedor e `opcoes` fica vazia. O que se compara é a cotação da **ação**
com o strike, que para venda coberta responde o essencial — o gatilho do
exercício é o preço da ação, não o da opção. A API declara o limite em
`tem_cotacao_de_opcao` e a tela repete.

Dentro do dinheiro usa tom de estado, **nunca vermelho**: numa call coberta
significa que a ação subiu e o exercício ficou provável — você
provavelmente sai no lucro. Vermelho contaria a história errada.

### Resultado líquido é estimativa, não apuração

O cálculo desconta custos e imposto por **perna fiscal** (prêmio da opção e
venda da ação ao strike têm tratamentos diferentes, e a isenção mensal vale
para ação e não para opção). Mas a apuração de verdade é mensal, consolida
operações e carrega prejuízo — nada disso acontece aqui. Alíquotas e custos
ficam em `src/fiscal/tributos.yaml` no repositório principal.

### Encerrar pede confirmação porque é irreversível

Não existe reabrir posição. O diálogo coleta o desfecho (expirou,
recomprada, exercida), que o backend passa a exigir porque sem ele não há
resultado a apurar — e de quebra impede perda de dado por engano de mira.

## O que o contrato ainda não tem

Dados que o modelo de referência assume e a API não expõe: variação do dia
(`/carteira` devolve só preço corrente), nome do ativo por ticker na
carteira, e os campos de opção (delta, IV, IV rank) fora do blob
`criterios`. Para marcar strike de opção no gráfico faltaria guardar strike
e vencimento em `posicoes` — hoje só o código da opção é registrado.

Próximo: as telas de escrita (`assets.manage`, `portfolio.manage`,
`earnings.manage`).
