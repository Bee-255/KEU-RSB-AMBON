// Fungsi untuk memformat setiap kata menjadi kapital di awal
export const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Fungsi untuk memformat angka dengan pemisah ribuan
export const formatAngka = (angka) => {
  if (angka === null || typeof angka === 'undefined') {
    return "";
  }
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Fungsi untuk mengembalikan angka murni dari string yang diformat
export const parseAngka = (str) => {
  return parseInt(str.replace(/\./g, ""), 10) || 0;
};

// Fungsi untuk mengubah angka bulan menjadi angka Romawi
export const toRoman = (num) => {
  const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return roman[num] || "";
};

// Fungsi untuk memformat tanggal ke dd-mm-yyyy
export const formatTanggal = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

// Fungsi untuk memformat tanggal ke "Ambon, DD MMMM YYYY"
export const formatTanggalIndonesia = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00'); // Tambahkan T00:00:00 agar tidak terpengaruh timezone
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return `Ambon, ${date.toLocaleDateString('id-ID', options)}`;
};

// Fungsi untuk memformat tanggal tanpa kota
export const formatDateIndo = (tanggal) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(tanggal));
};

// Fungsi untuk memformat tanggal dengan kota
export const formatDateWithCity = (tanggal) => {
    return `Ambon, ${new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(tanggal))}`;
};