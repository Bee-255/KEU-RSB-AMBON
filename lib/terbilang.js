// Fungsi untuk mengonversi angka menjadi teks (Terbilang)
export const terbilang = (angka) => {
  const bilangan = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];

  angka = Math.abs(angka);
  if (angka === 0) {
    return "nol";
  }

  if (angka < 12) {
    return bilangan[angka];
  } else if (angka < 20) {
    return terbilang(angka - 10) + " belas";
  } else if (angka < 100) {
    const sisa = angka % 10;
    const puluh = Math.floor(angka / 10);
    return (
      bilangan[puluh] +
      " puluh" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 200) {
    const sisa = angka - 100;
    return "seratus" + (sisa > 0 ? " " + terbilang(sisa) : "");
  } else if (angka < 1000) {
    const sisa = angka % 100;
    const ratus = Math.floor(angka / 100);
    return (
      bilangan[ratus] +
      " ratus" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 2000) {
    const sisa = angka - 1000;
    return "seribu" + (sisa > 0 ? " " + terbilang(sisa) : "");
  } else if (angka < 1000000) {
    const sisa = angka % 1000;
    const ribu = Math.floor(angka / 1000);
    return (
      terbilang(ribu) +
      " ribu" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 1000000000) {
    const sisa = angka % 1000000;
    const juta = Math.floor(angka / 1000000);
    return (
      terbilang(juta) +
      " juta" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 1000000000000) {
    const sisa = angka % 1000000000;
    const milyar = Math.floor(angka / 1000000000);
    return (
      terbilang(milyar) +
      " milyar" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 1000000000000000) {
    const sisa = angka % 1000000000000;
    const triliun = Math.floor(angka / 1000000000000);
    return (
      terbilang(triliun) +
      " triliun" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else {
    return "Jumlah melebihi batas";
  }
};