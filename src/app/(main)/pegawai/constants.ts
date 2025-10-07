export const allPangkatPolri: string[] = [
  "KOMISARIS BESAR POLISI", "AJUN KOMISARIS BESAR POLISI", "KOMISARIS POLISI", "AJUN KOMISARIS POLISI",
  "INSPEKTUR POLISI SATU", "INSPEKTUR POLISI DUA", "AIPTU", "AIPDA",
  "BRIPKA", "BRIGADIR", "BRIPTU", "BRIPDA", "AJUN BRIGADIR POLISI",
  "AJUN BRIGADIR POLISI DUA", "BHAYANGKARA KEPALA", "BHAYANGKARA SATU", "BHAYANGKARA DUA"
];

export const allPangkatAsn: string[] = [
  "PEMBINA UTAMA", "PEMBINA UTAMA MADYA", "PEMBINA UTAMA MUDA", "PEMBINA TK. I", "PEMBINA",
  "PENATA TK. I", "PENATA", "PENDA TK. I", "PENDA", "PENGATUR TK. I",
  "PENGATUR", "PENGATUR MUDA TK. I", "PENGATUR MUDA", "JURU TK. I", "JURU",
  "JURU MUDA TK. I", "JURU MUDA"
];

export const golonganByPangkatAsn = {
  "PEMBINA UTAMA": ["IV/e"], "PEMBINA UTAMA MADYA": ["IV/d"], "PEMBINA UTAMA MUDA": ["IV/c"], "PEMBINA TK. I": ["IV/b"], "PEMBINA": ["IV/a"],
  "PENATA TK. I": ["III/d"], "PENATA": ["III/c"], "PENDA TK. I": ["III/b"], "PENDA": ["III/a"],
  "PENGATUR TK. I": ["II/d"], "PENGATUR": ["II/c"], "PENGATUR MUDA TK. I": ["II/b"], "PENGATUR MUDA": ["II/a"],
  "JURU TK. I": ["I/d"], "JURU": ["I/c"], "JURU MUDA TK. I": ["I/b"], "JURU MUDA": ["I/a"],
};

export const golonganByPangkatPolri = {
  "KOMISARIS BESAR POLISI": ["IV/c"], "AJUN KOMISARIS BESAR POLISI": ["IV/b"], "KOMISARIS POLISI": ["IV/a"],
  "AJUN KOMISARIS POLISI": ["III/c"], "INSPEKTUR POLISI SATU": ["III/b"], "INSPEKTUR POLISI DUA": ["III/a"],
  "AIPTU": ["II/f"], "AIPDA": ["II/e"], "BRIPKA": ["II/d"], "BRIGADIR": ["II/c"], "BRIPTU": ["II/b"], "BRIPDA": ["II/a"],
  "AJUN BRIGADIR POLISI": ["I/e"], "AJUN BRIGADIR POLISI DUA": ["I/d"], "BHAYANGKARA KEPALA": ["I/c"], "BHAYANGKARA SATU": ["I/b"], "BHAYANGKARA DUA": ["I/a"]
};

export const pekerjaanOrder: string[] = ["Anggota Polri", "ASN", "PPPK", "TKK", "Dokter Mitra", "Tenaga Mitra"];