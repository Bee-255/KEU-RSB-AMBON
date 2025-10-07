import { ModalProps } from '../types';
import pageStyles from "@/styles/komponen.module.css";

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return (
    <div
      className={pageStyles.modalOverlay}
      onClick={onClose}
    >
      <div
        className={pageStyles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;