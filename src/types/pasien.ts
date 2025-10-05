export interface Pasien {
  id: string;
  created_at: string;
  klasifikasi: string;
  nomor_rm: string;
  nama_pasien: string;
  jenis_rawat: string;
  unit_layanan: string;
  jumlah_tagihan: number;
  diskon: number;
  jumlah_bersih: number;
  bayar_tunai: number;
  bayar_transfer: number;
  tanggal_transfer: string | null;
  total_pembayaran: number;
  rekaman_harian_id: string;
  user_id: string;
}

export interface Rekapitulasi {
  id: string;
  tanggal: string;
  nama_user: string;
  total_pasien: number;
  total_tagihan: number;
  total_tunai: number;
  total_transfer: number;
  total_pembayaran: number;
  status: string;
}

export interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

export interface PasienFormData {
  klasifikasi: string;
  nomor_rm: string;
  nama_pasien: string;
  jenis_rawat: string;
  unit_layanan: string;
  jumlah_tagihan: number;
  diskon: number;
  jumlah_bersih: number;
  bayar_tunai: number;
  bayar_transfer: number;
  tanggal_transfer: string;
  total_pembayaran: number;
  rekaman_harian_id: string | null;
  user_id: string | null;
}