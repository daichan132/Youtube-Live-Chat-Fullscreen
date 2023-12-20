import styles from '../styles/Slider.module.scss';
interface SliderProps {
  value: number;
  sliderRef: React.RefObject<HTMLDivElement>;
}

export const Slider: React.FC<SliderProps> = ({ value, sliderRef }: SliderProps) => {
  return (
    <div ref={sliderRef} className={styles['slider-wrapper']}>
      <div className={styles['slider-track']} />
      <div className={styles['slider-thumb']} style={{ left: `${value * 100}%` }} />
    </div>
  );
};
