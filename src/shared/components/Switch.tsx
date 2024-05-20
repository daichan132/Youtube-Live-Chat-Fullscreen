import styles from "../styles/Switch.module.scss";

type Props = {
	checked: boolean;
	id: string;
	onChange: (checked: boolean) => void;
};

export const Switch = (props: Props) => {
	const { checked, id, onChange } = props;
	return (
		<div className={styles.wrapper}>
			<input
				className={styles.input}
				id={id}
				type="checkbox"
				checked={checked}
				onChange={() => {
					onChange(!checked);
				}}
			/>
			<label className={styles.label} htmlFor={id} />
		</div>
	);
};
