import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: Record<string, any>[];
  fileName?: string;
  sheetName?: string;
  onPrint?: () => void;
  showPrint?: boolean;
}

export default function ExportButton({
  data,
  fileName = 'Data-E-SPPG',
  sheetName = 'Data',
  onPrint,
  showPrint = true
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsOpen(false);
  };

  const exportToCsv = () => {
    if (!data || data.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  const handlePrint = () => {
    setIsOpen(false);
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="relative inline-block text-left no-print">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
      >
        <Download className="w-4 h-4 text-slate-500" />
        <span>Ekspor & Cetak</span>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black/5 border border-slate-100 z-30 py-1"
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            onClick={exportToExcel}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left font-medium"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor ke Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={exportToCsv}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left font-medium"
          >
            <FileText className="w-4 h-4 text-sky-600" />
            <span>Ekspor ke CSV (.csv)</span>
          </button>
          {showPrint && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left font-medium border-t border-slate-100"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak / Cetak PDF (A4)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
