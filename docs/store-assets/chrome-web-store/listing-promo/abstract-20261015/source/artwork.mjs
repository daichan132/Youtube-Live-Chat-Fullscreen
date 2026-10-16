const W = 440
const H = 280
const red = '#ff4549'
const ink = '#161619'

const text = (value, x, y, size, color = ink, extra = '') =>
  `<text data-copy="true" x="${x}" y="${y}" font-size="${size}" fill="${color}" letter-spacing="-0.9" ${extra}>${value}</text>`
const play = (x, y, size, color) => `<path d="M${x} ${y}l${size} ${size * 0.62}l-${size} ${size * 0.62}Z" fill="${color}"/>`
const corners = (x, y, w, h, size, color, stroke = 3) =>
  `<path d="M${x + size} ${y}H${x}V${y + size}M${x + w - size} ${y}H${x + w}V${y + size}M${x} ${y + h - size}V${y + h}H${x + size}M${x + w - size} ${y + h}H${x + w}V${y + h - size}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="square"/>`
const pane = (x, y, w, h, { fill = '#fff', stroke = ink, detail = ink, accent = red } = {}) => {
  const rowY = [y + 27, y + 44, y + 61]
  return `<g data-chat="true">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>
    <path d="M${x + 10} ${y + 11}h${w - 20}" stroke="${detail}" stroke-width="1.5" opacity=".55"/>
    ${rowY.map((cy, i) => `<circle cx="${x + 11}" cy="${cy}" r="3" fill="${accent}"/><path d="M${x + 21} ${cy}h${w - 31 - i * 4}" stroke="${detail}" stroke-width="2" stroke-linecap="round"/>`).join('')}
    <path d="M${x + 9} ${y + h - 17}h${w - 33}" stroke="${detail}" stroke-width="1.5" opacity=".5"/>
    <path d="M${x + w - 16} ${y + h - 22}l8 5l-8 5Z" fill="${detail}"/>
  </g>`
}
const video = (x, y, w, fill, stroke = ink) =>
  `<rect data-video="true" x="${x}" y="${y}" width="${w}" height="${(w * 9) / 16}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.7"/>`

export const createArtwork = fontBase64 => {
  const wrap = (
    id,
    name,
    description,
    background,
    body,
  ) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title-${id} desc-${id}">
  <title id="title-${id}">Fullscreen Live Chat — ${name}</title>
  <desc id="desc-${id}">${description}</desc>
  <defs><style>@font-face{font-family:YLCInter;font-style:normal;font-weight:500;src:url(data:font/woff2;base64,${fontBase64}) format('woff2')}text{font-family:YLCInter,Arial,sans-serif;font-weight:500}</style></defs>
  <rect width="440" height="280" fill="${background}"/>
  ${body}
</svg>`
  return [
    {
      id: '01',
      nameJa: '白い説明図',
      background: '#ffffff',
      conceptNote: '四隅の全画面マークと、動画の内側にあるチャット。最も素直な機能説明。',
      svg: wrap(
        '01',
        'White diagram',
        'A wide video frame with a play symbol and a compact chat panel entirely inside it.',
        '#ffffff',
        text('Fullscreen', 28, 43, 32) +
          text('Live Chat', 28, 78, 32, red) +
          corners(78, 95, 284, 168.5, 14, red, 3) +
          video(88, 105, 264, '#ffffff') +
          play(165, 164, 23, red) +
          pane(264, 117, 76, 124),
      ),
    },
    {
      id: '02',
      nameJa: '黒いミニマル',
      background: '#141416',
      conceptNote: '左に二つの言葉、右に動画とチャット。余白と輪郭で伝える横並びの構成。',
      svg: wrap(
        '02',
        'Dark minimal',
        'Two large words beside a small wide screen containing a red chat panel.',
        '#141416',
        text('Fullscreen', 24, 132, 30, '#ffffff') +
          text('Live Chat', 24, 168, 30, '#ffffff') +
          corners(218, 81, 200, 120.625, 10, '#ffffff', 2.5) +
          video(225, 88, 186, '#141416', '#ffffff') +
          play(254, 125, 17, '#ffffff') +
          pane(346, 98, 55, 85, { fill: red, stroke: red, detail: '#ffffff', accent: '#ffffff' }),
      ),
    },
    {
      id: '03',
      nameJa: '赤いフルスクリーン',
      background: red,
      conceptNote: 'ひとつの黒い画面に文字とチャットを収める。ストア一覧で輪郭が強い構成。',
      svg: wrap(
        '03',
        'Red fullscreen',
        'A black widescreen stage on red, with Fullscreen Live Chat and a white chat pane inside the stage.',
        red,
        corners(28, 27, 384, 226, 17, '#ffffff', 3) +
          video(40, 38.75, 360, ink, ink) +
          text('Fullscreen', 64, 116, 28, '#ffffff') +
          text('Live Chat', 64, 151, 28, '#ffffff') +
          play(66, 182, 17, red) +
          pane(284, 64, 92, 151, { fill: '#ffffff', stroke: '#ffffff', detail: ink, accent: red }),
      ),
    },
    {
      id: '04',
      nameJa: '四隅と吹き出し',
      background: '#f8f7f3',
      conceptNote: '全画面の四隅・再生・吹き出しの三つの記号で、機能を抽象化する。',
      svg: wrap(
        '04',
        'Corners and chat',
        'Four fullscreen corners contain a play symbol and one red speech bubble.',
        '#f8f7f3',
        text('Fullscreen', 220, 47, 32, ink, 'text-anchor="middle"') +
          corners(100, 74, 240, 135, 24, ink, 3) +
          '<rect data-video="true" x="100" y="74" width="240" height="135" fill="none" stroke="none"/>' +
          play(168, 128, 24, ink) +
          '<g data-chat="true"><path d="M266 101h50a7 7 0 0 1 7 7v45a7 7 0 0 1-7 7h-28l-15 11v-11h-7a7 7 0 0 1-7-7v-45a7 7 0 0 1 7-7Z" fill="' +
          red +
          '"/><path d="M272 119h38M272 130h31M272 141h23" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>' +
          text('Live Chat', 220, 251, 32, ink, 'text-anchor="middle"'),
      ),
    },
  ]
}
