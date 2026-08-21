/** Downloads an array of objects as a .csv file that Excel opens natively. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
  type?: "text" | "number" | "currency" | "date";
  align?: "left" | "right" | "center";
};

/** Builds a proper formatted .xlsx workbook (title banner, styled header, borders, currency
 *  number formats, auto-filter, frozen header, totals row) instead of a bare CSV. */
export async function downloadStyledExcel(opts: {
  filename: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  rows: Record<string, string | number>[];
  totals?: Record<string, number>;
}) {
  const ExcelJS = (await import("exceljs")).default;
  const { filename, sheetName, title, subtitle, columns, rows, totals } = opts;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AgroKhata";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: subtitle ? 4 : 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = columns.map((c) => ({ key: c.key, width: c.width ?? 16 }));

  const lastCol = columns.length;
  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, lastCol);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF0F3D5C" } };
  titleRow.getCell(1).alignment = { horizontal: "left" };
  titleRow.height = 22;

  if (subtitle) {
    const subtitleRow = sheet.addRow([subtitle]);
    sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, lastCol);
    subtitleRow.getCell(1).font = { size: 10, color: { argb: "FF64748B" } };
  }

  sheet.addRow([]);

  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.eachCell((cell, colNumber) => {
    const col = columns[colNumber - 1];
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F3D5C" } };
    cell.alignment = { horizontal: col.align ?? (col.type === "text" ? "left" : "right"), vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
  });
  headerRow.height = 20;
  sheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: lastCol } };

  const currencyFmt = '"₹"#,##0.00';
  rows.forEach((row, index) => {
    const dataRow = sheet.addRow(columns.map((c) => row[c.key] ?? ""));
    const zebra = index % 2 === 1;
    dataRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      cell.alignment = { horizontal: col.align ?? (col.type === "text" ? "left" : "right"), vertical: "middle" };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7FA" } };
      if (col.type === "currency") cell.numFmt = currencyFmt;
      if (col.type === "date") cell.numFmt = "dd-mmm-yyyy";
    });
  });

  if (totals) {
    const totalsRow = sheet.addRow(
      columns.map((c, i) => (i === 0 ? "Total" : (c.key in totals ? totals[c.key] : ""))),
    );
    totalsRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      cell.font = { bold: true };
      cell.border = { top: { style: "double", color: { argb: "FF0F3D5C" } } };
      cell.alignment = { horizontal: col.align ?? (col.type === "text" ? "left" : "right") };
      if (col.type === "currency" && colNumber > 1) cell.numFmt = currencyFmt;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

