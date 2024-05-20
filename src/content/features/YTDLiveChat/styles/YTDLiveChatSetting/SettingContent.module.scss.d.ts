export type Styles = {
	"content-setting-container": string;
	"content-setting-item": string;
	data: string;
	disable: string;
	open: string;
	preset: string;
	title: string;
	"title-with-icon": string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
