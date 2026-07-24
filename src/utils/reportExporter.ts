import ExcelJS from 'exceljs'

/** Column definition shared by both the CSV and xlsx export paths, so a
 * report's export logic only has to describe its columns once. */
export interface ExportColumn<T> {
	header: string
	value: (row: T) => string | number | boolean
}

const CSV_FIELD_NEEDS_QUOTING = /[",\n\r]/

/** RFC 4180-style escaping: wrap in double quotes and double up any embedded
 * double quotes. No external dependency needed for a format this simple. */
function escapeCsvField(value: string | number | boolean): string {
	const stringValue = String(value)
	if (!CSV_FIELD_NEEDS_QUOTING.test(stringValue)) {
		return stringValue
	}
	return `"${stringValue.replace(/"/g, '""')}"`
}

export function buildCsvBuffer<T>(
	columns: ExportColumn<T>[],
	rows: T[]
): Buffer {
	const lines = [
		columns.map((column) => escapeCsvField(column.header)).join(','),
		...rows.map((row) =>
			columns.map((column) => escapeCsvField(column.value(row))).join(',')
		),
	]

	// Leading UTF-8 BOM so Excel opens the CSV without mangling non-ASCII
	// characters (e.g. project/client names) — a no-op for anything else that
	// reads it as plain UTF-8.
	return Buffer.from('﻿' + lines.join('\r\n'), 'utf-8')
}

export async function buildXlsxBuffer<T>(
	sheetName: string,
	columns: ExportColumn<T>[],
	rows: T[]
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook()
	const sheet = workbook.addWorksheet(sheetName)

	sheet.columns = columns.map((column) => ({
		header: column.header,
		key: column.header,
		width: Math.max(column.header.length + 2, 15),
	}))
	sheet.getRow(1).font = { bold: true }

	for (const row of rows) {
		sheet.addRow(
			Object.fromEntries(
				columns.map((column) => [column.header, column.value(row)])
			)
		)
	}

	const arrayBuffer = await workbook.xlsx.writeBuffer()
	return Buffer.from(arrayBuffer)
}

export const XLSX_CONTENT_TYPE =
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const CSV_CONTENT_TYPE = 'text/csv'
