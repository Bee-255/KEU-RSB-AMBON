import React from 'react';
import { pekerjaanOrder } from '../constants';
import pageStyles from "@/styles/komponen.module.css";

interface SearchAndFilterProps {
  searchTerm: string;
  filterPekerjaan: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchTerm,
  filterPekerjaan,
  onSearchChange,
  onFilterChange
}) => {
  return (
    <>
      <select
        value={filterPekerjaan}
        onChange={(e) => onFilterChange(e.target.value)}
        className={pageStyles.filterSelect}
      >
        <option value="">Semua Pekerjaan</option>
        {pekerjaanOrder.map((pekerjaan) => (
          <option key={pekerjaan} value={pekerjaan}>{pekerjaan}</option>
        ))}
      </select>

      <div className={pageStyles.searchContainer}>
        <input
          type="text"
          placeholder="Cari pegawai..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={pageStyles.searchInput}
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className={pageStyles.searchClearButton}
          >
            &#x2715;
          </button>
        )}
      </div>
    </>
  );
};

export default SearchAndFilter;