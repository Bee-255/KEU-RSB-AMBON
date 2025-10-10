// src/app/(main)/pembayaran/components/PeriodSelect.tsx
import React from 'react';
import pageStyles from "@/styles/komponen.module.css";

interface PeriodOption {
    id: string;
    periode: string;
}

interface PeriodSelectProps {
    periods: PeriodOption[];
    selectedId: string;
    onSelect: (id: string) => void;
}

const PeriodSelect: React.FC<PeriodSelectProps> = ({ periods, selectedId, onSelect }) => {
    
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        // ID yang dipilih akan menjadi string kosong jika memilih opsi placeholder
        onSelect(event.target.value); 
    };

    return (
        <select
            value={selectedId}
            onChange={handleChange}
            className={pageStyles.searchInput} // Gunakan style yang sama seperti input search sebelumnya
        >
            {/* Opsi default, muncul jika periods kosong atau jika user memilihnya */}
            <option value="" disabled={periods.length > 0}>
                {periods.length === 0 ? "-- Belum Ada Data --" : "-- Pilih Periode --"}
            </option>
            
            {periods.map((period) => (
                <option key={period.id} value={period.id}>
                    {period.periode}
                </option>
            ))}
        </select>
    );
};

export default PeriodSelect;