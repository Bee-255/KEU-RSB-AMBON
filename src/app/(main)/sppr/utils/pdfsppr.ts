// src/lib/pdfsppr.ts

import jsPDF from "jspdf";
import "jspdf-autotable";
import { capitalizeWords, formatAngka, formatTanggalIndonesia } from "@/lib/format";
import { interNormalFont, interBoldFont } from "@/lib/fonts";
import { terbilang } from "@/lib/terbilang";

// Interface untuk mendefinisikan struktur data SPPR
interface Sppr {
  tanggal: string;
  nomor_surat: string;
  nama_kpa: string;
  jabatan_kpa: string;
  pangkat_kpa: string;
  nama_bendahara: string;
  jabatan_bendahara: string;
  pangkat_bendahara: string;
  nama_pengambil: string;
  jabatan_pengambil: string;
  pangkat_pengambil: string;
  jumlah_penarikan: number;
  status_sppr: string;
  nomor_rekening: string;
  nama_rekening: string;
  nama_bank: string;
}

// Fungsi untuk membuat PDF sesuai template
export const generateSpprPdf = (sppr: Sppr) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentMargin = 4;
  const lineHeight = 4;

  // Menyematkan font Inter ke dalam dokumen jsPDF
  doc.addFileToVFS('Inter-Regular.ttf', interNormalFont);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', interBoldFont);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

  // Helper function untuk format tanggal tanpa kota
  const formatTanggal = (tanggal: string): string => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(tanggal));
  };

  // Helper function untuk justify teks secara manual dan akurat
  const justifyText = (text: string, x: number, y: number, maxWidth: number, fontHeight: number, doc: jsPDF) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineSpacingFactor = 1.5;

    lines.forEach((line: string, index: number) => {
      // Mengubah let menjadi const karena currentLineY tidak di-reassign di sini
      const currentLineY = y + (index * fontHeight * lineSpacingFactor);
      const words = line.split(' ');

      // Logika khusus untuk baris terakhir agar tidak ter-justify
      if (index === lines.length - 1) {
        doc.text(line, x, currentLineY);
        return;
      }

      const textWidth = doc.getTextWidth(line);
      const spaceToFill = maxWidth - textWidth;
      const spaceCount = words.length - 1;
      // Menghindari pembagian oleh nol jika hanya ada satu kata atau kurang
      const addedSpace = spaceCount > 0 ? spaceToFill / spaceCount : 0;
      let currentX = x;

      words.forEach((word: string) => {
        doc.text(word, currentX, currentLineY);
        // Menambahkan spasi sesuai kebutuhan, hindari spasi ekstra di akhir baris
        currentX += doc.getTextWidth(word) + doc.getTextWidth(' ') + addedSpace;
      });
    });
  };

  // Set font Inter
  doc.setFont("Inter", "normal");
  doc.setFontSize(11);

  // **Fungsi untuk membuat halaman SPPR (Halaman 1) **
  const createSPPRSection = (startY: number) => {
    let y = startY + 20;
    // Variabel ini tidak perlu diubah, jadi gunakan const
    const boxWidth = pageWidth - margin * 2;
    const boxX = margin;
    const textWidth = boxWidth - contentMargin * 2;
    const textX = boxX + contentMargin;

    // Part 1: Kotak Kop Surat
    const part1BoxHeight = 16;
    doc.rect(boxX, y, boxWidth, part1BoxHeight);
    const part1Y = y + 5;
    doc.setFont("Inter", "bold");
    doc.setFontSize(11);
    doc.text("KEPOLISIAN NEGARA REPUBLIK INDONESIA", pageWidth / 2, part1Y, { align: "center" });
    doc.text("DAERAH MALUKU", pageWidth / 2, part1Y + lineHeight, { align: "center" });
    doc.text("RUMAH SAKIT BHAYANGKARA AMBON", pageWidth / 2, part1Y + lineHeight * 2, { align: "center" });
    y += part1BoxHeight;

    // Part 2: Kotak Judul dan Tanggal
    const part2BoxHeight = 13;
    doc.rect(boxX, y, boxWidth, part2BoxHeight);
    const part2Y = y + 5;
    doc.setFont("Inter", "bold");
    doc.setFontSize(11);
    const titleText = "SURAT PERSETUJUAN PENDEBITAN REKENING (SPPR)";
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, pageWidth / 2, part2Y, { align: "center" });
    doc.line(pageWidth / 2 - titleWidth / 2, part2Y + 1, pageWidth / 2 + titleWidth / 2, part2Y + 1);

    const textAfterTitleY = part2Y + lineHeight + 1;
    doc.setFont("Inter", "normal");
    doc.setFontSize(11);
    const combinedText = `Tanggal : ${formatTanggal(sppr.tanggal)} No. ${sppr.nomor_surat}`;
    doc.text(combinedText, pageWidth / 2, textAfterTitleY, { align: "center" });
    y += part2BoxHeight;

    // Part 3: Kotak Penjelasan
    const part3BoxHeight = 20;
    doc.rect(boxX, y, boxWidth, part3BoxHeight);
    const part3Y = y + 5;

    const penjelasanText = `Saya yang bertanda tangan di bawah ini selaku Kuasa Pengguna Anggaran memerintahkan Bendahara Pengeluaran agar melakukan Pendebitan Rekening menggunakan Kartu Debit sejumlah Rp${formatAngka(sppr.jumlah_penarikan)}`;

    justifyText(penjelasanText, textX, part3Y, textWidth, lineHeight, doc);

    y += part3BoxHeight;

    // Part 4: Kotak Terbilang
    const part4BoxHeight = 15;
    doc.rect(boxX, y, boxWidth, part4BoxHeight);
    const part4Y = y + 5;

    const terbilangText = `Terbilang: ${capitalizeWords(terbilang(sppr.jumlah_penarikan))} Rupiah`;
    justifyText(terbilangText, textX, part4Y, textWidth, lineHeight, doc);

    y += part4BoxHeight;

    // Part 5: Kotak Atas Dasar
    const part5BoxHeight = 10;
    doc.rect(boxX, y, boxWidth, part5BoxHeight);
    const part5Y = y + 5;

    doc.text(`Atas dasar: Surat perintah bayar nomor ......... **)`, textX, part5Y);

    y += part5BoxHeight;

    // Part 6: Kotak Tanda Tangan
    const part6BoxHeight = 45;
    doc.rect(boxX, y, boxWidth, part6BoxHeight);
    const part6Y = y + 5;

    doc.text(formatTanggalIndonesia(sppr.tanggal), pageWidth / 2, part6Y, { align: "center" });
    const signatureYOffset = 6;
    doc.text("Kuasa Pengguna Anggaran", margin + 19, part6Y + signatureYOffset, { align: "left" });
    doc.text("Bendahara Pengeluaran", pageWidth - margin - 25, part6Y + signatureYOffset, { align: "right" });

    // Tambahkan garis bawah pada nama
    const namaY = part6Y + signatureYOffset + 25;
    doc.setFont("Inter");

    // Teks nama KPA dan garis bawah
    const namaKpaWidth = doc.getTextWidth(sppr.nama_kpa);
    doc.text(sppr.nama_kpa, margin + 10, namaY, { align: "left" });
    doc.line(margin + 10, namaY + 1, margin + 10 + namaKpaWidth, namaY + 1);

    // Teks nama Bendahara dan garis bawah
    const namaBendaharaWidth = doc.getTextWidth(sppr.nama_bendahara);
    const xBendahara = pageWidth - margin - 10; // Posisi x untuk align right
    doc.text(sppr.nama_bendahara, xBendahara, namaY, { align: "right" });
    doc.line(xBendahara - namaBendaharaWidth, namaY + 1, xBendahara, namaY + 1);

    doc.setFont("Inter", "normal");
    doc.text(sppr.pangkat_kpa, margin + 13, part6Y + signatureYOffset + 30, { align: "left" });
    doc.text(sppr.pangkat_bendahara, pageWidth - margin - 10, part6Y + signatureYOffset + 30, { align: "right" });
    y += part6BoxHeight;
  };

  // Fungsi untuk membuat halaman Surat Kuasa (Halaman 2)
  const createSuratKuasaSection = () => {
    let y = margin;
    const boxWidth = pageWidth - margin * 2;
    const textX = margin + contentMargin;

    // Judul
    doc.setFont("Inter", "bold");
    doc.setFontSize(12);
    doc.text("SURAT KUASA", pageWidth / 2, y, { align: "center" });

    // Konten Surat Kuasa
    y += 20;
    doc.setFont("Inter", "normal");
    doc.setFontSize(11);
    doc.text("Yang bertanda tangan di bawah ini:", margin, y, {
      lineHeightFactor: 1.5,
    });

    y += 10;
    doc.text("Nama", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.nama_bendahara + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    doc.text("Pangkat/NRP/NIP", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.pangkat_bendahara + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    doc.text("Jabatan", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.jabatan_bendahara + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    doc.text("Kesatuan", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text("POLDA MALUKU.", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += 10;
    doc.text("Dengan ini memberikan kuasa kepada:", margin, y, {
      lineHeightFactor: 1.5,
    });

    y += 10;
    doc.text("Nama", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.nama_pengambil + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    doc.text("Pangkat/NRP/NIP", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.pangkat_pengambil + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    doc.text("Jabatan", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.jabatan_pengambil + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    doc.text("Kesatuan", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text("POLDA MALUKU.", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += 10;
    const penjelasanKuasa = `Untuk menandatangani slip penarikan dan pengambilan uang secara tunai sebesar Rp${formatAngka(sppr.jumlah_penarikan)} (${capitalizeWords(terbilang(sppr.jumlah_penarikan))} Rupiah) Pada Rekening BANK RAKYAT INDONESIA dengan data sebagai berikut:`;

    // Split teks menjadi beberapa baris yang sesuai dengan lebar yang ditentukan
    const splitPenjelasanKuasa = doc.splitTextToSize(
      penjelasanKuasa,
      pageWidth - 2 * margin
    );

    // Cetak teks yang sudah di-split dengan align justify
    doc.text(splitPenjelasanKuasa, margin, y, {
      align: "justify",
      maxWidth: pageWidth - 2 * margin,
      lineHeightFactor: 1.5,
    });

    // Tambah nilai y sesuai dengan jumlah baris yang terbagi
    y += splitPenjelasanKuasa.length * lineHeight * 1.5;

    y += 5;
    // Baris ini sudah benar karena properti sudah ada di interface Sppr
    doc.text("Nomor Rekening", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.nomor_rekening + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    // Baris ini sudah benar karena properti sudah ada di interface Sppr
    doc.text("Atas Nama", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.nama_rekening + ";", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += lineHeight * 1.5;
    // Baris ini sudah benar karena properti sudah ada di interface Sppr
    doc.text("Nama Bank", margin, y, { lineHeightFactor: 1.5 });
    doc.text(":", margin + 40, y, { lineHeightFactor: 1.5 });
    doc.text(sppr.nama_bank+ ".", margin + 42, y, {
      lineHeightFactor: 1.5,
    });

    y += 10;
    const risikoText =
      "Segala resiko yang terjadi menjadi tanggung jawab saya selaku pemberi kuasa.";
    const splitRisikoText = doc.splitTextToSize(risikoText, pageWidth - 2 * margin);
    doc.text(splitRisikoText, margin, y, {
      align: "justify",
      maxWidth: pageWidth - 2 * margin,
      lineHeightFactor: 1.5,
    });

    y += splitRisikoText.length * lineHeight * 1.5;

    y += 5;
    const penutup =
      "Demikian surat kuasa ini saya buat dengan penuh kesadaran dan tanpa paksaan dari pihak manapun.";
    const splitPenutup = doc.splitTextToSize(penutup, pageWidth - 2 * margin);
    doc.text(splitPenutup, margin, y, {
      align: "justify",
      maxWidth: pageWidth - 2 * margin,
      lineHeightFactor: 1.5,
    });

    y += splitPenutup.length * lineHeight * 1.5;

    y += 5;

    // Tanggal Penutup (diselaraskan dengan posisi bendahara)
    const rightColumnCenter = pageWidth - margin - (pageWidth / 4) + margin / 2;
    doc.text(`Ambon, ${formatTanggal(sppr.tanggal)}`, rightColumnCenter, y, {
      align: "center",
    });

    y += 10;

    // Bagian Tanda Tangan - Disusun dalam 2 kolom simetris
    const leftColumnCenter = margin + pageWidth / 4 - margin / 2;

    doc.setLineWidth(0.1);

    // Jabatan
    doc.setFont("Inter", "normal");
    doc.setFontSize(11);
    doc.text("Penerima Kuasa", leftColumnCenter, y, { align: "center" });
    doc.text("Bendahara Pengeluaran", rightColumnCenter, y, { align: "center" });

    y += 30;

    // Nama
    const namaPengambilWidth = doc.getTextWidth(sppr.nama_pengambil);
    const namaBendaharaWidth = doc.getTextWidth(sppr.nama_bendahara);
    doc.text(sppr.nama_pengambil, leftColumnCenter, y, { align: "center" });
    doc.text(sppr.nama_bendahara, rightColumnCenter, y, { align: "center" });

    // Garis bawah untuk nama
    doc.line(
      leftColumnCenter - namaPengambilWidth / 2,
      y + 1,
      leftColumnCenter + namaPengambilWidth / 2,
      y + 1,
    );
    doc.line(
      rightColumnCenter - namaBendaharaWidth / 2,
      y + 1,
      rightColumnCenter + namaBendaharaWidth / 2,
      y + 1,
    );

    y += 5;

    // Pangkat
    doc.setFontSize(10);
    doc.text(sppr.pangkat_pengambil, leftColumnCenter, y, { align: "center" });
    doc.text(sppr.pangkat_bendahara, rightColumnCenter, y, { align: "center" });

    y += 10;
  };

  // Proses eksekusi untuk kedua halaman
  // Halaman 1
  createSPPRSection(0);
  createSPPRSection(pageHeight / 2);

  // Garis pemisah untuk halaman 1
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight / 2, pageWidth - margin, pageHeight / 2);

  // Halaman 2: Tambahkan halaman baru dan render surat kuasa
  doc.addPage();
  createSuratKuasaSection();

  doc.save(`SPPR_${sppr.nomor_surat}.pdf`);
};