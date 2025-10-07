import React from 'react';
import { PegawaiData } from '../types';
import pageStyles from "@/styles/komponen.module.css";

interface ActionButtonsProps {
  isAllowedToEditOrDelete: boolean;
  selectedPegawai: PegawaiData | null;
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
    <div className={pageStyles.actionButtons}>
      {isAllowedToEditOrDelete && (
        <>
          <button 
            className={pageStyles.addButton} 
            onClick={onAdd}
          >
            Tambah Pegawai
          </button>
          
          <button 
            className={pageStyles.editButton} 
            onClick={onEdit}
            disabled={!selectedPegawai}
          >
            Edit
          </button>
          
          <button 
            className={pageStyles.deleteButton} 
            onClick={onDelete}
            disabled={!selectedPegawai}
          >
            Hapus
          </button>
        </>
      )}
    </div>
  );
};

export default ActionButtons;