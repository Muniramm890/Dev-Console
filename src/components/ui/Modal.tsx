// FILE: teacher-app/src/components/ui/Modal.tsx
// Source: admin App.tsx -> Modal
// @ts-nocheck
import { Icon } from "./Icon";

export const Modal = ({ open, onClose, title, children, width = 600, zIndex = 1000 }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: zIndex }} onClick={onClose}>

      <div
        className="modal"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3 className="syne" style={{ fontSize: 17, fontWeight: 700 }}>
            {title}
          </h3>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 10px" }}
            onClick={onClose}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
