export default function variants04To06(h) {
  const { red, ink, text, play, corners, video, pane, bubble } = h
  return [
    {
      id: '04',
      nameJa: '赤いステージ',
      conceptNote: '赤い余白と一つの黒い16:9画面。左に機能名、右に白いチャットを収め、全画面の内側で会話できることを図で伝える。',
      background: red,
      body:
        video(24, 30, 392, ink, ink) +
        corners(24, 30, 392, 220.5, 16, '#ffffff', 3) +
        text('YouTube', 48, 81, 22, '#ffffff') +
        text('Fullscreen', 48, 130, 30, '#ffffff') +
        text('Live Chat', 48, 167, 30, '#ffffff') +
        play(50, 194, 16, red) +
        pane(288, 61, 96, 160, { fill: '#ffffff', stroke: '#ffffff', detail: ink, accent: red }),
    },
    {
      id: '05',
      nameJa: '余白と四隅',
      conceptNote: '白地に四隅、再生、赤い吹き出しを一つずつ。上のFullscreenと右下のLive Chatで、図を挟む非対称な組み方。',
      background: '#ffffff',
      body:
        text('YouTube', 24, 36, 21, ink) +
        text('Fullscreen', 24, 74, 30, ink) +
        video(92, 83, 256, 'none', 'none') +
        corners(92, 83, 256, 144, 23, ink, 3) +
        play(153, 139, 24, ink) +
        bubble(261, 105, 65, 86, red, '#ffffff') +
        text('Live Chat', 416, 258, 30, red, 'text-anchor="end"'),
    },
    {
      id: '06',
      nameJa: '黒地の横組み',
      conceptNote: '黒い背景の左に白い機能名、右に四隅と吹き出し。YouTubeだけを赤にして、小さな一覧でも三つの言葉が読み取れる構成。',
      background: ink,
      body:
        text('YouTube', 24, 44, 22, red) +
        text('Fullscreen', 24, 132, 28, '#ffffff') +
        text('Live Chat', 24, 168, 28, '#ffffff') +
        video(206, 91, 210, 'none', 'none') +
        corners(206, 91, 210, 118.125, 18, '#ffffff', 3) +
        play(246, 135, 19, '#ffffff') +
        bubble(328, 108, 65, 76, red, '#ffffff'),
    },
  ]
}
