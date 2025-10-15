// src/app/(main)/pembayaran/components/PeriodSelect.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

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
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedPeriod = periods.find(p => p.id === selectedId);

    const handleSelect = (periodId: string) => {
        onSelect(periodId);
        setIsOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', minWidth: '250px' }}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '60%',
                    padding: '6px 10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left'
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
            >
                <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    flex: 1 
                }}>
                    {selectedPeriod 
                        ? `${selectedPeriod.periode}`
                        : (periods.length === 0 ? "-- Belum Ada Data --" : "-- Pilih Periode --")
                    }
                </span>
                <FaChevronDown 
                    style={{ 
                        marginLeft: '8px', 
                        fontSize: '12px',
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }} 
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 100,
                    zIndex: 50,
                    backgroundColor: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    marginTop: '0px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    {periods.length === 0 ? (
                        <div style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#6b7280',
                            textAlign: 'center'
                        }}>
                            Tidak ada data periode
                        </div>
                    ) : (
                        periods.map((period) => (
                            <div
                                key={period.id}
                                onClick={() => handleSelect(period.id)}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f3f4f6',
                                    backgroundColor: selectedId === period.id ? '#3b82f6' : 'white',
                                    color: selectedId === period.id ? 'white' : '#374151',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedId !== period.id) {
                                        e.currentTarget.style.backgroundColor = '#f9fafb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedId !== period.id) {
                                        e.currentTarget.style.backgroundColor = 'white';
                                    }
                                }}
                            >
                                <div style={{ fontWeight: '500' }}>{period.periode}</div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    opacity: 0.8,
                                    marginTop: '2px'
                                }}>
                            
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PeriodSelect;