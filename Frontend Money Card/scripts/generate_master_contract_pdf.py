import os
import json
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    Preformatted, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header
        self.drawString(36, 762, "MONEY CARD — M0 V10 AUTHORITATIVE BACKEND API CONTRACT")
        self.drawRightString(576, 762, "DEVELOPER 2 HANDOFF")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 756, 576, 756)

        # Footer
        self.line(36, 42, 576, 42)
        self.drawString(36, 30, "CONFIDENTIAL — FOR BACKEND IMPLEMENTATION ONLY")
        self.drawRightString(576, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def escape_xml(text):
    if not text:
        return ""
    text = str(text)
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text

def build_pdf_from_markdown(md_content, output_pdf_path):
    print(f"Compiling PDF to: {output_pdf_path}")
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    cover_title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'),
        alignment=1, # Center
        spaceAfter=12
    )

    cover_subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#2563EB'),
        alignment=1,
        spaceAfter=24
    )

    cover_meta_style = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=14,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=6
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#1D4ED8'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'Heading3_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=3
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2.5
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor('#0F172A'),
        backColor=colors.HexColor('#F8FAFC'),
        borderPadding=4,
        spaceBefore=3,
        spaceAfter=5
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#1E293B')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#FFFFFF')
    )

    story = []
    lines = md_content.split('\n')
    in_code_block = False
    code_buffer = []
    in_table = False
    table_buffer = []

    def format_inline(text):
        text = escape_xml(text)
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        text = re.sub(r'`(.*?)`', r'<font face="Courier" color="#1E40AF"><b>\1</b></font>', text)
        return text

    def flush_table():
        if not table_buffer:
            return
        table_data = []
        for i, row in enumerate(table_buffer):
            cols = [c.strip() for c in row.strip('|').split('|')]
            if all(set(c).issubset({'-', ':', ' '}) for c in cols):
                continue # separator
            row_cells = []
            for c in cols:
                st = table_header_style if i == 0 else table_cell_style
                row_cells.append(Paragraph(format_inline(c), st))
            if row_cells:
                table_data.append(row_cells)
        
        if table_data:
            num_cols = max(len(r) for r in table_data)
            col_width = (doc.width) / max(num_cols, 1)
            t = Table(table_data, colWidths=[col_width]*num_cols)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#94A3B8')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(t)
            story.append(Spacer(1, 4))

    i = 0
    while i < len(lines):
        line = lines[i]

        if line.strip().startswith('```'):
            if in_code_block:
                code_text = escape_xml('\n'.join(code_buffer))
                if code_text.strip():
                    story.append(Preformatted(code_text, code_style))
                code_buffer = []
                in_code_block = False
            else:
                if in_table:
                    flush_table()
                    table_buffer = []
                    in_table = False
                in_code_block = True
                code_buffer = []
            i += 1
            continue

        if in_code_block:
            code_buffer.append(line)
            i += 1
            continue

        if '|' in line and line.strip().startswith('|'):
            in_table = True
            table_buffer.append(line)
            i += 1
            continue
        elif in_table:
            flush_table()
            table_buffer = []
            in_table = False

        stripped = line.strip()
        if not stripped:
            i += 1
            continue

        if stripped == '<!-- PAGEBREAK -->':
            story.append(PageBreak())
            i += 1
            continue

        if stripped.startswith('# '):
            story.append(Paragraph(format_inline(stripped[2:]), h1_style))
        elif stripped.startswith('## '):
            story.append(Paragraph(format_inline(stripped[3:]), h1_style))
        elif stripped.startswith('### '):
            story.append(Paragraph(format_inline(stripped[4:]), h2_style))
        elif stripped.startswith('#### '):
            story.append(Paragraph(format_inline(stripped[5:]), h3_style))
        elif stripped.startswith('- ') or stripped.startswith('* '):
            bullet_text = "&bull; " + format_inline(stripped[2:])
            story.append(Paragraph(bullet_text, bullet_style))
        elif stripped.startswith('> '):
            alert_text = format_inline(stripped[2:])
            story.append(Paragraph(f"<b>Note:</b> {alert_text}", body_style))
        elif stripped.startswith('---'):
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceAfter=4, spaceBefore=4))
        else:
            story.append(Paragraph(format_inline(stripped), body_style))

        i += 1

    if in_table:
        flush_table()

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully compiled master PDF: {output_pdf_path}")

if __name__ == '__main__':
    print("Master PDF builder loaded.")
