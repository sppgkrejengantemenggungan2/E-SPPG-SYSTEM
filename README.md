# E-SPPG (ELECTRONIC SISTEM INFORMASI SATUAN PELAYANAN PEMENUHAN GIZI)
**Sistem ERP Terpadu Program Makan Bergizi Gratis (MBG)**

---

## 1. Identitas Awal Sistem
- **Nama Aplikasi**: E-SPPG Management System
- **Instansi SPPG**: SPPG Probolinggo Krejengan Temenggungan 2
- **Yayasan**: Yayasan Hafshawaty
- **Program**: Makan Bergizi Gratis (MBG)
- **Zona Waktu**: Asia/Jakarta (WIB)
- **Bahasa**: Indonesia
- **Mata Uang**: Rupiah (IDR)
- **Format Tanggal**: DD-MM-YYYY
- **Format Dokumen Cetak**: A4 Portrait MBG Standard

Semua identitas ini dapat diperbarui secara dinamis oleh Admin Utama melalui modul **Pengaturan > Profil SPPG**, dan otomatis memperbarui seluruh kop surat, dokumen BAST, RAB, PO, dan laporan resmi.

---

## 2. Struktur Modul & Alur Bisnis Terintegrasi

### A. Dashboard Utama
- **12 Indikator Kunci (KPI)**:
  1. Total Kelompok Lembaga Sasaran (SD, MTs, Posyandu)
  2. Total Penerima Manfaat Terdaftar
  3. Total Porsi Kecil (Balita & SD Kelas 1-3)
  4. Total Porsi Besar (SD Kelas 4-6, MTs, Guru & Bumil)
  5. Total Anggaran RAB Disetujui
  6. Total Purchase Order (PO) Harian
  7. Total Stok Bahan Pangan Gudang (kg)
  8. Total Realisasi Pengeluaran Kas
  9. Saldo Kas Berjalan
  10. Status Penyaluran & BAST
  11. Jumlah Relawan Tidak Hadir
  12. Jumlah Relawan Pengganti
- **Menu Hari Ini**: Komponen menu, kandungan energi, protein, lemak, karbohidrat, serat, dan estimasi food cost.
- **Sasaran Distribusi Hari Ini**: Rekap kuota porsi per lembaga sasaran.
- **Monitoring Kehadiran Relawan**: Daftar relawan absen dan relawan pengganti.

### B. Data Master
- **Master Bahan Pangan**: Database komposisi gizi pangan Kemenkes (Energi, Protein, Lemak, Karbo, Serat per 100g), harga acuan, stok minimum, dan kategori.
- **Master Barang Operasional**: Inventaris ompreng stainless SUS-304 5 sekat, sendok garpu, box termal, tabung gas.
- **Master Supplier Rekanan**: Supplier sayur, protein hewani, sembako, dan operasional dengan nomor rekening pembayaran.
- **Master Data Pengguna**: Akun staf operasional dan hak akses.

### C. Modul Penerima Manfaat
- Kelompok Lembaga Sasaran (SDN Temenggungan 1, SDN Krejengan 2, MTs Hafshawaty Zainul Hasan, Posyandu Melati).
- Rincian Jiwa: Siswa (L/P), Guru (L/P), Balita, Ibu Hamil, Ibu Menyusui.
- Perhitungan otomatis porsi kecil dan porsi besar.
- Import Excel (.xlsx) & Export Excel / CSV.
- Rekapitulasi Otomatis Cetak A4 Berita Acara.

### D. Modul Tugas PLOG (Menu & Gizi)
- **Nama & Item Menu**: Jadwal makan pagi/siang/sore, kategori menu, porsi kecil dan besar.
- **Perencanaan Menu & Bahan (Resep)**: Menghitung kuantitas bahan berdasarkan:
  $$\text{Total Kebutuhan Bahan (kg)} = \frac{\text{Berat Bahan per Porsi (gram)} \times \text{Jumlah Porsi}}{1000}$$
- **Kalkulasi Kandungan Gizi (AKG 35%)**:
  $$\text{Zat Gizi per Porsi} = \frac{\text{Berat Bahan (gram)}}{100} \times \text{Kandungan Gizi per 100 gram}$$
- **Input Food Cost**: Menghitung food cost per porsi kecil, porsi besar, dan total biaya bahan.

### E. Modul Tugas PLOK (RAB & Pengadaan)
- **Rencana Anggaran Belanja (RAB)**: Bahan pangan, barang operasional, dan biaya operasional. Alur persetujuan Kepala SPPG, catatan penolakan, versioning revisi tanpa mengubah histori versi sebelumnya.
- **Purchase Order (PO) Harian**: Nomor PO otomatis terhubung dengan pagu RAB.
- **Checklist Penerimaan Bahan**: Pemeriksaan fisik, status Aman / Tidak Aman, unggah multi-foto dokumentasi.
  - *Aturan Idempotent*: Stok gudang **hanya bertambah setelah dikonfirmasi** oleh petugas berwenang, dan sistem mencegah penambahan stok ganda dari PO yang sama.

### F. Modul Inventory & Gudang
- Saldo stok bahan pangan realtime.
- Mutasi Masuk (dari penerimaan PO) dan Mutasi Keluar (pemakaian masak dapur).
- Proteksi pencegahan stok negatif.
- Stock Opname Fisik: membandingkan stok sistem dengan timbangan fisik nyata, menghitung selisih (discrepancy), dan menghasilkan Berita Acara Opname.

### G. Modul Tugas Divisi Operasional
1. **Divisi Persiapan**: Sortasi bahan rusak/busuk (sayur, lauk hewani, buah + foto), pencatatan suhu ruangan persiapan/pengolahan/pemorsian, relawan absen & pengganti.
2. **Divisi Pengolahan**: Pengukuran suhu makanan matang (nasi, ayam, tempe, sayur, buah) dengan jam pengukuran & foto, suhu ruangan dapur.
3. **Divisi Pemorsian**: Suhu makanan saat packing, uji gramasi ompreng porsi kecil & porsi besar vs standar resep (QC gramasi), foto ompreng porsi kecil & besar.
4. **Divisi Distribusi**: Jadwal pengiriman, rute pengantaran, driver, nomor armada kendaraan, nominal BBM & kupon SPBU, foto serah terima.
5. **Divisi Cuci Ompreng (Food Waste)**: Penimbangan sisa makanan (nasi, lauk, sayur, buah) dan kalkulasi otomatis:
   $$\text{Food Waste (\%)} = \left(\frac{\text{Total Berat Sampah Makanan (kg)}}{\text{Total Berat Makanan Diproduksi (kg)}}\right) \times 100\%$$

### H. Modul Administrasi, Persuratan & BAST
- Surat Masuk dan Surat Keluar berpenomoran otomatis.
- Cetak Surat Tugas dinas operasional.
- **BAST Penerimaan Makanan** dan **BAST Pengembalian Wadah Ompreng** (format cetak formal A4, langsung tercatat otomatis di buku arsip surat keluar).
- **Pembuat Flyer Menu MBG Otomatis**: Dilengkapi logo resmi BGN RI, BNSP, SLHS, informasi gizi AKG, foto ompreng, batas konsumsi maksimal (4 jam pasca-masak), dan fitur unduh PNG / cetak A4.

### I. Modul Uji Organoleptik
- **Organoleptik PLOG**: Uji sensori dapur oleh Ahli Gizi (Warna, Aroma, Rasa, Tekstur, Penampilan, Kesimpulan Layak Konsumsi, Foto & TTD).
- **Organoleptik PIC**: Uji sensori saat penerimaan di sekolah oleh Kepala Sekolah/PIC.

### J. Modul Keuangan & Kas
- Buku Kas Umum (BKU) terintegrasi.
- Pencatatan Pemasukan (termin dana APBN/yayasan) dan Pengeluaran.
- Integrasi pembayaran PO: Pembelian bahan pangan dari PO dapat dilunasi langsung dengan mencatat nomor bukti kas, dan PO otomatis ditandai **Lunas**.
- Perhitungan saldo kas berjalan realtime.

### K. Modul 16 Laporan Resmi Terstandar
Tersedia 16 laporan dinas terintegrasi langsung dengan sumber data aktual, dilengkapi filter rentang tanggal, preview cetak A4, dan ekspor Excel (.xlsx) serta CSV.

### L. Keamanan & Pengaturan
- Autentikasi Google Firebase & Role-Based Access Control (RBAC).
- Switcher simulasi 10 peran operasional untuk verifikasi hak akses instan.
- **Audit Log Immutable**: Mencatat setiap aktivitas user, aksi CREATE/UPDATE/DELETE/APPROVE, timestamp, dan detail perubahan.
- Backup database ke file JSON dan prosedur restore terproteksi.

---

## 3. Konfigurasi Firebase
Aplikasi telah terhubung ke Firebase Project resmi AI Studio:
- **Project ID**: `predictive-outlook-k3rp2`
- **Firestore Database ID**: `ai-studio-6132e586-8134-46bd-86e6-4ec671e1208a`
- **Rules**: Dideploy melalui `firestore.rules` dengan standar Zero-Trust dan Default-Deny.
