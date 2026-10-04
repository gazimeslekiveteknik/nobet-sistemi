import React, { useState } from 'react';
import { FileSpreadsheet, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Teacher, Lesson } from '../types';
import { parseBilsaExcel } from '../algorithm/bilsaParser';
import { parseBilsaPDF } from '../algorithm/pdfParser';

interface ExcelImportProps {
  onDataImported: (teachers: Teacher[], lessons: Lesson[]) => void;
}

export function ExcelImport({ onDataImported }: ExcelImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [_file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ teachers: number; lessons: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadedFile.arrayBuffer();
      let parsedData;
      
      if (uploadedFile.name.toLowerCase().endsWith('.pdf')) {
        parsedData = await parseBilsaPDF(data);
      } else {
        const workbook = XLSX.read(data, { type: 'array' });
        parsedData = parseBilsaExcel(workbook);
      }
      
      const { teachers, lessons } = parsedData;
      setResult({ teachers: teachers.length, lessons: lessons.length });
      onDataImported(teachers, lessons);
    } catch (err: any) {
      setError(err.message || 'Dosya işlenirken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Ders Programı Aktar (Excel / PDF)</h2>
        <p className="text-gray-500 mt-1">
          Bilsa'dan aldığınız öğretmen el programını yükleyin. 
          <span className="font-semibold text-indigo-600 ml-1">En hatasız sonuç için Excel (.xlsx) formatı önerilir.</span> Ancak doğrudan PDF de yükleyebilirsiniz.
        </p>
      </div>

      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex gap-4">
            <div className="p-4 bg-green-100 rounded-full">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
            </div>
            <div className="p-4 bg-red-100 rounded-full">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Excel veya PDF dosyasını buraya sürükleyin
            </p>
            <p className="text-sm text-gray-500 mt-1">veya bilgisayarınızdan seçmek için tıklayın</p>
          </div>
          
          <label className="mt-4 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-colors">
            Dosya Seç
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls, .pdf" 
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {isProcessing && (
        <div className="mt-6 flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-3"></div>
          Dosya işleniyor, lütfen bekleyin...
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Aktarım Hatası</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Aktarım Başarılı!</p>
            <p className="text-sm mt-1">Sistem başarıyla <strong>{result.teachers}</strong> öğretmen ve <strong>{result.lessons}</strong> ders tanımı buldu.</p>
          </div>
        </div>
      )}
    </div>
  );
}
