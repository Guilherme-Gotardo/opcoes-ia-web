/**
 * Gráfico de velas com as posições marcadas.
 *
 * O INTERVALO VEM DO DADO, NÃO DO CÓDIGO
 * --------------------------------------
 * A tela oferece os intervalos que a API diz existir para aquele ticker
 * (`intervalos_disponiveis`) e desenha o que vier. Passar o ETL a coletar
 * 15m faz o gráfico acompanhar sem tocar aqui — era o requisito.
 *
 * VERDE E VERMELHO AQUI SÃO LEGÍTIMOS
 * -----------------------------------
 * O resto do painel reserva essa dupla para direção de preço e usa tons
 * próprios para estado de dado. Uma vela É direção de preço: fechamento
 * acima da abertura é alta. É o único lugar onde a cor carrega o dado
 * diretamente — e mesmo assim o corpo tem forma (cheio/vazado) para não
 * depender só dela.
 *
 * O QUE NÃO É MARCADO, E POR QUÊ
 * ------------------------------
 * Posição em opção não vira linha de strike: `posicoes` guarda o CÓDIGO da
 * opção (PETRI450) e não o strike, e derivá-lo exigiria fazer parsing de
 * código B3 — que este projeto não faz em lugar nenhum, de propósito.
 * Marcar um strike adivinhado num gráfico de preço seria inventar o número
 * mais perigoso da tela.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Candles, type Carteira, type Vela } from "../api/client";
import { Cartao } from "../componentes/Cartao";
import { Comando } from "../componentes/Comando";
import { Estado } from "../componentes/Estado";
import { IconeAlerta, IconeGrafico } from "../componentes/Icones";
import { brl, dataHora, numero, preco } from "../lib/formato";

const ALTURA = 340;
const PAD = { topo: 16, base: 30, esq: 8, dir: 62 };
/** Espessura máxima do corpo, pela mesma regra das outras barras do painel. */
const CORPO_MAXIMO = 24;

type Marcador = { preco: number; rotulo: string; classe: string };

/** Ticks "redondos" para o eixo de preço, em vez de divisões cruas. */
function ticksDePreco(min: number, max: number, alvo = 5): number[] {
  const bruto = (max - min) / alvo;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ??
    potencia * 10;
  const inicio = Math.ceil(min / passo) * passo;
  const ticks: number[] = [];
  for (let v = inicio; v <= max; v += passo) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/**
 * Rótulo do eixo do tempo.
 *
 * Numa série intradiária de vários dias, só a hora produz "10:00, 14:00,
 * 11:00, 15:00" — que parece desordenado quando na verdade é o dia virando.
 * Por isso a data entra no primeiro rótulo de cada dia; os demais mostram
 * só a hora, e a leitura fica em ordem.
 */
function rotuloDoEixoX(iso: string, intervalo: string, anterior?: string): string {
  const d = new Date(iso);
  const intradiario = /m$|h$/.test(intervalo);
  if (!intradiario) {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const mudouODia =
    anterior == null || new Date(anterior).toDateString() !== d.toDateString();
  return mudouODia
    ? `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`
    : hora;
}

function Velas({
  velas,
  intervalo,
  marcadores,
  largura,
}: {
  velas: Vela[];
  intervalo: string;
  marcadores: Marcador[];
  largura: number;
}) {
  const [sobre, setSobre] = useState<number | null>(null);

  const plotW = Math.max(80, largura - PAD.esq - PAD.dir);
  const plotH = ALTURA - PAD.topo - PAD.base;

  /*
   * A escala é a das VELAS. Esticar o domínio para caber um marcador
   * distante espremia o preço em uma faixa fina no topo — a posição
   * aparecia, e o dado principal ficava ilegível. Marcador longe demais é
   * fixado na borda e rotulado como fora de escala: some da posição exata,
   * nunca da tela, e não sequestra o eixo.
   */
  const precos = velas.flatMap((v) => [v.maxima, v.minima]);
  const cru = { min: Math.min(...precos), max: Math.max(...precos) };
  const amplitude = cru.max - cru.min || cru.max * 0.02 || 1;
  const folga = amplitude * 0.08;

  // Um marcador dentro desta margem entra no domínio; além dela, é fixado.
  const margem = amplitude * 0.35;
  const dentro = marcadores
    .map((m) => m.preco)
    .filter((p) => p >= cru.min - margem && p <= cru.max + margem);

  const min = Math.min(cru.min - folga, ...dentro);
  const max = Math.max(cru.max + folga, ...dentro);

  const y = (p: number) =>
    PAD.topo + ((max - Math.min(Math.max(p, min), max)) / (max - min)) * plotH;
  const foraDaEscala = (p: number) => p < min || p > max;
  const faixa = plotW / velas.length;
  const x = (i: number) => PAD.esq + faixa * (i + 0.5);
  const corpo = Math.max(1, Math.min(CORPO_MAXIMO, faixa * 0.62));

  const ticks = ticksDePreco(min, max);
  const passoRotulo = Math.max(1, Math.ceil(velas.length / 8));
  const ativa = sobre != null ? velas[sobre] : null;

  return (
    <div className="grafico__area">
      <svg
        width={largura}
        height={ALTURA}
        role="img"
        aria-label={`Gráfico de velas de ${intervalo} com ${velas.length} períodos`}
        onMouseLeave={() => setSobre(null)}
        onMouseMove={(e) => {
          const caixa = e.currentTarget.getBoundingClientRect();
          const rel = e.clientX - caixa.left - PAD.esq;
          const i = Math.floor(rel / faixa);
          setSobre(i >= 0 && i < velas.length ? i : null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              className="grafico__grade"
              x1={PAD.esq}
              x2={PAD.esq + plotW}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="grafico__tick" x={PAD.esq + plotW + 6} y={y(t) + 4}>
              {t.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </text>
          </g>
        ))}

        {velas.map((v, i) => {
          const alta = v.fechamento >= v.abertura;
          const topoCorpo = y(Math.max(v.abertura, v.fechamento));
          const alturaCorpo = Math.max(1, Math.abs(y(v.abertura) - y(v.fechamento)));
          return (
            <g
              key={v.abertura_em}
              className={`vela vela--${alta ? "alta" : "baixa"}${
                sobre === i ? " vela--sobre" : ""
              }`}
            >
              <line x1={x(i)} x2={x(i)} y1={y(v.maxima)} y2={y(v.minima)} />
              <rect
                x={x(i) - corpo / 2}
                y={topoCorpo}
                width={corpo}
                height={alturaCorpo}
                rx={1}
              />
            </g>
          );
        })}

        {marcadores.map((m) => {
          const fora = foraDaEscala(m.preco);
          return (
            <g
              key={m.rotulo}
              className={`marcador ${m.classe}${fora ? " marcador--fora" : ""}`}
            >
              <line x1={PAD.esq} x2={PAD.esq + plotW} y1={y(m.preco)} y2={y(m.preco)} />
              <text x={PAD.esq + plotW + 6} y={y(m.preco) + 4}>
                {fora ? (m.preco < min ? "↓ " : "↑ ") : ""}
                {m.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </text>
            </g>
          );
        })}

        {velas.map((v, i) =>
          i % passoRotulo === 0 ? (
            <text
              key={`r-${v.abertura_em}`}
              className="grafico__tick"
              x={x(i)}
              y={ALTURA - 10}
              textAnchor="middle"
            >
              {rotuloDoEixoX(
                v.abertura_em,
                intervalo,
                // O rótulo anterior DESENHADO, não a vela anterior: é com
                // ele que o leitor compara.
                i >= passoRotulo ? velas[i - passoRotulo].abertura_em : undefined,
              )}
            </text>
          ) : null,
        )}

        {sobre != null && (
          <line
            className="grafico__cursor"
            x1={x(sobre)}
            x2={x(sobre)}
            y1={PAD.topo}
            y2={PAD.topo + plotH}
          />
        )}
      </svg>

      {/* Tooltip em HTML, não em SVG: texto fluido e legível sem reinventar
          quebra de linha dentro do desenho. */}
      {ativa && (
        <div
          className="grafico__dica"
          style={{
            insetInlineStart: `${Math.min(Math.max(x(sobre!) - 80, 0), largura - 170)}px`,
          }}
        >
          <p className="grafico__dica-quando">{dataHora(ativa.abertura_em)}</p>
          <dl>
            <div><dt>Abertura</dt><dd className="num">{preco(ativa.abertura)}</dd></div>
            <div><dt>Máxima</dt><dd className="num">{preco(ativa.maxima)}</dd></div>
            <div><dt>Mínima</dt><dd className="num">{preco(ativa.minima)}</dd></div>
            <div><dt>Fechamento</dt><dd className="num">{preco(ativa.fechamento)}</dd></div>
            {ativa.volume != null && (
              <div><dt>Volume</dt><dd className="num">{numero(ativa.volume)}</dd></div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

type Props = {
  carteira: Carteira | null;
};

export function Grafico({ carteira }: Props) {
  const acoes = useMemo(
    () => (carteira?.posicoes ?? []).filter((p) => p.tipo_ativo === "ACAO"),
    [carteira],
  );

  const [ticker, setTicker] = useState<string>("");
  const [intervalo, setIntervalo] = useState("1h");
  const [dados, setDados] = useState<Candles | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [largura, setLargura] = useState(760);
  const caixa = useRef<HTMLDivElement>(null);

  // Primeiro ticker da carteira, assim que ela chega.
  useEffect(() => {
    if (ticker === "" && acoes.length > 0) setTicker(acoes[0].ticker);
  }, [acoes, ticker]);

  // Largura real em vez de viewBox escalado: assim o texto do eixo não
  // cresce junto com o gráfico em tela larga.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setLargura(Math.max(320, e.contentRect.width)),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!ticker) return;
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    api
      .candles(ticker, intervalo)
      .then((d) => {
        if (!cancelado) setDados(d);
      })
      .catch((e: Error) => {
        if (!cancelado) setErro(e.message);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [ticker, intervalo]);

  /*
   * O mesmo ticker pode ter vários lotes, cada um com seu preço médio.
   * Marcar só o primeiro mostraria um custo que não é o da posição — a
   * linha certa é a média PONDERADA pela quantidade. É aritmética sobre o
   * que a API devolveu, não critério.
   */
  const lotes = useMemo(
    () => acoes.filter((p) => p.ticker === ticker),
    [acoes, ticker],
  );
  const posicao = useMemo(() => {
    if (lotes.length === 0) return null;
    const quantidade = lotes.reduce((t, p) => t + p.quantidade, 0);
    const custo = lotes.reduce((t, p) => t + p.quantidade * p.preco_medio, 0);
    return {
      quantidade,
      lotes: lotes.length,
      precoMedio: quantidade !== 0 ? custo / quantidade : lotes[0].preco_medio,
      precoMercado: lotes.find((p) => p.preco_mercado != null)?.preco_mercado ?? null,
    };
  }, [lotes]);

  const marcadores: Marcador[] = [];
  if (posicao) {
    marcadores.push({
      preco: posicao.precoMedio,
      rotulo: "preco-medio",
      classe: "marcador--custo",
    });
    if (posicao.precoMercado != null) {
      marcadores.push({
        preco: posicao.precoMercado,
        rotulo: "mercado",
        classe: "marcador--mercado",
      });
    }
  }

  const disponiveis = dados?.intervalos_disponiveis ?? [];

  return (
    <Cartao
      id="grafico"
      icone={<IconeGrafico />}
      titulo="Gráfico dos tickers"
      nota="Velas OHLC com o preço médio da sua posição e a cotação atual marcados. O intervalo é o que houver coletado."
      acoes={
        <div className="grafico__controles">
          <select
            className="campo"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            aria-label="Ticker do gráfico"
          >
            {acoes.map((p) => (
              <option key={p.ticker} value={p.ticker}>
                {p.ticker}
              </option>
            ))}
          </select>
          {disponiveis.length > 0 && (
            <div className="filtros" role="group" aria-label="Intervalo">
              {disponiveis.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`filtro${intervalo === i ? " filtro--ativo" : ""}`}
                  aria-pressed={intervalo === i}
                  onClick={() => setIntervalo(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div ref={caixa} className="grafico">
        {acoes.length === 0 ? (
          <Estado titulo="Nenhuma ação em carteira">
            O gráfico segue as ações que você tem. Registre uma posição no cadastro.
          </Estado>
        ) : erro ? (
          <Estado tom="erro" icone={<IconeAlerta />} titulo="Não foi possível ler as velas">
            {erro}
          </Estado>
        ) : carregando && dados == null ? (
          <Estado titulo="Carregando velas…" />
        ) : (dados?.velas.length ?? 0) === 0 ? (
          <Estado
            icone={<IconeGrafico />}
            titulo={`Nenhuma vela coletada para ${ticker}`}
            acao={
              <Comando>
                {`python -m src.etl.fetch_candles --tickers ${ticker} --intervalo ${intervalo}`}
              </Comando>
            }
          >
            As velas vêm de um ETL próprio, separado da cotação: cotação é preço num
            instante, vela é o resumo de um período.
          </Estado>
        ) : (
          <>
            <Velas
              velas={dados!.velas}
              intervalo={dados!.intervalo}
              marcadores={marcadores}
              largura={largura}
            />
            <ul className="grafico__legenda">
              <li>
                <span className="chave chave--alta" aria-hidden /> alta no período
              </li>
              <li>
                <span className="chave chave--baixa" aria-hidden /> baixa no período
              </li>
              {posicao && (
                <li>
                  <span className="chave chave--custo" aria-hidden /> preço médio ·{" "}
                  <span className="num">{brl(posicao.precoMedio)}</span>
                  {posicao.lotes > 1 && (
                    <span className="grafico__nota-legenda">
                      ponderado de {numero(posicao.lotes)} lotes
                    </span>
                  )}
                </li>
              )}
              {posicao?.precoMercado != null && (
                <li>
                  <span className="chave chave--mercado" aria-hidden /> cotação ·{" "}
                  <span className="num">{brl(posicao.precoMercado)}</span>
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      {(dados?.velas.length ?? 0) > 0 && (
        <p className="cartao__rodape">
          <span>
            {numero(dados!.velas.length)} velas de {dados!.intervalo}. Posição em opção
            não vira linha aqui: o banco guarda o código da opção, não o strike, e
            derivá-lo exigiria interpretar código B3 — a tela não adivinha o número
            mais perigoso do gráfico.
          </span>
        </p>
      )}
    </Cartao>
  );
}
