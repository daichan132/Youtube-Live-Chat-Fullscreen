import { useEffect, useState } from "react";

export const useDisanleTopTransition = (
	isDragging: boolean,
	isResizing: boolean,
) => {
	const [disableTopTransition, setDisableTopTransition] = useState(true);
	useEffect(() => {
		if (isDragging || isResizing) {
			setDisableTopTransition(true);
		} else {
			setDisableTopTransition(false);
		}
	}, [isDragging, isResizing]);
	return disableTopTransition;
};
