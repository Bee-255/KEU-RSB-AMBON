import React from 'react';
import { FaStepBackward, FaStepForward, FaCaretLeft, FaCaretRight } from "react-icons/fa";

const PaginasiKeu = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
  // Logic untuk menentukan halaman yang akan ditampilkan
  const maxPagesToShow = 5;
  const pageNumbers = [];

  // Menentukan halaman awal dan akhir untuk ditampilkan
  let startPage = 1;
  let endPage = Math.min(totalPages, maxPagesToShow);

  if (currentPage > Math.floor(maxPagesToShow / 2) + 1 && totalPages > maxPagesToShow) {
    if (currentPage > totalPages - Math.floor(maxPagesToShow / 2)) {
      startPage = totalPages - maxPagesToShow + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - Math.floor(maxPagesToShow / 2);
      endPage = currentPage + Math.floor(maxPagesToShow / 2);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  // Jika total halaman kurang dari maxPagesToShow, tampilkan semua
  if (totalPages <= maxPagesToShow) {
      pageNumbers.length = 0; // Kosongkan array
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
  }

  return (
    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", alignItems: "center", padding: "0px" }}>
      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
        <div style={{ display: "flex", border: "1px solid #ccc", borderRadius: "4px", overflow: "hidden", marginLeft: "10px" }}>
          {/* Tombol Halaman Pertama */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            style={{ 
              padding: "8px 12px", 
              background: "white", 
              border: "none", 
              cursor: "pointer", 
              opacity: currentPage === 1 ? 0.5 : 1, 
              color: "#2563eb",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FaStepBackward size={10} />
          </button>
          {/* Tombol Halaman Sebelumnya */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ 
              padding: "8px 8px", 
              background: "white", 
              border: "none", 
              cursor: "pointer", 
              opacity: currentPage === 1 ? 0.5 : 1, 
              color: "#2563eb",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FaCaretLeft size={14} />
          </button>
          
          {/* Tampilan Halaman */}
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                padding: "8px 12px",
                background: page === currentPage ? "#2563eb" : "white",
                color: page === currentPage ? "white" : "#2563eb",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {page}
            </button>
          ))}

          {/* Tombol Halaman Selanjutnya */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ 
              padding: "8px 12px", 
              background: "white", 
              border: "none", 
              cursor: "pointer", 
              opacity: currentPage === totalPages ? 0.5 : 1, 
              color: "#2563eb",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FaCaretRight size={14} />
          </button>
          {/* Tombol Halaman Terakhir */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{ 
              padding: "8px 12px", 
              background: "white", 
              border: "none", 
              cursor: "pointer", 
              opacity: currentPage === totalPages ? 0.5 : 1, 
              color: "#2563eb",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FaStepForward size={10} />
          </button>
        </div>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          style={{ padding: "8px 2px 8px 8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "white" }}
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