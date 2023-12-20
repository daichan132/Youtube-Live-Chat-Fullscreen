import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCFontFamilyChange } from '../../../hooks/YTDLiveChatSetting/useYLCFontFamilyChange';
import styles from '../../../styles/YTDLiveChatSetting/FontFamily.module.scss';

export const FontFamilyInput = () => {
  const { changeFontFamily } = useYLCFontFamilyChange();
  const { fontFamily, updateYLCStyleUpdate } = useYTDLiveChatStore(
    useShallow((state) => ({
      fontFamily: state.fontFamily,
      updateYLCStyleUpdate: state.updateYLCStyleUpdate,
    })),
  );
  return (
    <input
      className={styles['input']}
      value={fontFamily}
      onChange={(event) => {
        updateYLCStyleUpdate({ fontFamily: event.target.value });
        changeFontFamily(event.target.value);
      }}
    />
  );
};
