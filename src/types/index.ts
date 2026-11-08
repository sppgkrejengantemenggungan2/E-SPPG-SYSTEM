export type UserRole =
  | 'Admin Utama'
  | 'Kepala SPPG'
  | 'Pengawas Gizi'
  | 'Pengawas Keuangan'
  | 'Asisten Lapangan'
  | 'Admin Gudang'
  | 'Koordinator Relawan'
  | 'Relawan'
  | 'Editor Web'
  | 'Mitra';

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roleTitle?: string;
  phone?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
  updatedAt: string;
}

export interface SppgProfile {
  id: string;
  appName: string;
  institutionName: string;
  foundationName: string;
  programName: string;
  sppgCode?: string;
  address: string;
  phone: string;
  email: string;
  headName: string;
  headNip?: string;
  nutritionistName: string;
  nutritionistStr?: string;
  financeOfficerName: string;
  updatedAt: string;
  logoUrl?: string;
  bgnLogoUrl?: string;
  bnspLogoUrl?: string;
  slhsLogoUrl?: string;
}

export interface BeneficiaryGroup {
  id: string;
  institutionName: string;
  category: 'SD/MI' | 'SMP/MTs' | 'SMA/MA' | 'Posyandu/BKB' | 'Pondok Pesantren' | 'Lainnya';
  address: string;
  picName: string;
  phone: string;
  bankAccount?: string;
  bankName?: string;
  status: 'aktif' | 'nonaktif';
  photoUrl?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Beneficiary {
  id: string;
  groupId: string;
  institutionName: string;
  maleStudents: number;
  femaleStudents: number;
  maleTeachers: number;
  femaleTeachers: number;
  toddlers: number;
  pregnantMothers: number;
  breastfeedingMothers: number;
  smallPortions: number; // calculated or target
  largePortions: number;
  totalPortions: number;
  status: 'aktif' | 'nonaktif';
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface FoodIngredient {
  id: string;
  name: string;
  category: 'Karbohidrat' | 'Protein Hewani' | 'Protein Nabati' | 'Sayuran' | 'Buah' | 'Bumbu & Minyak' | 'Barang Operasional';
  unit: 'kg' | 'gram' | 'liter' | 'ml' | 'butir' | 'ikat' | 'buah' | 'pcs' | 'pack';
  referencePrice: number;
  energyKcal: number; // per 100g
  proteinG: number;   // per 100g
  fatG: number;       // per 100g
  carbG: number;      // per 100g
  fiberG: number;     // per 100g
  currentStock: number;
  minimumStock: number;
  itemType: 'Bahan Pangan' | 'Barang Operasional';
  imageUrl?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  category: 'Bahan Segar' | 'Sembako' | 'Sayur & Buah' | 'Daging & Unggas' | 'Packaging & Operasional';
  bankName?: string;
  accountNumber?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
  updatedAt: string;
}

export interface MenuIngredientItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  weightGPerPortion: number;
  unitPrice: number;
  totalNeededKg: number;
  totalCost: number;
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  fiberG: number;
}

export type DishComponentCategory = 
  | 'Karbohidrat' 
  | 'Protein Hewani' 
  | 'Protein Nabati' 
  | 'Sayur' 
  | 'Buah' 
  | 'Susu' 
  | 'Tambahan';

export interface MenuItemDish {
  id: string;
  category: DishComponentCategory;
  dishName: string; // Contoh: Nasi putih, Ayam kecap, Tumis buncis
  gramasi?: number;
  notes?: string;
}

export type MenuStatus = 'Draft' | 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Dipublikasikan' | 'Direncanakan' | 'Selesai';

export interface MenuPlan {
  id: string;
  date: string; // Tanggal distribusi
  dayName?: string; // Hari (Otomatis dari tanggal)
  menuPeriod?: 'Mingguan' | 'Bulanan' | 'Siklus' | string;
  targetGroups?: string[]; // Balita, bumil, busui, siswa, dan lainnya
  mealTime: 'Pagi' | 'Siang' | 'Sore';
  name: string; // Nama menu utama
  category: 'Reguler' | 'Khusus Balita' | 'Khusus Bumil/Busui';
  components: string[]; // Ringkasan teks komponen
  dishItems?: MenuItemDish[]; // Item-item hidangan per komponen
  smallPortions: number;
  largePortions: number;
  totalPortions: number;
  ingredients: MenuIngredientItem[];
  // Nutritional per portion
  totalEnergyKcal: number;
  totalProteinG: number;
  totalFatG: number;
  totalCarbG: number;
  totalFiberG: number;
  // Food cost
  foodCostSmall: number;
  foodCostLarge: number;
  totalCost: number;
  status: MenuStatus;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RabItem {
  id: string;
  category: 'Bahan Pangan' | 'Barang Operasional' | 'Biaya Operasional';
  name: string;
  spec?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Rab {
  id: string;
  rabNumber: string;
  period: string; // e.g., "Maret 2026 - Minggu 1"
  startDate: string;
  endDate: string;
  totalPortions: number;
  foodCostBudget: number;
  operationalBudget: number;
  totalBudget: number;
  status: 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak' | 'Revisi';
  approvedBy?: string;
  approvalDate?: string;
  approvalNote?: string;
  version: number;
  items: RabItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PoItem {
  id: string;
  ingredientId?: string;
  name: string;
  category: string;
  orderQuantity: number;
  receivedQuantity?: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  rabId: string;
  orderDate: string;
  deliveryDate: string;
  menuDate: string;
  menuName?: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  status: 'Draft' | 'Menunggu Persetujuan' | 'Disetujui' | 'Dikirim' | 'Diterima Sebagian' | 'Diterima Lengkap' | 'Ditolak';
  isPaid: 'Belum Dibayar' | 'Lunas';
  paymentTransactionId?: string;
  approvedBy?: string;
  notes?: string;
  poAttachmentUrl?: string;
  items: PoItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  poItemId: string;
  name: string;
  orderQuantity: number;
  receivedQuantity: number;
  difference: number;
  unit: string;
  safetyStatus: 'Aman' | 'Tidak Aman' | 'Perlu Tindak Lanjut';
  notes?: string;
}

export interface ReceivingChecklist {
  id: string;
  poId: string;
  poNumber: string;
  receivingDate: string;
  supplierName: string;
  inspectorName: string;
  status: 'Diperiksa' | 'Dikonfirmasi Masuk Gudang' | 'Ditolak';
  isInventoryUpdated: boolean;
  inventoryTransactionId?: string;
  items: ChecklistItem[];
  photoUrls: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'Masuk' | 'Keluar' | 'Penyesuaian Opname';
  quantity: number;
  unit: string;
  previousStock: number;
  finalStock: number;
  reference: string; // e.g. "PO-2026/03/001" or "Menu-2026-03-01"
  note?: string;
  recordedBy: string;
  proofUrl?: string;
  createdAt: string;
}

export interface StockOpname {
  id: string;
  opnameNumber: string;
  date: string;
  officerName: string;
  systemStock: number;
  physicalStock: number;
  discrepancy: number;
  unit: string;
  ingredientId: string;
  ingredientName: string;
  reason: string;
  status: 'Draft' | 'Disetujui' | 'Disesuaikan';
  photoUrl?: string;
  createdAt: string;
}

export type DivisionType = 'Persiapan' | 'Pengolahan' | 'Pemorsian' | 'Distribusi' | 'Cuci Ompreng';

export interface DivisionTask {
  id: string;
  division: DivisionType;
  date: string;
  shift: 'Pagi' | 'Siang';
  officerName: string;
  taskData: Record<string, any>;
  photoUrls: string[];
  status: 'Dalam Proses' | 'Selesai' | 'Diverifikasi';
  createdAt: string;
  updatedAt: string;
}

export interface DistributionRecord {
  id: string;
  distributionNumber: string;
  date: string;
  institutionId: string;
  institutionName: string;
  picName: string;
  phone?: string;
  smallPortions: number;
  largePortions: number;
  totalPortions: number;
  departureTime: string;
  arrivalTime: string;
  driverName: string;
  vehicleNumber: string;
  fuelCost: number;
  status: 'Dipersiapkan' | 'Dalam Pengiriman' | 'Tiba di Lokasi' | 'Selesai Serah Terima';
  bastNumber?: string;
  bastStatus: 'Draft' | 'Diterbitkan' | 'Selesai';
  photoUrls: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashTransaction {
  id: string;
  proofNumber: string;
  date: string;
  type: 'Masuk' | 'Keluar';
  category: 'Dana Hibah/APBN' | 'Pembelian Bahan Pangan' | 'Operasional SPPG' | 'BBM & Transport' | 'Insentif Relawan' | 'Insentif Lembaga' | 'Lain-lain';
  description: string;
  amount: number;
  referencePoId?: string;
  recordedBy: string;
  verificationStatus: 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak';
  attachmentUrl?: string;
  createdAt: string;
}

export interface OrganolepticRecord {
  id: string;
  type: 'PIC' | 'PLOG';
  recordNumber: string;
  date: string;
  time: string;
  menuName: string;
  inspectorName: string;
  institution: string;
  color: 'Sangat Menarik' | 'Menarik' | 'Cukup' | 'Kurang Menarik';
  aroma: 'Sangat Sedap/Khas' | 'Sedap' | 'Cukup' | 'Kurang Sedap/Asing';
  taste: 'Sangat Lezat & Pas' | 'Lezat' | 'Cukup' | 'Hambar/Kurang Pas';
  texture: 'Sangat Empuk/Pas' | 'Empuk' | 'Cukup' | 'Keras/Lembek';
  appearance: 'Sangat Bersih & Menarik' | 'Bersih & Menarik' | 'Cukup' | 'Kurang Higienis';
  conclusion: 'Sangat Layak Konsumsi' | 'Layak Konsumsi' | 'Layak dengan Catatan' | 'Tidak Layak Konsumsi';
  notes?: string;
  photoUrls: string[];
  signatureName?: string;
  createdAt: string;
}

export interface LetterRecord {
  id: string;
  type: 'Surat Masuk' | 'Surat Keluar' | 'Surat Tugas' | 'BAST Penerimaan' | 'BAST Pengembalian';
  letterNumber: string;
  date: string;
  recipientOrSender: string;
  subject: string;
  content?: string;
  signatory: string;
  category: 'Administrasi' | 'Logistik' | 'Penyaluran' | 'Keuangan' | 'Koordinasi';
  fileUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface VolunteerAttendance {
  id: string;
  volunteerName: string;
  date: string;
  division: DivisionType;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Tanpa Keterangan';
  absenceReason?: string;
  substituteName?: string;
  substituteDivision?: DivisionType;
  incentiveAmount: number;
  paymentStatus: 'Belum Dibayar' | 'Dibayar';
  paymentDate?: string;
  createdAt: string;
}

export interface InstitutionIncentive {
  id: string;
  institutionId: string;
  institutionName: string;
  period: string;
  totalBeneficiaries: number;
  ratePerPerson: number;
  totalIncentive: number;
  paymentStatus: 'Belum Dibayar' | 'Dibayar';
  paymentProofUrl?: string;
  paidDate?: string;
  createdAt: string;
}

export interface FoodWasteRecord {
  id: string;
  date: string;
  riceWasteKg: number;
  animalProteinWasteKg: number;
  plantProteinWasteKg: number;
  vegetableWasteKg: number;
  fruitWasteKg: number;
  totalWasteKg: number;
  totalProductionKg: number;
  wastePercentage: number;
  officerName: string;
  notes?: string;
  photoUrls: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  module: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'PRINT' | 'STOCK_MUTATION';
  recordId?: string;
  details: string;
  ipAddress?: string;
}
