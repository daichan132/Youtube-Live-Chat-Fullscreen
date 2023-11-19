import styles from '../styles/Switch.module.scss';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const Switch = (props: Props) => {
  const { checked, onChange } = props;
  return (
    <div className={styles['wrapper']}>
      <input
        className={styles['input']}
        id="switch"
        type="checkbox"
        checked={checked}
        onChange={() => {
          onChange(!checked);
        }}
      />
      <label className={styles['label']} htmlFor="switch"></label>
    </div>
  );
};
