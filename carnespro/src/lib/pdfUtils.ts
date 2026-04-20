import { ClientProfile, ClientMovement } from '@/stores/useClientStore';

function fmt(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR');
}

function fmtDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
};

export async function downloadComprobantePago(
  client: ClientProfile,
  movement: ClientMovement,
  prevBalance: number
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: [80, 175] });
  const w = 80;
  const m = 6;
  let y = 8;

  const line = (yPos: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(m, yPos, w - m, yPos);
  };

  // Header
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, w, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('CARNESPRO', w / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Sistema de Gestión para Carnicerías', w / 2, y, { align: 'center' });
  y += 9;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('COMPROBANTE DE PAGO', w / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text(`N° ${movement.id.slice(-8).toUpperCase()}`, m, y);
  doc.text(fmtDateTime(movement.date), w - m, y, { align: 'right' });
  y += 5;
  line(y); y += 5;

  // Client
  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', m, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(client.name, m, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`DNI: ${client.dni}`, m, y);
  y += 4;
  if (client.phone) { doc.text(`Tel: ${client.phone}`, m, y); y += 4; }
  y += 1;
  line(y); y += 5;

  // Concept
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(130, 130, 130);
  doc.text('CONCEPTO', m, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(movement.description, m, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Método: ${METHOD_LABELS[movement.paymentMethod || ''] || 'Efectivo'}`, m, y);
  y += 5;
  line(y); y += 5;

  // Amounts
  const rCol = w - m;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text('Saldo anterior:', m, y);
  doc.text(fmt(prevBalance), rCol, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(34, 197, 94);
  doc.text('Monto abonado:', m, y);
  doc.text(`- ${fmt(movement.amount)}`, rCol, y, { align: 'right' });
  y += 3;

  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.4);
  doc.line(m, y, w - m, y);
  doc.setLineWidth(0.2);
  y += 5;

  const saldo = movement.balanceAfter;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(saldo > 0 ? 220 : 34, saldo > 0 ? 38 : 197, saldo > 0 ? 38 : 94);
  doc.text('SALDO RESTANTE:', m, y);
  doc.text(fmt(saldo), rCol, y, { align: 'right' });
  y += 6;

  line(y); y += 6;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('Gracias por su preferencia', w / 2, y, { align: 'center' });
  y += 4;
  doc.text('Documento informativo — no válido como factura', w / 2, y, { align: 'center' });
  y += 3;
  doc.text('CARNESPro © 2026', w / 2, y, { align: 'center' });

  const filename = `comprobante-${client.name.replace(/\s+/g, '-').toLowerCase()}-${movement.id.slice(-6)}.pdf`;
  doc.save(filename);
}

export async function downloadCartola(client: ClientProfile) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = 210;
  const mg = 16;
  const contentW = w - mg * 2;
  let y = 0;

  // Paleta
  const RED: [number, number, number] = [185, 28, 28];
  const RED_LIGHT: [number, number, number] = [220, 38, 38];
  const DARK: [number, number, number] = [17, 24, 39];
  const GRAY_DARK: [number, number, number] = [55, 65, 81];
  const GRAY_MID: [number, number, number] = [107, 114, 128];
  const GRAY_LIGHT: [number, number, number] = [243, 244, 246];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GREEN: [number, number, number] = [22, 163, 74];
  const BORDER: [number, number, number] = [209, 213, 219];

  const setFill = (c: [number, number, number]) => doc.setFillColor(...c);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(...c);
  const setTxt = (c: [number, number, number]) => doc.setTextColor(...c);

  // ── HEADER ──────────────────────────────────────────────────────────────
  setFill(RED);
  doc.rect(0, 0, w, 36, 'F');

  // Barra decorativa inferior del header
  setFill(RED_LIGHT);
  doc.rect(0, 33, w, 3, 'F');

  // Logo / nombre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setTxt(WHITE);
  doc.text('CARNESPRO', mg, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setTxt([255, 200, 200]);
  doc.text('Sistema de Gestión para Carnicerías', mg, 23);

  // Título derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTxt(WHITE);
  doc.text('ESTADO DE CUENTA', w - mg, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setTxt([255, 200, 200]);
  doc.text(fmtDate(new Date().toISOString()), w - mg, 22, { align: 'right' });

  y = 44;

  // ── CLIENTE ─────────────────────────────────────────────────────────────
  // Sombra sutil
  setFill([229, 231, 235]);
  doc.roundedRect(mg + 0.5, y + 0.5, contentW, 30, 3, 3, 'F');

  setFill(WHITE);
  setDraw(BORDER);
  doc.setLineWidth(0.4);
  doc.roundedRect(mg, y, contentW, 30, 3, 3, 'FD');

  // Acento rojo izquierdo
  setFill(RED);
  doc.roundedRect(mg, y, 4, 30, 1, 1, 'F');
  doc.rect(mg + 2, y, 2, 30, 'F');

  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setTxt(DARK);
  doc.text(client.name, mg + 10, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setTxt(GRAY_MID);
  doc.text('Saldo pendiente:', mg + 10, y);

  const balAmt = fmt(client.balance);
  const isDebt = client.balance > 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setTxt(isDebt ? RED : GREEN);
  doc.text(balAmt, mg + 45, y);


  y += 18;

  // ── TABLA ────────────────────────────────────────────────────────────────
  const cols = {
    date:    mg,
    desc:    mg + 34,
    type:    w - mg - 78,
    amount:  w - mg - 38,
    balance: w - mg,
  };

  const drawTableHeader = () => {
    setFill(DARK);
    doc.roundedRect(mg, y, contentW, 10, 2, 2, 'F');
    doc.rect(mg, y + 5, contentW, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTxt([156, 163, 175]);
    doc.text('FECHA',       cols.date + 2,    y + 6.5);
    doc.text('DESCRIPCIÓN', cols.desc + 2,    y + 6.5);
    doc.text('TIPO',        cols.type,         y + 6.5, { align: 'right' });
    doc.text('MONTO',       cols.amount,       y + 6.5, { align: 'right' });
    doc.text('SALDO',       cols.balance,      y + 6.5, { align: 'right' });
    y += 12;
  };

  drawTableHeader();

  const sorted = [...client.movements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sorted.forEach((m, i) => {
    if (y > 264) {
      doc.addPage();
      y = 20;
      drawTableHeader();
    }

    const rowH = 10;

    if (i % 2 === 0) {
      setFill(GRAY_LIGHT);
      doc.rect(mg, y, contentW, rowH, 'F');
    }

    // Línea divisora izquierda de color por tipo
    setFill(m.type === 'sale' ? RED_LIGHT : GREEN);
    doc.rect(mg, y, 2, rowH, 'F');

    const cy = y + 6.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTxt(GRAY_MID);
    doc.text(fmtDate(m.date), cols.date + 4, cy);

    let desc = m.description;
    const maxDescW = cols.type - cols.desc - 8;
    while (doc.getTextWidth(desc) > maxDescW && desc.length > 4) desc = desc.slice(0, -1);
    if (desc !== m.description) desc += '…';
    setTxt(DARK);
    doc.text(desc, cols.desc + 2, cy);

    // Pill tipo
    const typeLabel = m.type === 'sale' ? 'Compra' : 'Pago';
    const typeColor: [number, number, number] = m.type === 'sale' ? [254, 226, 226] : [220, 252, 231];
    const typeTextColor: [number, number, number] = m.type === 'sale' ? RED : GREEN;
    doc.setFontSize(6.5);
    const tpW = doc.getTextWidth(typeLabel) + 6;
    setFill(typeColor);
    doc.roundedRect(cols.type - tpW, cy - 4.5, tpW, 6, 1.5, 1.5, 'F');
    setTxt(typeTextColor);
    doc.text(typeLabel, cols.type - tpW / 2, cy - 0.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTxt(m.type === 'sale' ? RED : GREEN);
    const prefix = m.type === 'sale' ? '+' : '-';
    doc.text(`${prefix} ${fmt(m.amount)}`, cols.amount, cy, { align: 'right' });

    setTxt(m.balanceAfter > 0 ? RED : GREEN);
    doc.text(fmt(m.balanceAfter), cols.balance, cy, { align: 'right' });

    setDraw(BORDER);
    doc.setLineWidth(0.2);
    doc.line(mg, y + rowH, mg + contentW, y + rowH);
    y += rowH;
  });

  y += 6;

  // ── RESUMEN ──────────────────────────────────────────────────────────────
  if (y > 258) { doc.addPage(); y = 20; }

  // Caja resumen
  const resumeH = 28;
  setFill([229, 231, 235]);
  doc.roundedRect(mg + 0.5, y + 0.5, contentW, resumeH, 3, 3, 'F');
  setFill(isDebt ? [255, 241, 241] : [240, 253, 244]);
  setDraw(isDebt ? RED : GREEN);
  doc.setLineWidth(0.5);
  doc.roundedRect(mg, y, contentW, resumeH, 3, 3, 'FD');

  // Barra superior coloreada
  setFill(isDebt ? RED : GREEN);
  doc.roundedRect(mg, y, contentW, 5, 3, 3, 'F');
  doc.rect(mg, y + 2, contentW, 3, 'F');

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setTxt(GRAY_DARK);
  doc.text('Saldo total a pagar:', mg + 8, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setTxt(isDebt ? RED : GREEN);
  doc.text(fmt(client.balance), w - mg - 8, y, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTxt(GRAY_MID);
  const totalSales = client.movements.filter(m => m.type === 'sale').reduce((s, m) => s + m.amount, 0);
  const totalPaid  = client.movements.filter(m => m.type === 'payment').reduce((s, m) => s + m.amount, 0);
  doc.text(`Total compras: ${fmt(totalSales)}`, mg + 8, y);
  doc.text(`Total pagos: ${fmt(totalPaid)}`, w - mg - 8, y, { align: 'right' });

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    setDraw(BORDER);
    doc.setLineWidth(0.3);
    doc.line(mg, 287, w - mg, 287);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setTxt(GRAY_MID);
    doc.text('Documento informativo — no válido como factura fiscal', mg, 291);
    doc.text(`Pág. ${i} / ${pageCount}`, w - mg, 291, { align: 'right' });
  }

  const filename = `cuenta-${client.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  doc.save(filename);
}
