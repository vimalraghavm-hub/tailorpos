import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  Search,
  Check,
  RefreshCw,
  Users,
  Ruler
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';
import { normalizePhone } from '../../utils/phoneUtils';
import { GARMENT_MEASUREMENT_FIELDS } from '../../data/measurementDefinitions';

export const ExcelImportModal = ({ isOpen = true, onClose }) => {
  const { 
    customers = [], 
    addCustomer, 
    showToast, 
    measurementTemplates = [],
    loadShopData 
  } = useShop();

  useModalDismiss(onClose, isOpen);

  const [step, setStep] = useState(1); // 1: Upload, 2: Column Mapping, 3: Validation & Preview, 4: Importing / Done
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  
  // Mapping state: { excelColumnHeader: targetFieldKey }
  // Target field keys: 'name', 'phone', 'address', 'notes', or 'presetKey.fieldKey' (e.g. 'gown.length')
  const [columnMapping, setColumnMapping] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);

  if (!isOpen) return null;

  // Build list of target system fields for mapping dropdown
  const systemFields = [
    { key: '', label: '-- Unmapped (Skip Column) --' },
    { key: 'name', label: 'Customer Name (Required)' },
    { key: 'phone', label: 'Phone Number (Required)' },
    { key: 'address', label: 'Address' },
    { key: 'notes', label: 'Customer Notes' },
  ];

  // Add measurement preset fields to system fields list
  const presetKeys = ['gown', 'blouse', 'top', 'shirt', 'pant', 'custom'];
  presetKeys.forEach(pKey => {
    const fields = GARMENT_MEASUREMENT_FIELDS[pKey] || [];
    fields.forEach(f => {
      systemFields.push({
        key: `${pKey}.${f.key}`,
        label: `${pKey.charAt(0).toUpperCase() + pKey.slice(1)} / ${f.label}`
      });
    });
  });

  // Also include custom fields from measurementTemplates in Settings
  if (measurementTemplates && Array.isArray(measurementTemplates)) {
    measurementTemplates.forEach(tmpl => {
      const pKey = (tmpl.slug || tmpl.id || tmpl.name || '').toLowerCase();
      (tmpl.fields || []).forEach(f => {
        const fieldKey = f.key || f.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const comboKey = `${pKey}.${fieldKey}`;
        if (!systemFields.some(sf => sf.key === comboKey)) {
          systemFields.push({
            key: comboKey,
            label: `${tmpl.name} / ${f.label}`
          });
        }
      });
    });
  }

  // STEP 1: Handle File Selection & Parse Spreadsheet
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames || []);

        const firstSheetName = wb.SheetNames[0];
        setSelectedSheet(firstSheetName);
        parseSheetData(wb, firstSheetName);
      } catch (err) {
        console.error('Error reading Excel file:', err);
        showToast('File Error', 'Could not parse Excel/CSV file. Please check format.', 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const parseSheetData = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert sheet to array of arrays (header = 1) to inspect raw rows
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!data || data.length === 0) {
      showToast('Empty Sheet', 'Selected sheet has no data.', 'warning');
      return;
    }

    const headers = data[0].map(h => String(h).trim()).filter(Boolean);
    const rows = data.slice(1).filter(r => r.some(cell => String(cell).trim() !== ''));

    setRawHeaders(headers);
    setRawRows(rows);

    // Auto-detect column mappings based on header text
    const autoMap = {};
    headers.forEach(h => {
      const hLower = h.toLowerCase();
      if (hLower.includes('name') && !hLower.includes('garment')) {
        autoMap[h] = 'name';
      } else if (hLower.includes('phone') || hLower.includes('mobile') || hLower.includes('contact') || hLower.includes('cell')) {
        autoMap[h] = 'phone';
      } else if (hLower.includes('address') || hLower.includes('city') || hLower.includes('location')) {
        autoMap[h] = 'address';
      } else if (hLower.includes('note') || hLower.includes('remark') || hLower.includes('comment')) {
        autoMap[h] = 'notes';
      } else {
        // Match against measurement fields
        const matchedField = systemFields.find(sf => {
          if (!sf.key || !sf.key.includes('.')) return false;
          const [preset, field] = sf.key.split('.');
          return hLower.includes(preset) && (hLower.includes(field) || hLower.includes(sf.label.toLowerCase()));
        });
        if (matchedField) {
          autoMap[h] = matchedField.key;
        }
      }
    });

    setColumnMapping(autoMap);
    setStep(2);
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      parseSheetData(workbook, sheetName);
    }
  };

  // STEP 5: Validate Processed Rows
  const validatedData = useMemo(() => {
    if (rawRows.length === 0 || !columnMapping) return { validRows: [], summary: { newCount: 0, existingCount: 0, invalidCount: 0, duplicateCount: 0 } };

    const nameColIdx = rawHeaders.findIndex(h => columnMapping[h] === 'name');
    const phoneColIdx = rawHeaders.findIndex(h => columnMapping[h] === 'phone');
    const addressColIdx = rawHeaders.findIndex(h => columnMapping[h] === 'address');
    const notesColIdx = rawHeaders.findIndex(h => columnMapping[h] === 'notes');

    // Build active customer phone lookup
    const activePhoneSet = new Set((customers || []).map(c => c.phone ? normalizePhone(c.phone) : '').filter(Boolean));
    const seenExcelPhones = new Set();

    let newCount = 0;
    let existingCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    const rows = rawRows.map((r, idx) => {
      const nameVal = nameColIdx !== -1 ? String(r[nameColIdx] || '').trim() : `Customer ${idx + 1}`;
      const rawPhone = phoneColIdx !== -1 ? String(r[phoneColIdx] || '').trim() : '';
      const addressVal = addressColIdx !== -1 ? String(r[addressColIdx] || '').trim() : '';
      const notesVal = notesColIdx !== -1 ? String(r[notesColIdx] || '').trim() : '';

      const normalized = normalizePhone(rawPhone);

      // Extract measurement values for mapped measurement columns
      const measurementsObj = {};
      rawHeaders.forEach((h, hIdx) => {
        const targetKey = columnMapping[h];
        if (targetKey && targetKey.includes('.')) {
          const [preset, field] = targetKey.split('.');
          const val = String(r[hIdx] || '').trim();
          if (val) {
            if (!measurementsObj[preset]) measurementsObj[preset] = {};
            measurementsObj[preset][field] = val;
          }
        }
      });

      let status = 'NEW'; // 'NEW' | 'EXISTING' | 'INVALID' | 'DUPLICATE_IN_FILE'
      let reason = '';

      if (!normalized || normalized.length < 7) {
        status = 'INVALID';
        reason = 'Missing or invalid phone number';
        invalidCount++;
      } else if (seenExcelPhones.has(normalized)) {
        status = 'DUPLICATE_IN_FILE';
        reason = 'Duplicate phone number in uploaded file';
        duplicateCount++;
      } else {
        seenExcelPhones.add(normalized);
        if (activePhoneSet.has(normalized)) {
          status = 'EXISTING';
          reason = 'Matches existing active profile';
          existingCount++;
        } else {
          status = 'NEW';
          reason = 'New customer profile';
          newCount++;
        }
      }

      return {
        rowIndex: idx + 1,
        name: nameVal,
        phone: rawPhone,
        normalizedPhone: normalized,
        address: addressVal,
        notes: notesVal,
        measurements: measurementsObj,
        status,
        reason
      };
    });

    return {
      validRows: rows,
      summary: { newCount, existingCount, invalidCount, duplicateCount }
    };
  }, [rawRows, rawHeaders, columnMapping, customers]);

  // STEP 6: Execute Import
  const handleConfirmImport = async () => {
    const importableRows = validatedData.validRows.filter(r => r.status === 'NEW' || r.status === 'EXISTING');
    if (importableRows.length === 0) {
      showToast('No Valid Customers', 'There are no valid new or existing customers to import.', 'warning');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const row of importableRows) {
        const res = await addCustomer({
          name: row.name,
          phone: row.phone,
          address: row.address || 'Local Address',
          notes: row.notes || '',
          measurements: row.measurements
        });

        if (res) {
          successCount++;
        } else {
          failCount++;
        }
      }

      setImportResults({ successCount, failCount });
      setStep(4);
      if (loadShopData) await loadShopData();
      showToast('Import Complete', `Successfully imported ${successCount} customer profiles.`, 'success');
    } catch (err) {
      console.error('Error during customer import execution:', err);
      showToast('Import Error', err.message || 'An error occurred during import.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      maxWidthClass="max-w-4xl"
      zIndex={10020}
    >
      {/* Header */}
      <div className="p-3.5 sm:p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#202020] dark:text-white leading-tight">
              Import Customers from Excel / CSV
            </h3>
            <p className="text-[11px] sm:text-xs text-[#777777]">
              Bulk import customer directory profiles, contact details & body measurements
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">

        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-[#E3E3E3] dark:border-[#333333] pb-4">
          {[
            { s: 1, label: '1. Select File' },
            { s: 2, label: '2. Column Mapping' },
            { s: 3, label: '3. Preview & Validate' },
            { s: 4, label: '4. Summary' }
          ].map(st => (
            <div
              key={st.s}
              className={`flex items-center gap-2 text-xs font-bold ${
                step === st.s
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : step > st.s
                  ? 'text-[#202020] dark:text-white'
                  : 'text-gray-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step === st.s
                  ? 'bg-emerald-600 text-white'
                  : step > st.s
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'bg-gray-200 dark:bg-[#282828] text-gray-500'
              }`}>
                {st.s}
              </span>
              <span className="hidden sm:inline">{st.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: File Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-8 border-2 border-dashed border-[#E3E3E3] dark:border-[#333333] rounded-3xl bg-[#F5F5F5]/50 dark:bg-[#252525]/50 flex flex-col items-center justify-center text-center space-y-3">
              <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h4 className="font-bold text-sm text-[#202020] dark:text-white">
                  Choose Excel (.xlsx, .xls) or CSV (.csv) File
                </h4>
                <p className="text-xs text-[#777777] max-w-sm mt-1">
                  Upload existing customer register containing names, phone numbers, addresses, and measurement values.
                </p>
              </div>

              <label className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-smooth cursor-pointer shadow-xs inline-flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Browse File
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 animate-pulse pt-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Reading spreadsheet...
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <span className="font-bold block">💡 Import Guidelines:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Phone number is used as the primary identity for deduplication.</li>
                <li>Imported profiles start with 0 orders and ₹0 outstanding.</li>
                <li>No fake historical orders or duplicate active customers will be created.</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E3E3E3] dark:border-[#333333]">
              <div>
                <h4 className="font-bold text-sm text-[#202020] dark:text-white">
                  Map Excel Columns to Customer Fields
                </h4>
                <p className="text-xs text-[#777777]">
                  File: <span className="font-mono font-bold text-[#202020] dark:text-white">{fileName}</span> ({rawRows.length} rows detected)
                </p>
              </div>

              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#777777]">Sheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-3 py-1 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  >
                    {sheetNames.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
              {rawHeaders.map((header) => (
                <div key={header} className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-1.5">
                  <span className="text-xs font-bold text-[#202020] dark:text-white block truncate" title={header}>
                    Excel Column: <span className="text-emerald-600 dark:text-emerald-400">"{header}"</span>
                  </span>

                  <select
                    value={columnMapping[header] || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#202020] dark:text-white focus:outline-none"
                  >
                    {systemFields.map(sf => (
                      <option key={sf.key} value={sf.key}>{sf.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E3E3E3] dark:border-[#333333]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to File Upload
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!Object.values(columnMapping).includes('name') && !Object.values(columnMapping).includes('phone')) {
                    showToast('Mapping Warning', 'Please map at least Customer Name or Phone Number column.', 'warning');
                    return;
                  }
                  setStep(3);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                Preview & Validate Data <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Validate */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Validation Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">New Profiles</span>
                <h4 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{validatedData.summary.newCount}</h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 block">Existing Profiles</span>
                <h4 className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{validatedData.summary.existingCount}</h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">Duplicates in File</span>
                <h4 className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{validatedData.summary.duplicateCount}</h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <span className="text-[11px] font-semibold text-red-700 dark:text-red-400 block">Invalid Rows</span>
                <h4 className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">{validatedData.summary.invalidCount}</h4>
              </div>
            </div>

            {/* Rows Table */}
            <div className="border border-[#E3E3E3] dark:border-[#333333] rounded-2xl overflow-hidden max-h-[40vh] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Measurements</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                  {validatedData.validRows.map((r) => {
                    const measCount = Object.values(r.measurements || {}).reduce((acc, cat) => acc + Object.keys(cat || {}).length, 0);

                    return (
                      <tr key={r.rowIndex} className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[#777777]">{r.rowIndex}</td>
                        <td className="py-2.5 px-3 font-bold text-[#202020] dark:text-white">{r.name}</td>
                        <td className="py-2.5 px-3 font-mono text-[#777777]">{r.phone || '—'}</td>
                        <td className="py-2.5 px-3 text-[#777777] truncate max-w-[150px]">{r.address || '—'}</td>
                        <td className="py-2.5 px-3 text-[#777777]">
                          {measCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                              <Ruler className="w-3 h-3" /> {measCount} fields
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'NEW'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : r.status === 'EXISTING'
                              ? 'bg-blue-500/10 text-blue-600'
                              : r.status === 'DUPLICATE_IN_FILE'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E3E3E3] dark:border-[#333333]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Column Mapping
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessing || (validatedData.summary.newCount + validatedData.summary.existingCount === 0)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-smooth flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Import {validatedData.summary.newCount + validatedData.summary.existingCount} Customers
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Summary / Complete */}
        {step === 4 && importResults && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#202020] dark:text-white">
                Customer Import Successful!
              </h3>
              <p className="text-xs text-[#777777] mt-1 max-w-sm mx-auto">
                Created / updated {importResults.successCount} customer profiles. Imported customers are now available across Customer Profiles, Invoice Creation, and Search.
              </p>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs shadow-xs hover:opacity-90 cursor-pointer"
              >
                Done & Close
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
