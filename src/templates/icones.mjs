// Ícones em SVG, desenhados aqui (traço de 1,8 em 24×24, pontas redondas). Os de marcas
// (WhatsApp) vêm do Simple Icons (CC0). Todos levam aria-hidden: o texto do botão ou da
// ligação é que diz o que fazem.

const T = (corpo, extra = '') =>
  `<svg class="icone${extra}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${corpo}</svg>`;
const C = (corpo, extra = '') =>
  `<svg class="icone${extra}" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false">${corpo}</svg>`;

export const icones = {
  carrinho: T('<path d="M5.5 8h13l-1.1 11.2a1 1 0 0 1-1 .8H7.6a1 1 0 0 1-1-.8L5.5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
  menu: T('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  fechar: T('<path d="M6 6l12 12M18 6 6 18"/>'),
  seta: T('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  setaEsq: T('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  baixo: T('<path d="m6 9 6 6 6-6"/>'),
  esquerda: T('<path d="m15 6-6 6 6 6"/>'),
  direita: T('<path d="m9 6 6 6-6 6"/>'),
  mais: T('<path d="M12 5v14M5 12h14"/>'),
  menos: T('<path d="M5 12h14"/>'),
  lixo: T('<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.2a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8l1-12.2M9 7V4.5h6V7"/>'),
  email: T('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
  telefone: T('<path d="M6.5 3.5h3l1.5 4.5-2 1.3a11 11 0 0 0 5.7 5.7l1.3-2 4.5 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z"/>'),
  local: T('<path d="M12 21s-7-6.1-7-11.4A7 7 0 0 1 19 9.6C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.6" r="2.6"/>'),
  coracao: T('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>'),
  gravar: T('<path d="M4 20h4.2L19.4 8.8a2.1 2.1 0 0 0-3-3L5.2 17v3"/><path d="m14.5 7.7 3 3"/>'),
  caixa: T('<path d="M4 8.2 12 4l8 4.2v7.6L12 20l-8-4.2V8.2Z"/><path d="m4 8.2 8 4.2 8-4.2M12 12.4V20"/>'),
  camiao: T('<path d="M3 6.5h10.5v9.5H3zM13.5 10h4l3.5 3.5V16h-7.5"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>'),
  regua: T('<path d="M3.5 16.5 16.5 3.5l4 4-13 13-4-4Z"/><path d="m7.5 12.5 1.6 1.6M10.5 9.5l1.6 1.6M13.5 6.5l1.6 1.6"/>'),
  escudo: T('<path d="M12 3.2 19 6v5.2c0 4.6-3 8.1-7 9.6-4-1.5-7-5-7-9.6V6l7-2.8Z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
  presente: T('<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v7.5h14V12M12 8v11.5M12 8C10 5 7.5 4.6 7 6.3S9 8 12 8Zm0 0c2-3 4.5-3.4 5-1.7S15 8 12 8Z"/>'),
  copiar: T('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>'),
  certo: T('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  pausa: T('<path d="M9 6.5v11M15 6.5v11"/>'),
  tocar: T('<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>'),
  folha: T('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-6.5 9.5-8"/>'),
  estrela: T('<path d="m12 4 2.3 4.9 5.2.6-3.9 3.6 1.1 5.2L12 15.6l-4.7 2.7 1.1-5.2-3.9-3.6 5.2-.6L12 4Z"/>'),
  info: T('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>'),
  // categorias
  torre: T('<path d="M7 21V4.5M17 21V4.5M7 9h10M7 14.5h10M7 20h10"/><path d="M7 4.5h10"/>'),
  triangulo: T('<path d="M12 3.5 4 20.5M12 3.5l8 17M7.2 14h9.6M9.2 9.5h5.6"/>'),
  estante: T('<path d="M5 3.5v17M19 3.5v17M5 9h14M5 14.5h14M5 20.5h14"/><path d="M8 9V6.5M10.5 9V7M14.5 14.5v-3"/>'),
  todos: T('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  // marcas
  whatsapp: C('<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z"/>'),
  instagram: T('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8v.01"/>'),
  facebook: C('<path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21h3Z"/>'),
};

// Ícones das «vantagens» na página inicial: maiores, a duas cores (traço castanho, mancha mel).
export const ilustracoes = {
  mao: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false"><circle cx="32" cy="34" r="24" fill="var(--mel-claro)"/><path d="M32 47s-13-8-13-18a7.5 7.5 0 0 1 13-5 7.5 7.5 0 0 1 13 5c0 10-13 18-13 18Z" fill="var(--terracota-claro)" stroke="var(--castanho)" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
  gravar: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false"><circle cx="32" cy="34" r="24" fill="var(--salva-clara)"/><rect x="14" y="36" width="36" height="12" rx="3" fill="var(--madeira)" stroke="var(--castanho)" stroke-width="2.4"/><path d="M20 42.5c3-3 5 3 8 0s5 3 8 0 5 3 8 0" fill="none" stroke="var(--castanho)" stroke-width="2.2" stroke-linecap="round"/><path d="M36 14 46 24l-5 5-10-10 5-5Z" fill="var(--mel)" stroke="var(--castanho)" stroke-width="2.4" stroke-linejoin="round"/><path d="m31 19-3 9 9-3" fill="none" stroke="var(--castanho)" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
  pronto: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false"><circle cx="32" cy="34" r="24" fill="var(--mel-claro)"/><path d="M22 52V18M42 52V18M22 28h20M22 39h20M22 50h20M22 18h20" fill="none" stroke="var(--castanho)" stroke-width="2.6" stroke-linecap="round"/><circle cx="47" cy="17" r="8" fill="var(--salva)" stroke="var(--castanho)" stroke-width="2.2"/><path d="m43.5 17 2.5 2.5 4.5-5" fill="none" stroke="var(--castanho)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  local: `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false"><circle cx="32" cy="34" r="24" fill="var(--salva-clara)"/><path d="M32 52s-14-12-14-23a14 14 0 0 1 28 0c0 11-14 23-14 23Z" fill="var(--terracota-claro)" stroke="var(--castanho)" stroke-width="2.4" stroke-linejoin="round"/><circle cx="32" cy="29" r="5" fill="var(--papel)" stroke="var(--castanho)" stroke-width="2.4"/></svg>`,
};
