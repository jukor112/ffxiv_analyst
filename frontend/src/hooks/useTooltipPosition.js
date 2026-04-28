import { useState, useCallback } from "react";

export default function useTooltipPosition(options = {}) {
    const { placement = "bottom-right", offset = 8, maxWidth = null, maxHeight = null } = options;

    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [show, setShow] = useState(false);
    const [above, setAbove] = useState(false);

    const handleShow = useCallback(
        (element) => {
            if (!element) return;
            const rect = element.getBoundingClientRect();

            let x, y, isAbove = false;

            if (placement === "centered") {
                x = rect.left + rect.width / 2;
                isAbove = rect.top < 160;
                y = isAbove ? rect.bottom : rect.top;
            } else {
                x = rect.right + offset;
                y = rect.bottom + offset;
            }

            setTooltipPos({ x, y });
            setAbove(isAbove);
            setShow(true);
        },
        [placement, offset],
    );

    const handleHide = useCallback(() => {
        setShow(false);
    }, []);

    const clampPosition = useCallback(
        (pos) => {
            if (maxWidth && maxWidth > 0) {
                pos.x = Math.min(pos.x, window.innerWidth - maxWidth);
            }
            if (maxHeight && maxHeight > 0) {
                pos.y = Math.min(pos.y, window.innerHeight - maxHeight);
            }
            return pos;
        },
        [maxWidth, maxHeight],
    );

    return { tooltipPos, show, handleShow, handleHide, clampPosition, above };
}
