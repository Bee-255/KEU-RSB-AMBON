// src/lib/keuNotification.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { 
  FaCircleXmark, FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaTriangleExclamation } from 'react-icons/fa6';
// Import styles dari lokasi yang sudah ditentukan
import styles from '@/styles/keunotification.module.css'; 

// --- 1. TIPE DATA ---

type NotificationType = "success" | "error" | "warning" | "info" | "none";
type NotificationPosition = "top-right" | "top-center" | "top-left" | "bottom-right";

interface ToastProps {
  id: string;
  message: string;
  type: NotificationType;
  position: NotificationPosition;
  duration: number;
}

interface ConfirmModalProps {
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  showToast: (message: string, type: NotificationType, duration?: number, position?: NotificationPosition) => void;
  showConfirm: (props: Omit<ConfirmModalProps, 'onCancel' | 'onConfirm'>) => Promise<boolean>;
}

interface ConfirmState extends Omit<ConfirmModalProps, 'onCancel' | 'onConfirm'> {
  isVisible: boolean;
  resolver: (value: boolean) => void;
}

const initialConfirmState: ConfirmState = {
  title: '',
  message: '',
  isVisible: false,
  resolver: () => {},
};


// --- 2. KOMPONEN UI INTERNAL ---

const getIconAndTitle = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return { icon: <FaCircleCheck />, title: 'Sukses' }; // Icon centang (FaCheck) untuk Sukses
    case 'error':
      return { icon: <FaCircleXmark />, title: 'Gagal' }; // Icon X (FaCircleXmark) untuk Gagal
    case 'warning':
      return { icon: <FaCircleExclamation />, title: 'Peringatan' }; // Icon tanda seru lingkaran
    case 'info':
      return { icon: <FaCircleInfo />, title: 'Informasi' }; // Icon info lingkaran
    default:
      return { icon: null, title: 'Notifikasi' };
  }
};

/**
 * Toast Item Component
 */
const ToastItem: React.FC<ToastProps & { onClose: (id: string) => void }> = ({ id, message, type, duration, onClose }) => {
  const { icon, title } = getIconAndTitle(type);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animasi masuk
    const enterTimer = setTimeout(() => setIsVisible(true), 50); 
    
    // Auto-close timer
    const autoCloseTimer = setTimeout(() => {
        setIsVisible(false);
        const cleanupTimer = setTimeout(() => onClose(id), 300);
        return () => clearTimeout(cleanupTimer);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div 
      className={`${styles.toastItem} ${styles[type]} ${isVisible ? styles.show : ''}`}
      role="alert"
    >
      <div className={styles.toastHeader}>
        <span className={styles.toastTitle}>
          {icon} 
          <span>{title}</span> 
        </span>
        <button onClick={handleClose} className={styles.toastClose} aria-label="Tutup notifikasi">
          <FaCircleXmark />
        </button>
      </div>
      <div className={styles.toastDivider} /> {/* Garis 1px */}
      <div className={styles.toastMessage}>{message}</div>
    </div>
  );
};

/**
 * Confirm Modal Component
 */
const ConfirmModal: React.FC<ConfirmModalProps & { isVisible: boolean }> = ({
  title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Batal', isVisible,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setShow(true), 50);
      document.body.style.overflow = 'hidden'; // Kunci scroll
    } else {
      setShow(false);
      const timer = setTimeout(() => {
        if (!document.querySelector(`.${styles.modalBackdrop}.show`)) {
          document.body.style.overflow = 'auto';
        }
      }, 250);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isVisible]);

  if (!isVisible && !show) return null;

  return (
    <div className={`${styles.modalBackdrop} ${show ? styles.show : ''}`}>
      <div className={styles.modalBox} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header Konfirmasi */}
        <div className={styles.modalHeader}>
          <FaTriangleExclamation className={styles.modalHeaderIcon} />
          <h2 id="modal-title">{title}</h2>
        </div>
        
        <div className={styles.modalDivider} /> {/* Garis 1px */}

        <div className={styles.modalBody}>
          {message}
        </div>
        
        <div className={styles.modalDivider} /> {/* Garis 1px */}
        
        {/* Footer Tombol Aksi */}
        <div className={styles.modalFooter}>
          <button onClick={onCancel} className={`${styles.modalButton} ${styles.btnCancel}`}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`${styles.modalButton} ${styles.btnConfirm}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 3. CONTEXT DAN PROVIDER ---

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Hook untuk menggunakan fungsionalitas notifikasi di komponen
 */
export const keuNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    // Pesan error jika hook dipanggil di luar Provider
    throw new Error('keuNotification harus bersamaan NotificationProvider');
  }
  return context;
};

/**
 * Provider yang harus membungkus komponen utama aplikasi
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(initialConfirmState);

  // --- Toast Logic ---
  const showToast = useCallback((
    message: string, 
    type: NotificationType, 
    duration: number = 4000, 
    position: NotificationPosition = 'top-right'
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newToast: ToastProps = { id, message, type, duration, position };
    
    setToasts(prevToasts => [...prevToasts, newToast]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);
  
  const positionedToasts = useMemo(() => {
    return toasts.reduce((acc, toast) => {
        const pos = toast.position;
        if (!acc[pos]) {
            acc[pos] = [];
        }
        acc[pos].push(toast);
        return acc;
    }, {} as Record<NotificationPosition, ToastProps[]>);
  }, [toasts]);


  // --- Confirm Modal Logic ---
  const showConfirm = useCallback((props: Omit<ConfirmModalProps, 'onCancel' | 'onConfirm'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...props,
        title: props.title || "Konfirmasi",
        isVisible: true,
        resolver: resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState.resolver(true);
    setConfirmState(initialConfirmState);
  }, [confirmState.resolver]);

  const handleCancel = useCallback(() => {
    confirmState.resolver(false);
    setConfirmState(initialConfirmState);
  }, [confirmState.resolver]);


  const contextValue = useMemo(() => ({
    showToast,
    showConfirm,
  }), [showToast, showConfirm]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* 4. Rendering Toast Container */}
      {Object.entries(positionedToasts).map(([position, toastList]) => (
          <div 
              key={position}
              // Menggunakan style posisi
              className={`${styles.toastContainer} ${styles[position as NotificationPosition]}`}
          >
              {toastList.map(toast => (
                  <ToastItem key={toast.id} {...toast} onClose={closeToast} />
              ))}
          </div>
      ))}
      
      {/* 5. Rendering Confirm Modal */}
      <ConfirmModal
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isVisible={confirmState.isVisible}
      />
    </NotificationContext.Provider>
  );
};