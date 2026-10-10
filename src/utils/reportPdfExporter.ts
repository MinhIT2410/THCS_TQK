import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CompetitionWeeklyReport } from '../types/competition';

/**
 * Removes Vietnamese diacritical tones and normalizes characters.
 * Example: "Tuần 1" -> "Tuan 1", "Tất cả khối" -> "Tat ca khoi"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Sanitizes a string fragment for clean, safe filenames.
 */
export function sanitizeFileNamePart(str: string): string {
  if (!str) return '';
  const noTones = removeVietnameseTones(str);
  return noTones
    .replace(/[\/\s\:\,\;\t\n\r]+/g, '-') // replace spaces, slashes, punctuation with '-'
    .replace(/[^a-zA-Z0-9\-_]/g, '')     // remove invalid characters
    .replace(/[\-_]{2,}/g, '-')          // collapse multiple dashes/underscores
    .replace(/^[\-_]+|[\-_]+$/g, '');    // trim leading/trailing dashes/underscores
}

/**
 * Formats date string to DD-MM-YYYY format for filenames.
 */
function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  const isoMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${d}-${m}-${y}`;
  }
  try {
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {
    // fallback
  }
  return sanitizeFileNamePart(dateStr);
}

/**
 * Normalizes and removes duplicated prefixes like "Tuần 1: Tuần 1: ..." in period labels.
 */
export function cleanPeriodLabel(str?: string): string {
  if (!str) return '';
  let cleaned = str;
  cleaned = cleaned.replace(/(Tuần\s*\d+)\s*:\s*\1\s*:/gi, '$1:');
  cleaned = cleaned.replace(/(Tuần\s*\d+)\s*:\s*\1\b/gi, '$1');
  return cleaned.trim();
}

/**
 * Helper to extract clean week name part e.g. "Tuan-1" from report fields.
 */
function extractWeekNamePart(report: CompetitionWeeklyReport): string {
  if ((report as any).week_number) {
    return `Tuan-${(report as any).week_number}`;
  }
  const raw = cleanPeriodLabel(report.week_name || report.period_label || '');
  const match = raw.match(/Tuần\s*(\d+)/i);
  if (match) {
    return `Tuan-${match[1]}`;
  }
  const stripped = raw.split(':')[0].replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}.*/, '');
  const sanitized = sanitizeFileNamePart(stripped);
  return sanitized || 'Tuan';
}

/**
 * Builds a standardized, clean, Vietnamese-friendly filename for competition reports.
 * 
 * Examples:
 * - Weekly: Bien-ban-thi-dua_Luu-tru_Khoi-6_Tuan-1_03-08-2026-09-08-2026.pdf
 * - Monthly: Bien-ban-thi-dua_Khoi-6_Thang-08-2026.pdf
 * - Semester: Bien-ban-thi-dua_Khoi-6_Hoc-ky-I_2025-2026.pdf
 * - Year: Bien-ban-thi-dua_Khoi-6_Nam-hoc-2025-2026.pdf
 */
export function buildReportPdfFileName(report: CompetitionWeeklyReport, isSnapshot = false): string {
  const gradePart = sanitizeFileNamePart(report.grade_name || 'Tat-ca-khoi');
  const periodType = (report.period_type || 'WEEK').toUpperCase();
  let periodPart = '';

  if (periodType === 'WEEK') {
    const weekPart = extractWeekNamePart(report);
    const startDate = formatDateDDMMYYYY(report.period_start);
    const endDate = formatDateDDMMYYYY(report.period_end);
    if (startDate && endDate) {
      periodPart = `${gradePart}_${weekPart}_${startDate}-${endDate}`;
    } else {
      periodPart = `${gradePart}_${weekPart}`;
    }
  } else if (periodType === 'MONTH') {
    const monthLabel = sanitizeFileNamePart(cleanPeriodLabel(report.period_label) || 'Thang');
    periodPart = `${gradePart}_${monthLabel}`;
  } else if (periodType === 'SEMESTER') {
    const semLabel = sanitizeFileNamePart(cleanPeriodLabel(report.period_label) || 'Hoc-ky-I');
    const yearLabel = sanitizeFileNamePart(report.academic_year_name || '2025-2026');
    periodPart = `${gradePart}_${semLabel}_${yearLabel}`;
  } else if (periodType === 'YEAR') {
    const yearLabel = sanitizeFileNamePart(report.academic_year_name || cleanPeriodLabel(report.period_label) || '2025-2026');
    periodPart = `${gradePart}_Nam-hoc-${yearLabel}`;
  } else {
    const customLabel = sanitizeFileNamePart(cleanPeriodLabel(report.period_label || report.week_name) || 'Bao-cao');
    periodPart = `${gradePart}_${customLabel}`;
  }

  const prefix = isSnapshot ? 'Bien-ban-thi-dua_Luu-tru' : 'Bien-ban-thi-dua';
  return `${prefix}_${periodPart}.pdf`.replace(/_{2,}/g, '_');
}

/**
 * Converts OKLCH color strings or OKLCH expressions inside CSS strings into rgb(...) / rgba(...) format.
 */
export function oklchToRgb(oklchStr: string): string {
  // Try browser Canvas2D context conversion
  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillStyle = oklchStr;
        const computed = ctx.fillStyle;
        if (computed && !computed.includes('oklch') && computed !== 'transparent' && computed !== 'rgba(0, 0, 0, 0)') {
          return computed;
        }
      }
    }
  } catch {
    // fallback
  }

  return parseOklchMath(oklchStr);
}

function parseOklchMath(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(([^)]+)\)/i);
  if (!match) return oklchStr;

  const raw = match[1].trim();
  const parts = raw.split('/');
  const colorPart = parts[0].trim();
  const alphaPart = parts[1] ? parts[1].trim() : null;

  const comps = colorPart.split(/\s+/).filter(Boolean);
  if (comps.length < 3) return 'rgb(0,0,0)';

  const L = parseCompValue(comps[0], true);
  const C = parseCompValue(comps[1], false);
  const H = parseCompValue(comps[2], false);

  let alpha = 1;
  if (alphaPart) {
    if (alphaPart.endsWith('%')) {
      alpha = parseFloat(alphaPart) / 100;
    } else {
      alpha = parseFloat(alphaPart);
    }
    if (isNaN(alpha)) alpha = 1;
  }

  // OKLCH -> OKLAB
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLAB -> LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS -> Linear sRGB
  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toSRGB = (c: number) => {
    const clamped = Math.max(0, c);
    const gamma = clamped > 0.0031308 ? 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055 : 12.92 * clamped;
    return Math.min(255, Math.max(0, Math.round(gamma * 255)));
  };

  const r = toSRGB(rLin);
  const g = toSRGB(gLin);
  const bComp = toSRGB(bLin);

  if (alpha < 0.999) {
    return `rgba(${r}, ${g}, ${bComp}, ${Number(alpha.toFixed(3))})`;
  }
  return `rgb(${r}, ${g}, ${bComp})`;
}

function parseCompValue(valStr: string, isLightness: boolean): number {
  if (!valStr || valStr === 'none') return 0;
  if (valStr.endsWith('%')) {
    const val = parseFloat(valStr) / 100;
    return isLightness ? val : val;
  }
  const val = parseFloat(valStr);
  return isNaN(val) ? 0 : val;
}

export function replaceOklchInString(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) {
    return str;
  }
  return str.replace(/oklch\(([^)]+)\)/gi, (match) => {
    return oklchToRgb(match);
  });
}

/**
 * Sanitizes all OKLCH colors in the cloned document for html2canvas compatibility.
 * Operates purely on the clone in memory during export.
 */
function sanitizeClonedDocColors(clonedDoc: Document, clonedElement: HTMLElement): void {
  // 1. Sanitize <style> tags in cloned document
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
      styleTag.textContent = replaceOklchInString(styleTag.textContent);
    }
  });

  // 2. Sanitize all elements in cloned document
  const colorProps = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'fill',
    'stroke',
    'boxShadow'
  ] as const;

  const win = clonedDoc.defaultView || window;
  const allElements = Array.from(clonedDoc.querySelectorAll<HTMLElement>('*'));
  allElements.push(clonedElement);

  allElements.forEach((el) => {
    // Check and sanitize inline style attribute if present
    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.includes('oklch')) {
      el.setAttribute('style', replaceOklchInString(styleAttr));
    }

    // Inspect computed style and convert/apply explicitly to inline style
    try {
      const computed = win.getComputedStyle(el);
      colorProps.forEach((prop) => {
        const val = computed.getPropertyValue(prop) || (computed as any)[prop];
        if (val && typeof val === 'string') {
          if (val.includes('oklch')) {
            const sanitized = replaceOklchInString(val);
            (el.style as any)[prop] = sanitized;
          } else if (val.startsWith('rgb')) {
            // Requirement 10: Use getComputedStyle rgb values directly on clone
            (el.style as any)[prop] = val;
          }
        }
      });
    } catch {
      // ignore computed style errors for pseudo-elements
    }
  });
}

/**
 * Unified PDF export function:
 * 1. Captures the exact DOM node of ReportDocument using html2canvas.
 * 2. Formats to standard A4 portrait (210mm x 297mm) with ~10mm margins.
 * 3. Scales content so it occupies almost full printable width (190mm).
 * 4. Automatically splits multi-page reports cleanly at table row boundaries without squishing or clipping.
 */

/**
 * html2canvas can render Tailwind's space-y-* utilities too tightly because
 * recent Tailwind versions implement them with logical margins / CSS variables.
 * Materialize the important vertical spacing as plain margin-top values only
 * inside the cloned DOM used for PDF export, so the on-screen report is unchanged.
 */
function materializeVerticalSpacingForPdf(root: HTMLElement): void {
  const spacingMap: Array<[string, string]> = [
    ['space-y-6', '24px'],
    ['space-y-5', '20px'],
    ['space-y-4', '16px'],
    ['space-y-3', '12px'],
    ['space-y-2', '8px'],
    ['space-y-1', '4px'],
    ['space-y-0.5', '2px'],
  ];

  spacingMap.forEach(([className, marginTop]) => {
    const containers: HTMLElement[] = [];
    if (root.classList.contains(className)) {
      containers.push(root);
    }
    root.querySelectorAll<HTMLElement>(`.${className.replace('.', '\\.')}`).forEach((el) => {
      containers.push(el);
    });

    containers.forEach((container) => {
      const children = Array.from(container.children) as HTMLElement[];
      children.forEach((child, index) => {
        if (index > 0) {
          child.style.marginTop = marginTop;
        }
      });
    });
  });

  // Keep detailed violation text comfortably readable on A4.
  root.querySelectorAll<HTMLElement>('table tbody td:last-child').forEach((cell) => {
    cell.style.lineHeight = '1.5';
  });

  root.querySelectorAll<HTMLElement>('table tbody td:last-child li').forEach((item) => {
    item.style.lineHeight = '1.5';
  });
}


/**
 * Make the PDF clone visually match the saved-report preview:
 * visible grid borders, header fill, padding and row separation.
 * This only affects the cloned DOM passed to html2canvas.
 */
function materializeReportTableForPdf(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('table').forEach((table) => {
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.borderSpacing = '0';
    table.style.tableLayout = 'auto';
    table.style.border = '1px solid #cbd5e1';
    table.style.backgroundColor = '#ffffff';
  });

  root.querySelectorAll<HTMLElement>('thead tr').forEach((row) => {
    row.style.backgroundColor = '#f1f5f9';
  });

  root.querySelectorAll<HTMLElement>('th').forEach((cell) => {
    cell.style.border = '1px solid #cbd5e1';
    cell.style.padding = '10px';
    cell.style.verticalAlign = 'middle';
    cell.style.lineHeight = '1.35';
    cell.style.backgroundColor = '#f1f5f9';
  });

  root.querySelectorAll<HTMLElement>('td').forEach((cell) => {
    cell.style.border = '1px solid #e2e8f0';
    cell.style.padding = '10px';
    cell.style.verticalAlign = 'top';
    cell.style.lineHeight = '1.45';
    cell.style.backgroundColor = '#ffffff';
  });

  root.querySelectorAll<HTMLElement>('tbody tr').forEach((row) => {
    row.style.breakInside = 'avoid';
    row.style.pageBreakInside = 'avoid';
  });

  // Preserve the table-card look from the preview.
  root.querySelectorAll<HTMLElement>('.overflow-x-auto').forEach((wrapper) => {
    wrapper.style.border = '1px solid #cbd5e1';
    wrapper.style.borderRadius = '8px';
    wrapper.style.overflow = 'hidden';
    wrapper.style.backgroundColor = '#ffffff';
  });
}

export async function exportReportToPdf(
  targetElement: HTMLElement | null,
  report: CompetitionWeeklyReport,
  isSnapshot = false
): Promise<void> {
  if (!targetElement) {
    throw new Error('Không tìm thấy phần tử giao diện báo cáo để xuất PDF.');
  }

  const fileName = buildReportPdfFileName(report, isSnapshot);

  // 1. Capture DOM element with html2canvas
  // 1.5x is ~145-155 DPI for this A4 layout: sharp enough for text,
  // while avoiding the very large 2x full-page raster that previously produced ~20-30 MB PDFs.
  let measuredBreaks: Array<{ top: number; bottom: number; kind: string }> = [];
  let measuredHeight = 0;
  const canvas = await html2canvas(targetElement, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: targetElement.scrollWidth || 800,
    windowHeight: targetElement.scrollHeight,
    onclone: (clonedDoc, element) => {
      // Force clean document container styling for accurate A4 aspect rendering
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#0f172a';
      // Keep the same visual width as the saved-report preview instead of
      // reflowing the document into a narrower hard-coded width.
      const sourceWidth = Math.max(800, Math.round(targetElement.getBoundingClientRect().width || targetElement.offsetWidth || 848));
      element.style.width = `${sourceWidth}px`;
      element.style.maxWidth = `${sourceWidth}px`;
      element.style.margin = '0 auto';
      element.style.padding = '24px';
      element.style.boxSizing = 'border-box';

      // Strip dark mode class on cloned element
      element.classList.remove('dark');

      // Convert textareas to pre-wrap divs so supervisor notes render cleanly
      const textareas = element.querySelectorAll('textarea');
      textareas.forEach((ta) => {
        const div = clonedDoc.createElement('div');
        div.className = ta.className;
        div.style.whiteSpace = 'pre-wrap';
        div.style.minHeight = '60px';
        div.innerText = (ta as HTMLTextAreaElement).value || (ta as HTMLTextAreaElement).placeholder || 'Không có nhận xét bổ sung.';
        if (ta.parentNode) {
          ta.parentNode.replaceChild(div, ta);
        }
      });

      // Expand horizontal overflow table containers
      const scrollWrappers = element.querySelectorAll('.overflow-x-auto');
      scrollWrappers.forEach((wrapper) => {
        (wrapper as HTMLElement).style.overflow = 'visible';
      });

      // Tailwind space-y-* can collapse visually in html2canvas.
      // Convert it to ordinary margin-top values in the export clone only.
      materializeVerticalSpacingForPdf(element);
      materializeReportTableForPdf(element);

      // Measure actual clone geometry (not offsetTop, which is relative to nested
      // table/container offset parents). Keep entire table rows and signature together.
      const rootRect = element.getBoundingClientRect();
      measuredHeight = element.getBoundingClientRect().height;
      measuredBreaks = Array.from(element.querySelectorAll<HTMLElement>(
        'tbody tr, thead, [data-pdf-section="notes"], [data-pdf-section="signatures"]'
      )).map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top - rootRect.top,
          bottom: rect.bottom - rootRect.top,
          kind: node.matches('tbody tr') ? 'row' : node.matches('thead') ? 'header' : 'section',
        };
      }).filter((item) => item.bottom > item.top);

      // Sanitize OKLCH colors on cloned DOM
      sanitizeClonedDocColors(clonedDoc, element);
    }
  });

  // 2. Setup jsPDF for standard A4 Portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    precision: 3
  });

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 10; // 10mm margins all around
  const printableWidth = pageWidth - margin * 2; // 190mm
  const printableHeight = pageHeight - margin * 2; // 277mm

  // Conversion factor: mm per canvas pixel
  const mmPerCanvasPx = printableWidth / canvas.width;
  const maxSlicePx = printableHeight / mmPerCanvasPx;

  // html2canvas captures the export clone, so pagination must use measurements
  // from that same clone. Canvas and clone coordinates share this scale.
  const captureScale = canvas.height / (measuredHeight || canvas.height);
  const blocks = measuredBreaks.map((block) => ({
    top: block.top * captureScale,
    bottom: block.bottom * captureScale,
    kind: block.kind,
  }));

  let currentY = 0;
  let pageIndex = 0;

  while (currentY < canvas.height) {
    let slicePx = Math.min(maxSlicePx, canvas.height - currentY);

    // A row or signature must not cross the physical A4 page boundary.
    // Move the whole block to the next page when it fits there. For a single
    // exceptionally tall row, a split is unavoidable and is left as fallback.
    if (currentY + slicePx < canvas.height) {
      const endY = currentY + slicePx;
      const crossing = blocks.find((block) =>
        block.top > currentY + 1 && block.top < endY - 1 && block.bottom > endY + 1
        && block.bottom - block.top <= maxSlicePx
      );
      if (crossing) {
        slicePx = crossing.top - currentY;
      } else {
        // Prefer ending on a completed row, rather than between a row and
        // its surrounding table/notes, provided this doesn't waste much space.
        const candidate = blocks
          .filter((block) => block.bottom > currentY + maxSlicePx * 0.72 && block.bottom <= endY)
          .sort((a, b) => b.bottom - a.bottom)[0];
        if (candidate) slicePx = candidate.bottom - currentY;
      }
    }
    slicePx = Math.max(1, slicePx);

    // Slice canvas
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.max(1, Math.ceil(slicePx));

    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, currentY, canvas.width, slicePx,
        0, 0, canvas.width, slicePx
      );
    }

    // The report is mostly text on a white/light background.
    // JPEG dramatically reduces PDF size compared with embedding a lossless PNG per page.
    // 0.88 keeps small text and thin table borders visually clean at 1.5x capture scale.
    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.90);
    const pdfImageHeight = slicePx * mmPerCanvasPx;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      pageImgData,
      'JPEG',
      margin,
      margin,
      printableWidth,
      pdfImageHeight,
      undefined,
      'FAST'
    );

    currentY += slicePx;
    pageIndex++;
  }

  pdf.save(fileName);
}
