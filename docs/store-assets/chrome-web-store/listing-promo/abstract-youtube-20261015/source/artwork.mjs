import variants04To06 from './variants-04-06.mjs'
import variants07To09 from './variants-07-09.mjs'

const red = '#ff4549'
const ink = '#161619'
const text = (value, x, y, size, color = ink, extra = '') =>
  `<text data-copy="true" x="${x}" y="${y}" font-size="${size}" fill="${color}" letter-spacing="${size >= 28 ? -0.9 : -0.35}" ${extra}>${value}</text>`
const play = (x, y, size, color) => `<path d="M${x} ${y}l${size} ${size * 0.62}l-${size} ${size * 0.62}Z" fill="${color}"/>`
const corners = (x, y, w, height, size, color, stroke = 3) =>
  `<path d="M${x + size} ${y}H${x}V${y + size}M${x + w - size} ${y}H${x + w}V${y + size}M${x} ${y + height - size}V${y + height}H${x + size}M${x + w - size} ${y + height}H${x + w}V${y + height - size}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="square"/>`
const video = (x, y, w, fill = 'none', stroke = ink) =>
  `<rect data-video="true" x="${x}" y="${y}" width="${w}" height="${(w * 9) / 16}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.7"/>`
const pane = (x, y, w, height, { fill = '#ffffff', stroke = ink, detail = ink, accent = red } = {}) => {
  const pad = Math.min(10, w * 0.14)
  return `<g data-chat="true">
    <rect x="${x}" y="${y}" width="${w}" height="${height}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>
    <path d="M${x + pad} ${y + 11}h${w - 2 * pad}" stroke="${detail}" stroke-width="1.5" opacity=".55"/>
    ${[0.27, 0.45, 0.63].map((fraction, i) => `<circle cx="${x + pad}" cy="${y + height * fraction}" r="3" fill="${accent}"/><path d="M${x + pad + 10} ${y + height * fraction}h${w - 2 * pad - 10 - i * 3}" stroke="${detail}" stroke-width="2" stroke-linecap="round"/>`).join('')}
    <path d="M${x + pad} ${y + height - 16}h${w - 2 * pad - 16}" stroke="${detail}" stroke-width="1.5" opacity=".5"/>
    <path d="M${x + w - 16} ${y + height - 21}l8 5l-8 5Z" fill="${detail}"/>
  </g>`
}
const bubble = (x, y, w, height, fill = red, detail = '#ffffff') => {
  const box = height - 11
  const tail = Math.min(14, w * 0.25)
  return `<g data-chat="true">
    <path d="M${x + 7} ${y}h${w - 14}a7 7 0 0 1 7 7v${box - 14}a7 7 0 0 1-7 7h-${w * 0.46}l-${tail} 11v-11H${x + 7}a7 7 0 0 1-7-7V${y + 7}a7 7 0 0 1 7-7Z" fill="${fill}"/>
    ${[0.3, 0.5, 0.7].map((fraction, i) => `<path d="M${x + 12} ${y + box * fraction}h${w - 24 - i * 4}" stroke="${detail}" stroke-width="2.7" stroke-linecap="round"/>`).join('')}
  </g>`
}

export const createArtwork = fontBase64 => {
  const h = { red, ink, text, play, corners, video, pane, bubble }
  const own = [
    {
      id: '01',
      nameJa: '白い基本形',
      background: '#ffffff',
      conceptNote: '左上に三つの言葉、右下に動画とチャット。輪郭と赤い吹き出しで最小限に伝える。',
      body:
        text('YouTube', 28, 36, 21) +
        text('Fullscreen', 28, 70, 30) +
        text('Live Chat', 28, 104, 30, red) +
        corners(118, 116, 252, 150.5, 14, red, 3) +
        video(128, 126, 232, '#ffffff') +
        play(193, 177, 21, red) +
        bubble(280, 144, 62, 78),
    },
    {
      id: '02',
      nameJa: '白いセンターシンボル',
      background: '#f8f7f3',
      conceptNote: '中央の四隅・再生・吹き出しを、YouTubeと二つの機能名で挟んだ整った構成。',
      body:
        text('YouTube', 220, 34, 21, ink, 'text-anchor="middle"') +
        text('Fullscreen', 220, 70, 30, ink, 'text-anchor="middle"') +
        video(108, 87, 224, 'none', 'none') +
        corners(108, 87, 224, 126, 21, ink, 3) +
        play(171, 136, 22, ink) +
        bubble(256, 105, 59, 74) +
        text('Live Chat', 220, 254, 30, red, 'text-anchor="middle"'),
    },
    {
      id: '03',
      nameJa: '大きな動画とチャット',
      background: '#ffffff',
      conceptNote: 'YouTubeを上に、二つの機能名を横並びに置く。大きな黒い画面に白いチャットを重ねる。',
      body:
        text('YouTube', 28, 37, 21, red) +
        text('Fullscreen', 28, 78, 28) +
        text('Live Chat', 231, 78, 28) +
        video(80, 103, 280, ink, ink) +
        play(150, 163, 22, '#ffffff') +
        pane(250, 116, 96, 131, { fill: '#ffffff', stroke: '#ffffff', detail: ink, accent: red }),
    },
    {
      id: '10',
      nameJa: 'YouTubeを主役に',
      background: ink,
      conceptNote: 'YouTubeを大きく、機能名を一列に。下の白い四隅と赤い吹き出しで機能を示す。',
      body:
        text('YouTube', 28, 51, 32, '#ffffff') +
        text('Fullscreen', 28, 83, 23, red) +
        text('Live Chat', 184, 83, 23, red) +
        video(96, 112, 248, 'none', 'none') +
        corners(96, 112, 248, 139.5, 23, '#ffffff', 3) +
        play(174, 168, 22, '#ffffff') +
        bubble(272, 135, 54, 70),
    },
  ]
  return [...own, ...variants04To06(h), ...variants07To09(h)]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(artwork => ({
      ...artwork,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280" role="img" aria-labelledby="title-${artwork.id} desc-${artwork.id}">
<title id="title-${artwork.id}">YouTube Fullscreen Live Chat — ${artwork.nameJa}</title>
<desc id="desc-${artwork.id}">${artwork.conceptNote}</desc>
<defs><style>@font-face{font-family:YLCInter;font-style:normal;font-weight:500;src:url(data:font/woff2;base64,${fontBase64}) format('woff2')}text{font-family:YLCInter,Arial,sans-serif;font-weight:500}</style></defs>
<rect width="440" height="280" fill="${artwork.background}"/>
${artwork.body}
</svg>`,
    }))
}
