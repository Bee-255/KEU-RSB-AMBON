export const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  };
  const formatted = date.toLocaleDateString('id-ID', options);
  return formatted.replace(/\//g, '-');
};

export const formatRupiah = (number: number | string | null) => {
  if (number === null || number === undefined || number === "") return "-";
  const num = typeof number === 'string' ? parseFloat(number.replace(/\./g, '')) : number;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatInputRupiah = (value: string): string => {
  const numbersOnly = value.replace(/[^\d]/g, '');
  if (numbersOnly === '') return '';
  return numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseRupiahInput = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  const numbersOnly = formattedValue.replace(/\./g, '');
  return parseInt(numbersOnly, 10) || 0;
};

export const formatNumberDisplay = (number: number | string | null): string => {
  if (number === null || number === undefined || number === "") return "-";
  const num = typeof number === 'string' ? parseFloat(number.replace(/\./g, '')) : number;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat('id-ID').format(num);
};

export const getStatusPembayaran = (jumlahBersih: number, totalPembayaran: number) => {
  if (totalPembayaran === jumlahBersih) {
    return "LUNAS";
  } else if (totalPembayaran < jumlahBersih) {
    return "KURANG BAYAR";
  } else {
    return "LEBIH BAYAR";
  }
};