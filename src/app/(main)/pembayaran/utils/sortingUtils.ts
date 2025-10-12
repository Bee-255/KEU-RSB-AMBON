// src/app/(main)/pembayaran/utils/sortingUtils.ts

// --- Interface untuk data yang perlu di-sort ---
export interface SortablePegawai {
  nama: string;
  pekerjaan: string;
  pangkat: string;
  golongan: string;
}

// --- Mapping urutan pekerjaan ---
const PEKERJAAN_ORDER: Record<string, number> = {
  'Anggota Polri': 1,
  'ASN': 2,
  'PPPK': 3,
  'TKK': 4,
  'Dokter Mitra': 5,
  'Tenaga Mitra': 6
};

// --- Mapping urutan pangkat Polri (tertinggi dulu) ---
const PANGKAT_POLRI_ORDER: Record<string, number> = {
  'Jenderal Polisi': 1,
  'Komisaris Jenderal Polisi': 2,
  'Inspektur Jenderal Polisi': 3,
  'Brigadir Jenderal Polisi': 4,
  'Kombes Pol': 5,
  'AKBP': 6,
  'Kompol': 7,
  'AKP': 8,
  'Ajun Komisaris Polisi': 8,
  'IPTU': 9,
  'IPDA': 10,
  'AIPTU': 11,
  'AIPDA': 12,
  'BRIPKA': 13,
  'BRIGADIR': 14,
  'BRIPTU': 15,
  'BRIPDA': 16,
  'ABRIP': 17,
  'ABRIPTU': 18,
  'ABRIPDA': 19
};

// --- Mapping urutan pangkat ASN (tertinggi dulu) ---
const PANGKAT_ASN_ORDER: Record<string, number> = {
  'Pembina Utama': 1,
  'Pembina Utama Madya': 2,
  'Pembina Utama Muda': 3,
  'Pembina Tingkat I': 4,
  'Pembina': 5,
  'Penata Tingkat I': 6,
  'Penata': 7,
  'Penata Muda Tingkat I': 8,
  'Penata Muda': 9
};

// --- Mapping urutan golongan (tertinggi dulu) ---
const GOLONGAN_ORDER: Record<string, number> = {
  'IV/e': 1,
  'IV/d': 2,
  'IV/c': 3,
  'IV/b': 4,
  'IV/a': 5,
  'III/d': 6,
  'III/c': 7,
  'III/b': 8,
  'III/a': 9,
  'II/d': 10,
  'II/c': 11,
  'II/b': 12,
  'II/a': 13,
  'I/d': 14,
  'I/c': 15,
  'I/b': 16,
  'I/a': 17
};

// --- Fungsi untuk normalisasi pangkat Polri ---
const normalizePangkatPolri = (pangkat: string): string => {
  if (!pangkat) return '';
  
  const pangkatLower = pangkat.toLowerCase().trim();
  
  // Handle alias dan variasi penulisan
  if (pangkatLower.includes('ajun komisaris polisi') || pangkatLower === 'akp') {
    return 'AKP';
  }
  if (pangkatLower.includes('komisaris polisi') || pangkatLower === 'kompol') {
    return 'Kompol';
  }
  if (pangkatLower.includes('akbp') || pangkatLower.includes('ajun komisaris besar polisi')) {
    return 'AKBP';
  }
  if (pangkatLower.includes('kombes') || pangkatLower.includes('komisaris besar')) {
    return 'Kombes Pol';
  }
  if (pangkatLower.includes('brigadir jenderal')) {
    return 'Brigadir Jenderal Polisi';
  }
  if (pangkatLower.includes('inspektur jenderal')) {
    return 'Inspektur Jenderal Polisi';
  }
  if (pangkatLower.includes('komisaris jenderal')) {
    return 'Komisaris Jenderal Polisi';
  }
  if (pangkatLower.includes('jenderal polisi')) {
    return 'Jenderal Polisi';
  }
  
  // Return asli jika tidak ada mapping khusus
  return pangkat;
};

// --- Fungsi pembantu untuk compare pangkat ---
const comparePangkat = (a: SortablePegawai, b: SortablePegawai): number => {
  let orderA = 99;
  let orderB = 99;

  if (a.pekerjaan === 'Anggota Polri') {
    // Normalisasi pangkat untuk case-insensitive dan handle alias
    const pangkatA = normalizePangkatPolri(a.pangkat);
    const pangkatB = normalizePangkatPolri(b.pangkat);
    
    orderA = PANGKAT_POLRI_ORDER[pangkatA] || 99;
    orderB = PANGKAT_POLRI_ORDER[pangkatB] || 99;
  } else if (a.pekerjaan === 'ASN') {
    orderA = PANGKAT_ASN_ORDER[a.pangkat] || 99;
    orderB = PANGKAT_ASN_ORDER[b.pangkat] || 99;
  }

  // Return negative jika orderA < orderB (pangkat lebih tinggi)
  return orderA - orderB;
};

// --- Fungsi pembantu untuk compare golongan ---
const compareGolongan = (a: SortablePegawai, b: SortablePegawai): number => {
  const orderA = GOLONGAN_ORDER[a.golongan] || 99;
  const orderB = GOLONGAN_ORDER[b.golongan] || 99;

  // Return negative jika orderA < orderB (golongan lebih tinggi)
  return orderA - orderB;
};

// --- Fungsi utama untuk sorting ---
export const sortPegawai = (a: SortablePegawai, b: SortablePegawai): number => {
  // 1. Urutkan berdasarkan prioritas pekerjaan
  const orderA = PEKERJAAN_ORDER[a.pekerjaan] || 99;
  const orderB = PEKERJAAN_ORDER[b.pekerjaan] || 99;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  // 2. Untuk Polri & ASN: urutkan berdasarkan pangkat (tertinggi dulu)
  if (a.pekerjaan === 'Anggota Polri' || a.pekerjaan === 'ASN') {
    const pangkatComparison = comparePangkat(a, b);
    if (pangkatComparison !== 0) return pangkatComparison;
  }

  // 3. Untuk semua: urutkan berdasarkan golongan (tertinggi dulu)
  const golonganComparison = compareGolongan(a, b);
  if (golonganComparison !== 0) return golonganComparison;

  // 4. Default: urutkan berdasarkan nama (A-Z)
  return a.nama.localeCompare(b.nama);
};

// --- Fungsi untuk grouping data berdasarkan klasifikasi ---
export const groupByKlasifikasi = <T extends SortablePegawai>(
  data: T[], 
  getKlasifikasi: (item: T) => string
): { medis: T[], paramedis: T[] } => {
  const medis: T[] = [];
  const paramedis: T[] = [];

  data.forEach(item => {
    const klasifikasi = getKlasifikasi(item).toLowerCase();
    if (klasifikasi === 'medis') {
      medis.push(item);
    } else {
      paramedis.push(item);
    }
  });

  return { medis, paramedis };
};

// --- Fungsi untuk validasi dan normalisasi data ---
export const normalizePegawaiData = (data: any): SortablePegawai => {
  return {
    nama: data.nama || '',
    pekerjaan: data.pekerjaan || '',
    pangkat: data.pangkat || '',
    golongan: data.golongan || ''
  };
};

// --- Fungsi untuk batch sorting ---
export const sortPegawaiBatch = <T extends SortablePegawai>(data: T[]): T[] => {
  return [...data].sort(sortPegawai);
};