import { useEffect } from "react";

export default function Modal({ title, children, onClose, className = "" }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="dialoghead">
          <h2 id="modal-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}
