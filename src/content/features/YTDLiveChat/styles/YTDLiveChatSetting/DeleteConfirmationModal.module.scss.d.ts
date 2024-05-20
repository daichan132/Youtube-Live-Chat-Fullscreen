export type Styles = {
	actions: string;
	buttonCancel: string;
	buttonDelete: string;
	content: string;
	Modal: string;
	Overlay: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
