// src/components/paginasi.tsx
"use client";

import React, { useState } from 'react';
import { FaStepBackward, FaStepForward, FaCaretLeft, FaCaretRight } from "react-icons/fa";

// Interface untuk props komponen
interface PaginasiProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
}

// Gaya CSS dalam bentuk objek
const styles = {
    container: {
        marginTop: "1rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0",
    },
    innerContainer: {
        display: "flex",
        gap: "5px",
        alignItems: "center",
    },
    buttonGroup: {
        display: "flex",
        borderRadius: "4px",
        overflow: "hidden",
    },
    button: {
        padding: "8px 8px",
        background: "white",
        cursor: "pointer",
        color: "#2563eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
    },
    pageButton: {
        padding: "6px 12px",
        fontWeight: "400",
        cursor: "pointer",
        border: "none",
    },
    select: {
        padding: "6px 4px 6px 4px",
        borderRadius: "4px",
        border: "1px solid #ccc",
        backgroundColor: "white",
    },
};

const Paginasi: React.FC<PaginasiProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
}) => {
    const [hoveredPage, setHoveredPage] = useState<number | null>(null);

    const maxPagesToShow = 3;
    const pageNumbers: number[] = [];

    let startPage = 1;
    let endPage = Math.min(totalPages, maxPagesToShow);

    if (totalPages > maxPagesToShow) {
        if (currentPage > Math.floor(maxPagesToShow / 2) + 1) {
            if (currentPage > totalPages - Math.floor(maxPagesToShow / 2)) {
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - Math.floor(maxPagesToShow / 2);
                endPage = currentPage + Math.floor(maxPagesToShow / 2);
            }
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }
    
    // Jika total halaman kurang dari maxPagesToShow, tampilkan semua
    if (totalPages <= maxPagesToShow && totalPages > 0) {
      pageNumbers.length = 0; // Kosongkan array
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    }

    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;
    const allButtonsDisabled = totalItems === 0;

    return (
        <div style={styles.container}>
            <div style={styles.innerContainer}>
                {/* Tombol Navigasi Halaman */}
                <div style={styles.buttonGroup}>
                    {/* Tombol Halaman Pertama */}
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={isFirstPage || allButtonsDisabled}
                        style={{
                            ...styles.button,
                            border: "1px solid #ccc",
                            borderRight: "none",
                            borderRadius: "4px 0 0 4px",
                            opacity: isFirstPage || allButtonsDisabled ? 0.5 : 1,
                        }}
                    >
                        <FaStepBackward size={10} />
                    </button>
                    {/* Tombol Halaman Sebelumnya */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={isFirstPage || allButtonsDisabled}
                        style={{
                            ...styles.button,
                            borderTop: "1px solid #ccc",
                            borderBottom: "1px solid #ccc",
                            borderLeft: "none",
                            borderRight: "none",
                            opacity: isFirstPage || allButtonsDisabled ? 0.5 : 1,
                        }}
                    >
                        <FaCaretLeft size={14} />
                    </button>

                    {/* Tampilan Nomor Halaman */}
                    {pageNumbers.map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            disabled={allButtonsDisabled}
                            onMouseEnter={() => setHoveredPage(page)}
                            onMouseLeave={() => setHoveredPage(null)}
                            style={{
                                ...styles.pageButton,
                                background: page === currentPage ? "#2563eb" : (hoveredPage === page ? "#ebe9e5ff" : "white"),
                                color: page === currentPage ? "white" : "#2563eb",
                                fontWeight: page === currentPage ? "600" : "400",
                                borderTop: page === currentPage ? "none" : "1px solid #ccc",
                                borderBottom: page === currentPage ? "none" : "1px solid #ccc",
                                borderLeft: "none",
                                borderRight: "none",
                            }}
                        >
                            {page}
                        </button>
                    ))}

                    {/* Tombol Halaman Selanjutnya */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={isLastPage || allButtonsDisabled}
                        style={{
                            ...styles.button,
                            borderTop: "1px solid #ccc",
                            borderBottom: "1px solid #ccc",
                            borderLeft: "none",
                            borderRight: "none",
                            opacity: isLastPage || allButtonsDisabled ? 0.5 : 1,
                        }}
                    >
                        <FaCaretRight size={14} />
                    </button>
                    {/* Tombol Halaman Terakhir */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={isLastPage || allButtonsDisabled}
                        style={{
                            ...styles.button,
                            borderTop: "1px solid #ccc",
                            borderBottom: "1px solid #ccc",
                            borderLeft: "none",
                            borderRight: "1px solid #ccc",
                            borderRadius: "0 4px 4px 0",
                            opacity: isLastPage || allButtonsDisabled ? 0.5 : 1,
                        }}
                    >
                        <FaStepForward size={10} />
                    </button>
                </div>
                {/* Opsi Items per Halaman */}
                <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    disabled={allButtonsDisabled}
                    style={styles.select}
                >
                    {[5, 10, 20, 50].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default Paginasi;