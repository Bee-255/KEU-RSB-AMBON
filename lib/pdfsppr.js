import jsPDF from "jspdf";
import "jspdf-autotable";
import { capitalizeWords, formatAngka, formatTanggalIndonesia } from "./utils";
import { interNormalFont, interBoldFont } from "./fonts";
import { terbilang } from "./terbilang";

// Fungsi untuk membuat PDF sesuai template
export const createPDF = (sppr) => {
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
  const formatTanggal = (tanggal) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(tanggal));
  };

  // Helper function untuk justify teks secara manual dan akurat
  const justifyText = (text, x, y, maxWidth, fontHeight, doc) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineSpacingFactor = 1.5;

    lines.forEach((line, index) => {
      let currentLineY = y + (index * fontHeight * lineSpacingFactor);
      const words = line.split(' ');

      if (index === lines.length - 1) {
        doc.text(line, x, currentLineY);
        return;
      }

      const textWidth = doc.getTextWidth(line);
      const spaceToFill = maxWidth - textWidth;
      const spaceCount = words.length - 1;
      const addedSpace = spaceToFill / spaceCount;
      let currentX = x;

      words.forEach((word, wordIndex) => {
        doc.text(word, currentX, currentLineY);
        currentX += doc.getTextWidth(word) + doc.getTextWidth(' ') + addedSpace;
      });
    });
  };

  // Set font Inter
  doc.setFont("Inter", "normal");
  doc.setFontSize(11);

  // **Fungsi untuk membuat halaman SPPR (Halaman 1) **
  const createSPPRSection = (startY) => {
    let y = startY + 20;
    const boxWidth = pageWidth - margin * 2;
    const boxX = margin;
    const textWidth = boxWidth - contentMargin * 2;
    const textX = boxX + contentMargin;

    // Part 1: Kotak Kop Surat
    const part1BoxHeight = 16;
    doc.rect(boxX, y, boxWidth, part1BoxHeight);
    let part1Y = y + 5;
    doc.setFont("Inter", "bold");
    doc.setFontSize(11);
    doc.text("KEPOLISIAN NEGARA REPUBLIK INDONESIA", pageWidth / 2, part1Y, { align: "center" });
    part1Y += lineHeight;
    doc.text("DAERAH MALUKU", pageWidth / 2, part1Y, { align: "center" });
    part1Y += lineHeight;
    doc.text("RUMAH SAKIT BHAYANGKARA AMBON", pageWidth / 2, part1Y, { align: "center" });
    y += part1BoxHeight;

    // Part 2: Kotak Judul dan Tanggal
    const part2BoxHeight = 13;
    doc.rect(boxX, y, boxWidth, part2BoxHeight);
    let part2Y = y + 5;
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
    let part3Y = y + 5;

    const penjelasanText = `Saya yang bertanda tangan di bawah ini selaku Kuasa Pengguna Anggaran memerintahkan Bendahara Pengeluaran agar melakukan Pendebitan Rekening menggunakan Kartu Debit sejumlah Rp${formatAngka(sppr.jumlah_penarikan)}`;

    justifyText(penjelasanText, textX, part3Y, textWidth, lineHeight, doc);

    y += part3BoxHeight;

    // Part 4: Kotak Terbilang
    const part4BoxHeight = 15;
    doc.rect(boxX, y, boxWidth, part4BoxHeight);
    let part4Y = y + 5;

    const terbilangText = `Terbilang: ${capitalizeWords(terbilang(sppr.jumlah_penarikan))} Rupiah`; // Gunakan fungsi capitalizeWords untuk kapital di awal kata
    justifyText(terbilangText, textX, part4Y, textWidth, lineHeight, doc);

    y += part4BoxHeight;

    // Part 5: Kotak Atas Dasar
    const part5BoxHeight = 10;
    doc.rect(boxX, y, boxWidth, part5BoxHeight);
    let part5Y = y + 5;

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
    doc.text(sppr.nama_bendahara, pageWidth - margin - 22, namaY, { align: "right" });
    doc.line(pageWidth - margin - 34 - namaBendaharaWidth, namaY + 1, pageWidth - margin - 10, namaY + 1);

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
    doc.text("Yang bertanda tangan di bawah ini:", margin, y);

    y += 10;
    doc.text("Nama", margin, y);
    doc.text(":", margin + 40, y);
    doc.text(sppr.nama_bendahara, margin + 42, y); // Ambil nama KPA dari data

    y += lineHeight;
    doc.text("Pangkat/NRP/NIP", margin, y);
    doc.text(":", margin + 40, y);
    doc.text(sppr.pangkat_bendahara, margin + 42, y); // Ambil pangkat KPA dari data

    y += lineHeight;
    doc.text("Jabatan", margin, y);
    doc.text(":", margin + 40, y);
    doc.text("KAUR KEU;", margin + 42, y);

    y += lineHeight;
    doc.text("Kesatuan", margin, y);
    doc.text(":", margin + 40, y);
    doc.text("POLDA MALUKU.", margin + 42, y);

    y += 10;
    doc.text("Dengan ini memberikan kuasa kepada:", margin, y);

    y += 10;
    doc.text("Nama", margin, y);
    doc.text(":", margin + 40, y);
    doc.text(sppr.nama_pengambil, margin + 42, y); // Nama pengambil

    y += lineHeight;
    doc.text("Pangkat/NRP/NIP", margin, y);
    doc.text(":", margin + 40, y);
    doc.text(sppr.pangkat_pengambil, margin + 42, y); // Pangkat dan NRP pengambil

    y += lineHeight;
    doc.text("Jabatan", margin, y);
    doc.text(":", margin + 40, y);
    doc.text("BANUM UR KEU;", margin + 42, y);

    y += lineHeight;
    doc.text("Kesatuan", margin, y);
    doc.text(":", margin + 40, y);
    doc.text("POLDA MALUKU.", margin + 42, y);

    y += 10;
    const penjelasanKuasa = `Untuk menandatangani slip penarikan dan pengambilan uang secara tunai sebesar Rp${formatAngka(sppr.jumlah_penarikan)} (${terbilang(sppr.jumlah_penarikan)} rupiah.) Pada Rekening BANK RAKYAT INDONESIA dengan data sebagai berikut:`;
    doc.text(penjelasanKuasa, margin, y);

    y += 10;
    doc.text("Nomor Rekening", margin, y);
    doc.text(":", margin + 40, y);
    doc.text("652502151371000;", margin + 42, y);

    y += lineHeight;
    doc.text("Atas Nama", margin, y);
    doc.text(":", margin + 40, y);
    doc.text("BPG 061 RUMAH SAKIT BHAYANGKARA;", margin + 42, y);

    y += lineHeight;
    doc.text("Nama Bank", margin, y);
    doc.text(":", margin + 40, y);
    doc.text("BANK RAKYAT INDONESIA.", margin + 42, y);

    y += 10;
    doc.text("Segala resiko yang terjadi menjadi tanggung jawab saya selaku pemberi kuasa.", margin, y);

    y += 10;
    const penutup = "Demikian surat kuasa ini saya buat dengan penuh kesadaran dan tanpa paksaan dari pihak manapun.";
    doc.text(penutup, margin, y);

    y += 20;
    doc.text(`Ambon, ${formatTanggal(sppr.tanggal)}`, pageWidth - margin, y, { align: "right" });

    y += 10;
    doc.text("Penerima Kuasa", margin + 10, y);
    doc.text("Bendahara Pengeluaran", pageWidth - margin - 20, y, { align: "right" });

    // Tanda tangan
    y += 30;
    doc.text(sppr.nama_pengambil, margin + 10, y);
    doc.text(sppr.nama_bendahara, pageWidth - margin - 20, y, { align: "right" });

    y += lineHeight;
    doc.text(sppr.pangkat_pengambil, margin + 10, y);
    doc.text(sppr.pangkat_bendahara, pageWidth - margin - 20, y, { align: "right" });
};


  // ** Proses eksekusi untuk kedua halaman **
  // Halaman 1
  createSPPRSection(0);
  createSPPRSection(pageHeight / 2);

  // Garis pemisah untuk halaman 1
  doc.setLineDash([2, 2], 0);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight / 2, pageWidth - margin, pageHeight / 2);
  doc.setLineDash([], 0);

  // Halaman 2: Tambahkan halaman baru dan render surat kuasa
  doc.addPage();
  createSuratKuasaSection();

  doc.save(`SPPR_${sppr.nomor_surat}.pdf`);
};