import React, { forwardRef } from "react";

import styles from "../styles/Slider.module.css";

interface SliderProps {
	value: number;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
	({ value }, ref) => {
		return (
			<div ref={ref} className={styles["slider-wrapper"]}>
				<div className={styles["slider-track"]} />
				<div
					className={styles["slider-thumb"]}
					style={{ left: `${value * 100}%` }}
				/>
			</div>
		);
	},
);

Slider.displayName = "Slider";
