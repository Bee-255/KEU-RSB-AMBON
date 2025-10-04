// Fungsi untuk memformat setiap kata menjadi kapital di awal
export const capitalizeWords = (str: string): string => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Fungsi untuk memformat angka dengan pemisah ribuan
export const formatAngka = (angka: number | string | null | undefined): string => {
  if (angka === null || typeof angka === 'undefined') {
    return "";
  }
  const angkaToNumber = typeof angka === 'string' ? parseFloat(angka) : angka;
  if (isNaN(angkaToNumber)) {
    return "";
  }
  return angkaToNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Fungsi untuk mengembalikan angka murni dari string yang diformat
export const parseAngka = (str: string): number => {
  if (!str) return 0;
  return parseInt(str.replace(/\./g, ""), 10) || 0;
};

// Fungsi untuk mengubah angka bulan menjadi angka Romawi
export const toRoman = (num: number): string => {
  const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return roman[num] || "";
};

// Fungsi untuk memformat tanggal ke dd-mm-yyyy
export const formatTanggal = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

// Fungsi serbaguna untuk memformat tanggal dalam format Indonesia
// Parameter `withCity` menentukan apakah nama kota "Ambon" disertakan
export const formatTanggalIndonesia = (dateString: string, withCity: boolean = false): string => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00'); 
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  const formattedDate = date.toLocaleDateString('id-ID', options);
  return withCity ? `Ambon, ${formattedDate}` : formattedDate;
};