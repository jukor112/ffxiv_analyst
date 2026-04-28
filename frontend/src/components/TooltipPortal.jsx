import { createPortal } from "react-dom";
import { useEffect, useRef, useCallback } from "react";

export default function TooltipPortal({ show, position, placement = "bottom-right", above = false, className = "", style = {}, maxWidth = null, maxHeight = null, children, onClose }) {
    const portalRef = useRef(null);

    const handleClickOutside = useCallback(
        (e) => {
            if (portalRef.current && !portalRef.current.contains(e.target)) {
                onClose?.();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!show) return;
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [show, handleClickOutside]);

    if (!show) return null;

    const clamped = { ...position };
    if (maxWidth && maxWidth > 0) {
        clamped.x = Math.min(position.x, window.innerWidth - maxWidth);
    }
    if (maxHeight && maxHeight > 0) {
        clamped.y = Math.min(position.y, window.innerHeight - maxHeight);
    }

    const portalStyle = {
        position: "fixed",
        left: `${clamped.x}px`,
        zIndex: 9999,
        ...(placement === "centered"
            ? { transform: "translateX(-50%)" }
            : {}),
        ...(placement === "centered" && !above
            ? { top: `${clamped.y + 6}px` }
            : placement === "centered" && above
              ? { bottom: `${window.innerHeight - clamped.y + 6}px` }
              : { top: `${clamped.y}px` }),
        ...style,
    };

    return createPortal(
        <div ref={portalRef} className={`animate-tooltip-fade-in ${className}`} style={portalStyle}>
            {children}
        </div>,
        document.body,
    );
}
