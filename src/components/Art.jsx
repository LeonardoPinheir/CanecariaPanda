// Ilustrações em traço grosso (estilo adesivo) usadas como logotipo e como
// imagem dos produtos que ainda não têm foto.

const INK = '#000';

export function PandaMark({ size = 40, className = '' }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="15" cy="15" r="10" fill={INK} />
      <circle cx="49" cy="15" r="10" fill={INK} />
      <ellipse cx="32" cy="36" rx="25" ry="22" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="22.5" cy="34" rx="6.5" ry="8.5" transform="rotate(-28 22.5 34)" fill={INK} />
      <ellipse cx="41.5" cy="34" rx="6.5" ry="8.5" transform="rotate(28 41.5 34)" fill={INK} />
      <circle cx="23.5" cy="32.5" r="2.2" fill="#fff" />
      <circle cx="40.5" cy="32.5" r="2.2" fill="#fff" />
      <ellipse cx="32" cy="43" rx="3.6" ry="2.6" fill={INK} />
      <path d="M28.5 47.5 Q32 50.5 35.5 47.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="17" cy="44" rx="3.2" ry="2" fill="#F26B1D" opacity=".85" />
      <ellipse cx="47" cy="44" rx="3.2" ry="2" fill="#F26B1D" opacity=".85" />
    </svg>
  );
}

const isDark = (hex = '#fff') => {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 < 110;
};

function splitLines(text) {
  const t = text.trim();
  if (t.length <= 11) return [t];
  const words = t.split(/\s+/);
  if (words.length === 1) return [t.slice(0, 18)];
  let best = [t, ''];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return best.map((l) => l.slice(0, 18));
}

// Caneca grande, com o texto do cliente estampado.
export function Mug({ color = '#ffffff', accent = '', text = '', className = '', title }) {
  const lines = text ? splitLines(text) : [];
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const size = Math.max(22, Math.min(58, 300 / longest));
  const dark = isDark(color);
  const inkOnMug = dark ? '#fff' : INK;
  const handle = accent || color;
  const inside = accent || (dark ? '#2a2a2a' : '#e8e6e1');
  return (
    <svg viewBox="0 0 400 340" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : 'true'}>
      <ellipse cx="180" cy="318" rx="128" ry="11" fill={INK} opacity=".09" />
      <path d="M278 112 C352 108 366 140 366 182 C366 232 342 258 278 256" fill="none" stroke={INK} strokeWidth="44" strokeLinecap="round" />
      <path d="M278 112 C352 108 366 140 366 182 C366 232 342 258 278 256" fill="none" stroke={handle} strokeWidth="32" strokeLinecap="round" />
      <path d="M72 62 L72 278 Q72 308 102 308 L258 308 Q288 308 288 278 L288 62 Z" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M90 92 L90 270" stroke={dark ? '#fff' : INK} strokeOpacity=".12" strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="180" cy="62" rx="108" ry="22" fill={inside} stroke={INK} strokeWidth="6" />
      {lines.length > 0 ? (
        <text x="184" y={190 - ((lines.length - 1) * size) / 2} textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize={size} fill={inkOnMug}>
          {lines.map((l, i) => (
            <tspan key={i} x="184" dy={i === 0 ? 0 : size * 0.98}>{l}</tspan>
          ))}
        </text>
      ) : null}
      <g transform={`translate(${184 - 13} ${lines.length ? 214 + ((lines.length - 1) * size) / 2 : 172})`}>
        <path d="M13 24 C-4 12 2 -1 13 7 C24 -1 30 12 13 24 Z" fill="#F26B1D" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function Shirt({ color }) {
  return (
    <g>
      <path d="M130 70 L95 85 L50 125 L80 165 L105 150 L105 290 L295 290 L295 150 L320 165 L350 125 L305 85 L270 70 Q200 110 130 70 Z" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M150 74 Q200 102 250 74" fill="none" stroke={INK} strokeWidth="5" />
    </g>
  );
}

function Pillow({ color }) {
  return (
    <path d="M80 85 Q200 65 320 85 Q300 180 320 275 Q200 255 80 275 Q100 180 80 85 Z" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
  );
}

function Bottle({ color }) {
  return (
    <g>
      <rect x="170" y="40" width="60" height="34" rx="10" fill="#d9d9d9" stroke={INK} strokeWidth="6" />
      <path d="M178 74 L178 92 Q140 108 140 140 L140 285 Q140 305 160 305 L240 305 Q260 305 260 285 L260 140 Q260 108 222 92 L222 74 Z" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    </g>
  );
}

function Frame({ color }) {
  return (
    <g>
      <rect x="95" y="55" width="210" height="250" rx="8" fill="#8a5a33" stroke={INK} strokeWidth="6" />
      <rect x="118" y="78" width="164" height="204" rx="4" fill={color} stroke={INK} strokeWidth="4" />
      <path d="M128 262 L175 200 L205 235 L230 210 L272 262 Z" fill="#2f7d32" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="245" cy="122" r="16" fill="#F26B1D" stroke={INK} strokeWidth="4" />
    </g>
  );
}

function Cup({ color }) {
  return (
    <g>
      <ellipse cx="190" cy="270" rx="140" ry="26" fill="#fff" stroke={INK} strokeWidth="6" />
      <path d="M262 140 C318 138 322 200 268 214" fill="none" stroke={INK} strokeWidth="30" strokeLinecap="round" />
      <path d="M262 140 C318 138 322 200 268 214" fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" />
      <path d="M100 118 L118 236 Q124 258 150 258 L230 258 Q256 258 262 236 L280 118 Z" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <ellipse cx="190" cy="118" rx="90" ry="18" fill="#6b4226" stroke={INK} strokeWidth="6" />
    </g>
  );
}

function Beer({ color }) {
  return (
    <g>
      <path d="M262 120 L310 120 Q330 120 330 140 L330 230 Q330 250 310 250 L262 250" fill="none" stroke={INK} strokeWidth="22" strokeLinejoin="round" />
      <path d="M262 120 L310 120 Q330 120 330 140 L330 230 Q330 250 310 250 L262 250" fill="none" stroke="#f4f4f4" strokeWidth="10" strokeLinejoin="round" />
      <rect x="100" y="80" width="170" height="225" rx="14" fill={color} stroke={INK} strokeWidth="6" />
      <path d="M96 92 Q110 52 140 70 Q160 40 190 64 Q220 40 245 68 Q275 54 274 96 Z" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M140 120 L140 280 M185 120 L185 280 M230 120 L230 280" stroke="#fff" strokeOpacity=".45" strokeWidth="8" strokeLinecap="round" />
    </g>
  );
}

function Kit({ color }) {
  return (
    <g>
      <path d="M150 120 Q200 30 250 120" fill="none" stroke={INK} strokeWidth="14" />
      <path d="M150 120 Q200 30 250 120" fill="none" stroke="#c99a5b" strokeWidth="6" />
      <path d="M70 120 L330 120 L305 300 L95 300 Z" fill="#d9a766" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M85 165 L315 165 M90 215 L310 215 M95 260 L305 260" stroke={INK} strokeOpacity=".35" strokeWidth="4" />
      <rect x="120" y="70" width="70" height="80" rx="10" fill="#fff" stroke={INK} strokeWidth="6" />
      <rect x="210" y="85" width="60" height="70" rx="6" fill={color} stroke={INK} strokeWidth="6" />
      <path d="M210 120 L270 120 M240 85 L240 155" stroke="#fff" strokeWidth="6" />
    </g>
  );
}

function Box({ color }) {
  return (
    <g>
      <rect x="90" y="110" width="220" height="190" rx="10" fill={color} stroke={INK} strokeWidth="6" />
      <rect x="80" y="85" width="240" height="45" rx="8" fill={color} stroke={INK} strokeWidth="6" />
      <path d="M200 85 L200 300" stroke="#F26B1D" strokeWidth="16" />
    </g>
  );
}

const SHAPES = { camiseta: Shirt, almofada: Pillow, squeeze: Bottle, quadro: Frame, xicara: Cup, chopp: Beer, kit: Kit, outro: Box };

export const ART_KINDS = [
  ['caneca', 'Caneca'], ['xicara', 'Xícara'], ['chopp', 'Caneca de chopp'], ['camiseta', 'Camiseta'],
  ['almofada', 'Almofada'], ['squeeze', 'Squeeze'], ['quadro', 'Quadro'], ['kit', 'Kit / cesta'], ['outro', 'Caixa / outro'],
];

export function ProductArt({ art = {}, label = '', className = '' }) {
  const kind = art.kind || 'caneca';
  if (kind === 'caneca') return <Mug color={art.color} accent={art.accent} text={label} className={className} />;
  const Shape = SHAPES[kind] || Box;
  return (
    <svg viewBox="0 0 400 340" className={className} aria-hidden="true">
      <ellipse cx="200" cy="318" rx="130" ry="11" fill={INK} opacity=".09" />
      <Shape color={art.color || '#fff'} />
    </svg>
  );
}
