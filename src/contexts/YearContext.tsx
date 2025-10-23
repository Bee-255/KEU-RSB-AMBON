// src/contexts/YearContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface YearContextType {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export const YearProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Load selected year from user session on initial load
  useEffect(() => {
    const loadUserYear = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get year from user metadata
          const userYear = user.user_metadata?.periode_tahun;
          if (userYear) {
            setSelectedYear(parseInt(userYear));
          } else {
            // Default to current year if no year in metadata
            setSelectedYear(new Date().getFullYear());
          }
        }
      } catch (error) {
        console.error('Error loading user year:', error);
        setSelectedYear(new Date().getFullYear());
      }
    };

    loadUserYear();
  }, []);

  // Fetch available years from database
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const { data, error } = await supabase
          .from('bas_periode')
          .select('tahun')
          .order('tahun', { ascending: false });

        if (error) {
          console.error("Error fetching years:", error);
          return;
        }

        if (data && data.length > 0) {
          const uniqueYears = Array.from(new Set(data.map(item => item.tahun))).sort((a, b) => b - a);
          setAvailableYears(uniqueYears);
        } else {
          // If no years in database, use current year
          const currentYear = new Date().getFullYear();
          setAvailableYears([currentYear]);
        }
      } catch (error) {
        console.error("Error in fetchAvailableYears:", error);
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear]);
      }
    };

    fetchAvailableYears();
  }, []);

  const value: YearContextType = {
    selectedYear,
    setSelectedYear,
    availableYears
  };

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  );
};

export const useYearContext = (): YearContextType => {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYearContext must be used within a YearProvider');
  }
  return context;
};