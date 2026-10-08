import * as XLSX from 'xlsx';
import {
  Student,
  BPSHouse,
  BPSSection,
  resolveBPSHouse,
  ALL_HOUSES,
  BPS_HOUSES_MAP,
} from '../types';

export interface ParsedStudentRow {
  admissionNo: string;
  name: string;
  class: string;
  section: string;
  house: BPSHouse;
  schoolSection: BPSSection;
  houseFullName: string;
  rawHouseInput?: string;
  fatherName?: string;
  contactNo?: string;
  isValid: boolean;
  error?: string;
}

export const ExcelService = {
  // 1. Download formatted Excel (.xlsx) template for BPS Pilani with all sections
  downloadExcelTemplate(): void {
    const templateData = [
      {
        'Admission Number': '12455',
        'Student Name': 'Aarav Sharma',
        'Class': '11',
        'Section': 'A',
        'House': 'PAN',
        'Father Name': 'Dr. Rajesh Sharma',
        'Contact Number': '9829012345',
      },
      {
        'Admission Number': '12456',
        'Student Name': 'Vivaan Birla',
        'Class': '8',
        'Section': 'B',
        'House': 'GH-PAN',
        'Father Name': 'Suresh Birla',
        'Contact Number': '9829054321',
      },
      {
        'Admission Number': '12457',
        'Student Name': 'Raghav Singhal',
        'Class': '7',
        'Section': 'A',
        'House': 'MH-PAT',
        'Father Name': 'Anil Singhal',
        'Contact Number': '9414012345',
      },
      {
        'Admission Number': '12458',
        'Student Name': 'Kabir Verma',
        'Class': '4',
        'Section': 'A',
        'House': 'KUMAR',
        'Father Name': 'Manish Verma',
        'Contact Number': '9829011223',
      },
      {
        'Admission Number': '12459',
        'Student Name': 'Aryan Chauhan',
        'Class': '3',
        'Section': 'B',
        'House': 'SG1',
        'Father Name': 'Vikram Chauhan',
        'Contact Number': '9829033445',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for clean readability
    worksheet['!cols'] = [
      { wch: 18 }, // Admission Number
      { wch: 22 }, // Student Name
      { wch: 10 }, // Class
      { wch: 10 }, // Section
      { wch: 18 }, // House
      { wch: 22 }, // Father Name
      { wch: 18 }, // Contact Number
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BPS_Students_Template');

    XLSX.writeFile(workbook, 'BPS_Student_Import_Template.xlsx');
  },

  // 2. Download CSV template
  downloadCsvTemplate(): void {
    const csvContent =
      'Admission Number,Student Name,Class,Section,House,Father Name,Contact Number\n' +
      '12455,Aarav Sharma,11,A,PAN,Dr. Rajesh Sharma,9829012345\n' +
      '12456,Vivaan Birla,8,B,GH-PAN,Suresh Birla,9829054321\n' +
      '12457,Raghav Singhal,7,A,MH-PAT,Anil Singhal,9414012345\n' +
      '12458,Kabir Verma,4,A,KUMAR,Manish Verma,9829011223\n' +
      '12459,Aryan Chauhan,3,B,SG1,Vikram Chauhan,9829033445\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'BPS_Student_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // 3. Flexible Column Key Finder (case-insensitive & fuzzy)
  findColumnValue(row: Record<string, unknown>, patterns: RegExp[]): string {
    const keys = Object.keys(row);
    for (const pattern of patterns) {
      for (const k of keys) {
        if (pattern.test(k.trim())) {
          const val = row[k];
          if (val !== undefined && val !== null) {
            return String(val).trim();
          }
        }
      }
    }
    return '';
  },

  // 4. Parse ArrayBuffer / File from Excel or CSV upload
  async parseSpreadsheetFile(file: File): Promise<ParsedStudentRow[]> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Read sheet as raw 2D array of rows first to auto-detect header row
    const rawMatrix = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

    if (!rawMatrix || rawMatrix.length === 0) {
      return [];
    }

    // Determine header row index (usually 0, or up to row 4 if there's a title header)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawMatrix.length, 5); i++) {
      const rowArr = rawMatrix[i] || [];
      const rowStr = rowArr.map((c) => String(c || '').toLowerCase()).join(' ');
      if (
        (rowStr.includes('adm') || rowStr.includes('scholar') || rowStr.includes('roll')) &&
        (rowStr.includes('name') || rowStr.includes('student'))
      ) {
        headerRowIdx = i;
        break;
      }
    }

    // Read sheet with range starting at detected header row
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      range: headerRowIdx,
    });

    const parsed: ParsedStudentRow[] = [];

    // Column match regex patterns
    const ADM_PATTERNS = [
      /^admission[\s._-]?no/i,
      /^admission[\s._-]?number/i,
      /^adm[\s._-]?no/i,
      /^adm/i,
      /^scholar[\s._-]?no/i,
      /^sr[\s._-]?no/i,
      /^student[\s._-]?id/i,
      /^roll[\s._-]?no/i,
      /^reg[\s._-]?no/i,
      /^id$/i,
    ];

    const NAME_PATTERNS = [
      /^student[\s._-]?name/i,
      /^name[\s._-]?of[\s._-]?student/i,
      /^full[\s._-]?name/i,
      /^student/i,
      /^name$/i,
    ];

    const CLASS_PATTERNS = [
      /^class[\s._-]?grade/i,
      /^class$/i,
      /^grade$/i,
      /^standard$/i,
      /^std$/i,
    ];

    const SECTION_PATTERNS = [
      /^section$/i,
      /^sec$/i,
      /^class[\s._-]?section/i,
    ];

    const HOUSE_PATTERNS = [
      /^house[\s._-]?name/i,
      /^house[\s._-]?abbr/i,
      /^house[\s._-]?code/i,
      /^houses/i,
      /^house$/i,
      /^hostel/i,
    ];

    const FATHER_PATTERNS = [
      /^father[\s._-]?name/i,
      /^father['s]?[\s._-]?name/i,
      /^parent[\s._-]?name/i,
      /^guardian[\s._-]?name/i,
      /^father$/i,
      /^guardian$/i,
    ];

    const CONTACT_PATTERNS = [
      /^contact[\s._-]?no/i,
      /^contact[\s._-]?number/i,
      /^mobile[\s._-]?no/i,
      /^phone[\s._-]?no/i,
      /^mobile$/i,
      /^phone$/i,
      /^contact$/i,
      /^cell$/i,
    ];

    for (const row of rawRows) {
      const admRaw = this.findColumnValue(row, ADM_PATTERNS);
      const nameRaw = this.findColumnValue(row, NAME_PATTERNS);
      const classRaw = this.findColumnValue(row, CLASS_PATTERNS) || '10';
      const sectionRaw = this.findColumnValue(row, SECTION_PATTERNS) || 'A';
      const houseRaw = this.findColumnValue(row, HOUSE_PATTERNS);
      const fatherRaw = this.findColumnValue(row, FATHER_PATTERNS);
      const contactRaw = this.findColumnValue(row, CONTACT_PATTERNS);

      const admStr = admRaw.replace(/\D/g, '');
      const nameStr = nameRaw.trim();
      const classStr = classRaw.trim();
      const secStr = sectionRaw.trim().toUpperCase();

      // Empty row check
      if (!admStr && !nameStr) {
        continue;
      }

      // Robust house resolver handles:
      // Senior: PAN, PAT, KAN, KAT, VYAS
      // Middle: GH-PAN, GH, MH-PAT, MH, DH-KAT, DH, BH-VYAS, BH, VH-KAN, VH (takes part before hyphen)
      // Junior: KUMAR, SG1, BAL, KISHO
      const resolved = resolveBPSHouse(houseRaw);

      let isValid = true;
      let error = '';

      if (!admStr) {
        isValid = false;
        error = 'Missing admission number';
      } else if (!nameStr) {
        isValid = false;
        error = 'Missing student name';
      }

      parsed.push({
        admissionNo: admStr,
        name: nameStr,
        class: classStr || '10',
        section: secStr || 'A',
        house: resolved.house,
        schoolSection: resolved.section,
        houseFullName: resolved.fullName,
        rawHouseInput: houseRaw || undefined,
        fatherName: fatherRaw || undefined,
        contactNo: contactRaw || undefined,
        isValid,
        error,
      });
    }

    return parsed;
  },

  // 5. Convert parsed rows into official Student entity
  convertToStudentEntities(rows: ParsedStudentRow[]): Student[] {
    return rows
      .filter((r) => r.isValid)
      .map((r) => {
        // Pad admission to at least 5 digits
        const paddedAdm = r.admissionNo.padStart(5, '0');
        const houseNo = `BPSST50${paddedAdm}`;
        const qrId = `QR-BPS-${paddedAdm}`;

        return {
          id: `STU-${paddedAdm}`,
          admissionNo: r.admissionNo,
          name: r.name,
          class: r.class,
          section: r.section,
          house: r.house,
          schoolSection: r.schoolSection,
          houseFullName: r.houseFullName,
          houseNo,
          qrId,
          status: 'ON_CAMPUS',
          fatherName: r.fatherName,
          contactNo: r.contactNo,
        };
      });
  },
};

