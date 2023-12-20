import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCFontFamilyChange } from '../../../hooks/YTDLiveChatSetting/useYLCFontFamilyChange';
import styles from '../../../styles/YTDLiveChatSetting/FontFamily.module.scss';

export const FontFamilyInput = () => {
  const { changeFontFamily } = useYLCFontFamilyChange();
  const { fontFamily, updateYLCStyle } = useYTDLiveChatStore(
    useShallow((state) => ({
      fontFamily: state.fontFamily,
      updateYLCStyle: state.updateYLCStyle,
    })),
  );
  return (
    <input
      className={styles['input']}
      value={fontFamily}
      onChange={(event) => {
        updateYLCStyle({ fontFamily: event.target.value });
        changeFontFamily(event.target.value);
      }}
    />
  );
};
