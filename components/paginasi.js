// components/PaginasiKeu.js

import React from 'react';
import { FiChevronLeft, FiChevronRight, FiSkipBack, FiSkipForward } from "react-icons/fi";

const PaginasiKeu = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
  return (
    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "left", alignItems: "center", padding: "0px 0px" }}>
      <span style={{ fontSize: "0.85rem" }}>
        Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems} data
      </span>
      <div style={{ display: "flex", gap: "5px", marginLeft: "auto", alignItems: "center" }}>
        <div style={{ display: "flex", border: "1px solid #ccc", borderRadius: "4px", overflow: "hidden", marginleft: "10px" }}>
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            style={{ padding: "8px 12px", background: "white", border: "none", cursor: "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            <FiSkipBack />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ padding: "8px 12px", background: "white", border: "none", cursor: "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            <FiChevronLeft />
          </button>
          <button
            style={{ padding: "8px 12px", background: "#2563eb", color: "white", border: "none", fontWeight: "bold" }}
          >
            {currentPage}
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ padding: "8px 12px", background: "white", border: "none", cursor: "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            <FiChevronRight />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: "8px 12px", background: "white", border: "none", cursor: "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            <FiSkipForward />
          </button>
        </div>
        <select 
          value={itemsPerPage} 
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          style={{ padding: "8px 2px 8px 8px", borderRadius: "4px", border: "1px solid #ccc" , backgroundColor: "white"}}
        >
          {[10, 20, 50, 100, 500, 1000].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PaginasiKeu;