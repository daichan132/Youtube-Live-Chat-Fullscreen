import emojiRegex from 'emoji-regex';

export const changeImgAlt = (imgNode: any) => {
  const regex = emojiRegex();
  const replacedAlt = imgNode.alt.replace(regex, '');
  if (!replacedAlt) return;
  if (imgNode.dataset.emojiId.indexOf('UCkszU2WH9gy1mb0dV-11UJg/') !== -1) {
    /* ---------------------------- Youtube固有の絵文字の場合 ---------------------------- */
    imgNode.alt = ':' + imgNode.alt + ':';
  } else {
    /* ---------------------------- メンバーシップ専用の絵文字の場合 ---------------------------- */
    imgNode.alt = ':_' + imgNode.alt + ':';
  }
};
