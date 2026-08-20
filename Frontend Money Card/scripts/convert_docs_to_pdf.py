import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted, PageBreak, KeepTogether
from reportlab.lib.units import inch

def escape_xml(text):
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text

def markdown_to_pdf(md_path, pdf_path):
    print(f"Converting: {md_path} -> {pdf_path}")
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#2563EB'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'Heading3_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#475569'),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0F172A'),
        backColor=colors.HexColor('#F1F5F9'),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#FFFFFF')
    )

    story = []
    lines = content.split('\n')
    in_code_block = False
    code_buffer = []
    in_table = False
    table_buffer = []

    def format_inline(text):
        text = escape_xml(text)
        # Bold
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        # Code
        text = re.sub(r'`(.*?)`', r'<font face="Courier" color="#2563EB">\1</font>', text)
        return text

    def flush_table():
        if not table_buffer:
            return
        table_data = []
        for i, row in enumerate(table_buffer):
            # parse columns
            cols = [c.strip() for c in row.strip('|').split('|')]
            if all(set(c).issubset({'-', ':', ' '}) for c in cols):
                continue # delimiter row
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
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(t)
            story.append(Spacer(1, 6))

    i = 0
    while i < len(lines):
        line = lines[i]

        # Code block toggle
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

        # Tables
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

        # Headings
        if stripped.startswith('# '):
            story.append(Paragraph(format_inline(stripped[2:]), title_style))
            story.append(Spacer(1, 4))
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
            p = Paragraph(f"<b>Note:</b> {alert_text}", body_style)
            story.append(p)
        elif stripped.startswith('---'):
            story.append(Spacer(1, 6))
        else:
            story.append(Paragraph(format_inline(stripped), body_style))

        i += 1

    if in_table:
        flush_table()

    doc.build(story)
    print(f"Generated PDF: {pdf_path}")

if __name__ == '__main__':
    handoff_dir = os.path.join(os.getcwd(), 'developer-2-handoff-pack')
    md_files = [
        'DEVELOPER_2_HANDOFF.md',
        'API_CONTRACT_TEST_REPORT.md',
        'COMPLETE_ENDPOINT_INVENTORY.md',
        'API_CONTRACT_GAPS.md',
        'README.md'
    ]

    for md_file in md_files:
        md_full = os.path.join(handoff_dir, md_file)
        pdf_name = os.path.splitext(md_file)[0] + '.pdf'
        pdf_full = os.path.join(handoff_dir, pdf_name)
        if os.path.exists(md_full):
            markdown_to_pdf(md_full, pdf_full)
