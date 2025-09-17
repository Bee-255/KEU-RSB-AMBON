import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Fungsi untuk membuat PDF dari tabel
const createPDF = (data) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Laporan Surat Perintah Pendebitan Rekening", 14, 20);

  const tableData = data.map((item) => [
    item.tanggal,
    item.nomor_surat,
    item.nama_kpa,
    item.nama_bendahara,
    item.nama_pengambil,
    item.pangkat_nrp,
  ]);

  const tableHeaders = [
    ["Tanggal", "Nomor Surat", "Nama KPA", "Bendahara", "Pengambil", "Pangkat/NRP"],
  ];

  doc.autoTable({
    startY: 30,
    head: tableHeaders,
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [22, 160, 133] },
  });

  doc.save("laporan_sppr.pdf");
};

const sppr = () => {
  const [spprList, setSpprList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSPPR, setCurrentSPPR] = useState(null);
  const router = useRouter();

  // State untuk form input
  const [formData, setFormData] = useState({
    tanggal: "",
    nomor_surat: "",
    nama_kpa: "",
    nama_bendahara: "",
    nama_pengambil: "",
    pangkat_nrp: "",
  });

  // Ambil data SPPR dari Supabase saat halaman dimuat
  useEffect(() => {
    fetchSPPR();
  }, []);

  const fetchSPPR = async () => {
    const { data, error } = await supabase.from("SPPR").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Gagal mengambil data:", error);
    } else {
      setSpprList(data);
    }
  };

  // Tangani perubahan input form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Tangani tombol Rekam/Simpan
  const handleSave = async (e) => {
    e.preventDefault();

    if (isEditing) {
      // Logic untuk Edit
      const { data, error } = await supabase
        .from("SPPR")
        .update(formData)
        .eq("id", currentSPPR.id);

      if (error) {
        Swal.fire("Gagal!", "Data gagal diupdate. Coba lagi.", "error");
        console.error("Error updating data:", error);
      } else {
        Swal.fire("Berhasil!", "Data berhasil diupdate.", "success");
        fetchSPPR(); // Refresh data
        resetForm();
      }
    } else {
      // Logic untuk Rekam
      const { data, error } = await supabase.from("SPPR").insert([formData]);

      if (error) {
        Swal.fire("Gagal!", "Data gagal disimpan. Coba lagi.", "error");
        console.error("Error inserting data:", error);
      } else {
        Swal.fire("Berhasil!", "Data berhasil disimpan.", "success");
        fetchSPPR(); // Refresh data
        resetForm();
      }
    }
  };

  // Tangani tombol Edit
  const handleEdit = (sppr) => {
    setIsEditing(true);
    setCurrentSPPR(sppr);
    setFormData({
      tanggal: sppr.tanggal,
      nomor_surat: sppr.nomor_surat,
      nama_kpa: sppr.nama_kpa,
      nama_bendahara: sppr.nama_bendahara,
      nama_pengambil: sppr.nama_pengambil,
      pangkat_nrp: sppr.pangkat_nrp,
    });
  };

  // Tangani tombol Hapus
  const handleDelete = async (spprId) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from("SPPR").delete().eq("id", spprId);

        if (error) {
          Swal.fire("Gagal!", "Data gagal dihapus. Coba lagi.", "error");
          console.error("Error deleting data:", error);
        } else {
          Swal.fire("Dihapus!", "Data berhasil dihapus.", "success");
          fetchSPPR(); // Refresh data
        }
      }
    });
  };

  // Tangani tombol Download
  const handleDownload = () => {
    createPDF(spprList);
  };

  // Reset form
  const resetForm = () => {
    setIsEditing(false);
    setCurrentSPPR(null);
    setFormData({
      tanggal: "",
      nomor_surat: "",
      nama_kpa: "",
      nama_bendahara: "",
      nama_pengambil: "",
      pangkat_nrp: "",
    });
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Surat Perintah Pendebitan Rekening</h1>
      </header>

      {/* Form Input Data */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          {isEditing ? "Edit Data SPPR" : "Rekam Data SPPR"}
        </h2>
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal</label>
              <input
                type="date"
                name="tanggal"
                value={formData.tanggal}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nomor Surat</label>
              <input
                type="text"
                name="nomor_surat"
                value={formData.nomor_surat}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama KPA</label>
              <input
                type="text"
                name="nama_kpa"
                value={formData.nama_kpa}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Bendahara</label>
              <input
                type="text"
                name="nama_bendahara"
                value={formData.nama_bendahara}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Pengambil</label>
              <input
                type="text"
                name="nama_pengambil"
                value={formData.nama_pengambil}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pangkat & NRP</label>
              <input
                type="text"
                name="pangkat_nrp"
                value={formData.pangkat_nrp}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
            >
              {isEditing ? "Simpan Perubahan" : "Rekam Data"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabel Data dan Tombol Download */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Daftar SPPR</h2>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
          >
            Download PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nomor Surat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama KPA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Bendahara
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Pengambil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pangkat/NRP
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {spprList.map((sppr) => (
                <tr key={sppr.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sppr.tanggal}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sppr.nomor_surat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sppr.nama_kpa}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sppr.nama_bendahara}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sppr.nama_pengambil}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sppr.pangkat_nrp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(sppr)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sppr.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default sppr;