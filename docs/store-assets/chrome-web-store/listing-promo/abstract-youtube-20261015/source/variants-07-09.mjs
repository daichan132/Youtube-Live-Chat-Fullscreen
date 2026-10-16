export default function variants(h) {
  const { red, ink, text, play, corners, video, pane, bubble } = h

  return [
    {
      id: '07',
      nameJa: '余白と左チャット',
      conceptNote: '白い余白と細い画面の輪郭。赤いチャットを左側に置き、位置を変えられる機能を抽象化する。',
      background: '#ffffff',
      body:
        text('YouTube', 24, 39, 22) +
        text('Fullscreen', 416, 42, 30, ink, 'text-anchor="end"') +
        video(72, 66, 296, '#ffffff', ink) +
        pane(85, 80, 76, 132, { fill: red, stroke: red, detail: '#ffffff', accent: '#ffffff' }) +
        play(244, 133, 25, ink) +
        text('Live Chat', 220, 260, 30, ink, 'text-anchor="middle"'),
    },
    {
      id: '08',
      nameJa: '黒いシンボル',
      conceptNote: '黒地に白い全画面の四隅と再生記号。ひとつの赤い吹き出しでライブチャットを示す。',
      background: ink,
      body:
        text('YouTube', 220, 37, 22, '#ffffff', 'text-anchor="middle"') +
        text('Fullscreen', 220, 78, 30, '#ffffff', 'text-anchor="middle"') +
        video(100, 95, 240, 'none', 'none') +
        corners(100, 95, 240, 135, 22, '#ffffff', 3) +
        play(158, 151, 24, '#ffffff') +
        bubble(250, 115, 65, 79, red, '#ffffff') +
        text('Live Chat', 220, 258, 30, '#ffffff', 'text-anchor="middle"'),
    },
    {
      id: '09',
      nameJa: '三語と小さな画面',
      conceptNote: '左に三つの言葉、右に小さな全画面の図。明るい紙面のような背景と少ない図形で機能を伝える。',
      background: '#f8f7f3',
      body:
        text('YouTube', 24, 107, 22) +
        text('Fullscreen', 24, 143, 26) +
        text('Live Chat', 24, 179, 26, red) +
        video(208, 90, 208, 'none', 'none') +
        corners(208, 90, 208, 117, 14, ink, 2.5) +
        play(253, 134, 23, ink) +
        bubble(338, 107, 59, 76, red, '#ffffff'),
    },
  ]
}
