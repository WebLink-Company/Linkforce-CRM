import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export const exportToCSV = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });
  const blob = new Blob([wbout], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
};