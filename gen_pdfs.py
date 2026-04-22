"""Generate Carnify brochure + contract PDFs."""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
import os

OUTPUT_DIR = r"C:\Users\dello\OneDrive\Desktop\SISTEMAS\Carniceria"

# ── Colors ────────────────────────────────────────────────────────────────────
DARK_RED   = colors.HexColor("#8B0000")
LIGHT_RED  = colors.HexColor("#B22222")
CREAM      = colors.HexColor("#FFF8F0")
DARK_CREAM = colors.HexColor("#F5E6D8")
DARK_GRAY  = colors.HexColor("#1A1A1A")
MID_GRAY   = colors.HexColor("#555555")
LIGHT_GRAY = colors.HexColor("#EEEEEE")
WHITE      = colors.white

W, H = A4  # 595.28 x 841.89 pt


# ═══════════════════════════════════════════════════════════════════════════════
# BROCHURE  (v2 — better structure + illustrations)
# ═══════════════════════════════════════════════════════════════════════════════

def draw_page_footer(c, page_num=None):
    c.setFillColor(DARK_RED)
    c.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(18*mm, 3.5*mm, "carnify.app  |  dellorsif@gmail.com")
    if page_num:
        c.drawRightString(W - 18*mm, 3.5*mm, f"{page_num}")

def draw_section_header(c, title, subtitle=None):
    """Dark red top band with title."""
    c.setFillColor(DARK_RED)
    c.rect(0, H - 32*mm, W, 32*mm, fill=1, stroke=0)
    # left accent bar
    c.setFillColor(DARK_CREAM)
    c.rect(0, H - 32*mm, 5*mm, 32*mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 20)
    ty = H - 18*mm if subtitle else H - 20*mm
    c.drawString(20*mm, ty, title)
    if subtitle:
        c.setFont("Helvetica", 10)
        c.setFillColor(DARK_CREAM)
        c.drawString(20*mm, H - 27*mm, subtitle)

def draw_screen_mockup(c, x, y, w, h):
    """Draw a simplified laptop/screen mockup."""
    # Screen outer frame
    c.setFillColor(DARK_GRAY)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    # Screen inner (display area)
    pad = 4
    sw = w - pad*2
    sh = h - pad*2 - 8
    sx, sy = x + pad, y + 8 + pad
    c.setFillColor(colors.HexColor("#0F172A"))
    c.roundRect(sx, sy, sw, sh, 3, fill=1, stroke=0)

    # Fake sidebar
    c.setFillColor(colors.HexColor("#1E293B"))
    c.rect(sx, sy, sw * 0.22, sh, fill=1, stroke=0)

    # Sidebar menu items
    c.setFillColor(DARK_RED)
    c.roundRect(sx + 4, sy + sh - 18, sw * 0.18, 10, 2, fill=1, stroke=0)
    for i in range(5):
        c.setFillColor(colors.HexColor("#334155"))
        c.roundRect(sx + 4, sy + sh - 34 - i*14, sw * 0.18, 8, 1, fill=1, stroke=0)

    # Main content area — fake stat cards
    cx2 = sx + sw * 0.25
    card_w = (sw * 0.73) / 2 - 3
    card_h = sh * 0.3
    card_colors = [colors.HexColor("#1D4ED8"), colors.HexColor("#059669")]
    for i, cc in enumerate(card_colors):
        cx3 = cx2 + i * (card_w + 4)
        c.setFillColor(cc)
        c.roundRect(cx3, sy + sh - card_h - 6, card_w, card_h, 3, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 5)
        c.drawString(cx3 + 4, sy + sh - 16, ["Ventas hoy", "Transacciones"][i])
        c.setFont("Helvetica-Bold", 8)
        c.drawString(cx3 + 4, sy + sh - card_h + 6, ["$84.500", "23"][i])

    # Fake bar chart
    chart_y = sy + 6
    chart_h2 = sh * 0.42
    chart_x = cx2
    chart_w2 = sw * 0.73
    c.setFillColor(colors.HexColor("#1E293B"))
    c.roundRect(chart_x, chart_y, chart_w2, chart_h2, 2, fill=1, stroke=0)
    bars = [0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 0.65]
    bar_w2 = (chart_w2 - 10) / len(bars)
    for i, v in enumerate(bars):
        bx2 = chart_x + 5 + i * bar_w2
        bh2 = (chart_h2 - 14) * v
        c.setFillColor(DARK_RED)
        c.roundRect(bx2, chart_y + 6, bar_w2 - 2, bh2, 1, fill=1, stroke=0)

    # Camera dot
    c.setFillColor(colors.HexColor("#475569"))
    c.circle(x + w/2, y + 4, 2, fill=1, stroke=0)


def draw_phone_mockup(c, x, y, w, h):
    """Draw a phone showing POS screen."""
    # Phone body
    c.setFillColor(DARK_GRAY)
    c.roundRect(x, y, w, h, 10, fill=1, stroke=0)
    # Screen
    pad = 5
    sw = w - pad*2
    sh = h - pad*2 - 16
    sx, sy = x + pad, y + 10 + pad
    c.setFillColor(colors.HexColor("#0F172A"))
    c.roundRect(sx, sy, sw, sh, 4, fill=1, stroke=0)

    # POS header
    c.setFillColor(DARK_RED)
    c.rect(sx, sy + sh - 14, sw, 14, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 5)
    c.drawCentredString(sx + sw/2, sy + sh - 9, "Punto de Venta")

    # Product grid (2x3)
    prod_colors = [
        colors.HexColor("#7C3AED"), colors.HexColor("#DC2626"),
        colors.HexColor("#D97706"), colors.HexColor("#059669"),
        colors.HexColor("#2563EB"), colors.HexColor("#DB2777"),
    ]
    labels = ["Vacio", "Asado", "Lomo", "Pollo", "Cerdo", "Chorizo"]
    pw = (sw - 6) / 2
    ph = (sh - 50) / 3
    for i, (pc, lbl) in enumerate(zip(prod_colors, labels)):
        col = i % 2
        row = i // 2
        px = sx + 2 + col * (pw + 2)
        py = sy + sh - 30 - row * (ph + 2) - ph
        c.setFillColor(pc)
        c.roundRect(px, py, pw, ph, 2, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 4)
        c.drawCentredString(px + pw/2, py + ph/2 - 2, lbl)

    # Total bar
    c.setFillColor(colors.HexColor("#1E293B"))
    c.rect(sx, sy, sw, 18, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 5)
    c.drawString(sx + 3, sy + 11, "TOTAL")
    c.setFillColor(colors.HexColor("#4ADE80"))
    c.setFont("Helvetica-Bold", 6)
    c.drawRightString(sx + sw - 3, sy + 11, "$18.500")
    c.setFillColor(DARK_RED)
    c.roundRect(sx + 2, sy + 2, sw - 4, 8, 2, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 4)
    c.drawCentredString(sx + sw/2, sy + 5, "COBRAR")

    # Home button
    c.setFillColor(colors.HexColor("#374151"))
    c.circle(x + w/2, y + 6, 4, fill=1, stroke=0)


def draw_module_card(c, x, y, w, h, icon_char, title, desc, accent):
    """Rounded card with colored top strip."""
    # Card shadow (offset)
    c.setFillColor(colors.HexColor("#DDDDDD"))
    c.roundRect(x + 2, y - 2, w, h, 6, fill=1, stroke=0)
    # Card body
    c.setFillColor(WHITE)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    # Top accent strip
    c.setFillColor(accent)
    c.roundRect(x, y + h - 8, w, 8, 6, fill=1, stroke=0)
    c.rect(x, y + h - 8, w, 4, fill=1, stroke=0)  # flatten bottom of strip
    # Icon circle
    c.setFillColor(accent)
    c.circle(x + 16, y + h - 16, 10, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + 16, y + h - 19, icon_char)
    # Title
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 30, y + h - 19, title)
    # Divider
    c.setStrokeColor(LIGHT_GRAY)
    c.setLineWidth(0.5)
    c.line(x + 6, y + h - 26, x + w - 6, y + h - 26)
    # Description
    c.setFillColor(MID_GRAY)
    c.setFont("Helvetica", 7.5)
    # word-wrap manually at ~38 chars
    words = desc.split()
    lines2 = []
    cur = ""
    for word in words:
        if len(cur) + len(word) + 1 <= 38:
            cur = (cur + " " + word).strip()
        else:
            lines2.append(cur)
            cur = word
    if cur:
        lines2.append(cur)
    for i, ln in enumerate(lines2[:3]):
        c.drawString(x + 6, y + h - 34 - i * 9, ln)


def make_brochure():
    path = os.path.join(OUTPUT_DIR, "carnify_presentacion.pdf")
    c = canvas.Canvas(path, pagesize=A4)

    # ══════════════════════════════════════════════════════════════════
    # PAGE 1 — COVER
    # ══════════════════════════════════════════════════════════════════
    # Full background split: left red / right cream
    c.setFillColor(DARK_RED)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.rect(W * 0.52, 0, W * 0.48, H, fill=1, stroke=0)

    # Diagonal separator
    from reportlab.graphics.shapes import Drawing, Polygon
    from reportlab.graphics import renderPDF
    d = Drawing(W, H)
    poly = Polygon([W * 0.52, 0, W * 0.60, 0, W * 0.52, H],
                   fillColor=CREAM, strokeColor=None)
    d.add(poly)
    renderPDF.draw(d, c, 0, 0)

    # Top label bar
    c.setFillColor(colors.HexColor("#5C0000"))
    c.rect(0, H - 14*mm, W * 0.52, 14*mm, fill=1, stroke=0)
    c.setFillColor(DARK_CREAM)
    c.setFont("Helvetica", 8)
    c.drawString(18*mm, H - 8*mm, "SISTEMA DE GESTION PARA CARNICERAS")

    # Big logo circle
    lx, ly = W * 0.27, H * 0.56
    c.setFillColor(colors.HexColor("#6B0000"))
    c.circle(lx, ly, 55, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.circle(lx, ly, 48, fill=1, stroke=0)
    # Meat bone icon inside circle
    c.setFillColor(DARK_RED)
    c.roundRect(lx - 24, ly - 8, 48, 16, 6, fill=1, stroke=0)
    for dx2, dy2 in [(-28, -12), (-28, 4), (28, -12), (28, 4)]:
        c.circle(lx + dx2, ly + dy2, 11, fill=1, stroke=0)

    # Brand name
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 52)
    c.drawString(18*mm, H * 0.39, "CARNIFY")

    # Tagline
    c.setFont("Helvetica", 13)
    c.setFillColor(DARK_CREAM)
    c.drawString(18*mm, H * 0.34, "Gestion inteligente")
    c.drawString(18*mm, H * 0.30, "para tu carniceria")

    # Left feature pills
    pill_items = ["POS rapido", "Control de caja", "Reportes", "Multi-usuario"]
    for i, pill in enumerate(pill_items):
        py2 = H * 0.24 - i * 14*mm
        c.setFillColor(colors.HexColor("#6B0000"))
        c.roundRect(18*mm, py2 - 4*mm, 52*mm, 9*mm, 4, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica", 9)
        c.drawString(22*mm, py2, pill)

    # Right side: screen mockup
    draw_screen_mockup(c, W * 0.57, H * 0.42, W * 0.36, H * 0.34)

    # Right side: headline text
    c.setFillColor(DARK_RED)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(W * 0.57, H * 0.38, "Todo tu negocio,")
    c.drawString(W * 0.57, H * 0.33, "desde un solo lugar.")
    c.setFillColor(MID_GRAY)
    c.setFont("Helvetica", 9)
    c.drawString(W * 0.57, H * 0.27, "Accedelo desde cualquier")
    c.drawString(W * 0.57, H * 0.23, "dispositivo. Sin instalaciones.")

    # Right bottom: price teaser
    c.setFillColor(DARK_RED)
    c.roundRect(W * 0.57, H * 0.13, W * 0.36, 22*mm, 6, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W * 0.57 + W * 0.18, H * 0.13 + 14*mm, "Desde $ 50.000 / mes")
    c.setFont("Helvetica", 8)
    c.setFillColor(DARK_CREAM)
    c.drawCentredString(W * 0.57 + W * 0.18, H * 0.13 + 7*mm, "Activacion: $ 150.000 unico pago")

    # Footer
    c.setFillColor(colors.HexColor("#3B0000"))
    c.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, 3.5*mm, "Franco  |  dellorsif@gmail.com")

    c.showPage()

    # ══════════════════════════════════════════════════════════════════
    # PAGE 2 — QUE ES + MODULOS en grilla
    # ══════════════════════════════════════════════════════════════════
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    draw_section_header(c, "Que es Carnify?",
                        "Sistema 100% en la nube disenado para carniceras argentinas")

    # Intro paragraph box
    iy = H - 48*mm
    c.setFillColor(WHITE)
    c.roundRect(18*mm, iy - 20*mm, W - 36*mm, 20*mm, 5, fill=1, stroke=0)
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 9.5)
    intro = ("Carnify centraliza toda la operacion de tu carnicera: venta, stock, costos, "
             "personal y reportes en una sola plataforma. Accedela desde la computadora, "
             "el celular o la tablet. Sin instalaciones ni servidores propios.")
    # simple wrap at 90 chars
    words = intro.split()
    lines2, cur2 = [], ""
    for w2 in words:
        if len(cur2) + len(w2) + 1 <= 95:
            cur2 = (cur2 + " " + w2).strip()
        else:
            lines2.append(cur2)
            cur2 = w2
    if cur2:
        lines2.append(cur2)
    for i, ln in enumerate(lines2):
        c.drawString(22*mm, iy - 6*mm - i*5.5*mm, ln)

    # ── MODULE CARDS 3x3 grid ─────────────────────────────────────────
    y_lbl = iy - 27*mm
    c.setFillColor(DARK_RED)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(18*mm, y_lbl, "Modulos incluidos")
    c.setStrokeColor(DARK_RED)
    c.setLineWidth(2)
    c.line(18*mm, y_lbl - 3*mm, W - 18*mm, y_lbl - 3*mm)

    modules = [
        ("$",  "Dashboard",    "Metricas en tiempo real: ventas, ticket promedio, transacciones del dia.", colors.HexColor("#1D4ED8")),
        ("POS","Punto de Venta","Venta rapida con codigos PLU y busqueda por nombre o categoria.",         colors.HexColor("#DC2626")),
        ("P",  "Productos",    "Catalogo por categoria: Vacuno, Cerdo, Pollo, Achuras, Embutidos.",        colors.HexColor("#D97706")),
        ("%",  "Costos",       "Calcula margenes y costos por corte para maximizar rentabilidad.",         colors.HexColor("#059669")),
        ("C",  "Clientes",     "Base de datos con historial de compras por cliente.",                     colors.HexColor("#7C3AED")),
        ("P",  "Personal",     "Alta de empleados con permisos configurables por modulo.",                colors.HexColor("#DB2777")),
        ("C$", "Caja",         "Apertura, cierre y movimientos de caja diaria.",                          colors.HexColor("#0891B2")),
        ("R",  "Reportes",     "Estadisticas semanales, mensuales y ranking de productos.",               colors.HexColor("#65A30D")),
        ("U",  "Multi-usuario","Cada empleado accede solo a los modulos autorizados.",                    colors.HexColor("#EA580C")),
    ]

    cols = 3
    card_w2 = (W - 36*mm - (cols-1)*4*mm) / cols
    card_h2 = 26*mm
    gap_x = card_w2 + 4*mm
    gap_y = card_h2 + 4*mm
    start_x = 18*mm
    start_y = y_lbl - 8*mm - card_h2

    for i, (icon, title, desc, accent) in enumerate(modules):
        col2 = i % cols
        row2 = i // cols
        cx4 = start_x + col2 * gap_x
        cy4 = start_y - row2 * gap_y
        draw_module_card(c, cx4, cy4, card_w2, card_h2, icon, title, desc, accent)

    draw_page_footer(c, "2")
    c.showPage()

    # ══════════════════════════════════════════════════════════════════
    # PAGE 3 — POS PREVIEW + BENEFICIOS
    # ══════════════════════════════════════════════════════════════════
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    draw_section_header(c, "Por que elegir Carnify?",
                        "Beneficios concretos para tu negocio")

    # Left column: phone mockup + caption
    mock_w = 52*mm
    mock_h = 88*mm
    mock_x = 18*mm
    mock_y = H - 32*mm - mock_h - 10*mm
    draw_phone_mockup(c, mock_x, mock_y, mock_w, mock_h)
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(mock_x + mock_w/2, mock_y - 7*mm, "Punto de Venta")
    c.setFont("Helvetica", 8)
    c.setFillColor(MID_GRAY)
    c.drawCentredString(mock_x + mock_w/2, mock_y - 12*mm, "funciona desde el celular")

    # Right column: benefits
    bx3 = 82*mm
    by3 = H - 38*mm
    benefits = [
        (colors.HexColor("#DC2626"), "Venta mas rapida",
         "POS intuitivo. Menos errores en el mostrador. Mas clientes atendidos."),
        (colors.HexColor("#059669"), "Control total del negocio",
         "Sabe en tiempo real cuanto vendiste, que margen tenes y como esta la caja."),
        (colors.HexColor("#1D4ED8"), "Acceso desde cualquier dispositivo",
         "Computadora, celular o tablet. Revisa el negocio desde donde estes."),
        (colors.HexColor("#7C3AED"), "Actualizaciones automaticas",
         "Nuevas funciones sin costo extra ni interrupciones del servicio."),
        (colors.HexColor("#D97706"), "Soporte dedicado",
         "Asistencia por WhatsApp y email de lunes a viernes en horario comercial."),
        (colors.HexColor("#0891B2"), "Sin contratos largos",
         "Pago mensual. Cancelas cuando queres con 15 dias de aviso."),
    ]
    for i, (accent2, title2, desc2) in enumerate(benefits):
        item_y = by3 - i * 16*mm
        # accent circle
        c.setFillColor(accent2)
        c.circle(bx3 + 4*mm, item_y - 2*mm, 5, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(bx3 + 4*mm, item_y - 4.5*mm, str(i+1))
        # text
        c.setFillColor(DARK_GRAY)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(bx3 + 11*mm, item_y, title2)
        c.setFillColor(MID_GRAY)
        c.setFont("Helvetica", 8.5)
        c.drawString(bx3 + 11*mm, item_y - 5.5*mm, desc2)
        # separator
        c.setStrokeColor(LIGHT_GRAY)
        c.setLineWidth(0.5)
        c.line(bx3 + 11*mm, item_y - 10*mm, W - 18*mm, item_y - 10*mm)

    # ══ PRICING BOX ═══════════════════════════════════════════════════
    # Full-width gradient-like box at bottom
    pb_y = 18*mm
    pb_h = 42*mm

    # Shadow
    c.setFillColor(colors.HexColor("#CCCCCC"))
    c.roundRect(22*mm, pb_y - 1.5*mm, W - 44*mm, pb_h, 8, fill=1, stroke=0)
    # Main box
    c.setFillColor(DARK_RED)
    c.roundRect(20*mm, pb_y, W - 40*mm, pb_h, 8, fill=1, stroke=0)
    # Left accent panel
    c.setFillColor(colors.HexColor("#6B0000"))
    c.roundRect(20*mm, pb_y, (W - 40*mm)/2, pb_h, 8, fill=1, stroke=0)
    c.rect(20*mm + (W - 40*mm)/2 - 10, pb_y, 10, pb_h, fill=1, stroke=0)

    mid_x = 20*mm + (W - 40*mm)/2

    # Left panel: activation
    c.setFillColor(DARK_CREAM)
    c.setFont("Helvetica", 8)
    c.drawCentredString(mid_x/2 + 10*mm, pb_y + pb_h - 10*mm, "PAGO DE ACTIVACION")
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(mid_x/2 + 10*mm, pb_y + pb_h - 24*mm, "$ 150.000")
    c.setFillColor(DARK_CREAM)
    c.setFont("Helvetica", 8)
    c.drawCentredString(mid_x/2 + 10*mm, pb_y + pb_h - 33*mm, "pago unico al contratar")

    # Vertical divider
    c.setStrokeColor(colors.HexColor("#6B0000"))
    c.setLineWidth(1)
    c.line(mid_x, pb_y + 6*mm, mid_x, pb_y + pb_h - 6*mm)

    # Right panel: monthly
    c.setFillColor(DARK_CREAM)
    c.setFont("Helvetica", 8)
    c.drawCentredString(mid_x + (W - 40*mm)/4, pb_y + pb_h - 10*mm, "CUOTA MENSUAL")
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(mid_x + (W - 40*mm)/4, pb_y + pb_h - 24*mm, "$ 50.000")
    c.setFillColor(DARK_CREAM)
    c.setFont("Helvetica", 8)
    c.drawCentredString(mid_x + (W - 40*mm)/4, pb_y + pb_h - 33*mm, "por mes, todo incluido")

    draw_page_footer(c, "3")
    c.showPage()

    # ══════════════════════════════════════════════════════════════════
    # PAGE 4 — COMO EMPEZAR + CONTACTO
    # ══════════════════════════════════════════════════════════════════
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    draw_section_header(c, "Como empezar", "En 3 pasos tenes Carnify funcionando en tu carnicera")

    steps = [
        ("1", DARK_RED,                   "Contactanos",
         "Escribinos por WhatsApp o email. Te damos una demo gratuita del sistema."),
        ("2", colors.HexColor("#D97706"),  "Activacion",
         "Abonamos la activacion y configuramos tu carnicera: productos, precios, empleados."),
        ("3", colors.HexColor("#059669"),  "A vender",
         "En menos de 24 hs tu equipo ya puede operar con Carnify. Sin capacitacion compleja."),
    ]

    # Horizontal stepper
    step_y = H - 60*mm
    step_w = (W - 36*mm) / 3
    for i, (num, accent3, title3, desc3) in enumerate(steps):
        sx3 = 18*mm + i * step_w
        # Connector line
        if i < 2:
            c.setStrokeColor(LIGHT_GRAY)
            c.setLineWidth(1.5)
            c.setDash(4, 3)
            c.line(sx3 + step_w - 4*mm, step_y + 5*mm, sx3 + step_w + 4*mm, step_y + 5*mm)
            c.setDash()
        # Circle
        c.setFillColor(accent3)
        c.circle(sx3 + step_w/2, step_y + 5*mm, 12, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(sx3 + step_w/2, step_y + 1*mm, num)
        # Title
        c.setFillColor(DARK_GRAY)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(sx3 + step_w/2, step_y - 10*mm, title3)
        # Desc
        c.setFillColor(MID_GRAY)
        c.setFont("Helvetica", 8.5)
        wds = desc3.split()
        lns2, cur3 = [], ""
        for wd in wds:
            if len(cur3) + len(wd) + 1 <= 30:
                cur3 = (cur3 + " " + wd).strip()
            else:
                lns2.append(cur3)
                cur3 = wd
        if cur3:
            lns2.append(cur3)
        for j, ln3 in enumerate(lns2):
            c.drawCentredString(sx3 + step_w/2, step_y - 18*mm - j*5*mm, ln3)

    # ── CONTACT CARD ──────────────────────────────────────────────────
    cc_y = H - 60*mm - 80*mm
    c.setFillColor(WHITE)
    c.roundRect(18*mm, cc_y, W - 36*mm, 60*mm, 8, fill=1, stroke=0)
    c.setFillColor(DARK_RED)
    c.roundRect(18*mm, cc_y + 44*mm, W - 36*mm, 16*mm, 8, fill=1, stroke=0)
    c.rect(18*mm, cc_y + 44*mm, W - 36*mm, 8*mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(W/2, cc_y + 50*mm, "Contacto")

    # Avatar circle
    c.setFillColor(DARK_RED)
    c.circle(W/2, cc_y + 34*mm, 16, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W/2, cc_y + 29*mm, "F")

    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W/2, cc_y + 18*mm, "Franco Dellorsi")
    c.setFont("Helvetica", 9)
    c.setFillColor(MID_GRAY)
    c.drawCentredString(W/2, cc_y + 12*mm, "Desarrollador de Carnify")

    # Contact chips
    chip_items = [("@", "dellorsif@gmail.com", colors.HexColor("#DC2626")),
                  ("in", "carnify.app", DARK_RED)]
    chip_w = 64*mm
    total_chips_w = len(chip_items) * chip_w + (len(chip_items)-1)*6*mm
    chip_start = W/2 - total_chips_w/2
    for i, (ico, txt, col3) in enumerate(chip_items):
        cx5 = chip_start + i*(chip_w + 6*mm)
        c.setFillColor(col3)
        c.roundRect(cx5, cc_y + 3*mm, chip_w, 8*mm, 3, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(cx5 + 4*mm, cc_y + 6.5*mm, ico)
        c.setFont("Helvetica", 8)
        c.drawString(cx5 + 10*mm, cc_y + 6.5*mm, txt)

    # ── Demo offer banner ──────────────────────────────────────────────
    bn_y = cc_y - 20*mm
    c.setFillColor(colors.HexColor("#FEF3C7"))
    c.roundRect(18*mm, bn_y, W - 36*mm, 14*mm, 5, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#D97706"))
    c.setLineWidth(1)
    c.roundRect(18*mm, bn_y, W - 36*mm, 14*mm, 5, fill=0, stroke=1)
    c.setFillColor(colors.HexColor("#92400E"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W/2, bn_y + 8*mm, "DEMO GRATUITA — Sin compromiso")
    c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, bn_y + 3*mm, "Contactanos y te mostramos el sistema en vivo antes de decidir.")

    draw_page_footer(c, "4")
    c.showPage()
    c.save()
    print(f"Brochure saved: {path}")


# ═══════════════════════════════════════════════════════════════════════════════
# CONTRACT
# ═══════════════════════════════════════════════════════════════════════════════

def make_contract():
    path = os.path.join(OUTPUT_DIR, "carnify_contrato.pdf")
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=3*cm, rightMargin=3*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    styles = getSampleStyleSheet()
    sty_title = ParagraphStyle(
        "CTitle", parent=styles["Title"],
        fontSize=18, textColor=DARK_RED, spaceAfter=4,
        fontName="Helvetica-Bold", alignment=TA_CENTER,
    )
    sty_sub = ParagraphStyle(
        "CSub", parent=styles["Normal"],
        fontSize=10, textColor=MID_GRAY, alignment=TA_CENTER, spaceAfter=2,
    )
    sty_h1 = ParagraphStyle(
        "CH1", parent=styles["Heading2"],
        fontSize=11, textColor=DARK_RED, spaceBefore=14, spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    sty_body = ParagraphStyle(
        "CBody", parent=styles["Normal"],
        fontSize=10, textColor=DARK_GRAY, leading=16, alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    sty_field = ParagraphStyle(
        "CField", parent=styles["Normal"],
        fontSize=10, textColor=DARK_GRAY, leading=16,
    )

    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story.append(Paragraph("CARNIFY", sty_title))
    story.append(Paragraph("Contrato de Licencia de Uso de Software SaaS", sty_sub))
    story.append(Spacer(1, 2*mm))
    story.append(HRFlowable(width="100%", thickness=2, color=DARK_RED))
    story.append(Spacer(1, 6*mm))

    # ── Parties ──────────────────────────────────────────────────────────────
    parties_data = [
        ["PROVEEDOR", "CLIENTE"],
        [
            "Franco Dellorsi\nDesarrollador independiente\ncorreo: dellorsif@gmail.com",
            "[NOMBRE Y APELLIDO / RAZON SOCIAL]\nCUIT: ___________________________\nCorreo: _________________________"
        ],
    ]
    parties_table = Table(parties_data, colWidths=[(W - 6*cm) / 2, (W - 6*cm) / 2])
    parties_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), DARK_RED),
        ("TEXTCOLOR",    (0, 0), (-1, 0), WHITE),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 10),
        ("ALIGN",        (0, 0), (-1, 0), "CENTER"),
        ("FONTSIZE",     (0, 1), (-1, 1), 9),
        ("FONTNAME",     (0, 1), (-1, 1), "Helvetica"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [CREAM, CREAM]),
        ("BOX",          (0, 0), (-1, -1), 0.5, DARK_RED),
        ("INNERGRID",    (0, 0), (-1, -1), 0.5, LIGHT_GRAY),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 8*mm))

    # ── Clauses ──────────────────────────────────────────────────────────────
    clauses = [
        ("1. OBJETO",
         "El presente contrato tiene por objeto regular el acceso y uso del sistema de software "
         "denominado <b>Carnify</b>, plataforma SaaS (Software as a Service) de gestion integral para "
         "carnicencias, provista por el Proveedor mediante acceso remoto a traves de Internet."),

        ("2. DEFINICIONES",
         "<b>Carnify:</b> sistema de gestion en la nube que incluye los modulos de Dashboard, Punto de Venta, "
         "Productos, Costos, Clientes, Personal, Caja, Reportes y control multi-usuario.<br/>"
         "<b>Licencia:</b> derecho de uso no exclusivo, intransferible e indelegable otorgado al Cliente.<br/>"
         "<b>Organizacion:</b> la carniceria o comercio del Cliente que utiliza la plataforma."),

        ("3. PRECIO Y CONDICIONES DE PAGO",
         "3.1. <b>Activacion:</b> el Cliente abonara un pago unico de <b>$ 150.000 ARS</b> en concepto de activacion "
         "de cuenta, configuracion inicial y alta de la organizacion.<br/>"
         "3.2. <b>Canon mensual:</b> el Cliente abonara <b>$ 50.000 ARS</b> por mes calendario, "
         "en forma anticipada dentro de los primeros 5 (cinco) dias corridos de cada mes.<br/>"
         "3.3. El Proveedor podra ajustar el canon mensual con un preaviso minimo de 30 dias."),

        ("4. DURACION",
         "El contrato entra en vigencia en la fecha de pago de la activacion y se renueva automaticamente "
         "cada mes. Cualquiera de las partes podra resolverlo sin causa mediante notificacion fehaciente "
         "con <b>15 (quince) dias corridos</b> de anticipacion. El acceso se mantiene activo hasta "
         "la fecha de vencimiento del periodo abonado."),

        ("5. USO PERMITIDO",
         "La licencia se otorga exclusivamente para uso interno de la Organizacion del Cliente. "
         "Queda expresamente prohibido: (a) ceder, sublicenciar, revender o transferir el acceso; "
         "(b) intentar copiar, descompilar o realizar ingenieria inversa del software; "
         "(c) compartir credenciales con personas ajenas a la Organizacion."),

        ("6. SOPORTE TECNICO",
         "El Proveedor brindara soporte tecnico por WhatsApp y correo electronico en dias habiles "
         "de lunes a viernes de 9:00 a 18:00 hs (hora Argentina). "
         "El soporte cubre consultas de uso, incidencias de acceso y errores del sistema."),

        ("7. ACTUALIZACIONES",
         "Las actualizaciones, mejoras y nuevas funcionalidades de la plataforma estan incluidas "
         "en el canon mensual sin costo adicional. El Proveedor podra implementar actualizaciones "
         "sin previo aviso, procurando no interrumpir la disponibilidad del servicio."),

        ("8. SUSPENSION POR MORA",
         "En caso de falta de pago del canon mensual, el Proveedor podra suspender el acceso "
         "al sistema transcurridos <b>10 (diez) dias corridos</b> desde la fecha de vencimiento, "
         "previa notificacion al correo electronico del Cliente. La suspension no extingue la deuda."),

        ("9. PROTECCION DE DATOS",
         "El Proveedor no cedera, vendra ni transferira a terceros los datos del Cliente ni "
         "de sus clientes almacenados en la plataforma. Los datos se utilizan exclusivamente para "
         "prestar el servicio contratado."),

        ("10. LIMITACION DE RESPONSABILIDAD",
         "El Proveedor no sera responsable por perdidas de datos ocasionadas por fuerza mayor, "
         "fallas en la infraestructura de terceros (hosting, internet), cortes de suministro electrico "
         "u otras causas ajenas a su control. Se recomienda al Cliente realizar respaldos periodicos "
         "de informacion critica."),

        ("11. RESCISION",
         "Cualquiera de las partes podra rescindir el contrato de forma inmediata ante incumplimiento "
         "grave de la otra parte, previa notificacion con detalles del incumplimiento y otorgamiento "
         "de un plazo de 5 dias habiles para subsanarlo."),

        ("12. JURISDICCION Y LEY APLICABLE",
         "Para toda cuestion litigiosa derivada del presente contrato, las partes se someten a la "
         "jurisdiccion de los Tribunales Ordinarios de la Republica Argentina, renunciando a cualquier "
         "otro fuero que pudiera corresponderles."),
    ]

    for title, body in clauses:
        story.append(Paragraph(title, sty_h1))
        story.append(Paragraph(body, sty_body))

    # ── Signatures ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("FIRMAS", sty_h1))
    story.append(Spacer(1, 4*mm))

    col_w = (W - 6*cm - 1*cm) / 2
    sig_data = [
        ["PROVEEDOR", "CLIENTE"],
        ["\n\n\n___________________________", "\n\n\n___________________________"],
        ["Franco Dellorsi", "[Nombre del Cliente]"],
        ["Fecha: ___________________", "Fecha: ___________________"],
        ["Aclaracion: ______________", "Aclaracion: ______________"],
    ]
    sig_table = Table(sig_data, colWidths=[col_w, col_w])
    sig_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), DARK_RED),
        ("TEXTCOLOR",    (0, 0), (-1, 0), WHITE),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    story.append(sig_table)

    doc.build(story)
    print(f"Contract saved: {path}")


if __name__ == "__main__":
    make_brochure()
    make_contract()
    print("Done.")
