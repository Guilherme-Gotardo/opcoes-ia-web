/**
 * Ícones inline, 16px, herdando `currentColor`.
 *
 * Existem por uma razão de acessibilidade, não de enfeite: cor de status
 * (bom / atenção / crítico) nunca pode ser o único canal — quem não separa
 * verde de vermelho precisa do ícone e do rótulo ao lado. Por isso todo selo
 * de status neste app carrega um destes.
 */
type Props = { className?: string };

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
};

export const IconeOk = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconeAlerta = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconeInfo = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export const IconeRelogio = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const IconeX = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </svg>
);

export const IconeSubiu = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const IconeDesceu = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M7 7l10 10M17 9v8H9" />
  </svg>
);

export const IconeEstavel = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M5 12h14" />
  </svg>
);

export const IconeAtualizar = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </svg>
);

export const IconeSol = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconeLua = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export const IconeCarteira = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
    <path d="M16 12h.01" />
  </svg>
);

export const IconeGrafico = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="m7 15 3-4 3 2 4-6" />
  </svg>
);

export const IconeLista = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const IconeIdeia = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
  </svg>
);

export const IconeEtiqueta = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.8 8.8a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8Z" />
    <path d="M7 7h.01" />
  </svg>
);

export const IconeBussola = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m16.2 7.8-2.9 6.5-6.5 2.9 2.9-6.5Z" />
  </svg>
);

export const IconeCalendario = ({ className }: Props) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconeCopiar = ({ className }: Props) => (
  <svg {...base} className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconeRaio = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);

export const IconeSeta = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
