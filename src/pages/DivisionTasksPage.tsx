import { useState, useEffect } from 'react';
import { 
  Layers, 
  Thermometer, 
  Scale, 
  Trash2, 
  Truck, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Camera, 
  Clock, 
  AlertTriangle,
  Fuel,
  RotateCcw,
  FileText,
  Printer,
  Eye,
  Maximize2,
  X,
  ShieldCheck,
  Building2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { getDivisionTasks, saveDivisionTask } from '../services/divisionTaskService';
import { getFoodWasteRecords, saveFoodWasteRecord } from '../services/foodWasteService';
import { getBeneficiaries } from '../services/beneficiaryService';
import { getDistributionRecords, saveDistributionRecord } from '../services/distributionService';
import { saveCashTransaction } from '../services/cashService';
import { logAuditEvent } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useSppg } from '../context/SppgContext';
import { DivisionTask, DivisionType, FoodWasteRecord, Beneficiary, DistributionRecord } from '../types';
import Modal from '../components/common/Modal';
import WatermarkedPhotoUploader from '../components/common/WatermarkedPhotoUploader';
import ExportButton from '../components/common/ExportButton';
import KopSurat from '../components/common/KopSurat';

interface DivisionTasksPageProps {
  initialSubmodule?: string;
}

export default function DivisionTasksPage({ initialSubmodule = 'persiapan' }: DivisionTasksPageProps) {
  const { userProfile, hasPermission } = useAuth();
  const { profile } = useSppg();

  const [activeTab, setActiveTab] = useState<DivisionType>('Persiapan');
  const [tasks, setTasks] = useState<DivisionTask[]>([]);
  const [wasteRecords, setWasteRecords] = useState<FoodWasteRecord[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [distributionRecords, setDistributionRecords] = useState<DistributionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sub-tabs for Divisi Distribusi
  const [distributionSubTab, setDistributionSubTab] = useState<'Pengiriman' | 'Pengembalian' | 'BBM'>('Pengiriman');

  // Lightbox Modal state for inspecting any photo across the page
  const [lightboxData, setLightboxData] = useState<{ url: string; title: string; meta?: string } | null>(null);

  // Modals for each division
  const [isPersiapanModalOpen, setIsPersiapanModalOpen] = useState(false);
  const [isPengolahanModalOpen, setIsPengolahanModalOpen] = useState(false);
  const [isPemorsianModalOpen, setIsPemorsianModalOpen] = useState(false);
  const [isDistribusiPengirimanModalOpen, setIsDistribusiPengirimanModalOpen] = useState(false);
  const [isDistribusiPengembalianModalOpen, setIsDistribusiPengembalianModalOpen] = useState(false);
  const [isDistribusiBbmModalOpen, setIsDistribusiBbmModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);

  // Form State: 1. Divisi Persiapan (Bahan Rusak Sayur, Hewani, Buah)
  const [persiapanForm, setPersiapanForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'Pagi' as 'Pagi' | 'Siang',
    officerName: userProfile?.displayName || 'Petugas Divisi Persiapan',
    roomTempC: 22.5,
    // Sayur rusak
    sayur: {
      name: 'Sayur Bayam & Kangkung',
      weightKg: 1.5,
      reason: 'Layu batang bawah & sortasi daun menguning',
      action: 'Dipilah & komplain retur potongan ke supplier sayur',
      photoUrl: ''
    },
    // Lauk hewani rusak
    laukHewani: {
      name: 'Daging Ayam Fillet',
      weightKg: 0.8,
      reason: 'Aroma asam & sedikit berlendir saat unboxing beku',
      action: 'Reject langsung saat penerimaan, minta penggantian hari ini',
      photoUrl: ''
    },
    // Buah rusak
    buah: {
      name: 'Pisang Cavendish / Barangan',
      weightKg: 1.2,
      reason: 'Bonyok lebam benturan transportasi dan kulit hitam berair',
      action: 'Sortasi afkir, tidak diikutsertakan pemorsian',
      photoUrl: ''
    },
    notes: 'Pemeriksaan bahan baku pagi sebelum proses pencucian dan pemotongan.'
  });

  // Form State: 2. Divisi Pengolahan (Suhu CCP: Nasi, Hewani, Nabati, Sayur, Buah)
  const [pengolahanForm, setPengolahanForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'Pagi' as 'Pagi' | 'Siang',
    officerName: userProfile?.displayName || 'Chef Samsul Arifin',
    roomTempC: 26.5,
    // CCP Suhu Nasi (Standar >= 65°C)
    nasi: {
      dishName: 'Nasi Putih Pulen Organik',
      tempC: 84.5,
      time: '06:15 WIB',
      status: 'Aman & Matang Sempurna (>= 65°C)',
      photoUrl: ''
    },
    // CCP Suhu Lauk Hewani (Standar >= 74°C)
    laukHewani: {
      dishName: 'Ayam Kecap Bumbu Gurih',
      tempC: 78.5,
      time: '06:40 WIB',
      status: 'Aman Membasmi Salmonella (>= 74°C)',
      photoUrl: ''
    },
    // CCP Suhu Lauk Nabati (Standar >= 65°C)
    laukNabati: {
      dishName: 'Tempe Mendoan / Orek Tempe',
      tempC: 75.0,
      time: '06:50 WIB',
      status: 'Aman & Matang Sempurna (>= 65°C)',
      photoUrl: ''
    },
    // CCP Suhu Sayur (Standar >= 65°C)
    sayur: {
      dishName: 'Tumis Buncis Jagung Manis',
      tempC: 72.0,
      time: '07:05 WIB',
      status: 'Aman & Matang Sempurna (>= 65°C)',
      photoUrl: ''
    },
    // Suhu Buah (Standar 5 - 10°C atau Sejuk Ruang Chiller)
    buah: {
      dishName: 'Semangka Potong Higienis',
      tempC: 9.5,
      time: '07:00 WIB',
      status: 'Suhu Chiller Dingin Segar (5-10°C)',
      photoUrl: ''
    },
    notes: 'Pengukuran menggunakan termometer tusuk digital Food Grade bersertifikat kalibrasi.'
  });

  // Form State: 3. Divisi Pemorsian (Suhu Packing & QC Ompreng Kecil + Besar)
  const [pemorsianForm, setPemorsianForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'Pagi' as 'Pagi' | 'Siang',
    officerName: userProfile?.displayName || 'Nurul Hidayati, A.Md.Gz',
    roomTempC: 21.0,
    // Suhu Makanan saat Pemorsian
    suhuNasi: { tempC: 68.0, photoUrl: '' },
    suhuLaukHewani: { tempC: 69.5, photoUrl: '' },
    suhuLaukNabati: { tempC: 66.5, photoUrl: '' },
    suhuSayur: { tempC: 65.5, photoUrl: '' },
    suhuBuah: { tempC: 11.0, photoUrl: '' },
    // QC Ompreng Porsi Kecil (PAUD/TK/SD 1-3)
    omprengKecil: {
      targetGram: 365,
      measuredGram: 368,
      status: 'Lolos QC Gramatur (Toleransi +- 5g)',
      photoUrl: '',
      notes: 'Komposisi lengkap: Nasi 100g, Ayam 45g, Tempe 30g, Sayur 60g, Semangka 130g'
    },
    // QC Ompreng Porsi Besar (SD 4-6 / SMP / Guru)
    omprengBesar: {
      targetGram: 525,
      measuredGram: 528,
      status: 'Lolos QC Gramatur (Toleransi +- 5g)',
      photoUrl: '',
      notes: 'Komposisi lengkap: Nasi 160g, Ayam 75g, Tempe 45g, Sayur 90g, Semangka 150g'
    },
    notes: 'Pemorsian di ruang ber-AC bersih steril dengan APD lengkap (masker, hairnet, sarung tangan nitril).'
  });

  // Form State: 4A. Divisi Distribusi - Pengiriman & BAST
  const [distribusiPengirimanForm, setDistribusiPengirimanForm] = useState({
    institutionId: '',
    institutionName: 'SDN Temenggungan 1',
    picName: 'Dra. Hj. Ummi Kulsum',
    phone: '0813-3122-8901',
    smallPortions: 110,
    largePortions: 120,
    departureTime: '09:45 WIB',
    arrivalTime: '10:05 WIB',
    driverName: userProfile?.displayName || 'Khoirul Anam',
    vehicleNumber: 'N 8412 QW (Mobil Box MBG 01)',
    photoKegiatan: '',
    photoBast: '',
    photoOrganoleptik: '',
    notes: 'Kondisi ompreng tersegel rapat, suhu box terjaga hangat.',
    autoGenerateBast: true
  });

  // Form State: 4B. Divisi Distribusi - Pengembalian Ompreng
  const [distribusiPengembalianForm, setDistribusiPengembalianForm] = useState({
    institutionName: 'SDN Temenggungan 1',
    smallPortionsReturned: 110,
    largePortionsReturned: 120,
    departureTime: '12:30 WIB',
    arrivalTime: '13:00 WIB',
    driverName: userProfile?.displayName || 'Khoirul Anam',
    vehicleNumber: 'N 8412 QW (Mobil Box MBG 01)',
    photoKegiatan: '',
    photoSerahTerima: '',
    notes: 'Seluruh ompreng dikembalikan lengkap tanpa ada yang pecah/hilang.'
  });

  // Form State: 4C. Divisi Distribusi - Pengisian BBM
  const [distribusiBbmForm, setDistribusiBbmForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '08:30 WIB',
    vehicleNumber: 'N 8412 QW (Mobil Box MBG 01)',
    fuelType: 'Pertalite' as 'Pertalite' | 'Pertamax' | 'Dexlite',
    fuelAmountRp: 100000,
    fuelLiters: 10.0,
    odometerKm: 42150,
    spbuLocation: 'SPBU Krejengan 54.672.08',
    driverName: userProfile?.displayName || 'Khoirul Anam',
    photoStrukBbm: '',
    notes: 'Pengisian rutin rute pengiriman Krejengan - Pajarakan.',
    autoRecordCash: true
  });

  // Form State: 5. Divisi Cuci Ompreng (Food Waste per Komponen)
  const [wasteForm, setWasteForm] = useState({
    date: new Date().toISOString().split('T')[0],
    officerName: userProfile?.displayName || 'Agus Subekti (Petugas Cuci)',
    totalProductionKg: 385.0,
    // 5 Komponen Sisa Makanan
    riceWasteKg: 3.2,
    ricePhotoUrl: '',
    animalProteinWasteKg: 1.1,
    animalProteinPhotoUrl: '',
    plantProteinWasteKg: 1.4,
    plantProteinPhotoUrl: '',
    vegetableWasteKg: 2.6,
    vegetablePhotoUrl: '',
    fruitWasteKg: 1.1,
    fruitPhotoUrl: '',
    notes: 'Sisa makanan didominasi sayur kuah pada siswa kelas rendah. Sisa nasi dan lauk sangat minim (<2%).'
  });

  const canEdit = hasPermission('division', 'canCreate');

  useEffect(() => {
    if (initialSubmodule === 'pengolahan') setActiveTab('Pengolahan');
    else if (initialSubmodule === 'pemorsian') setActiveTab('Pemorsian');
    else if (initialSubmodule === 'distribusi') setActiveTab('Distribusi');
    else if (initialSubmodule === 'cuci-ompreng') setActiveTab('Cuci Ompreng');
    else setActiveTab('Persiapan');
  }, [initialSubmodule]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tList, wList, bList, dList] = await Promise.all([
        getDivisionTasks(),
        getFoodWasteRecords(),
        getBeneficiaries(),
        getDistributionRecords()
      ]);
      setTasks(tList || []);
      setWasteRecords(wList || []);
      setBeneficiaries(bList || []);
      setDistributionRecords(dList || []);
    } catch (err) {
      console.error('Error loading division data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update distribution form defaults when a beneficiary is picked
  const handleSelectBeneficiary = (instName: string) => {
    const found = beneficiaries.find(b => b.institutionName === instName);
    if (found) {
      setDistribusiPengirimanForm(prev => ({
        ...prev,
        institutionId: found.id,
        institutionName: found.institutionName,
        smallPortions: found.smallPortions,
        largePortions: found.largePortions
      }));
    } else {
      setDistribusiPengirimanForm(prev => ({
        ...prev,
        institutionName: instName
      }));
    }
  };

  // --- SAVE HANDLERS ---

  // 1. Save Persiapan Task
  const handleSavePersiapan = async (e: React.FormEvent) => {
    e.preventDefault();
    const photoUrls = [
      persiapanForm.sayur.photoUrl,
      persiapanForm.laukHewani.photoUrl,
      persiapanForm.buah.photoUrl
    ].filter(Boolean);

    await saveDivisionTask({
      division: 'Persiapan',
      date: persiapanForm.date,
      shift: persiapanForm.shift,
      officerName: persiapanForm.officerName,
      status: 'Selesai',
      photoUrls,
      taskData: {
        roomTempC: persiapanForm.roomTempC,
        notes: persiapanForm.notes,
        damagedSayur: persiapanForm.sayur,
        damagedLaukHewani: persiapanForm.laukHewani,
        damagedBuah: persiapanForm.buah,
        damagedIngredients: [
          { name: persiapanForm.sayur.name, category: 'Sayuran', weightKg: persiapanForm.sayur.weightKg, notes: persiapanForm.sayur.reason, photoUrl: persiapanForm.sayur.photoUrl },
          { name: persiapanForm.laukHewani.name, category: 'Lauk Hewani', weightKg: persiapanForm.laukHewani.weightKg, notes: persiapanForm.laukHewani.reason, photoUrl: persiapanForm.laukHewani.photoUrl },
          { name: persiapanForm.buah.name, category: 'Buah', weightKg: persiapanForm.buah.weightKg, notes: persiapanForm.buah.reason, photoUrl: persiapanForm.buah.photoUrl }
        ]
      }
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas Divisi',
      'CREATE',
      `Mencatat data Bahan Rusak Divisi Persiapan (Sayur, Hewani, Buah) tanggal ${persiapanForm.date}`
    );

    setIsPersiapanModalOpen(false);
    loadData();
  };

  // 2. Save Pengolahan Task
  const handleSavePengolahan = async (e: React.FormEvent) => {
    e.preventDefault();
    const photoUrls = [
      pengolahanForm.nasi.photoUrl,
      pengolahanForm.laukHewani.photoUrl,
      pengolahanForm.laukNabati.photoUrl,
      pengolahanForm.sayur.photoUrl,
      pengolahanForm.buah.photoUrl
    ].filter(Boolean);

    await saveDivisionTask({
      division: 'Pengolahan',
      date: pengolahanForm.date,
      shift: pengolahanForm.shift,
      officerName: pengolahanForm.officerName,
      status: 'Selesai',
      photoUrls,
      taskData: {
        roomTempC: pengolahanForm.roomTempC,
        notes: pengolahanForm.notes,
        foodTemperatures: [
          { item: pengolahanForm.nasi.dishName, tempC: pengolahanForm.nasi.tempC, time: pengolahanForm.nasi.time, status: pengolahanForm.nasi.status, photoUrl: pengolahanForm.nasi.photoUrl },
          { item: pengolahanForm.laukHewani.dishName, tempC: pengolahanForm.laukHewani.tempC, time: pengolahanForm.laukHewani.time, status: pengolahanForm.laukHewani.status, photoUrl: pengolahanForm.laukHewani.photoUrl },
          { item: pengolahanForm.laukNabati.dishName, tempC: pengolahanForm.laukNabati.tempC, time: pengolahanForm.laukNabati.time, status: pengolahanForm.laukNabati.status, photoUrl: pengolahanForm.laukNabati.photoUrl },
          { item: pengolahanForm.sayur.dishName, tempC: pengolahanForm.sayur.tempC, time: pengolahanForm.sayur.time, status: pengolahanForm.sayur.status, photoUrl: pengolahanForm.sayur.photoUrl },
          { item: pengolahanForm.buah.dishName, tempC: pengolahanForm.buah.tempC, time: pengolahanForm.buah.time, status: pengolahanForm.buah.status, photoUrl: pengolahanForm.buah.photoUrl }
        ]
      }
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas Divisi',
      'CREATE',
      `Mencatat Pengukuran Suhu CCP Pengolahan (Nasi, Hewani, Nabati, Sayur, Buah) tanggal ${pengolahanForm.date}`
    );

    setIsPengolahanModalOpen(false);
    loadData();
  };

  // 3. Save Pemorsian Task
  const handleSavePemorsian = async (e: React.FormEvent) => {
    e.preventDefault();
    const photoUrls = [
      pemorsianForm.suhuNasi.photoUrl,
      pemorsianForm.suhuLaukHewani.photoUrl,
      pemorsianForm.suhuLaukNabati.photoUrl,
      pemorsianForm.suhuSayur.photoUrl,
      pemorsianForm.suhuBuah.photoUrl,
      pemorsianForm.omprengKecil.photoUrl,
      pemorsianForm.omprengBesar.photoUrl
    ].filter(Boolean);

    await saveDivisionTask({
      division: 'Pemorsian',
      date: pemorsianForm.date,
      shift: pemorsianForm.shift,
      officerName: pemorsianForm.officerName,
      status: 'Selesai',
      photoUrls,
      taskData: {
        roomTempC: pemorsianForm.roomTempC,
        notes: pemorsianForm.notes,
        packingTemperatures: {
          nasi: pemorsianForm.suhuNasi,
          laukHewani: pemorsianForm.suhuLaukHewani,
          laukNabati: pemorsianForm.suhuLaukNabati,
          sayur: pemorsianForm.suhuSayur,
          buah: pemorsianForm.suhuBuah
        },
        gramasiChecks: [
          {
            portionType: 'Porsi Kecil (PAUD / TK / SD 1-3)',
            targetGram: pemorsianForm.omprengKecil.targetGram,
            measuredGram: pemorsianForm.omprengKecil.measuredGram,
            tolerance: pemorsianForm.omprengKecil.status,
            omprengPhotoUrl: pemorsianForm.omprengKecil.photoUrl,
            notes: pemorsianForm.omprengKecil.notes
          },
          {
            portionType: 'Porsi Besar (SD 4-6 / SMP / Guru)',
            targetGram: pemorsianForm.omprengBesar.targetGram,
            measuredGram: pemorsianForm.omprengBesar.measuredGram,
            tolerance: pemorsianForm.omprengBesar.status,
            omprengPhotoUrl: pemorsianForm.omprengBesar.photoUrl,
            notes: pemorsianForm.omprengBesar.notes
          }
        ]
      }
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas Divisi',
      'CREATE',
      `Mencatat Suhu Pemorsian & QC Ompreng Porsi Kecil & Besar tanggal ${pemorsianForm.date}`
    );

    setIsPemorsianModalOpen(false);
    loadData();
  };

  // 4A. Save Distribusi Pengiriman
  const handleSaveDistribusiPengiriman = async (e: React.FormEvent) => {
    e.preventDefault();
    const photoUrls = [
      distribusiPengirimanForm.photoKegiatan,
      distribusiPengirimanForm.photoBast,
      distribusiPengirimanForm.photoOrganoleptik
    ].filter(Boolean);

    const bastNumber = `BAST-TERIMA/SPPG-KRJ2/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`;

    await saveDistributionRecord({
      institutionId: distribusiPengirimanForm.institutionId,
      institutionName: distribusiPengirimanForm.institutionName,
      picName: distribusiPengirimanForm.picName,
      phone: distribusiPengirimanForm.phone,
      smallPortions: distribusiPengirimanForm.smallPortions,
      largePortions: distribusiPengirimanForm.largePortions,
      departureTime: distribusiPengirimanForm.departureTime,
      arrivalTime: distribusiPengirimanForm.arrivalTime,
      driverName: distribusiPengirimanForm.driverName,
      vehicleNumber: distribusiPengirimanForm.vehicleNumber,
      status: 'Selesai Serah Terima',
      bastNumber: distribusiPengirimanForm.autoGenerateBast ? bastNumber : undefined,
      bastStatus: distribusiPengirimanForm.autoGenerateBast ? 'Diterbitkan' : 'Draft',
      photoUrls,
      notes: `${distribusiPengirimanForm.notes} • [Foto Kegiatan, BAST, & Uji Organoleptik Terverifikasi]`
    });

    // Also record as a Division Task log for synchronization
    await saveDivisionTask({
      division: 'Distribusi',
      date: new Date().toISOString().split('T')[0],
      shift: 'Pagi',
      officerName: distribusiPengirimanForm.driverName,
      status: 'Selesai',
      photoUrls,
      taskData: {
        subType: 'Pengiriman Distribusi',
        institutionName: distribusiPengirimanForm.institutionName,
        smallPortions: distribusiPengirimanForm.smallPortions,
        largePortions: distribusiPengirimanForm.largePortions,
        departureTime: distribusiPengirimanForm.departureTime,
        arrivalTime: distribusiPengirimanForm.arrivalTime,
        driverName: distribusiPengirimanForm.driverName,
        vehicleNumber: distribusiPengirimanForm.vehicleNumber,
        bastNumber,
        photoKegiatan: distribusiPengirimanForm.photoKegiatan,
        photoBast: distribusiPengirimanForm.photoBast,
        photoOrganoleptik: distribusiPengirimanForm.photoOrganoleptik
      }
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas Divisi',
      'CREATE',
      `Mencatat Pengiriman Distribusi MBG ke ${distribusiPengirimanForm.institutionName} (${bastNumber})`
    );

    setIsDistribusiPengirimanModalOpen(false);
    loadData();
  };

  // 4B. Save Distribusi Pengembalian Ompreng
  const handleSaveDistribusiPengembalian = async (e: React.FormEvent) => {
    e.preventDefault();
    const photoUrls = [
      distribusiPengembalianForm.photoKegiatan,
      distribusiPengembalianForm.photoSerahTerima
    ].filter(Boolean);

    await saveDivisionTask({
      division: 'Distribusi',
      date: new Date().toISOString().split('T')[0],
      shift: 'Siang',
      officerName: distribusiPengembalianForm.driverName,
      status: 'Selesai',
      photoUrls,
      taskData: {
        subType: 'Pengembalian Ompreng',
        institutionName: distribusiPengembalianForm.institutionName,
        smallPortionsReturned: distribusiPengembalianForm.smallPortionsReturned,
        largePortionsReturned: distribusiPengembalianForm.largePortionsReturned,
        departureTime: distribusiPengembalianForm.departureTime,
        arrivalTime: distribusiPengembalianForm.arrivalTime,
        driverName: distribusiPengembalianForm.driverName,
        vehicleNumber: distribusiPengembalianForm.vehicleNumber,
        photoKegiatan: distribusiPengembalianForm.photoKegiatan,
        photoSerahTerima: distribusiPengembalianForm.photoSerahTerima,
        notes: distribusiPengembalianForm.notes
      }
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas Divisi',
      'CREATE',
      `Mencatat Pengembalian Ompreng dari ${distribusiPengembalianForm.institutionName} (${distribusiPengembalianForm.smallPortionsReturned} kecil, ${distribusiPengembalianForm.largePortionsReturned} besar)`
    );

    setIsDistribusiPengembalianModalOpen(false);
    loadData();
  };

  // 4C. Save Pengisian BBM
  const handleSaveDistribusiBbm = async (e: React.FormEvent) => {
    e.preventDefault();
    const photoUrls = [distribusiBbmForm.photoStrukBbm].filter(Boolean);

    await saveDivisionTask({
      division: 'Distribusi',
      date: distribusiBbmForm.date,
      shift: 'Pagi',
      officerName: distribusiBbmForm.driverName,
      status: 'Selesai',
      photoUrls,
      taskData: {
        subType: 'Pengisian BBM',
        vehicleNumber: distribusiBbmForm.vehicleNumber,
        fuelType: distribusiBbmForm.fuelType,
        fuelAmountRp: Number(distribusiBbmForm.fuelAmountRp) || 0,
        fuelLiters: Number(distribusiBbmForm.fuelLiters) || 0,
        odometerKm: Number(distribusiBbmForm.odometerKm) || 0,
        spbuLocation: distribusiBbmForm.spbuLocation,
        driverName: distribusiBbmForm.driverName,
        photoStrukBbm: distribusiBbmForm.photoStrukBbm,
        notes: distribusiBbmForm.notes
      }
    });

    if (distribusiBbmForm.autoRecordCash && distribusiBbmForm.fuelAmountRp > 0) {
      await saveCashTransaction({
        date: distribusiBbmForm.date,
        type: 'Keluar',
        category: 'BBM & Transport',
        description: `Pengisian BBM ${distribusiBbmForm.fuelType} (${distribusiBbmForm.fuelLiters}L) Armada ${distribusiBbmForm.vehicleNumber} di ${distribusiBbmForm.spbuLocation}`,
        amount: Number(distribusiBbmForm.fuelAmountRp),
        recordedBy: distribusiBbmForm.driverName,
        verificationStatus: 'Terverifikasi',
        attachmentUrl: distribusiBbmForm.photoStrukBbm
      });
    }

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas Divisi',
      'CREATE',
      `Mencatat Pengisian BBM Rp ${distribusiBbmForm.fuelAmountRp.toLocaleString('id-ID')} untuk ${distribusiBbmForm.vehicleNumber}`
    );

    setIsDistribusiBbmModalOpen(false);
    loadData();
  };

  // 5. Save Cuci Ompreng (Food Waste 5 Komponen)
  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const photoUrls = [
      wasteForm.ricePhotoUrl,
      wasteForm.animalProteinPhotoUrl,
      wasteForm.plantProteinPhotoUrl,
      wasteForm.vegetablePhotoUrl,
      wasteForm.fruitPhotoUrl
    ].filter(Boolean);

    const totalWasteKg = 
      (Number(wasteForm.riceWasteKg) || 0) +
      (Number(wasteForm.animalProteinWasteKg) || 0) +
      (Number(wasteForm.plantProteinWasteKg) || 0) +
      (Number(wasteForm.vegetableWasteKg) || 0) +
      (Number(wasteForm.fruitWasteKg) || 0);

    const saved = await saveFoodWasteRecord({
      date: wasteForm.date,
      riceWasteKg: Number(wasteForm.riceWasteKg) || 0,
      animalProteinWasteKg: Number(wasteForm.animalProteinWasteKg) || 0,
      plantProteinWasteKg: Number(wasteForm.plantProteinWasteKg) || 0,
      vegetableWasteKg: Number(wasteForm.vegetableWasteKg) || 0,
      fruitWasteKg: Number(wasteForm.fruitWasteKg) || 0,
      totalProductionKg: Number(wasteForm.totalProductionKg) || 385,
      officerName: wasteForm.officerName,
      notes: wasteForm.notes,
      photoUrls
    });

    // Also record in division tasks for integrated division reports
    await saveDivisionTask({
      division: 'Cuci Ompreng',
      date: wasteForm.date,
      shift: 'Siang',
      officerName: wasteForm.officerName,
      status: 'Selesai',
      photoUrls,
      taskData: {
        wastePercentage: saved.wastePercentage,
        totalWasteKg: saved.totalWasteKg,
        totalProductionKg: saved.totalProductionKg,
        components: {
          nasi: { kg: wasteForm.riceWasteKg, photoUrl: wasteForm.ricePhotoUrl },
          laukHewani: { kg: wasteForm.animalProteinWasteKg, photoUrl: wasteForm.animalProteinPhotoUrl },
          laukNabati: { kg: wasteForm.plantProteinWasteKg, photoUrl: wasteForm.plantProteinPhotoUrl },
          sayur: { kg: wasteForm.vegetableWasteKg, photoUrl: wasteForm.vegetablePhotoUrl },
          buah: { kg: wasteForm.fruitWasteKg, photoUrl: wasteForm.fruitPhotoUrl }
        }
      }
    });

    await logAuditEvent(
      userProfile?.displayName || 'User',
      userProfile?.email || '',
      'Tugas Divisi',
      'CREATE',
      `Mencatat Food Waste Cuci Ompreng: ${saved.wastePercentage}% (${totalWasteKg.toFixed(1)} kg dari ${wasteForm.totalProductionKg} kg)`
    );

    setIsWasteModalOpen(false);
    loadData();
  };

  const currentTabTasks = tasks.filter(t => t.division === activeTab);

  // Filtered distribution records
  const distributionPengirimanTasks = tasks.filter(t => t.division === 'Distribusi' && t.taskData?.subType === 'Pengiriman Distribusi');
  const distributionPengembalianTasks = tasks.filter(t => t.division === 'Distribusi' && t.taskData?.subType === 'Pengembalian Ompreng');
  const distributionBbmTasks = tasks.filter(t => t.division === 'Distribusi' && t.taskData?.subType === 'Pengisian BBM');

  return (
    <div className="space-y-6">
      {/* Tab Navigation Divisi Operasional */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('Persiapan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Persiapan' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>A. Divisi Persiapan (Bahan Rusak)</span>
          </button>

          <button
            onClick={() => setActiveTab('Pengolahan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Pengolahan' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
            <span>B. Divisi Pengolahan (Suhu CCP)</span>
          </button>

          <button
            onClick={() => setActiveTab('Pemorsian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Pemorsian' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-sky-600" />
            <span>C. Divisi Pemorsian (QC Ompreng)</span>
          </button>

          <button
            onClick={() => setActiveTab('Distribusi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Distribusi' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>D. Divisi Distribusi & BAST</span>
          </button>

          <button
            onClick={() => setActiveTab('Cuci Ompreng')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Cuci Ompreng' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-purple-600" />
            <span>E. Cuci Ompreng (Food Waste)</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canEdit && activeTab === 'Persiapan' && (
            <button
              onClick={() => setIsPersiapanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Data Bahan Rusak</span>
            </button>
          )}

          {canEdit && activeTab === 'Pengolahan' && (
            <button
              onClick={() => setIsPengolahanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Suhu Makanan Matang</span>
            </button>
          )}

          {canEdit && activeTab === 'Pemorsian' && (
            <button
              onClick={() => setIsPemorsianModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Suhu & QC Ompreng</span>
            </button>
          )}

          {canEdit && activeTab === 'Distribusi' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsDistribusiPengirimanModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Input Distribusi & BAST</span>
              </button>
              <button
                onClick={() => setIsDistribusiPengembalianModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pengembalian Ompreng</span>
              </button>
              <button
                onClick={() => setIsDistribusiBbmModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>Catat BBM</span>
              </button>
            </div>
          )}

          {canEdit && activeTab === 'Cuci Ompreng' && (
            <button
              onClick={() => setIsWasteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Food Waste 5 Komponen</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
            title="Cetak Laporan Pemeriksaan Resmi"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Cetak Dokumen</span>
          </button>

          <ExportButton
            data={activeTab === 'Cuci Ompreng' ? wasteRecords : currentTabTasks}
            fileName={`Tugas_Divisi_${activeTab}_SPPG`}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. TAB A: DIVISI PERSIAPAN (BAHAN RUSAK SAYUR, HEWANI, BUAH)   */}
      {/* ============================================================== */}
      {activeTab === 'Persiapan' && (
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-amber-800 uppercase bg-amber-100 px-2 py-0.5 rounded-full">
                Standar Sortasi Bahan Pangan Basah
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Pemeriksaan & Dokumentasi Bahan Rusak Divisi Persiapan
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Setiap sayur layu/busuk, lauk hewani berbau/berlendir, dan buah afkir wajib difoto dengan kompresi otomatis & watermark SPPG resmi sebelum dipilah/diretur ke supplier.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 text-xs font-bold rounded-xl shadow-2xs">
                Watermark: SPPG HAFSHAWATY 2
              </span>
            </div>
          </div>

          {/* List of Tasks */}
          {currentTabTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Layers className="w-10 h-10 mx-auto text-amber-400 mb-2 opacity-50" />
              <p className="font-semibold text-sm">Belum ada data pemeriksaan bahan rusak tercatat.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol &ldquo;Input Data Bahan Rusak&rdquo; di atas untuk mencatat sortasi bahan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {currentTabTasks.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Shift {t.shift} • Tanggal {t.date}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        Sortasi Bahan Rusak Dapur Persiapan
                      </h4>
                      <p className="text-xs text-slate-500">
                        Penanggung Jawab: <strong className="text-slate-800">{t.officerName}</strong> {t.taskData?.roomTempC ? `• Suhu Ruang: ${t.taskData.roomTempC}°C` : ''}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.status}</span>
                    </span>
                  </div>

                  {/* 3 Categories Cards: Sayur, Hewani, Buah */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Sayur Rusak */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            🌱 Bahan Rusak (Sayur)
                          </span>
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            {t.taskData?.damagedSayur?.weightKg ?? 0} kg
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {t.taskData?.damagedSayur?.name || 'Sayuran Daun/Umbi'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          &ldquo;{t.taskData?.damagedSayur?.reason || 'Sortasi daun layu/kuning'}&rdquo;
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          <strong>Tindakan:</strong> {t.taskData?.damagedSayur?.action || 'Dipisahkan'}
                        </p>
                      </div>

                      {/* Photo Thumbnail */}
                      {t.taskData?.damagedSayur?.photoUrl ? (
                        <div 
                          onClick={() => setLightboxData({
                            url: t.taskData.damagedSayur.photoUrl,
                            title: `Bahan Rusak (Sayur): ${t.taskData.damagedSayur.name}`,
                            meta: `Tanggal: ${t.date} • Petugas: ${t.officerName}`
                          })}
                          className="mt-3 relative rounded-lg overflow-hidden border border-emerald-300 aspect-video group cursor-pointer"
                        >
                          <img src={t.taskData.damagedSayur.photoUrl} alt="Sayur Rusak" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                            <Maximize2 className="w-4 h-4" />
                            <span>Perbesar</span>
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-emerald-300 px-1.5 py-0.5 rounded-sm font-mono">
                            Watermarked
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 py-4 text-center border border-dashed border-slate-300 rounded-lg text-[10px] text-slate-400">
                          Tidak ada foto sayur
                        </div>
                      )}
                    </div>

                    {/* 2. Lauk Hewani Rusak */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                            🥩 Bahan Rusak (Lauk Hewani)
                          </span>
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            {t.taskData?.damagedLaukHewani?.weightKg ?? 0} kg
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {t.taskData?.damagedLaukHewani?.name || 'Daging/Ikan/Telur'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          &ldquo;{t.taskData?.damagedLaukHewani?.reason || 'Sortasi bau/lendir'}&rdquo;
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          <strong>Tindakan:</strong> {t.taskData?.damagedLaukHewani?.action || 'Retur ke supplier'}
                        </p>
                      </div>

                      {/* Photo Thumbnail */}
                      {t.taskData?.damagedLaukHewani?.photoUrl ? (
                        <div 
                          onClick={() => setLightboxData({
                            url: t.taskData.damagedLaukHewani.photoUrl,
                            title: `Bahan Rusak (Lauk Hewani): ${t.taskData.damagedLaukHewani.name}`,
                            meta: `Tanggal: ${t.date} • Petugas: ${t.officerName}`
                          })}
                          className="mt-3 relative rounded-lg overflow-hidden border border-rose-300 aspect-video group cursor-pointer"
                        >
                          <img src={t.taskData.damagedLaukHewani.photoUrl} alt="Lauk Hewani Rusak" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                            <Maximize2 className="w-4 h-4" />
                            <span>Perbesar</span>
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-emerald-300 px-1.5 py-0.5 rounded-sm font-mono">
                            Watermarked
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 py-4 text-center border border-dashed border-slate-300 rounded-lg text-[10px] text-slate-400">
                          Tidak ada foto hewani
                        </div>
                      )}
                    </div>

                    {/* 3. Buah Rusak */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                            🍌 Bahan Rusak (Buah)
                          </span>
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            {t.taskData?.damagedBuah?.weightKg ?? 0} kg
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {t.taskData?.damagedBuah?.name || 'Pisang/Semangka/Jeruk'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          &ldquo;{t.taskData?.damagedBuah?.reason || 'Sortasi buah lebam/busuk'}&rdquo;
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          <strong>Tindakan:</strong> {t.taskData?.damagedBuah?.action || 'Pemisahan afkir'}
                        </p>
                      </div>

                      {/* Photo Thumbnail */}
                      {t.taskData?.damagedBuah?.photoUrl ? (
                        <div 
                          onClick={() => setLightboxData({
                            url: t.taskData.damagedBuah.photoUrl,
                            title: `Bahan Rusak (Buah): ${t.taskData.damagedBuah.name}`,
                            meta: `Tanggal: ${t.date} • Petugas: ${t.officerName}`
                          })}
                          className="mt-3 relative rounded-lg overflow-hidden border border-amber-300 aspect-video group cursor-pointer"
                        >
                          <img src={t.taskData.damagedBuah.photoUrl} alt="Buah Rusak" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                            <Maximize2 className="w-4 h-4" />
                            <span>Perbesar</span>
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-emerald-300 px-1.5 py-0.5 rounded-sm font-mono">
                            Watermarked
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 py-4 text-center border border-dashed border-slate-300 rounded-lg text-[10px] text-slate-400">
                          Tidak ada foto buah
                        </div>
                      )}
                    </div>
                  </div>

                  {t.taskData?.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <strong>Catatan Petugas:</strong> {t.taskData.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TAB B: DIVISI PENGOLAHAN (SUHU CCP: NASI, HEWANI, DLL)      */}
      {/* ============================================================== */}
      {activeTab === 'Pengolahan' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-rose-800 uppercase bg-rose-100 px-2 py-0.5 rounded-full">
                HACCP / CCP Suhu Matang Higiene Sanitasi
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Pemeriksaan Suhu Makanan Matang (Termometer Tusuk Digital)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pengukuran suhu wajib pada 5 hidangan: Nasi (≥65°C), Lauk Hewani (≥74°C), Lauk Nabati (≥65°C), Sayur (≥65°C), dan Buah Segar (5-10°C). Dilengkapi bukti foto jarum/display termometer.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-white border border-rose-300 text-rose-900 text-xs font-bold rounded-xl shadow-2xs">
                Standar BGN: Food Grade CCP
              </span>
            </div>
          </div>

          {currentTabTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Thermometer className="w-10 h-10 mx-auto text-rose-400 mb-2 opacity-50" />
              <p className="font-semibold text-sm">Belum ada catatan suhu makanan matang.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol &ldquo;Input Suhu Makanan Matang&rdquo; untuk merekam suhu hidangan hari ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {currentTabTasks.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-rose-800 uppercase bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        Shift {t.shift} • Tanggal {t.date}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        Log Suhu Makanan Matang CCP Dapur
                      </h4>
                      <p className="text-xs text-slate-500">
                        Juru Masak / Chef: <strong className="text-slate-800">{t.officerName}</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.status}</span>
                    </span>
                  </div>

                  {/* 5 Temperature Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {t.taskData?.foodTemperatures ? (
                      t.taskData.foodTemperatures.map((f: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                              {f.item}
                            </span>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="text-2xl font-black text-rose-700">{f.tempC}°C</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                              ✓ {f.status}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              Pukul {f.time}
                            </span>
                          </div>

                          {f.photoUrl ? (
                            <div 
                              onClick={() => setLightboxData({
                                url: f.photoUrl,
                                title: `Display Termometer: ${f.item} (${f.tempC}°C)`,
                                meta: `Tanggal: ${t.date} • Pukul: ${f.time} • Chef: ${t.officerName}`
                              })}
                              className="mt-3 relative rounded-lg overflow-hidden border border-rose-300 aspect-square group cursor-pointer"
                            >
                              <img src={f.photoUrl} alt={f.item} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold gap-1 transition-opacity">
                                <Maximize2 className="w-3 h-3" />
                                <span>Lihat Display</span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 py-3 text-center border border-dashed border-slate-300 rounded-lg text-[9px] text-slate-400">
                              Belum ada foto display
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 col-span-5">Data suhu detail belum dimasukkan.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TAB C: DIVISI PEMORSIAN (SUHU PACKING & QC OMPRENG KECIL/BESAR) */}
      {/* ============================================================== */}
      {activeTab === 'Pemorsian' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-sky-800 uppercase bg-sky-100 px-2 py-0.5 rounded-full">
                QC Pemorsian & Gramatur Sajian
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Suhu Packing Ompreng & Bukti Foto Ompreng Porsi Kecil & Porsi Besar
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pengukuran suhu saat pengemasan (Nasi, Hewani, Nabati, Sayur, Buah) serta dokumentasi foto nampan/ompreng porsi kecil (PAUD/TK/SD 1-3 target ~365g) dan porsi besar (SD 4-6/SMP/Guru target ~525g).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-white border border-sky-300 text-sky-900 text-xs font-bold rounded-xl shadow-2xs">
                Toleransi: ± 5 gram
              </span>
            </div>
          </div>

          {currentTabTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Scale className="w-10 h-10 mx-auto text-sky-400 mb-2 opacity-50" />
              <p className="font-semibold text-sm">Belum ada data pemorsian & QC ompreng.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol &ldquo;Input Suhu & QC Ompreng&rdquo; untuk merekam dokumentasi ompreng hari ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {currentTabTasks.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        Shift {t.shift} • Tanggal {t.date}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        Pemeriksaan Suhu Packing & QC Gramatur Ompreng
                      </h4>
                      <p className="text-xs text-slate-500">
                        Ahli Gizi / Petugas QC: <strong className="text-slate-800">{t.officerName}</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.status}</span>
                    </span>
                  </div>

                  {/* 2 Big Cards: Foto Ompreng Porsi Kecil & Foto Ompreng Porsi Besar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Porsi Kecil */}
                    <div className="bg-sky-50/50 rounded-2xl border border-sky-200 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-900 uppercase">
                            🍱 Ompreng Porsi Kecil (PAUD / TK / SD 1-3)
                          </span>
                          <span className="text-xs font-black text-sky-900 bg-white px-2.5 py-1 rounded-lg border border-sky-300">
                            Target ~365 gram
                          </span>
                        </div>

                        {t.taskData?.gramasiChecks?.[0] && (
                          <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-sky-950">
                              {t.taskData.gramasiChecks[0].measuredGram} gram
                            </span>
                            <span className="text-xs text-emerald-700 font-bold">
                              ✓ {t.taskData.gramasiChecks[0].tolerance}
                            </span>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 mt-1">
                          {t.taskData?.gramasiChecks?.[0]?.notes || 'Nasi 100g, Ayam 45g, Tempe 30g, Sayur 60g, Buah 130g'}
                        </p>
                      </div>

                      {/* Photo Thumbnail */}
                      {t.taskData?.gramasiChecks?.[0]?.omprengPhotoUrl ? (
                        <div 
                          onClick={() => setLightboxData({
                            url: t.taskData.gramasiChecks[0].omprengPhotoUrl,
                            title: 'QC Ompreng Porsi Kecil (PAUD/TK/SD 1-3)',
                            meta: `Tanggal: ${t.date} • Berat Tertimbang: ${t.taskData.gramasiChecks[0].measuredGram}g • Petugas: ${t.officerName}`
                          })}
                          className="mt-4 relative rounded-xl overflow-hidden border-2 border-sky-300 aspect-16/10 group cursor-pointer bg-slate-900"
                        >
                          <img src={t.taskData.gramasiChecks[0].omprengPhotoUrl} alt="Ompreng Kecil" className="w-full h-full object-cover group-hover:scale-102 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                            <Maximize2 className="w-4 h-4" />
                            <span>Perbesar Foto Ompreng Kecil</span>
                          </div>
                          <span className="absolute bottom-2 left-2 bg-slate-950/80 text-[10px] text-emerald-400 px-2 py-0.5 rounded font-mono">
                            Watermark SPPG Terverifikasi
                          </span>
                        </div>
                      ) : (
                        <div className="mt-4 py-8 text-center border border-dashed border-sky-300 rounded-xl text-xs text-slate-400">
                          Foto ompreng porsi kecil belum diunggah
                        </div>
                      )}
                    </div>

                    {/* Porsi Besar */}
                    <div className="bg-indigo-50/50 rounded-2xl border border-indigo-200 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 uppercase">
                            🍱 Ompreng Porsi Besar (SD 4-6 / SMP / Guru)
                          </span>
                          <span className="text-xs font-black text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-300">
                            Target ~525 gram
                          </span>
                        </div>

                        {t.taskData?.gramasiChecks?.[1] && (
                          <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-indigo-950">
                              {t.taskData.gramasiChecks[1].measuredGram} gram
                            </span>
                            <span className="text-xs text-emerald-700 font-bold">
                              ✓ {t.taskData.gramasiChecks[1].tolerance}
                            </span>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 mt-1">
                          {t.taskData?.gramasiChecks?.[1]?.notes || 'Nasi 160g, Ayam 75g, Tempe 45g, Sayur 90g, Buah 150g'}
                        </p>
                      </div>

                      {/* Photo Thumbnail */}
                      {t.taskData?.gramasiChecks?.[1]?.omprengPhotoUrl ? (
                        <div 
                          onClick={() => setLightboxData({
                            url: t.taskData.gramasiChecks[1].omprengPhotoUrl,
                            title: 'QC Ompreng Porsi Besar (SD 4-6/SMP/Guru)',
                            meta: `Tanggal: ${t.date} • Berat Tertimbang: ${t.taskData.gramasiChecks[1].measuredGram}g • Petugas: ${t.officerName}`
                          })}
                          className="mt-4 relative rounded-xl overflow-hidden border-2 border-indigo-300 aspect-16/10 group cursor-pointer bg-slate-900"
                        >
                          <img src={t.taskData.gramasiChecks[1].omprengPhotoUrl} alt="Ompreng Besar" className="w-full h-full object-cover group-hover:scale-102 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                            <Maximize2 className="w-4 h-4" />
                            <span>Perbesar Foto Ompreng Besar</span>
                          </div>
                          <span className="absolute bottom-2 left-2 bg-slate-950/80 text-[10px] text-emerald-400 px-2 py-0.5 rounded font-mono">
                            Watermark SPPG Terverifikasi
                          </span>
                        </div>
                      ) : (
                        <div className="mt-4 py-8 text-center border border-dashed border-indigo-300 rounded-xl text-xs text-slate-400">
                          Foto ompreng porsi besar belum diunggah
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Packing Temperatures */}
                  {t.taskData?.packingTemperatures && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600 block mb-2">
                        Pemeriksaan Suhu Saat Pemorsian:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Nasi</span>
                          <span className="font-bold text-slate-800">{t.taskData.packingTemperatures.nasi?.tempC || '-'}°C</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Lauk Hewani</span>
                          <span className="font-bold text-slate-800">{t.taskData.packingTemperatures.laukHewani?.tempC || '-'}°C</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Lauk Nabati</span>
                          <span className="font-bold text-slate-800">{t.taskData.packingTemperatures.laukNabati?.tempC || '-'}°C</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Sayur</span>
                          <span className="font-bold text-slate-800">{t.taskData.packingTemperatures.sayur?.tempC || '-'}°C</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Buah</span>
                          <span className="font-bold text-slate-800">{t.taskData.packingTemperatures.buah?.tempC || '-'}°C</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB D: DIVISI DISTRIBUSI (PENYALURAN + BAST, PENGEMBALIAN, BBM) */}
      {/* ============================================================== */}
      {activeTab === 'Distribusi' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-2 rounded-2xl">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDistributionSubTab('Pengiriman')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  distributionSubTab === 'Pengiriman' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Penyaluran MBG & BAST Lembaga ({distributionPengirimanTasks.length || distributionRecords.length})
              </button>
              <button
                onClick={() => setDistributionSubTab('Pengembalian')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  distributionSubTab === 'Pengembalian' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Pengembalian Ompreng ({distributionPengembalianTasks.length})
              </button>
              <button
                onClick={() => setDistributionSubTab('BBM')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  distributionSubTab === 'BBM' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Pengisian BBM Armada ({distributionBbmTasks.length})
              </button>
            </div>
          </div>

          {/* SubTab 1: Penyaluran & BAST */}
          {distributionSubTab === 'Pengiriman' && (
            <div className="space-y-4">
              {distributionRecords.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <Truck className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-50" />
                  <p className="font-semibold text-sm">Belum ada pengiriman distribusi tercatat.</p>
                  <p className="text-xs text-slate-400 mt-1">Klik tombol &ldquo;Input Distribusi & BAST&rdquo; untuk mengirim ke sekolah/lembaga penerima.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {distributionRecords.map((d) => (
                    <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            No. Distribusi: {d.distributionNumber}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">
                            {d.institutionName}
                          </h4>
                          <p className="text-xs text-slate-500">
                            PIC Penerima: <strong>{d.picName}</strong> • Kontak: {d.phone || '-'}
                          </p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-1">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                            {d.status}
                          </span>
                          {d.bastNumber && (
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              BAST: {d.bastNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">Porsi Kecil (PAUD-SD3)</span>
                          <span className="text-base font-black text-slate-900">{d.smallPortions} porsi</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">Porsi Besar (SD4-Guru)</span>
                          <span className="text-base font-black text-slate-900">{d.largePortions} porsi</span>
                        </div>
                        <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200">
                          <span className="text-sky-700 text-[10px] block font-bold">Total Disalurkan</span>
                          <span className="text-base font-black text-sky-950">{d.totalPortions} porsi</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">Waktu Berangkat & Tiba</span>
                          <span className="text-xs font-bold text-slate-800">{d.departureTime} → {d.arrivalTime}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mb-3">
                        <span>Petugas / Driver: <strong>{d.driverName}</strong></span>
                        <span>Armada Kendaraan: <strong>{d.vehicleNumber}</strong></span>
                      </div>

                      {/* 3 Photos: Kegiatan, Serah Terima / BAST, Uji Organoleptik PIC */}
                      {d.photoUrls && d.photoUrls.length > 0 && (
                        <div className="pt-3 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 block mb-2">
                            Dokumentasi Foto Terverifikasi (Watermark SPPG):
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {d.photoUrls.map((p, idx) => {
                              const label = idx === 0 ? 'Kegiatan Distribusi' : idx === 1 ? 'Serah Terima BAST' : 'Uji Organoleptik PIC';
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setLightboxData({
                                    url: p,
                                    title: `${label} - ${d.institutionName}`,
                                    meta: `Tanggal: ${d.date} • Driver: ${d.driverName} • Armada: ${d.vehicleNumber}`
                                  })}
                                  className="relative rounded-xl overflow-hidden border border-slate-300 aspect-video group cursor-pointer bg-slate-900"
                                >
                                  <img src={p} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold gap-1 transition-opacity">
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    <span>Perbesar</span>
                                  </div>
                                  <span className="absolute bottom-1 left-1 bg-black/75 text-[9px] text-white px-1.5 py-0.5 rounded font-mono truncate max-w-[90%]">
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: Pengembalian Ompreng */}
          {distributionSubTab === 'Pengembalian' && (
            <div className="space-y-4">
              {distributionPengembalianTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <RotateCcw className="w-10 h-10 mx-auto text-sky-400 mb-2 opacity-50" />
                  <p className="font-semibold text-sm">Belum ada pengembalian ompreng tercatat.</p>
                  <p className="text-xs text-slate-400 mt-1">Klik tombol &ldquo;Pengembalian Ompreng&rdquo; untuk mencatat penjemputan ompreng kosong dari lembaga.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {distributionPengembalianTasks.map((t) => (
                    <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div>
                          <span className="text-[10px] font-bold text-sky-800 uppercase bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                            Pengembalian Ompreng Kosong • Tanggal {t.date}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">
                            {t.taskData?.institutionName || 'Lembaga Penerima'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Petugas: <strong>{t.officerName}</strong> • Armada: {t.taskData?.vehicleNumber}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                          Selesai Diterima Kembali
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">Ompreng Kecil Kembali</span>
                          <span className="text-base font-black text-slate-900">{t.taskData?.smallPortionsReturned ?? 0} unit</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">Ompreng Besar Kembali</span>
                          <span className="text-base font-black text-slate-900">{t.taskData?.largePortionsReturned ?? 0} unit</span>
                        </div>
                        <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200">
                          <span className="text-sky-700 text-[10px] block font-bold">Total Ompreng Masuk</span>
                          <span className="text-base font-black text-sky-950">
                            {(t.taskData?.smallPortionsReturned || 0) + (t.taskData?.largePortionsReturned || 0)} unit
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">Jam Penjemputan - Kembali</span>
                          <span className="text-xs font-bold text-slate-800">{t.taskData?.departureTime} → {t.taskData?.arrivalTime}</span>
                        </div>
                      </div>

                      {/* Photos */}
                      {t.photoUrls && t.photoUrls.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                          {t.photoUrls.map((p, idx) => (
                            <div
                              key={idx}
                              onClick={() => setLightboxData({
                                url: p,
                                title: `Pengembalian Ompreng - ${t.taskData?.institutionName}`,
                                meta: `Tanggal: ${t.date} • Petugas: ${t.officerName}`
                              })}
                              className="relative rounded-xl overflow-hidden border border-slate-300 aspect-video group cursor-pointer bg-slate-900"
                            >
                              <img src={p} alt="Dokumentasi" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold gap-1 transition-opacity">
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Perbesar</span>
                              </div>
                              <span className="absolute bottom-1 left-1 bg-black/75 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                                {idx === 0 ? 'Foto Kegiatan Penjemputan' : 'Foto Serah Terima Pengembalian'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SubTab 3: BBM */}
          {distributionSubTab === 'BBM' && (
            <div className="space-y-4">
              {distributionBbmTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <Fuel className="w-10 h-10 mx-auto text-amber-400 mb-2 opacity-50" />
                  <p className="font-semibold text-sm">Belum ada catatan pengisian BBM.</p>
                  <p className="text-xs text-slate-400 mt-1">Klik tombol &ldquo;Catat BBM&rdquo; untuk mencatat pembelian BBM armada & unggah struk.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {distributionBbmTasks.map((t) => (
                    <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                          <Fuel className="w-4 h-4 text-amber-600" />
                          <span>{t.taskData?.vehicleNumber}</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {t.date}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nominal Pengisian:</span>
                          <span className="font-black text-amber-700 text-sm">
                            Rp {(t.taskData?.fuelAmountRp || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Jenis BBM & Volume:</span>
                          <span className="font-semibold text-slate-800">
                            {t.taskData?.fuelType} ({t.taskData?.fuelLiters} Liter)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Spidometer (KM):</span>
                          <span className="font-mono text-slate-800">
                            {t.taskData?.odometerKm?.toLocaleString('id-ID')} KM
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">SPBU / Lokasi:</span>
                          <span className="text-slate-700">{t.taskData?.spbuLocation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Driver / Petugas:</span>
                          <span className="text-slate-700">{t.taskData?.driverName}</span>
                        </div>
                      </div>

                      {t.taskData?.photoStrukBbm && (
                        <div 
                          onClick={() => setLightboxData({
                            url: t.taskData.photoStrukBbm,
                            title: `Struk BBM: ${t.taskData.vehicleNumber}`,
                            meta: `Nominal: Rp ${t.taskData.fuelAmountRp?.toLocaleString('id-ID')} • ${t.taskData.spbuLocation}`
                          })}
                          className="mt-3 relative rounded-xl overflow-hidden border border-amber-300 aspect-16/10 group cursor-pointer bg-slate-900"
                        >
                          <img src={t.taskData.photoStrukBbm} alt="Struk BBM" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Perbesar Struk</span>
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/75 text-[9px] text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                            Bukti Struk Terverifikasi
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. TAB E: DIVISI CUCI OMPRENG & FOOD WASTE PER KOMPONEN        */}
      {/* ============================================================== */}
      {activeTab === 'Cuci Ompreng' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-purple-800 uppercase bg-purple-100 px-2 py-0.5 rounded-full">
                Audit Food Waste & Zero Waste Program
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Pengukuran Sisa Makanan (Food Waste) 5 Komponen Hidangan
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pengukuran dan foto bukti fisik sisa makanan untuk: Nasi, Lauk Hewani, Lauk Nabati, Sayur, dan Buah. Rumus: <strong>(Total Sampah / Total Produksi) × 100%</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-white border border-purple-300 text-purple-900 text-xs font-bold rounded-xl shadow-2xs">
                Standar BGN: &lt; 5.0%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
              <h4 className="text-sm font-bold text-slate-900">
                Riwayat Pengukuran Food Waste Harian
              </h4>
              <span className="text-xs text-slate-500">
                Total Catatan: <strong>{wasteRecords.length} hari</strong>
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-2 text-center">Nasi</th>
                    <th className="py-2.5 px-2 text-center">Hewani</th>
                    <th className="py-2.5 px-2 text-center">Nabati</th>
                    <th className="py-2.5 px-2 text-center">Sayur</th>
                    <th className="py-2.5 px-2 text-center">Buah</th>
                    <th className="py-2.5 px-2 text-center font-bold text-slate-900">Total Sisa</th>
                    <th className="py-2.5 px-2 text-center">Produksi</th>
                    <th className="py-2.5 px-3 text-center bg-purple-50 text-purple-950 font-black">Food Waste (%)</th>
                    <th className="py-2.5 px-2 text-center">Foto Bukti</th>
                    <th className="py-2.5 px-3">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wasteRecords.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{w.date}</td>
                      <td className="py-2.5 px-2 text-center">{w.riceWasteKg} kg</td>
                      <td className="py-2.5 px-2 text-center">{w.animalProteinWasteKg} kg</td>
                      <td className="py-2.5 px-2 text-center">{w.plantProteinWasteKg} kg</td>
                      <td className="py-2.5 px-2 text-center">{w.vegetableWasteKg} kg</td>
                      <td className="py-2.5 px-2 text-center">{w.fruitWasteKg} kg</td>
                      <td className="py-2.5 px-2 text-center font-bold text-rose-700">{w.totalWasteKg} kg</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{w.totalProductionKg} kg</td>
                      <td className="py-2.5 px-3 text-center bg-purple-50/40 font-black text-purple-900 text-sm">
                        {w.wastePercentage}%
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {w.photoUrls && w.photoUrls.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setLightboxData({
                              url: w.photoUrls[0],
                              title: `Dokumentasi Sampah Makanan Tanggal ${w.date}`,
                              meta: `Total Sampah: ${w.totalWasteKg}kg (${w.wastePercentage}%) • Petugas: ${w.officerName}`
                            })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 px-2 py-0.5 rounded cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{w.photoUrls.length} Foto</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">{w.officerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: INPUT DIVISI PERSIAPAN (BAHAN RUSAK)                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPersiapanModalOpen}
        onClose={() => setIsPersiapanModalOpen(false)}
        title="Form Input Bahan Rusak - Divisi Persiapan"
        maxWidth="4xl"
      >
        <form onSubmit={handleSavePersiapan} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pemeriksaan</label>
              <input
                type="date"
                required
                value={persiapanForm.date}
                onChange={e => setPersiapanForm({ ...persiapanForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Shift Kerja</label>
              <select
                value={persiapanForm.shift}
                onChange={e => setPersiapanForm({ ...persiapanForm, shift: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="Pagi">Pagi (04:00 - 12:00 WIB)</option>
                <option value="Siang">Siang (12:00 - 18:00 WIB)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Penanggung Jawab Sortasi</label>
              <input
                type="text"
                required
                value={persiapanForm.officerName}
                onChange={e => setPersiapanForm({ ...persiapanForm, officerName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Section 1: Sayur Rusak */}
          <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                <span>🌱 1. Input Data Bahan Rusak (Sayur)</span>
              </h4>
              <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                Watermark Otomatis SPPG
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-700 font-medium block mb-1">Nama Sayuran</label>
                <input
                  type="text"
                  required
                  value={persiapanForm.sayur.name}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    sayur: { ...persiapanForm.sayur, name: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Berat Rusak / Layu (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={persiapanForm.sayur.weightKg}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    sayur: { ...persiapanForm.sayur, weightKg: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-rose-600"
                />
              </div>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Tindakan / Retur Supplier</label>
                <input
                  type="text"
                  value={persiapanForm.sayur.action}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    sayur: { ...persiapanForm.sayur, action: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-medium text-xs block mb-1">Penyebab Kerusakan (Layu / Berulat / Busuk Basah)</label>
              <input
                type="text"
                value={persiapanForm.sayur.reason}
                onChange={e => setPersiapanForm({
                  ...persiapanForm,
                  sayur: { ...persiapanForm.sayur, reason: e.target.value }
                })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </div>

            <WatermarkedPhotoUploader
              photoUrl={persiapanForm.sayur.photoUrl}
              onChange={url => setPersiapanForm({
                ...persiapanForm,
                sayur: { ...persiapanForm.sayur, photoUrl: url }
              })}
              label="Upload Foto Bukti Fisik Sayur Rusak / Layu"
              subLabel="Gunakan kamera langsung atau pilih berkas • Otomatis kompresi & cap watermark SPPG"
              watermarkTag="Bahan Rusak (Sayur)"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          {/* Section 2: Lauk Hewani Rusak */}
          <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-950 uppercase flex items-center gap-1.5">
                <span>🥩 2. Input Data Bahan Rusak (Lauk Hewani)</span>
              </h4>
              <span className="text-[10px] text-rose-700 font-bold bg-white px-2 py-0.5 rounded border border-rose-200">
                Watermark Otomatis SPPG
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-700 font-medium block mb-1">Nama Lauk Hewani</label>
                <input
                  type="text"
                  required
                  value={persiapanForm.laukHewani.name}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    laukHewani: { ...persiapanForm.laukHewani, name: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Berat Rusak / Tidak Layak (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={persiapanForm.laukHewani.weightKg}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    laukHewani: { ...persiapanForm.laukHewani, weightKg: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-rose-600"
                />
              </div>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Tindakan / Retur Supplier</label>
                <input
                  type="text"
                  value={persiapanForm.laukHewani.action}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    laukHewani: { ...persiapanForm.laukHewani, action: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-medium text-xs block mb-1">Penyebab Kerusakan (Berbau / Berlendir / Busuk)</label>
              <input
                type="text"
                value={persiapanForm.laukHewani.reason}
                onChange={e => setPersiapanForm({
                  ...persiapanForm,
                  laukHewani: { ...persiapanForm.laukHewani, reason: e.target.value }
                })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </div>

            <WatermarkedPhotoUploader
              photoUrl={persiapanForm.laukHewani.photoUrl}
              onChange={url => setPersiapanForm({
                ...persiapanForm,
                laukHewani: { ...persiapanForm.laukHewani, photoUrl: url }
              })}
              label="Upload Foto Bukti Fisik Lauk Hewani Rusak"
              subLabel="Foto kemasan & daging berlendir/berbau • Watermark otomatis SPPG"
              watermarkTag="Bahan Rusak (Lauk Hewani)"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          {/* Section 3: Buah Rusak */}
          <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-950 uppercase flex items-center gap-1.5">
                <span>🍌 3. Input Data Bahan Rusak (Buah)</span>
              </h4>
              <span className="text-[10px] text-amber-700 font-bold bg-white px-2 py-0.5 rounded border border-amber-200">
                Watermark Otomatis SPPG
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-700 font-medium block mb-1">Nama Buah</label>
                <input
                  type="text"
                  required
                  value={persiapanForm.buah.name}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    buah: { ...persiapanForm.buah, name: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Berat Rusak / Bonyok (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={persiapanForm.buah.weightKg}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    buah: { ...persiapanForm.buah, weightKg: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-rose-600"
                />
              </div>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Tindakan / Retur Supplier</label>
                <input
                  type="text"
                  value={persiapanForm.buah.action}
                  onChange={e => setPersiapanForm({
                    ...persiapanForm,
                    buah: { ...persiapanForm.buah, action: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-medium text-xs block mb-1">Penyebab Kerusakan (Bonyok Benturan / Asam / Kulit Busuk)</label>
              <input
                type="text"
                value={persiapanForm.buah.reason}
                onChange={e => setPersiapanForm({
                  ...persiapanForm,
                  buah: { ...persiapanForm.buah, reason: e.target.value }
                })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </div>

            <WatermarkedPhotoUploader
              photoUrl={persiapanForm.buah.photoUrl}
              onChange={url => setPersiapanForm({
                ...persiapanForm,
                buah: { ...persiapanForm.buah, photoUrl: url }
              })}
              label="Upload Foto Bukti Fisik Buah Rusak"
              subLabel="Foto buah afkir ber-watermark untuk bukti retur supplier"
              watermarkTag="Bahan Rusak (Buah)"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPersiapanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Data Bahan Rusak & Watermark
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: INPUT DIVISI PENGOLAHAN (SUHU CCP 5 ITEM)             */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPengolahanModalOpen}
        onClose={() => setIsPengolahanModalOpen(false)}
        title="Input Data & Upload Suhu Makanan Matang (Divisi Pengolahan)"
        maxWidth="4xl"
      >
        <form onSubmit={handleSavePengolahan} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={pengolahanForm.date}
                onChange={e => setPengolahanForm({ ...pengolahanForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Shift</label>
              <select
                value={pengolahanForm.shift}
                onChange={e => setPengolahanForm({ ...pengolahanForm, shift: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="Pagi">Pagi (04:00 - 12:00 WIB)</option>
                <option value="Siang">Siang (12:00 - 18:00 WIB)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Juru Masak / Chef PIC</label>
              <input
                type="text"
                required
                value={pengolahanForm.officerName}
                onChange={e => setPengolahanForm({ ...pengolahanForm, officerName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* 1. Suhu Nasi */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">
                1. Input Data & Upload Suhu Makanan (Nasi)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Standar CCP: &ge; 65°C
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nama Olahan Nasi</label>
                <input
                  type="text"
                  value={pengolahanForm.nasi.dishName}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    nasi: { ...pengolahanForm.nasi, dishName: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Suhu Tertusuk (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pengolahanForm.nasi.tempC}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    nasi: { ...pengolahanForm.nasi, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-rose-700"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Waktu Ukur (WIB)</label>
                <input
                  type="text"
                  value={pengolahanForm.nasi.time}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    nasi: { ...pengolahanForm.nasi, time: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <WatermarkedPhotoUploader
              photoUrl={pengolahanForm.nasi.photoUrl}
              onChange={url => setPengolahanForm({
                ...pengolahanForm,
                nasi: { ...pengolahanForm.nasi, photoUrl: url }
              })}
              label="Upload Foto Display / Jarum Termometer Tusuk (Nasi)"
              subLabel="Tampilkan layar display angka atau jarum termometer menusuk nasi matang"
              watermarkTag="Suhu Makanan (Nasi)"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          {/* 2. Suhu Lauk Hewani */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">
                2. Input Data & Upload Suhu Makanan (Lauk Hewani)
              </span>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Standar CCP: &ge; 74°C (Bebas Salmonella)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nama Hidangan Lauk Hewani</label>
                <input
                  type="text"
                  value={pengolahanForm.laukHewani.dishName}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    laukHewani: { ...pengolahanForm.laukHewani, dishName: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Suhu Tertusuk (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pengolahanForm.laukHewani.tempC}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    laukHewani: { ...pengolahanForm.laukHewani, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-rose-700"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Waktu Ukur (WIB)</label>
                <input
                  type="text"
                  value={pengolahanForm.laukHewani.time}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    laukHewani: { ...pengolahanForm.laukHewani, time: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <WatermarkedPhotoUploader
              photoUrl={pengolahanForm.laukHewani.photoUrl}
              onChange={url => setPengolahanForm({
                ...pengolahanForm,
                laukHewani: { ...pengolahanForm.laukHewani, photoUrl: url }
              })}
              label="Upload Foto Display / Jarum Termometer Tusuk (Lauk Hewani)"
              subLabel="Tusukkan sensor termometer ke bagian daging paling tebal"
              watermarkTag="Suhu Makanan (Lauk Hewani)"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          {/* 3. Suhu Lauk Nabati */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">
                3. Input Data & Upload Suhu Makanan (Lauk Nabati)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Standar CCP: &ge; 65°C
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nama Olahan Lauk Nabati</label>
                <input
                  type="text"
                  value={pengolahanForm.laukNabati.dishName}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    laukNabati: { ...pengolahanForm.laukNabati, dishName: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Suhu Tertusuk (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pengolahanForm.laukNabati.tempC}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    laukNabati: { ...pengolahanForm.laukNabati, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-rose-700"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Waktu Ukur (WIB)</label>
                <input
                  type="text"
                  value={pengolahanForm.laukNabati.time}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    laukNabati: { ...pengolahanForm.laukNabati, time: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <WatermarkedPhotoUploader
              photoUrl={pengolahanForm.laukNabati.photoUrl}
              onChange={url => setPengolahanForm({
                ...pengolahanForm,
                laukNabati: { ...pengolahanForm.laukNabati, photoUrl: url }
              })}
              label="Upload Foto Display / Jarum Termometer Tusuk (Lauk Nabati)"
              subLabel="Tampilkan suhu kematangan tempe/tahu saat pengangkatan"
              watermarkTag="Suhu Makanan (Lauk Nabati)"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          {/* 4. Suhu Sayur */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">
                4. Input Data & Upload Suhu Makanan (Sayur Matang)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Standar CCP: &ge; 65°C
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nama Olahan Sayur</label>
                <input
                  type="text"
                  value={pengolahanForm.sayur.dishName}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    sayur: { ...pengolahanForm.sayur, dishName: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Suhu Tertusuk (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pengolahanForm.sayur.tempC}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    sayur: { ...pengolahanForm.sayur, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-rose-700"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Waktu Ukur (WIB)</label>
                <input
                  type="text"
                  value={pengolahanForm.sayur.time}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    sayur: { ...pengolahanForm.sayur, time: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <WatermarkedPhotoUploader
              photoUrl={pengolahanForm.sayur.photoUrl}
              onChange={url => setPengolahanForm({
                ...pengolahanForm,
                sayur: { ...pengolahanForm.sayur, photoUrl: url }
              })}
              label="Upload Foto Display / Jarum Termometer Tusuk (Sayur Matang)"
              subLabel="Tampilkan layar termometer pada panci sayur matang"
              watermarkTag="Suhu Makanan (Sayur)"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          {/* 5. Suhu Buah */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">
                5. Input Data & Upload Suhu Makanan (Buah Segar)
              </span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Standar Penyimpanan: 5 - 10°C
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nama Buah Segar</label>
                <input
                  type="text"
                  value={pengolahanForm.buah.dishName}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    buah: { ...pengolahanForm.buah, dishName: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Suhu Ruang / Buah (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={pengolahanForm.buah.tempC}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    buah: { ...pengolahanForm.buah, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-sky-700"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Waktu Ukur (WIB)</label>
                <input
                  type="text"
                  value={pengolahanForm.buah.time}
                  onChange={e => setPengolahanForm({
                    ...pengolahanForm,
                    buah: { ...pengolahanForm.buah, time: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            <WatermarkedPhotoUploader
              photoUrl={pengolahanForm.buah.photoUrl}
              onChange={url => setPengolahanForm({
                ...pengolahanForm,
                buah: { ...pengolahanForm.buah, photoUrl: url }
              })}
              label="Upload Foto Display Termometer Suhu Buah"
              subLabel="Tampilkan pengukuran kesegaran buah chiller / ruang saji"
              watermarkTag="Suhu Buah"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPengolahanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan 5 Suhu CCP Makanan
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: INPUT DIVISI PEMORSIAN (SUHU & FOTO OMPRENG KECIL/BESAR) */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPemorsianModalOpen}
        onClose={() => setIsPemorsianModalOpen(false)}
        title="Input Suhu Pemorsian & QC Foto Ompreng Porsi Kecil & Besar"
        maxWidth="4xl"
      >
        <form onSubmit={handleSavePemorsian} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pemorsian</label>
              <input
                type="date"
                required
                value={pemorsianForm.date}
                onChange={e => setPemorsianForm({ ...pemorsianForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Shift</label>
              <select
                value={pemorsianForm.shift}
                onChange={e => setPemorsianForm({ ...pemorsianForm, shift: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="Pagi">Pagi (04:00 - 12:00 WIB)</option>
                <option value="Siang">Siang (12:00 - 18:00 WIB)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Petugas Ahli Gizi / QC</label>
              <input
                type="text"
                required
                value={pemorsianForm.officerName}
                onChange={e => setPemorsianForm({ ...pemorsianForm, officerName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Section A: Suhu Makanan Saat Pemorsian */}
          <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-200 space-y-3">
            <span className="text-xs font-bold text-sky-950 uppercase block">
              A. Input Suhu Makanan Saat Pemorsian (°C)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Nasi (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pemorsianForm.suhuNasi.tempC}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    suhuNasi: { ...pemorsianForm.suhuNasi, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Lauk Hewani (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pemorsianForm.suhuLaukHewani.tempC}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    suhuLaukHewani: { ...pemorsianForm.suhuLaukHewani, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Lauk Nabati (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pemorsianForm.suhuLaukNabati.tempC}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    suhuLaukNabati: { ...pemorsianForm.suhuLaukNabati, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Sayur (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pemorsianForm.suhuSayur.tempC}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    suhuSayur: { ...pemorsianForm.suhuSayur, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Buah (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pemorsianForm.suhuBuah.tempC}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    suhuBuah: { ...pemorsianForm.suhuBuah, tempC: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section B: QC Ompreng Porsi Kecil */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">
                B. Upload Foto Ompreng Porsi Kecil (PAUD / TK / SD 1-3)
              </span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Target Gramatur: 360 - 375 gram
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Gramatur Tertimbang (gram)</label>
                <input
                  type="number"
                  required
                  value={pemorsianForm.omprengKecil.measuredGram}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    omprengKecil: { ...pemorsianForm.omprengKecil, measuredGram: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-black text-sky-900 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Status Kelayakan Saji & Toleransi</label>
                <input
                  type="text"
                  value={pemorsianForm.omprengKecil.status}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    omprengKecil: { ...pemorsianForm.omprengKecil, status: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-emerald-700"
                />
              </div>
            </div>

            <WatermarkedPhotoUploader
              photoUrl={pemorsianForm.omprengKecil.photoUrl}
              onChange={url => setPemorsianForm({
                ...pemorsianForm,
                omprengKecil: { ...pemorsianForm.omprengKecil, photoUrl: url }
              })}
              label="Upload Foto Nampan / Ompreng Porsi Kecil"
              subLabel="Tampilkan nampan ompreng terisi lengkap 5 sekat untuk audit visual & gramatur"
              watermarkTag="Ompreng Porsi Kecil"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          {/* Section C: QC Ompreng Porsi Besar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase">
                C. Upload Foto Ompreng Porsi Besar (SD 4-6 / SMP / Guru)
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Target Gramatur: 515 - 535 gram
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Gramatur Tertimbang (gram)</label>
                <input
                  type="number"
                  required
                  value={pemorsianForm.omprengBesar.measuredGram}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    omprengBesar: { ...pemorsianForm.omprengBesar, measuredGram: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-black text-indigo-900 text-sm"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Status Kelayakan Saji & Toleransi</label>
                <input
                  type="text"
                  value={pemorsianForm.omprengBesar.status}
                  onChange={e => setPemorsianForm({
                    ...pemorsianForm,
                    omprengBesar: { ...pemorsianForm.omprengBesar, status: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-emerald-700"
                />
              </div>
            </div>

            <WatermarkedPhotoUploader
              photoUrl={pemorsianForm.omprengBesar.photoUrl}
              onChange={url => setPemorsianForm({
                ...pemorsianForm,
                omprengBesar: { ...pemorsianForm.omprengBesar, photoUrl: url }
              })}
              label="Upload Foto Nampan / Ompreng Porsi Besar"
              subLabel="Tampilkan ompreng porsi besar dengan gramatur standar resep BGN"
              watermarkTag="Ompreng Porsi Besar"
              institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPemorsianModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Data Pemorsian & Foto Ompreng
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4A: INPUT DISTRIBUSI PENGIRIMAN & BAST                   */}
      {/* ============================================================== */}
      <Modal
        isOpen={isDistribusiPengirimanModalOpen}
        onClose={() => setIsDistribusiPengirimanModalOpen(false)}
        title="Input Data Penyaluran Distribusi & Terbitkan BAST"
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveDistribusiPengiriman} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <span>Terhubung ke <strong>Master Penerima Manfaat</strong> & <strong>Buku Surat BAST Resmi</strong></span>
            <span className="font-bold">SPPG Probolinggo Krejengan 2</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Pilih Lembaga Penerima Manfaat</label>
              <select
                value={distribusiPengirimanForm.institutionName}
                onChange={e => handleSelectBeneficiary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
              >
                {beneficiaries.map(b => (
                  <option key={b.id} value={b.institutionName}>
                    {b.institutionName} ({b.totalPortions} Porsi)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nama PIC Sekolah / Guru Penerima</label>
              <input
                type="text"
                required
                value={distribusiPengirimanForm.picName}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, picName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Jumlah Porsi Kecil</label>
              <input
                type="number"
                min="0"
                required
                value={distribusiPengirimanForm.smallPortions}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, smallPortions: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sky-800"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Jumlah Porsi Besar</label>
              <input
                type="number"
                min="0"
                required
                value={distribusiPengirimanForm.largePortions}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, largePortions: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-indigo-800"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Waktu Keberangkatan</label>
              <input
                type="text"
                value={distribusiPengirimanForm.departureTime}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, departureTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Waktu Penerimaan di Lokasi</label>
              <input
                type="text"
                value={distribusiPengirimanForm.arrivalTime}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, arrivalTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Petugas Distribusi / Driver</label>
              <input
                type="text"
                required
                value={distribusiPengirimanForm.driverName}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, driverName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Kendaraan Armada Box</label>
              <input
                type="text"
                required
                value={distribusiPengirimanForm.vehicleNumber}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* 3 Uploaders required by user */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <WatermarkedPhotoUploader
              photoUrl={distribusiPengirimanForm.photoKegiatan}
              onChange={url => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, photoKegiatan: url })}
              label="1. Upload Foto Kegiatan Distribusi"
              subLabel="Foto proses serah terima ompreng di sekolah"
              watermarkTag="Kegiatan Distribusi"
              institutionName={distribusiPengirimanForm.institutionName}
            />

            <WatermarkedPhotoUploader
              photoUrl={distribusiPengirimanForm.photoBast}
              onChange={url => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, photoBast: url })}
              label="2. Upload Foto Serah Terima (BAST)"
              subLabel="Foto berkas fisik BAST ditandatangani PIC"
              watermarkTag="Serah Terima BAST"
              institutionName={distribusiPengirimanForm.institutionName}
            />

            <WatermarkedPhotoUploader
              photoUrl={distribusiPengirimanForm.photoOrganoleptik}
              onChange={url => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, photoOrganoleptik: url })}
              label="3. Upload Foto Uji Organoleptik PIC"
              subLabel="Foto PIC mencicipi & mengecek rasa makanan"
              watermarkTag="Uji Organoleptik PIC"
              institutionName={distribusiPengirimanForm.institutionName}
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoBast"
                checked={distribusiPengirimanForm.autoGenerateBast}
                onChange={e => setDistribusiPengirimanForm({ ...distribusiPengirimanForm, autoGenerateBast: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
              />
              <label htmlFor="autoBast" className="font-semibold text-slate-800 cursor-pointer">
                Otomatis terbitkan Berita Acara Serah Terima (BAST) & catat di Modul Surat Resmi
              </label>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Terintegrasi
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDistribusiPengirimanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Data Distribusi & BAST
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4B: INPUT PENGEMBALIAN OMPRENG KOSONG                    */}
      {/* ============================================================== */}
      <Modal
        isOpen={isDistribusiPengembalianModalOpen}
        onClose={() => setIsDistribusiPengembalianModalOpen(false)}
        title="Input Data Pengembalian Ompreng dari Lembaga"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveDistribusiPengembalian} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Nama Lembaga Asal</label>
              <select
                value={distribusiPengembalianForm.institutionName}
                onChange={e => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, institutionName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              >
                {beneficiaries.map(b => (
                  <option key={b.id} value={b.institutionName}>
                    {b.institutionName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Kendaraan Armada Penjemput</label>
              <input
                type="text"
                value={distribusiPengembalianForm.vehicleNumber}
                onChange={e => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Ompreng Kecil Kembali</label>
              <input
                type="number"
                min="0"
                required
                value={distribusiPengembalianForm.smallPortionsReturned}
                onChange={e => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, smallPortionsReturned: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Ompreng Besar Kembali</label>
              <input
                type="number"
                min="0"
                required
                value={distribusiPengembalianForm.largePortionsReturned}
                onChange={e => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, largePortionsReturned: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Waktu Berangkat Jemput</label>
              <input
                type="text"
                value={distribusiPengembalianForm.departureTime}
                onChange={e => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, departureTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Waktu Tiba di SPPG</label>
              <input
                type="text"
                value={distribusiPengembalianForm.arrivalTime}
                onChange={e => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, arrivalTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <WatermarkedPhotoUploader
              photoUrl={distribusiPengembalianForm.photoKegiatan}
              onChange={url => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, photoKegiatan: url })}
              label="Upload Foto Kegiatan Penjemputan Ompreng"
              subLabel="Foto muat ompreng kosong ke mobil box"
              watermarkTag="Penjemputan Ompreng"
              institutionName={distribusiPengembalianForm.institutionName}
            />

            <WatermarkedPhotoUploader
              photoUrl={distribusiPengembalianForm.photoSerahTerima}
              onChange={url => setDistribusiPengembalianForm({ ...distribusiPengembalianForm, photoSerahTerima: url })}
              label="Upload Foto Serah Terima Pengembalian Ompreng"
              subLabel="Foto bukti serah terima dengan pihak sekolah"
              watermarkTag="Serah Terima Pengembalian"
              institutionName={distribusiPengembalianForm.institutionName}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDistribusiPengembalianModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Pengembalian Ompreng
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4C: INPUT PENGISIAN BBM ARMADA                           */}
      {/* ============================================================== */}
      <Modal
        isOpen={isDistribusiBbmModalOpen}
        onClose={() => setIsDistribusiBbmModalOpen(false)}
        title="Data Pengisian BBM Armada & Bukti Struk SPBU"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveDistribusiBbm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Armada Kendaraan</label>
              <input
                type="text"
                required
                value={distribusiBbmForm.vehicleNumber}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Petugas / Driver</label>
              <input
                type="text"
                required
                value={distribusiBbmForm.driverName}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, driverName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Nominal BBM (Rp)</label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={distribusiBbmForm.fuelAmountRp}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, fuelAmountRp: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-black text-amber-700 text-sm"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Volume BBM (Liter)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={distribusiBbmForm.fuelLiters}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, fuelLiters: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">KM Spidometer</label>
              <input
                type="number"
                min="0"
                value={distribusiBbmForm.odometerKm}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, odometerKm: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Jenis Bahan Bakar</label>
              <select
                value={distribusiBbmForm.fuelType}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, fuelType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              >
                <option value="Pertalite">Pertalite (RON 90)</option>
                <option value="Pertamax">Pertamax (RON 92)</option>
                <option value="Dexlite">Dexlite (Diesel)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Lokasi SPBU</label>
              <input
                type="text"
                value={distribusiBbmForm.spbuLocation}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, spbuLocation: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <WatermarkedPhotoUploader
            photoUrl={distribusiBbmForm.photoStrukBbm}
            onChange={url => setDistribusiBbmForm({ ...distribusiBbmForm, photoStrukBbm: url })}
            label="Upload Foto Kegiatan Pengisian BBM / Struk SPBU"
            subLabel="Foto struk resmi tercetak jelas dengan tanggal, liter, dan nominal Rp"
            watermarkTag="Pengisian BBM Armada"
            institutionName="ARMADA DISTRIBUSI SPPG"
          />

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoCash"
                checked={distribusiBbmForm.autoRecordCash}
                onChange={e => setDistribusiBbmForm({ ...distribusiBbmForm, autoRecordCash: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 cursor-pointer"
              />
              <label htmlFor="autoCash" className="font-semibold text-slate-800 cursor-pointer">
                Catat otomatis ke Buku Kas Keluar (BBM & Transport)
              </label>
            </div>
            <span className="text-[10px] text-amber-800 font-bold bg-white px-2 py-0.5 rounded border border-amber-200">
              Sinkron Keuangan
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDistribusiBbmModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan Data BBM & Struk
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: INPUT FOOD WASTE 5 KOMPONEN (CUCI OMPRENG)           */}
      {/* ============================================================== */}
      <Modal
        isOpen={isWasteModalOpen}
        onClose={() => setIsWasteModalOpen(false)}
        title="Input Data & Upload Foto Sampah (Food Waste 5 Komponen)"
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveWaste} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={wasteForm.date}
                onChange={e => setWasteForm({ ...wasteForm, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Total Produksi Hari Ini (kg)</label>
              <input
                type="number"
                min="1"
                required
                value={wasteForm.totalProductionKg}
                onChange={e => setWasteForm({ ...wasteForm, totalProductionKg: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-black text-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">Petugas Cuci Ompreng</label>
              <input
                type="text"
                required
                value={wasteForm.officerName}
                onChange={e => setWasteForm({ ...wasteForm, officerName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* 5 Components Waste Grid */}
          <div className="space-y-4">
            {/* 1. Nasi */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-800 block">1. Sampah Nasi</label>
                  <span className="text-[10px] text-slate-500">Berat sisa nasi yang terbuang</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={wasteForm.riceWasteKg}
                      onChange={e => setWasteForm({ ...wasteForm, riceWasteKg: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 rounded border border-slate-300 font-bold text-rose-700 text-xs"
                    />
                    <span className="text-xs font-semibold text-slate-600">kg</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <WatermarkedPhotoUploader
                    photoUrl={wasteForm.ricePhotoUrl}
                    onChange={url => setWasteForm({ ...wasteForm, ricePhotoUrl: url })}
                    label="Upload Foto Dokumentasi Sampah (Nasi)"
                    watermarkTag="Sampah Makanan (Nasi)"
                    institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
                  />
                </div>
              </div>
            </div>

            {/* 2. Lauk Hewani */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-800 block">2. Sampah Lauk Hewani</label>
                  <span className="text-[10px] text-slate-500">Sisa tulang / daging tak terkonsumsi</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={wasteForm.animalProteinWasteKg}
                      onChange={e => setWasteForm({ ...wasteForm, animalProteinWasteKg: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 rounded border border-slate-300 font-bold text-rose-700 text-xs"
                    />
                    <span className="text-xs font-semibold text-slate-600">kg</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <WatermarkedPhotoUploader
                    photoUrl={wasteForm.animalProteinPhotoUrl}
                    onChange={url => setWasteForm({ ...wasteForm, animalProteinPhotoUrl: url })}
                    label="Upload Foto Dokumentasi Sampah (Lauk Hewani)"
                    watermarkTag="Sampah Makanan (Lauk Hewani)"
                    institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
                  />
                </div>
              </div>
            </div>

            {/* 3. Lauk Nabati */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-800 block">3. Sampah Lauk Nabati</label>
                  <span className="text-[10px] text-slate-500">Sisa tempe / tahu / olahan nabati</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={wasteForm.plantProteinWasteKg}
                      onChange={e => setWasteForm({ ...wasteForm, plantProteinWasteKg: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 rounded border border-slate-300 font-bold text-rose-700 text-xs"
                    />
                    <span className="text-xs font-semibold text-slate-600">kg</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <WatermarkedPhotoUploader
                    photoUrl={wasteForm.plantProteinPhotoUrl}
                    onChange={url => setWasteForm({ ...wasteForm, plantProteinPhotoUrl: url })}
                    label="Upload Foto Dokumentasi Sampah (Lauk Nabati)"
                    watermarkTag="Sampah Makanan (Lauk Nabati)"
                    institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
                  />
                </div>
              </div>
            </div>

            {/* 4. Sayur */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-800 block">4. Sampah Sayur</label>
                  <span className="text-[10px] text-slate-500">Sisa kuah & sayur ompreng</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={wasteForm.vegetableWasteKg}
                      onChange={e => setWasteForm({ ...wasteForm, vegetableWasteKg: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 rounded border border-slate-300 font-bold text-rose-700 text-xs"
                    />
                    <span className="text-xs font-semibold text-slate-600">kg</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <WatermarkedPhotoUploader
                    photoUrl={wasteForm.vegetablePhotoUrl}
                    onChange={url => setWasteForm({ ...wasteForm, vegetablePhotoUrl: url })}
                    label="Upload Foto Dokumentasi Sampah (Sayur)"
                    watermarkTag="Sampah Makanan (Sayur)"
                    institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
                  />
                </div>
              </div>
            </div>

            {/* 5. Buah */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-800 block">5. Sampah Buah</label>
                  <span className="text-[10px] text-slate-500">Sisa kulit / biji / potongan buah</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={wasteForm.fruitWasteKg}
                      onChange={e => setWasteForm({ ...wasteForm, fruitWasteKg: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 rounded border border-slate-300 font-bold text-rose-700 text-xs"
                    />
                    <span className="text-xs font-semibold text-slate-600">kg</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <WatermarkedPhotoUploader
                    photoUrl={wasteForm.fruitPhotoUrl}
                    onChange={url => setWasteForm({ ...wasteForm, fruitPhotoUrl: url })}
                    label="Upload Foto Dokumentasi Sampah (Buah)"
                    watermarkTag="Sampah Makanan (Buah)"
                    institutionName={profile.institutionName || 'SPPG HAFSHAWATY 2'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsWasteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan & Kalkulasi Food Waste
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* GLOBAL LIGHTBOX MODAL (PERBESAR PRATINJAU FULLSCREEN)          */}
      {/* ============================================================== */}
      {lightboxData && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in no-print"
          onClick={() => setLightboxData(null)}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold">{lightboxData.title}</h3>
                {lightboxData.meta && (
                  <p className="text-[11px] text-slate-400">{lightboxData.meta}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLightboxData(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-4xl max-h-[82vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxData.url}
              alt={lightboxData.title}
              className="w-full h-full max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
