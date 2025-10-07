import React from 'react';
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import styles from "@/styles/button.module.css";
import { PegawaiData } from '../types'; // Import tipe PegawaiData

interface ActionButtonsProps {
  isAllowedToEditOrDelete: boolean;
  selectedPegawai: PegawaiData | null; // Ganti any dengan PegawaiData | null
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isAllowedToEditOrDelete,
  selectedPegawai,
  onAdd,
  onEdit,
  onDelete
}) => {
  return (
    <>
      <button
        onClick={onAdd}
        disabled={!isAllowedToEditOrDelete}
        className={styles.rekamButton}
      >
        <FaPlus /> Rekam
      </button>
      
      <button
        onClick={onEdit}
        disabled={!selectedPegawai || !isAllowedToEditOrDelete}
        className={styles.editButton}
      >
        <FaEdit /> Edit
      </button>
      <button
        onClick={onDelete}
        disabled={!selectedPegawai || !isAllowedToEditOrDelete}
        className={styles.hapusButton}
      >
        <FaRegTrashAlt /> Hapus
      </button>
    </>
  );
};

export default ActionButtons;