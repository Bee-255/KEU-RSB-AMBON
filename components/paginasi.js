import React, { useState } from 'react';
import { FaStepBackward, FaStepForward, FaCaretLeft, FaCaretRight } from "react-icons/fa";

const PaginasiKeu = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
  // Tambahkan state untuk melacak halaman yang sedang di-hover
  const [hoveredPage, setHoveredPage] = useState(null);

  // Logic untuk menentukan halaman yang akan ditampilkan
  const maxPagesToShow = 3;
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
        {/* Hapus border di sini */}
        <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden" }}>
          {/* Tombol Halaman Pertama */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              background: "white",
              borderRadius: "4px 0px 0px 4px",
              border: "1px solid #ccc",
              borderRight: "none",
              cursor: "pointer",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ opacity: currentPage === 1 ? 0.5 : 1 }}>
              <FaStepBackward size={10} />
            </div>
          </button>
          {/* Tombol Halaman Sebelumnya */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: "8px 8px",
              background: "white",
              border: "1px solid #ccc",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              color: "#2563eb",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ opacity: currentPage === 1 ? 0.5 : 1 }}>
              <FaCaretLeft size={14} />
            </div>
          </button>

          {/* Tampilan Halaman yang aktif */}
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              // Tambahkan event handler untuk hover
              onMouseEnter={() => setHoveredPage(page)}
              onMouseLeave={() => setHoveredPage(null)}
              style={{
                padding: "6px 12px",
                // Logika hover: jika di-hover, ganti background
                background: page === currentPage ? "#2563eb" : (hoveredPage === page ? "#ebe9e5ff" : "white"),
                color: page === currentPage ? "white" : "#2563eb",
                borderTop: page === currentPage ? "none" : "1px solid #ccc",
                borderBottom: page === currentPage ? "none" : "1px solid #ccc",
                borderLeft: "none",
                borderRight: "none",
                fontWeight: page === currentPage ? "600" : "400",
                cursor: "pointer",
                display: 'outline',
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
              border: "1px solid #ccc",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              color: "#2563eb",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}>
              <FaCaretRight size={14} />
            </div>
          </button>
          {/* Tombol Halaman Terakhir */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: "8px 12px",
              background: "white",
              borderRadius: "0 4px 4px 0",
              border: "1px solid #ccc",
              borderLeft: "none",
              cursor: "pointer",
              color: "#2563eb",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}>
              <FaStepForward size={10} />
            </div>
          </button>
        </div>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          style={{ padding: "6px 2px 6px 4px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "white" }}
        >
          {[5, 10, 20, 50].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PaginasiKeu;