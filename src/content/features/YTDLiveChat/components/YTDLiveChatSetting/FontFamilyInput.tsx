import { useYLCFontFamilyChange } from '../../hooks/YTDLiveChatSetting/useYLCFontFamilyChange';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import styles from '../../styles/YTDLiveChatSetting/FontFamily.module.scss';

export const FontFamilyInput = () => {
  const { changeFontFamily } = useYLCFontFamilyChange();
  const { fontFamily, setFontFamily } = useYTDLiveChatStore(
    useShallow((state) => ({ fontFamily: state.fontFamily, setFontFamily: state.setFontFamily })),
  );
  return (
    <input
      className={styles['input']}
      value={fontFamily}
      onChange={(event) => {
        setFontFamily(event.target.value);
        changeFontFamily(event.target.value);
      }}
    />
  );
};
