// Interface untuk data pegawai
export interface PegawaiData {
  id: string; 
  nama: string;
  pekerjaan: string;
  nrp_nip_nir: string;
  klasifikasi: string;
  pangkat: string;
  tipe_identitas: string;
  golongan: string;
  jabatan_struktural: string;
  status: string;
  bank: string;
  no_rekening: string;
  nama_rekening: string;
}

// Interface untuk state form
export interface FormPegawaiData {
  nama: string;
  pekerjaan: string;
  nrp_nip_nir: string;
  klasifikasi: string;
  pangkat: string;
  tipe_identitas: string;
  golongan: string;
  jabatan_struktural: string;
  status: string;
  bank: string;
  no_rekening: string;
  nama_rekening: string;
}

// Interface untuk mapping golongan
export interface PangkatMap {
  [key: string]: string[];
}

// Interface untuk props komponen Modal
export interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}