# -*- coding: utf-8 -*-
"""
MONEY CARD — COMPLETE SYSTEM WORKFLOW & ARCHITECTURE REFERENCE
Publication-grade technical reference document generated via ReportLab.
Covers all 36 distinct architectural and business workflow sections.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted, HRFlowable
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
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))
        # Header
        self.drawString(36, 758, "MONEY CARD SYSTEM")
        self.setFont("Helvetica", 7.5)
        self.drawString(135, 758, "|   Complete System Workflow & Architecture Reference")
        self.drawRightString(576, 758, "M0 V10 Multi-Tenant Specification")
        
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)
        
        # Footer
        self.line(36, 42, 576, 42)
        self.setFont("Helvetica", 7.5)
        self.drawString(36, 30, "Confidential — Internal Engineering, Architecture & QA Reference")
        self.drawRightString(576, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf():
    output_filename = "MoneyCard_Complete_System_Workflow.pdf"
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46,
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_LEFT,
        spaceAfter=6,
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569"),
        alignment=TA_LEFT,
        spaceAfter=15,
    )
    
    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )
    
    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    h3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True,
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
        alignment=TA_LEFT,
        spaceAfter=5,
    )

    body_bold = ParagraphStyle(
        'CustomBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold',
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3,
    )
    
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1e293b"),
    )
    
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0f172a"),
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#ffffff"),
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.8,
        leading=9,
        textColor=colors.HexColor("#38bdf8"),
    )

    def make_callout(text, title="IMPORTANT ARCHITECTURAL RULE", border_color="#6366f1", bg_color="#f8fafc", width=540):
        t_style = ParagraphStyle('CalloutT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor(border_color), spaceAfter=2)
        b_style = ParagraphStyle('CalloutB', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=colors.HexColor("#334155"))
        content = [Paragraph(f"<b>{title}</b>", t_style), Paragraph(text, b_style)]
        t = Table([[content]], colWidths=[width])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
            ('LINELEFT', (0,0), (-1,-1), 3, colors.HexColor(border_color)),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        return t

    def make_diagram(text, title=None, width=540):
        t_style = ParagraphStyle('DiagT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.HexColor("#94a3b8"), spaceAfter=3)
        flowables = []
        if title:
            flowables.append(Paragraph(f"FLOW / ARCHITECTURE: {title.upper()}", t_style))
        flowables.append(Preformatted(text, code_style))
        t = Table([[flowables]], colWidths=[width])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0f172a")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#1e293b")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        return t

    story = []

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 15))
    
    # Header Banner Card
    banner_content = [
        Paragraph("<font color='#a5b4fc'><b>ENTERPRISE SYSTEM SPECIFICATION & WORKFLOW BLUEPRINT</b></font>", ParagraphStyle('CoverBadge', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor("#a5b4fc"), spaceAfter=6)),
        Paragraph("MONEY CARD SYSTEM", ParagraphStyle('BannerTitle', fontName='Helvetica-Bold', fontSize=26, leading=30, textColor=colors.white, spaceAfter=4)),
        Paragraph("COMPLETE SYSTEM WORKFLOW & TECHNICAL ARCHITECTURE", ParagraphStyle('BannerSub', fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=colors.HexColor("#e2e8f0"), spaceAfter=8)),
        Paragraph("End-to-End Workflow Reference: Super Admin • Organization Admin • Staff Flutter App • Backend • PostgreSQL", ParagraphStyle('BannerDesc', fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor("#94a3b8"))),
    ]
    banner_table = Table([[banner_content]], colWidths=[540])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0f172a")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1e293b")),
        ('TOPPADDING', (0,0), (-1,-1), 22),
        ('BOTTOMPADDING', (0,0), (-1,-1), 22),
        ('LEFTPADDING', (0,0), (-1,-1), 20),
        ('RIGHTPADDING', (0,0), (-1,-1), 20),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 15))

    # Metadata Grid
    meta_data = [
        [
            Paragraph("<b>Document Version:</b> 1.0.0 (Release Candidate)", table_cell),
            Paragraph("<b>Specification:</b> Damien M0 V10 Multi-Tenant Audited", table_cell),
        ],
        [
            Paragraph("<b>Release Date:</b> August 19, 2026", table_cell),
            Paragraph("<b>Target Audience:</b> Developers, Testers, Management, DevOps", table_cell),
        ],
        [
            Paragraph("<b>Client Applications:</b> React Web Portal + Flutter Android Staff POS", table_cell),
            Paragraph("<b>Core Services:</b> Node.js/TypeScript REST API + PostgreSQL 5432 (Prisma)", table_cell),
        ],
        [
            Paragraph("<b>Security Standard:</b> JWT (15m Access / 7d Refresh) + Cryptographic QR", table_cell),
            Paragraph("<b>Isolation Model:</b> Strict Multi-Tenant Organization & Branch Partitioning", table_cell),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Executive Abstract Callout
    story.append(make_callout(
        "This technical document provides the authoritative, exhaustive end-to-end architectural and operational specification for the Money Card platform. It details all user roles, state lifecycles, cryptographic QR token resolution, dynamic card session accounting, double-entry financial streams (CASH and manual UPI), multi-tenant isolation barriers, automated API contracts (58 endpoints), and hybrid Mock/Real API operational modes. No functionality described herein is speculative; all workflows correspond strictly to the production codebase and M0 V10 shared contract.",
        title="EXECUTIVE SUMMARY & OPERATIONAL MANDATE",
        border_color="#0ea5e9",
        bg_color="#f0f9ff"
    ))
    story.append(Spacer(1, 10))

    # Document Structure Overview Table (Table of Contents)
    story.append(Paragraph("DOCUMENT TABLE OF CONTENTS & SECTION INDEX", h2_style))
    
    toc_data = [
        [
            Paragraph("<b>SECTION</b>", table_header),
            Paragraph("<b>DOMAIN & TITLE</b>", table_header),
            Paragraph("<b>SECTION</b>", table_header),
            Paragraph("<b>DOMAIN & TITLE</b>", table_header),
        ],
        [
            Paragraph("<b>01</b>", table_cell_bold), Paragraph("System Overview & Architecture", table_cell),
            Paragraph("<b>19</b>", table_cell_bold), Paragraph("Analytics Engine (Platform vs Tenant)", table_cell),
        ],
        [
            Paragraph("<b>02</b>", table_cell_bold), Paragraph("User Roles & Responsibilities", table_cell),
            Paragraph("<b>20</b>", table_cell_bold), Paragraph("Analytics PDF Export Workflow", table_cell),
        ],
        [
            Paragraph("<b>03</b>", table_cell_bold), Paragraph("Authentication & Token Lifecycle", table_cell),
            Paragraph("<b>21</b>", table_cell_bold), Paragraph("Bill & Receipt PDF Engine", table_cell),
        ],
        [
            Paragraph("<b>04</b>", table_cell_bold), Paragraph("Organization Creation & Onboarding", table_cell),
            Paragraph("<b>22</b>", table_cell_bold), Paragraph("Permission Enforcement & RBAC", table_cell),
        ],
        [
            Paragraph("<b>05</b>", table_cell_bold), Paragraph("Org Admin Management Workflow", table_cell),
            Paragraph("<b>23</b>", table_cell_bold), Paragraph("Organization Isolation Security", table_cell),
        ],
        [
            Paragraph("<b>06</b>", table_cell_bold), Paragraph("Staff Management & 20 Permissions", table_cell),
            Paragraph("<b>24</b>", table_cell_bold), Paragraph("Error, Loading & Empty States", table_cell),
        ],
        [
            Paragraph("<b>07</b>", table_cell_bold), Paragraph("Branch Hierarchy & Isolation", table_cell),
            Paragraph("<b>25</b>", table_cell_bold), Paragraph("Mock API Dual-Engine Mode", table_cell),
        ],
        [
            Paragraph("<b>08</b>", table_cell_bold), Paragraph("Product / Catalog Administration", table_cell),
            Paragraph("<b>26</b>", table_cell_bold), Paragraph("Real API Integration & LAN Setup", table_cell),
        ],
        [
            Paragraph("<b>09</b>", table_cell_bold), Paragraph("Physical Card State Lifecycle", table_cell),
            Paragraph("<b>27</b>", table_cell_bold), Paragraph("Master End-to-End Business Flow", table_cell),
        ],
        [
            Paragraph("<b>10</b>", table_cell_bold), Paragraph("QR Scanning & Token Resolution", table_cell),
            Paragraph("<b>28</b>", table_cell_bold), Paragraph("Core Entity Data Flows & Schema", table_cell),
        ],
        [
            Paragraph("<b>11</b>", table_cell_bold), Paragraph("New Card Issuance & Registration", table_cell),
            Paragraph("<b>29</b>", table_cell_bold), Paragraph("Frontend/Backend Shared Contract", table_cell),
        ],
        [
            Paragraph("<b>12</b>", table_cell_bold), Paragraph("Active Card Operational Hub", table_cell),
            Paragraph("<b>30</b>", table_cell_bold), Paragraph("Local Development Workflow", table_cell),
        ],
        [
            Paragraph("<b>13</b>", table_cell_bold), Paragraph("Session Lifecycle & Accounting", table_cell),
            Paragraph("<b>31</b>", table_cell_bold), Paragraph("Integration & Cross-Platform Tests", table_cell),
        ],
        [
            Paragraph("<b>14</b>", table_cell_bold), Paragraph("POS Cart Checkout & Inventory", table_cell),
            Paragraph("<b>32</b>", table_cell_bold), Paragraph("Production Deployment Topology", table_cell),
        ],
        [
            Paragraph("<b>15</b>", table_cell_bold), Paragraph("Cash Recharge & Settlement", table_cell),
            Paragraph("<b>33</b>", table_cell_bold), Paragraph("Hardware Ecosystem & Future Roadmap", table_cell),
        ],
        [
            Paragraph("<b>16</b>", table_cell_bold), Paragraph("UPI Recharge (Store Static QR)", table_cell),
            Paragraph("<b>34</b>", table_cell_bold), Paragraph("Complete State Transition Machines", table_cell),
        ],
        [
            Paragraph("<b>17</b>", table_cell_bold), Paragraph("Refund & Session Return Workflow", table_cell),
            Paragraph("<b>35</b>", table_cell_bold), Paragraph("Role Responsibility Matrix Table", table_cell),
        ],
        [
            Paragraph("<b>18</b>", table_cell_bold), Paragraph("Branch Inventory Movements", table_cell),
            Paragraph("<b>36</b>", table_cell_bold), Paragraph("Final Unified Architecture Summary", table_cell),
        ],
    ]
    toc_table = Table(toc_data, colWidths=[24, 246, 24, 246])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: SYSTEM OVERVIEW & ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("SECTION 1 — SYSTEM OVERVIEW & ARCHITECTURE", h1_style))
    story.append(Paragraph(
        "The Money Card platform is a multi-tenant, cloud-enabled closed-loop smart card and Point of Sale (POS) ecosystem designed for commercial food courts, corporate cafeterias, university dining halls, and multi-branch retail environments. The system replaces cash transactions at merchant counters with temporary, prepaid physical QR cards, providing microsecond checkout speeds, zero internet dependency at customer checkout points, and mathematical reconciliation across branches.",
        body_style
    ))
    
    diag_s1 = """
                        MONEY CARD CLOUD PLATFORM ARCHITECTURE

                                 +-----------------------+
                                 |  PostgreSQL Database  |  (Relational Ledger, Multi-Tenant Tables)
                                 +-----------------------+
                                             ^
                                             |  (ACID Transactions, Type-Safe SQL)
                                 +-----------------------+
                                 |   Prisma ORM Engine   |  (Schema Migrations, $transaction Blocks)
                                 +-----------------------+
                                             ^
                                             |
                                 +-----------------------+
                                 | Backend REST Service  |  (Express/Node.js, /api/v1 Endpoints,
                                 |  (Source of Truth)    |   JWT Authentication, RBAC Guard)
                                 +-----------------------+
                                      ^             ^
                    (HTTPS /api/v1)   |             |   (HTTPS /api/v1 via Dio Client)
             +------------------------+             +------------------------+
             |                                                               |
+--------------------------+                                   +--------------------------+
|  React Admin Web Portal  |                                   |  Flutter Staff POS App   |
| (Super Admin & Org Admin)|                                   | (Android Tablets/Phones) |
+--------------------------+                                   +--------------------------+
| * Multi-Tenant Overview  |                                   | * Optical QR Scanner     |
| * Organization & Plans   |                                   | * Active Card Hub        |
| * Catalog Admin (Prices) |                                   | * POS Cart Checkout      |
| * Staff & Branch Provision|                                  | * Cash / Manual UPI Load |
| * Formal PDF Analytics   |                                   | * Customer Refund/Return |
+--------------------------+                                   +--------------------------+
"""
    story.append(make_diagram(diag_s1, title="Multi-Tier Enterprise System Architecture"))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Core Tier Breakdown & Operational Roles:", h2_style))
    s1_tiers = [
        ("PostgreSQL (Port 5432):", "The authoritative ACID relational data store. Stores immutable financial ledgers, tenant organizations, branch hierarchies, catalog items, physical card mappings, active card sessions, inventory balances, and cryptographically signed audit logs."),
        ("Prisma ORM Layer:", "Provides schema definition, migration management, and type-safe query execution. Critical financial operations (such as POS purchases and card settlement) utilize Prisma atomic <code>$transaction</code> blocks to guarantee zero partial-state writes."),
        ("Backend RESTful Service (/api/v1):", "The single source of truth for the entire platform. Handles JWT authentication, RBAC authorization, organization/branch isolation enforcement, business logic execution, and financial calculation validation."),
        ("React Admin Web Portal:", "Browser-based management interface built with Vite, TypeScript, and Tailwind CSS. Serves Super Admin (platform-wide oversight) and Organization Admin (tenant management, branch network, staff provisioning, catalog creation, PDF analytics)."),
        ("Flutter Staff Mobile Application:", "High-performance Android POS client built with Flutter, Riverpod, and Dio. Designed for fast counter operations: optical QR card scanning, balance inquiries, product cart selection, cash/UPI recharges, and card settlement."),
    ]
    for name, desc in s1_tiers:
        story.append(Paragraph(f"• <b>{name}</b> {desc}", bullet_style))
    
    story.append(Spacer(1, 4))
    story.append(make_callout(
        "<b>Architectural Rule: Single Source of Truth & Zero Peer-to-Peer Communication.</b> The React Web Portal and Flutter Staff POS Application never communicate directly with each other. Both clients interact strictly as stateless HTTP consumers with the Node.js/Prisma backend over the unified <code>/api/v1</code> contract. The backend database is the sole authoritative state machine for card balances, inventory stock, and session validity.",
        title="CORE ARCHITECTURAL INVARIANT",
        border_color="#6366f1"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 2: USER ROLES & ACTOR PROFILES
    # =========================================================================
    story.append(Paragraph("SECTION 2 — USER ROLES & ACTOR PROFILES", h1_style))
    story.append(Paragraph(
        "The Money Card system implements a Role-Based Access Control (RBAC) model defining four distinct actors. Each role operates within strict cryptographic boundaries and functional scopes.",
        body_style
    ))

    roles_data = [
        [
            Paragraph("<b>ROLE</b>", table_header),
            Paragraph("<b>ACTOR SCOPE</b>", table_header),
            Paragraph("<b>PRIMARY APPLICATION</b>", table_header),
            Paragraph("<b>CORE RESPONSIBILITIES & PERMITTED OPERATIONS</b>", table_header),
        ],
        [
            Paragraph("<b>SUPER_ADMIN</b>", table_cell_bold),
            Paragraph("Platform-Wide<br/>(Global Multi-Tenant)", table_cell),
            Paragraph("React Web Admin<br/><code>/admin/*</code>", table_cell),
            Paragraph("Creates tenant organizations, provisions initial Org Admin credentials, manages global subscription plan tiers, monitors gateway subscription payments, reviews plan change requests, and exports platform-wide 3-page PDF analytics.", table_cell),
        ],
        [
            Paragraph("<b>ORG_ADMIN</b>", table_cell_bold),
            Paragraph("Tenant Scope<br/>(Single Organization)", table_cell),
            Paragraph("React Web Admin<br/><code>/portal/*</code>", table_cell),
            Paragraph("Manages tenant branches, creates staff accounts, assigns granular permissions, creates product catalog items and prices, oversees branch inventory stock levels, tracks multi-branch performance, and exports organization PDF reports.", table_cell),
        ],
        [
            Paragraph("<b>STAFF</b>", table_cell_bold),
            Paragraph("Branch Scope<br/>(Assigned Branches)", table_cell),
            Paragraph("Flutter Android App<br/><code>Mobile POS</code>", table_cell),
            Paragraph("Performs counter operations: scans customer QR cards, activates card sessions, builds POS shopping carts from existing branch products, executes recharges (Cash / manual UPI), processes refunds and card returns, and adjusts inventory (if permitted).", table_cell),
        ],
        [
            Paragraph("<b>USER (Public)</b>", table_cell_bold),
            Paragraph("Cardholder Scope<br/>(Session Token)", table_cell),
            Paragraph("Public Web Portal<br/><code>/c/:token</code>", table_cell),
            Paragraph("Unauthenticated customer view: resolves physical card QR token to display live remaining card balance, active session duration, detailed itemized transaction history, and digital sales receipts.", table_cell),
        ],
    ]
    roles_table = Table(roles_data, colWidths=[65, 80, 85, 310])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(roles_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 3: AUTHENTICATION & TOKEN LIFECYCLE WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 3 — AUTHENTICATION WORKFLOW & TOKEN LIFECYCLE", h1_style))
    story.append(Paragraph(
        "Authentication across all client applications utilizes a dual-token JSON Web Token (JWT) architecture. Credentials are validated against bcrypt-hashed passwords stored in PostgreSQL. The platform supports dedicated login workflows for Super Admin, Organization Admin, and Counter Staff, each routing to their respective authorization scopes.",
        body_style
    ))

    diag_s3 = """
                  SUPER ADMIN & MULTI-ROLE LOGIN & TOKEN ROTATION FLOW

  Actor / Client                       Backend API (/api/v1)                PostgreSQL Database
        |                                       |                                    |
  1. SUPER ADMIN LOGIN                          |                                    |
     - Web UI: /login                           |                                    |
     - Credentials:                             |                                    |
       { email, password } -------------------->|                                    |
        |                                       |--- Validate Credentials (bcrypt) ->|
        |                                       |<-- User: role='SUPER_ADMIN',       |
        |                                       |          orgId=NULL, perms=[ALL] --|
        |                                       |                                    |
        |<-- 200 OK (accessToken, refreshToken)-|                                    |
        |                                       |                                    |
  2. Role Routing & Authorization               |                                    |
     - Store tokens in sessionStorage           |                                    |
     - AuthContext sets role = SUPER_ADMIN      |                                    |
     - Redirect to /admin/dashboard             |                                    |
     - Unlocks: Organizations, Global Plans,    |                                    |
       Subscriptions, Platform Analytics        |                                    |
        |                                       |                                    |
  3. API Operations                             |                                    |
     - GET /admin/organizations (Bearer JWT) -->|--- Verify JWT & SUPER_ADMIN claim -|
        |<-- 200 OK (Platform Dataset) ---------|<-- Return All Platform Orgs -------|
        |                                       |                                    |
  4. Token Expiry (15 mins) & Silent Refresh    |                                    |
     - POST /auth/refresh (refreshToken) ------>|--- Rotate & Validate Session Hash -|
        |<-- 200 OK (New Token Pair Issued) ----|<-- Issue Rotated Token Pair -------|
"""
    story.append(make_diagram(diag_s3, title="Super Admin & Multi-Role Login Sequence"))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Dedicated Login Workflows by Actor Role:", h2_style))
    
    login_flows_data = [
        [
            Paragraph("<b>USER ROLE</b>", table_header),
            Paragraph("<b>ACCESS CLIENT</b>", table_header),
            Paragraph("<b>CREDENTIALS & TOKEN PAYLOAD</b>", table_header),
            Paragraph("<b>POST-LOGIN ROUTING & SCOPE UNLOCKED</b>", table_header),
        ],
        [
            Paragraph("<b>SUPER_ADMIN</b>", table_cell_bold),
            Paragraph("React Web Admin<br/><code>/login</code>", table_cell),
            Paragraph("Platform email + password.<br/>JWT Payload: <code>role: 'SUPER_ADMIN'</code>, <code>organizationId: null</code> (Global Scope).", table_cell),
            Paragraph("Redirects immediately to <code>/admin/dashboard</code>. Unlocks platform-wide management: Create Organizations, Global Plans, Subscriptions, Platform Analytics, and Settings.", table_cell),
        ],
        [
            Paragraph("<b>ORG_ADMIN</b>", table_cell_bold),
            Paragraph("React Web Admin<br/><code>/login</code>", table_cell),
            Paragraph("Tenant admin email + password.<br/>JWT Payload: <code>role: 'ORG_ADMIN'</code>, <code>organizationId: '&lt;org-id&gt;'</code>.", table_cell),
            Paragraph("Redirects to <code>/portal/dashboard</code>. Scoped strictly to their single organization: Branches, Staff, Products, Cards, Inventory, and Tenant Analytics.", table_cell),
        ],
        [
            Paragraph("<b>STAFF</b>", table_cell_bold),
            Paragraph("Flutter Mobile App<br/><code>Login Screen</code>", table_cell),
            Paragraph("Staff email + password.<br/>JWT Payload: <code>role: 'STAFF'</code>, <code>assignedBranchIds: [...]</code>, <code>permissions: [...]</code>.", table_cell),
            Paragraph("Redirects to Mobile POS Counter Hub. Unlocks active branch selector, QR card scanner, POS cart checkout, Cash/UPI recharge, and card settlements.", table_cell),
        ],
    ]
    login_flows_table = Table(login_flows_data, colWidths=[80, 85, 175, 200])
    login_flows_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(login_flows_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Token Storage, Expiry & Route Protection:", h2_style))
    auth_specs = [
        ("Super Admin Route Protection:", "React Router enforces <code>RoleGuard(['SUPER_ADMIN'])</code> on all <code>/admin/*</code> routes. Unauthorized attempts by unauthenticated users redirect to <code>/login</code>; attempts by Org Admins or Staff yield HTTP 403 Forbidden."),
        ("Access Token Lifetime:", "15 Minutes. Encodes user UUID, role, organizationId, assignedBranchIds, and permission string array. Cryptographically signed using HMAC-SHA256 (HS256)."),
        ("Refresh Token Lifetime:", "7 Days. Opaque cryptographically random string stored as a SHA-256 hash in the database. Rotated on every single refresh invocation to prevent replay attacks."),
        ("Flutter Mobile Storage:", "Stored securely via <code>flutter_secure_storage</code> utilizing Android EncryptedSharedPreferences (backed by Hardware Keystore) and iOS Keychain Services."),
        ("Web Browser Storage:", "Stored in memory / <code>sessionStorage</code> with automatic silent refresh interceptors managed via Axios request/response middleware."),
        ("Automatic Session Invalidation:", "Calling <code>POST /api/v1/auth/logout</code> immediately blacklists and deletes the refresh token session from PostgreSQL, rendering all active client sessions invalid."),
    ]
    for name, desc in auth_specs:
        story.append(Paragraph(f"• <b>{name}</b> {desc}", bullet_style))
    story.append(Spacer(1, 8))
    # SECTION 4: ORGANIZATION CREATION & ONBOARDING WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 4 — ORGANIZATION CREATION & ONBOARDING WORKFLOW", h1_style))
    story.append(Paragraph(
        "Tenant onboarding is strictly governed by Super Admin. Organizations are provisioned alongside an initial Organization Admin account and subscription tier assignment within an atomic transaction.",
        body_style
    ))

    diag_s4 = """
                     ORGANIZATION CREATION & ONBOARDING SEQUENCE

Super Admin (Web UI)                      Backend (API Gateway)                     PostgreSQL
        |                                           |                                   |
        |-- 1. Fills 4 Required Onboarding Fields ->|                                   |
        |      - Organization Name (e.g. 'XYZ Foods')                                   |
        |      - Initial Admin Email                |                                   |
        |      - Password (min 8 chars)             |                                   |
        |      - Subscription Plan ID               |                                   |
        |                                           |                                   |
        |-- 2. POST /api/v1/admin/organizations --->|                                   |
        |                                           |-- 3. BEGIN Prisma $transaction -->|
        |                                           |      a. Create Organization Record|
        |                                           |      b. Hash Password & Create    |
        |                                           |         User (Role: ORG_ADMIN)    |
        |                                           |      c. Assign Frozen Permissions |
        |                                           |      d. Provision Subscription    |
        |                                           |-- 4. COMMIT Transaction --------->|
        |<-- 5. 201 Created Response (res.data.name)|                                   |
        |                                           |                                   |
        |-- 6. Toast: '[Organization Name] has been created'                           |
"""
    story.append(make_diagram(diag_s4, title="Atomic Tenant Organization Provisioning"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Mandatory UI Success Toast Format:</b> Upon successful creation, the frontend MUST display the dynamic confirmation: <code>'[Organization Name] has been created'</code> (e.g. <i>'XYZ Foods has been created'</i>). Generic messages such as <i>'Organization created successfully'</i> or hardcoded names are strictly prohibited by the M0 specification.",
        title="SPECIFICATION RULE: DYNAMIC ONBOARDING NOTIFICATION",
        border_color="#059669",
        bg_color="#f0fdf4"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 5: ORG ADMIN WORKFLOW & TENANT ISOLATION
    # =========================================================================
    story.append(Paragraph("SECTION 5 — ORG ADMIN WORKFLOW & TENANT BOUNDARY", h1_style))
    story.append(Paragraph(
        "Once onboarded, the Organization Admin manages their enterprise across seven operational modules: Dashboard Overview, Branch Management, Staff Administration, Product Catalog, Inventory Control, Physical Cards, and Tenant Analytics. Every database query executed by an Org Admin is scoped by the authenticated JWT claim <code>WHERE organizationId = :tenantId</code>.",
        body_style
    ))

    s5_modules = [
        ("Dashboard Overview:", "Real-time KPI cards displaying Total POS Revenue, Wallet Recharge Volume, Net Transactions, and Active Card Sessions across all permitted branches."),
        ("Branch Management:", "Creates operational branches (e.g., 'Downtown Food Court', 'Campus Kiosk'), updates operational status (ACTIVE / INACTIVE), and configures location metadata."),
        ("Staff Administration:", "Provisions staff accounts, sets login credentials, maps staff members to one or more physical branches, and toggles granular operational permissions."),
        ("Product Catalog Administration:", "Defines product catalog items, multi-select categories (e.g., ['Fast Food', 'Beverages']), and retail prices. Prices defined here are strictly authoritative."),
        ("Branch Inventory Oversight:", "Monitors physical stock counts per product per branch. Identifies low-stock items and performs manual quantity adjustments with audited reason codes."),
        ("Card & Session Oversight:", "Views pre-printed physical card inventory, tracks active customer sessions, and audits transaction ledgers."),
        ("Organization PDF Analytics:", "Generates and downloads formal, multi-page PDF analytics reports filtered by branch and custom date ranges."),
    ]
    for mod_title, mod_desc in s5_modules:
        story.append(Paragraph(f"• <b>{mod_title}</b> {mod_desc}", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 6: STAFF MANAGEMENT & THE FROZEN 20 PERMISSIONS MODEL
    # =========================================================================
    story.append(Paragraph("SECTION 6 — STAFF MANAGEMENT & FROZEN 20 PERMISSIONS MODEL", h1_style))
    story.append(Paragraph(
        "Staff members are provisioned by the Organization Admin. Access control is strictly decoupled from job titles and enforced through a frozen list of exactly 20 granular permissions defined in M0 Section 3.",
        body_style
    ))

    perm_data = [
        [
            Paragraph("<b>DOMAIN</b>", table_header),
            Paragraph("<b>PERMISSION CODE</b>", table_header),
            Paragraph("<b>FUNCTIONAL DESCRIPTION & PERMITTED ACTION</b>", table_header),
        ],
        [Paragraph("<b>Card Operations</b>", table_cell_bold), Paragraph("<code>CARD_VIEW</code>", table_cell), Paragraph("View card details, physical numbers, and QR registration status.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>CARD_ISSUE</code>", table_cell), Paragraph("Issue new physical cards and register unmapped QR codes.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>CARD_RETURN</code>", table_cell), Paragraph("Process customer card returns, calculate refund balances, and reset cards.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>CARD_BLOCK</code>", table_cell), Paragraph("Mark compromised or lost cards as BLOCKED.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>CARD_UNBLOCK</code>", table_cell), Paragraph("Restore BLOCKED cards back to AVAILABLE status.", table_cell)],
        [Paragraph("<b>Sessions & Payments</b>", table_cell_bold), Paragraph("<code>RECHARGE</code>", table_cell), Paragraph("Credit active card balances via Cash or manual UPI deposit.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>PURCHASE</code>", table_cell), Paragraph("Process POS checkout and deduct product costs from active sessions.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>REFUND</code>", table_cell), Paragraph("Execute transaction reversals and remaining balance cash refunds.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>SESSION_VIEW</code>", table_cell), Paragraph("Inspect active session balances, durations, and ledger records.", table_cell)],
        [Paragraph("<b>Products & Inventory</b>", table_cell_bold), Paragraph("<code>PRODUCT_VIEW</code>", table_cell), Paragraph("Browse and search catalog products within assigned branches.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>PRODUCT_MANAGE</code>", table_cell), Paragraph("Create and edit catalog products and prices (Admin portal only).", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>INVENTORY_VIEW</code>", table_cell), Paragraph("View branch stock levels, quantities, and low stock alert states.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>INVENTORY_MANAGE</code>", table_cell), Paragraph("Adjust inventory quantities and log stock movements.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>INVENTORY_IMPORT</code>", table_cell), Paragraph("Bulk import inventory stock via 3-column CSV spreadsheet.", table_cell)],
        [Paragraph("<b>Analytics & Reports</b>", table_cell_bold), Paragraph("<code>VIEW_ANALYTICS</code>", table_cell), Paragraph("Access operational transaction metrics and branch comparison charts.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>VIEW_REPORTS</code>", table_cell), Paragraph("Generate and download formal PDF business reports.", table_cell)],
        [Paragraph("<b>Staff & Organization</b>", table_cell_bold), Paragraph("<code>STAFF_VIEW</code>", table_cell), Paragraph("List organization staff members and branch assignments.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>STAFF_MANAGE</code>", table_cell), Paragraph("Create staff, update assignments, and modify permission sets.", table_cell)],
        [Paragraph("<b>Branch Network</b>", table_cell_bold), Paragraph("<code>BRANCH_VIEW</code>", table_cell), Paragraph("List branch locations and inspect operational status.", table_cell)],
        [Paragraph("", table_cell), Paragraph("<code>BRANCH_MANAGE</code>", table_cell), Paragraph("Create branches and update branch operational parameters.", table_cell)],
    ]
    perm_table = Table(perm_data, colWidths=[95, 120, 325])
    perm_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(perm_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 7: BRANCH HIERARCHY & BRANCH ISOLATION WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 7 — BRANCH HIERARCHY & BRANCH ISOLATION WORKFLOW", h1_style))
    story.append(Paragraph(
        "Organizations operate as multi-branch networks. Staff members are explicitly mapped to one or more permitted branches. The system enforces branch isolation at both the frontend routing level and the authoritative backend middleware level.",
        body_style
    ))

    diag_s7 = """
                          BRANCH ISOLATION & ACCESS CONTROL MODEL

                    Organization: 'Metro Cafeterias' (Org ID: org-101)
                     |                                       |
          +----------+----------+                 +----------+----------+
          |  Branch A: Central  |                 |  Branch B: Airport  |
          |  (Branch ID: br-A)  |                 |  (Branch ID: br-B)  |
          +---------------------+                 +---------------------+
                     ^                                       ^
                     | Assigned                             | Assigned
          +---------------------+                 +---------------------+
          |   Staff Member 1    |                 |   Staff Member 2    |
          | (assignedBranch: A) |                 | (assignedBranch: B) |
          +---------------------+                 +---------------------+
                     |                                       |
    [Staff 1 -> Scan Card @ Branch A]       [Staff 1 -> Attempts Action @ Branch B]
                   |                                       |
           Allowed (200 OK)                   REJECTED (403 BRANCH_ACCESS_DENIED)
"""
    story.append(make_diagram(diag_s7, title="Branch Authorization Partitioning"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Dual-Layer Security Guard:</b> Hiding a button in the Flutter UI or Web interface is never considered sufficient security. Every API request that touches branch inventory, transactions, or card sessions validates that the authenticated staff user's <code>assignedBranchIds</code> array contains the target <code>branchId</code>. Unauthorized attempts fail immediately with HTTP 403 Forbidden.",
        title="SECURITY PRINCIPLE: AUTHORITATIVE BRANCH ISOLATION",
        border_color="#ef4444",
        bg_color="#fef2f2"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 8: PRODUCT & CATALOG ADMINISTRATION VS POS CART
    # =========================================================================
    story.append(Paragraph("SECTION 8 — PRODUCT / CATALOG ADMINISTRATION VS POS CART", h1_style))
    story.append(Paragraph(
        "A critical architectural distinction exists between catalog administration (creating products and establishing retail prices) and POS counter operations (adding existing catalog items to a customer's active shopping cart).",
        body_style
    ))

    catalog_diff_data = [
        [
            Paragraph("<b>ATTRIBUTE / SCOPE</b>", table_header),
            Paragraph("<b>'ADD PRODUCT' — CATALOG ADMINISTRATION</b>", table_header),
            Paragraph("<b>'ADD PRODUCTS' — POS COUNTER CART</b>", table_header),
        ],
        [
            Paragraph("<b>Target Application</b>", table_cell_bold),
            Paragraph("React Web Admin Portal (<code>/products</code>)", table_cell),
            Paragraph("Flutter Mobile Staff App (<code>Active Card Hub</code>)", table_cell),
        ],
        [
            Paragraph("<b>Authorized Actor</b>", table_cell_bold),
            Paragraph("Organization Admin (<code>PRODUCT_MANAGE</code>)", table_cell),
            Paragraph("Counter Staff (<code>PURCHASE</code> / <code>PRODUCT_VIEW</code>)", table_cell),
        ],
        [
            Paragraph("<b>Core Action</b>", table_cell_bold),
            Paragraph("Creates master product record: Name, Category Array (e.g. <code>['Meals', 'Combos']</code>), and Authoritative Retail Unit Price.", table_cell),
            Paragraph("Queries active branch catalog, filters by category, increments item quantities, and builds a temporary POS cart.", table_cell),
        ],
        [
            Paragraph("<b>Price Modification</b>", table_cell_bold),
            Paragraph("Full authority to set, discount, or update product unit prices in PostgreSQL.", table_cell),
            Paragraph("<b>STRICTLY PROHIBITED.</b> Staff cannot alter, override, or discount product unit prices during checkout.", table_cell),
        ],
        [
            Paragraph("<b>Database Mutation</b>", table_cell_bold),
            Paragraph("Inserts into <code>products</code> and initializes <code>inventory_items</code>.", table_cell),
            Paragraph("Does not modify catalog; executes atomic purchase transaction against card session.", table_cell),
        ],
    ]
    catalog_table = Table(catalog_diff_data, colWidths=[100, 220, 220])
    catalog_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(catalog_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 9: PHYSICAL CARD LIFECYCLE & STATE MACHINE
    # =========================================================================
    story.append(Paragraph("SECTION 9 — PHYSICAL CARD LIFECYCLE & STATE MACHINE", h1_style))
    story.append(Paragraph(
        "Physical cards are reusable plastic or paper cards printed with a human-readable identifier (e.g. <code>MC-001</code>) and an opaque QR code URL (e.g. <code>https://moneycard.app/c/token-xyz</code>). Cards represent temporary account tokens that cycle through three discrete states.",
        body_style
    ))

    diag_s9 = """
                          PHYSICAL CARD STATE TRANSITION MACHINE

         +-------------------------------------------------------------+
         |                                                             |
         v                                                             |
   +-----------+          Session Created (Card Issued)          +-----------+
   | AVAILABLE | ----------------------------------------------> |  ACTIVE   |
   +-----------+                                                 +-----------+
         ^                                                             |
         |                   Session Settled / Card Returned           |
         +-------------------------------------------------------------+
         |                                                             |
         | Admin Unblock (CARD_UNBLOCK)          Admin Block (CARD_BLOCK)
         |                                                             |
         |                       +-----------+                         |
         +---------------------- |  BLOCKED  | <-----------------------+
                                 +-----------+
"""
    story.append(make_diagram(diag_s9, title="Card State Transition Graph"))
    story.append(Spacer(1, 6))

    card_states_desc = [
        ("AVAILABLE:", "The card is unassigned and in the merchant's physical card pool. It has zero active balance and no linked customer session. Ready to be issued to the next incoming customer."),
        ("ACTIVE:", "The card has been issued to a customer and is linked to an active, mutable <code>CardSession</code>. Can receive deposits (recharges) and execute POS debits (purchases)."),
        ("BLOCKED:", "The card has been locked by an administrator due to loss, theft, physical damage, or security flags. All purchases, recharges, and settlements are strictly rejected."),
    ]
    for st_title, st_desc in card_states_desc:
        story.append(Paragraph(f"• <b>{st_title}</b> {st_desc}", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 10: QR SCANNING & CRYPTOGRAPHIC TOKEN RESOLUTION
    # =========================================================================
    story.append(Paragraph("SECTION 10 — QR SCANNING & CRYPTOGRAPHIC TOKEN RESOLUTION", h1_style))
    story.append(Paragraph(
        "The Flutter Staff POS app utilizes the device camera via <code>mobile_scanner</code> to read printed QR codes. The QR code contains an HTTPS URL embedding an opaque, high-entropy token. The client extracts the token and resolves it via the safe public endpoint.",
        body_style
    ))

    diag_s10 = """
                        OPTICAL QR CARD SCANNING & RESOLUTION

   Staff Camera Scanner              Flutter App Controller              Backend (/api/v1)
            |                                  |                                 |
   1. Optical Scan Event                       |                                 |
      Raw Payload:                             |                                 |
      'https://app.moneycard/c/qtk_8f9a2' ---->|                                 |
            |                                  |-- 2. Token Regex Extraction     |
            |                                  |      Token: 'qtk_8f9a2'         |
            |                                  |                                 |
            |                                  |-- 3. POST /public/cards/resolve |
            |                                  |      Body: { qrToken: '...' } ->|
            |                                  |                                 |--- 4. Query Card &
            |                                  |                                 |       Active Session
            |                                  |<-- 5. Return Card & Session ----|
            |                                  |       { card, activeSession }   |
            |<-- 6. Trigger Haptic Vibration --|                                 |
            |    (HapticFeedback.mediumImpact) |                                 |
            |                                  |-- 7. Navigate to Active Card Hub|
"""
    story.append(make_diagram(diag_s10, title="QR Scanning, Token Resolution & Navigation Flow"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Camera Crash Suppression & Vibration Feedback:</b> The scanner controller implements a barcode processing debouncer. Unrecognized QR codes or malformed URLs produce a single user-friendly notification (<i>'QR card not registered'</i>) without putting the camera controller into an error loop. Successful scans trigger a standard haptic pulse (<code>HapticFeedback.mediumImpact()</code>) to confirm physical capture.",
        title="USER EXPERIENCE & SCANNER RESILIENCE",
        border_color="#0ea5e9",
        bg_color="#f0f9ff"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 11: NEW CARD ISSUANCE & REGISTRATION
    # =========================================================================
    story.append(Paragraph("SECTION 11 — NEW CARD ISSUANCE & REGISTRATION WORKFLOW", h1_style))
    story.append(Paragraph(
        "The platform supports two distinct workflows for card onboarding: pre-printed batch generation via the Admin portal, and counter-side issuance via the Flutter Staff app.",
        body_style
    ))

    story.append(Paragraph("1. Bulk Pre-Printing (Admin Workflow):", h2_style))
    story.append(Paragraph("The Organization Admin creates card batches in the Web Portal (e.g. 500 cards for Branch A). The system generates unique sequential physical numbers (MC-001 to MC-500) and assigns cryptographically random <code>qrToken</code> strings. Physical cards are manufactured with the encoded QR URLs.", body_style))

    story.append(Paragraph("2. Counter Issuance (Staff Workflow):", h2_style))
    story.append(Paragraph("When an unassigned card is scanned at the counter, the system detects status <code>AVAILABLE</code>. Staff prompts the customer for an initial deposit amount (e.g., ₹500), selects the payment mode (Cash / UPI), and clicks <b>'Issue Card & Start Session'</b>. The backend creates a new <code>CardSession</code> in state <code>ACTIVE</code> and sets the card's balance in one atomic operation.", body_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 12: ACTIVE CARD OPERATIONAL HUB WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 12 — ACTIVE CARD OPERATIONAL HUB WORKFLOW", h1_style))
    story.append(Paragraph(
        "The Active Card screen is the primary operational dashboard in the Flutter Staff POS application. Once a card is scanned, this screen consolidates all live metrics and operational actions for that specific customer session.",
        body_style
    ))

    hub_actions = [
        ("Balance Hero Badge:", "Displays current remaining balance formatted in standard currency (e.g. <code>INR 850.00</code>) with color-coded status badges."),
        ("Session Metadata Card:", "Displays active session start timestamp, elapsed duration, assigned branch name, and card physical number."),
        ("Action 1 — 'Add Products' (POS Cart):", "Opens the branch product catalog and search modal to select items, adjust quantities, and execute purchases."),
        ("Action 2 — 'Recharge' (Wallet Deposit):", "Opens the deposit sheet to accept Cash or manual UPI payments and credit the card balance."),
        ("Action 3 — 'Transaction History' (Ledger):", "Displays a chronological feed of all purchases, recharges, and reversals executed during the current active session."),
        ("Action 4 — 'Settle & Return Card' (Refund):", "Refunds any remaining balance in cash, closes the session, and resets the physical card to AVAILABLE."),
    ]
    for act_name, act_desc in hub_actions:
        story.append(Paragraph(f"• <b>{act_name}</b> {act_desc}", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 13: SESSION LIFECYCLE & DYNAMIC BALANCE ACCOUNTING
    # =========================================================================
    story.append(Paragraph("SECTION 13 — SESSION LIFECYCLE & DYNAMIC ACCOUNTING", h1_style))
    story.append(Paragraph(
        "A <code>CardSession</code> represents a single continuous customer visit. All financial debits and credits are bound to the active session. The card's balance is dynamically computed and verified by the database ledger.",
        body_style
    ))

    diag_s13 = """
                         CARD SESSION LIFECYCLE & BALANCE FORMULA

             +-------------------------------------------------------------+
             |                 Initial Issuance / Open Session             |
             |                   (Session Status: ACTIVE)                  |
             +-------------------------------------------------------------+
                                            |
                    +-----------------------+-----------------------+
                    |                                               |
                    v                                               v
        +-----------------------+                       +-----------------------+
        |   Wallet Recharges    |                       |     POS Purchases     |
        |   (Cash / Manual UPI) |                       |  (Catalog Items Sold) |
        +-----------------------+                       +-----------------------+
                    |                                               |
                    | (Credits: + Amount)                           | (Debits: - Total)
                    +-----------------------+-----------------------+
                                            |
                                            v
             +-------------------------------------------------------------+
             |                     LIVE REMAINING BALANCE                  |
             |       Balance = Initial Deposit + SUM(Recharges) - SUM(Purchases) |
             +-------------------------------------------------------------+
                                            |
                                            | Customer Visits Counter for Return
                                            v
             +-------------------------------------------------------------+
             |                   SETTLEMENT & RETURN                       |
             |   1. Cashier refunds remaining balance in Cash               |
             |   2. Session status set to SETTLED                          |
             |   3. Card balance reset to 0.00                             |
             |   4. Physical card returned to pool (Status: AVAILABLE)     |
             +-------------------------------------------------------------+
"""
    story.append(make_diagram(diag_s13, title="Session Lifecycle & Dynamic Balance Equation"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Single Active Session Invariant:</b> A physical card can have at most ONE <code>ACTIVE</code> session at any given time. Attempting to open a second session on a card that is already active is blocked by the database with HTTP <code>409 CARD_NOT_AVAILABLE</code>.",
        title="DATABASE CONSTRAINT RULE: ONE ACTIVE SESSION PER CARD",
        border_color="#f59e0b",
        bg_color="#fffbeb"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 14: POS PURCHASE WORKFLOW & INVENTORY DECREMENT
    # =========================================================================
    story.append(Paragraph("SECTION 14 — POS PURCHASE WORKFLOW & INVENTORY DECREMENT", h1_style))
    story.append(Paragraph(
        "POS purchase execution represents the core transactional flow at merchant counters. Items are selected from the branch catalog, quantities are confirmed, and an atomic database transaction handles balance deduction and stock decrement simultaneously.",
        body_style
    ))

    diag_s14 = """
                         POS PURCHASE & CHECKOUT TRANSACTION FLOW

Flutter POS (Staff)                    Backend API (/api/v1)                   PostgreSQL (Prisma)
        |                                       |                                       |
  1. Build Cart                                 |                                       |
     - Item 1: Burger x2 (@ 120.00 = 240.00)    |                                       |
     - Item 2: Coffee x1 (@  80.00 =  80.00)    |                                       |
     - Total: INR 320.00                        |                                       |
        |                                       |                                       |
  2. POST /card-sessions/:id/purchase --------->|                                       |
     Body: { items: [...], totalAmount: 320.00 }|                                       |
        |                                       |-- 3. BEGIN Prisma $transaction ------>|
        |                                       |      a. SELECT Session FOR UPDATE     |
        |                                       |      b. Check: Balance (450 >= 320)?  |
        |                                       |      c. Check: Stock (Qty >= Demand)? |
        |                                       |      d. Deduct Balance (450 - 320=130)|
        |                                       |      e. Decrement Inventory Quantities|
        |                                       |      f. Insert Transaction & LineItems|
        |                                       |-- 4. COMMIT Transaction ------------->|
        |<-- 5. 200 OK (PurchaseResponseData) --|                                       |
        |       { newBalance: 130.00, txnId }   |                                       |
        |                                       |                                       |
  6. Display Success Screen & Option to View/Download Bill PDF                          |
"""
    story.append(make_diagram(diag_s14, title="Atomic POS Purchase & Inventory Execution Flow"))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Error Handling & Guard Rails:", h2_style))
    story.append(Paragraph("• <b>422 INSUFFICIENT_BALANCE:</b> Returned when cart total exceeds available balance. Transaction aborted; no stock altered.", bullet_style))
    story.append(Paragraph("• <b>422 INSUFFICIENT_INVENTORY:</b> Returned when item quantity exceeds available branch inventory. Transaction aborted.", bullet_style))
    story.append(Paragraph("• <b>409 CARD_BLOCKED:</b> Returned if card was marked BLOCKED during the customer's visit.", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 15: CASH RECHARGE WORKFLOW & AUDITED SETTLEMENT
    # =========================================================================
    story.append(Paragraph("SECTION 15 — CASH RECHARGE WORKFLOW & AUDITED SETTLEMENT", h1_style))
    story.append(Paragraph(
        "Cash recharges allow customers to deposit physical paper currency at merchant counters to fund or top up their card balance. The transaction is instantly recorded in the cash ledger.",
        body_style
    ))

    s15_steps = [
        ("Step 1 — Cash Handover & Count:", "Customer hands currency notes to the counter staff. Staff physically verifies currency validity and counts the exact denomination."),
        ("Step 2 — Amount Entry & Verification:", "Staff enters the recharge amount (e.g. <code>INR 500.00</code>) into the Flutter POS deposit interface."),
        ("Step 3 — API Execution:", "Flutter app invokes <code>POST /api/v1/card-sessions/:id/recharge</code> with <code>paymentMethod: 'CASH'</code> and optional reference notes."),
        ("Step 4 — Atomic Balance Credit:", "Backend validates session status, credits balance, increments session cumulative recharges, and logs an audited transaction record of type <code>RECHARGE</code>."),
        ("Step 5 — Instant Receipt Generation:", "App renders success confirmation and enables instant PDF receipt viewing / downloading."),
    ]
    for st_title, st_desc in s15_steps:
        story.append(Paragraph(f"• <b>{st_title}</b> {st_desc}", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 16: UPI RECHARGE (STORE PHYSICAL STATIC QR) WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 16 — UPI RECHARGE (STORE PHYSICAL QR & MANUAL VERIFICATION)", h1_style))
    story.append(Paragraph(
        "The Money Card platform implements a <b>manually verified UPI workflow</b> designed for high reliability in retail environments. The branch operates a physical, static UPI standee QR on the counter. The Flutter POS app does NOT generate dynamic payment gateway QR codes on device screens.",
        body_style
    ))

    diag_s16 = """
                      MANUALLY VERIFIED UPI RECHARGE WORKFLOW

    Customer                             Counter Staff                         Flutter POS App
       |                                       |                                      |
  1. Scans physical store UPI standee QR       |                                      |
     (GooglePay / PhonePe / Paytm / BHIM)      |                                      |
       |                                       |                                      |
  2. Executes payment of INR 500.00            |                                      |
     UPI UTR/Ref: '428901234567'               |                                      |
       |                                       |                                      |
  3. Shows successful payment screen --------->|                                      |
       |                                 4. Verifies screen / soundbox / bank SMS     |
       |                                       |                                      |
       |                                       |-- 5. Enters Amount: 500.00 --------->|
       |                                       |-- 6. Enters UPI Ref: '428901234567'->|
       |                                       |-- 7. Selects Mode: 'UPI' ----------->|
       |                                       |                                      |
       |                                       |                                 8. Calls API
       |                                       |<-- 9. Success + New Balance ---------|
"""
    story.append(make_diagram(diag_s16, title="Store Static UPI Standee & Manual Staff Verification"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Important Operational Rule:</b> UPI recharge is explicitly an offline-verified payment stream with manual staff confirmation and UTR recording. It is NOT an automatic payment gateway webhook integration. This guarantees counter operations proceed without gateway timeout failures or internet webhook latency.",
        title="OPERATIONAL RULE: MANUAL UPI RECONCILIATION",
        border_color="#6366f1"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 17: REFUND & CARD SETTLEMENT / RETURN WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 17 — REFUND & CARD SETTLEMENT / RETURN WORKFLOW", h1_style))
    story.append(Paragraph(
        "When a customer finishes their visit, they return the physical card to the counter. The system computes the remaining balance, issues a cash refund, marks the session as SETTLED, and resets the card to AVAILABLE for the next customer.",
        body_style
    ))

    diag_s17 = """
                         CARD SETTLEMENT & BALANCE RETURN FLOW

Customer & Physical Card                   Counter Staff (Flutter POS)                Backend & PostgreSQL
        |                                       |                                       |
  1. Returns Card MC-042                        |                                       |
     to Cashier Counter ----------------------->|                                       |
        |                                 2. Scans QR / Opens Session                   |
        |                                    Active Balance: INR 180.00                 |
        |                                       |                                       |
        |                                 3. Clicks 'Settle & Return Card'              |
        |                                    Confirms Cash Refund: INR 180.00           |
        |                                       |                                       |
        |                                       |-- 4. POST /card-sessions/:id/return ->|
        |                                       |                                       |--- 5. Atomic Settlement:
        |                                       |                                       |       a. session.status = 'SETTLED'
        |                                       |                                       |       b. session.refundAmount = 180
        |                                       |                                       |       c. card.status = 'AVAILABLE'
        |                                       |                                       |       d. Record REFUND txn
        |                                       |<-- 6. 200 OK (Settled Confirmation) --|
        |<-- 7. Cashier hands INR 180.00 cash --|
        |                                 8. Physical Card MC-042 placed in AVAILABLE drawer
"""
    story.append(make_diagram(diag_s17, title="Card Return, Cash Refund & Session Settlement"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Double Refund Protection:</b> Attempting to execute a settlement or refund on an already settled session is strictly rejected by the backend with HTTP <code>409 ALREADY_SETTLED</code>. Once settled, a session becomes completely immutable.",
        title="IMMUTABILITY INVARIANT: ZERO DOUBLE REFUNDS",
        border_color="#ef4444",
        bg_color="#fef2f2"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 18: BRANCH INVENTORY & STOCK MOVEMENTS WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 18 — BRANCH INVENTORY & STOCK MOVEMENTS WORKFLOW", h1_style))
    story.append(Paragraph(
        "Inventory is branch-scoped. Each product has a linked <code>InventoryItem</code> tracking live stock quantities per branch. Stock automatically decrements upon purchase and can be manually adjusted by authorized staff or admins.",
        body_style
    ))

    inv_states = [
        ("IN_STOCK (Quantity > 10):", "Normal operational state. Items are available for purchase in POS carts."),
        ("LOW_STOCK (1 <= Quantity <= 10):", "Warning threshold. Triggers amber low-stock badges in Admin and Staff dashboards."),
        ("OUT_OF_STOCK (Quantity = 0):", "Critical state. Flutter POS prevents adding out-of-stock items to carts, preventing negative inventory."),
    ]
    for inv_title, inv_desc in inv_states:
        story.append(Paragraph(f"• <b>{inv_title}</b> {inv_desc}", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Audited Stock Adjustments & Movement History:", h2_style))
    story.append(Paragraph("Authorized personnel (<code>INVENTORY_MANAGE</code>) can adjust stock counts via <code>PATCH /api/v1/inventory/:id</code> specifying adjustment quantity (e.g. +50 or -5) and a mandatory reason code (<code>RESTOCK</code>, <code>SPOILAGE</code>, <code>DAMAGE</code>, <code>AUDIT_CORRECTION</code>). Every adjustment appends an immutable record to <code>inventory_movements</code>.", body_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 19: ANALYTICS & REPORTING ENGINE
    # =========================================================================
    story.append(Paragraph("SECTION 19 — ANALYTICS & REPORTING ENGINE", h1_style))
    story.append(Paragraph(
        "The analytics engine aggregates transactional ledgers, card sessions, and inventory counts into actionable business metrics. Access to analytics is strictly segmented by user role and cryptographic token claims.",
        body_style
    ))

    analytics_scope_data = [
        [
            Paragraph("<b>ANALYTICS SCOPE</b>", table_header),
            Paragraph("<b>AUTHORIZED ROLE</b>", table_header),
            Paragraph("<b>KEY METRICS & DATASETS PROVIDED</b>", table_header),
        ],
        [
            Paragraph("<b>Platform-Wide Scope</b>", table_cell_bold),
            Paragraph("SUPER_ADMIN", table_cell),
            Paragraph("Total onboarded organizations, active subscription counts, global gateway revenue, platform POS transaction volume, system-wide wallet recharges, plan tier tenant distributions, and cross-organization branch performance comparison.", table_cell),
        ],
        [
            Paragraph("<b>Tenant Scope</b>", table_cell_bold),
            Paragraph("ORG_ADMIN (<code>VIEW_ANALYTICS</code>)", table_cell),
            Paragraph("Organization-wide gross revenue, financial stream breakdown (60% Cash / 40% UPI estimates), total customer refunds, branch-by-branch operational comparison, top-selling product demand ranking, and hourly peak traffic distribution.", table_cell),
        ],
        [
            Paragraph("<b>Branch Counter Scope</b>", table_cell_bold),
            Paragraph("STAFF (<code>VIEW_ANALYTICS</code>)", table_cell),
            Paragraph("Shift-level counter operational metrics: total cash accepted, total UPI accepted, total sales billed, active session counts, and low-stock inventory alerts for the currently active branch.", table_cell),
        ],
    ]
    analytics_table = Table(analytics_scope_data, colWidths=[110, 110, 320])
    analytics_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(analytics_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 20: ANALYTICS PDF EXPORT WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 20 — ANALYTICS PDF EXPORT WORKFLOW", h1_style))
    story.append(Paragraph(
        "Super Admin and Organization Admin Analytics portals provide professional PDF export functionality with zero CSV alternatives. Both portals offer exactly two actions: <b>[ View PDF ]</b> (in-app modal preview) and <b>[ Download PDF ]</b> (direct binary file download).",
        body_style
    ))

    diag_s20 = """
                        UNIFIED ANALYTICS PDF EXPORT ARCHITECTURE

                            Analytics Dataset & Filter Context
                                            |
                                            v
                         buildPlatformAnalyticsJsPdf() / buildOrgAnalyticsJsPdf()
                                            |
                                            v
                              Complete PDF Document Binary
                                            |
                    +-----------------------+-----------------------+
                    |                                               |
                    v                                               v
            [ View PDF Action ]                           [ Download PDF Action ]
                    |                                               |
        Generate Blob & Object URL                       Execute Native jsPDF doc.save()
                    |                                               |
        Open Modal Iframe Preview                        Guaranteed Valid Single .pdf File:
        (Embedded PDF-1.3 Reader)                        * Super Admin:
                                                           MoneyCard_SuperAdmin_Analytics_YYYY-MM-DD.pdf
                                                         * Org Admin:
                                                           MoneyCard_OrgAdmin_Analytics_YYYY-MM-DD.pdf
"""
    story.append(make_diagram(diag_s20, title="Single Shared PDF Binary Generation Pipeline"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Binary Integrity & No CSV Guarantee:</b> All CSV export buttons, menu items, and code paths have been completely removed from the Analytics architecture. The PDF download engine utilizes native <code>doc.save(filename)</code> to prevent Chromium stream termination and eliminate raw UUID filenames (e.g. <code>a693c7e9-...</code>).",
        title="SPECIFICATION RULE: STRICTLY PDF EXPORT ONLY",
        border_color="#059669",
        bg_color="#f0fdf4"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 21: BILL & RECEIPT PDF ENGINE
    # =========================================================================
    story.append(Paragraph("SECTION 21 — BILL & RECEIPT PDF GENERATION & STORAGE", h1_style))
    story.append(Paragraph(
        "Following every successful POS purchase, cash recharge, or UPI top-up, the Flutter Staff app generates an itemized digital PDF sales receipt. The receipt is built locally on the client using the <code>pdf</code> / <code>printing</code> engine.",
        body_style
    ))

    s21_features = [
        ("Receipt Header:", "Displays Organization Name, Branch Name, Physical Counter Location, Date & Time, and Unique Transaction Reference ID."),
        ("Customer Context:", "Includes Card Number (e.g. <code>MC-001</code>), Active Session ID, and Payment Stream (<code>CASH</code>, <code>UPI</code>, or <code>CARD_WALLET</code>)."),
        ("Itemized Billed Items:", "For purchases: Tabulates Item Name, Unit Price, Quantity Sold, and Total Line Price."),
        ("Dynamic Balance Ledger:", "Prints Previous Balance, Transaction Amount (Deduction/Deposit), and New Remaining Live Balance."),
        ("Thermal Printer Philosophy:", "The Flutter app produces high-resolution PDF documents that can be viewed, saved, shared via Android intent, or manually printed via standard Android print spoolers. Automatic proprietary thermal printing hardware drivers are decoupled to maintain hardware independence."),
    ]
    for feat_name, feat_desc in s21_features:
        story.append(Paragraph(f"• <b>{feat_name}</b> {feat_desc}", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 22: PERMISSION ENFORCEMENT & RBAC
    # =========================================================================
    story.append(Paragraph("SECTION 22 — PERMISSION ENFORCEMENT & POLICY GUARDS", h1_style))
    story.append(Paragraph(
        "The system implements a four-stage Defense-in-Depth authorization policy executed on every single API transaction.",
        body_style
    ))

    diag_s22 = """
                         4-STAGE AUTHORIZATION EVALUATION PIPELINE

           Incoming HTTP Request (Bearer JWT Token)
                             |
                             v
               +---------------------------+
               |  1. JWT Signature Check   |  --> Invalid / Expired? -> 401 UNAUTHORIZED
               +---------------------------+
                             | Valid
                             v
               +---------------------------+
               | 2. Tenant Boundary Check  |  --> Mismatched Org ID? -> 403 ORGANIZATION_ACCESS_DENIED
               +---------------------------+
                             | Verified
                             v
               +---------------------------+
               |  3. Branch Access Check   |  --> Target Branch Not in assignedBranchIds? -> 403 BRANCH_ACCESS_DENIED
               +---------------------------+
                             | Permitted
                             v
               +---------------------------+
               | 4. Permission Set Check   |  --> Required Permission Missing (e.g. 'RECHARGE')? -> 403 PERMISSION_DENIED
               +---------------------------+
                             | Authorized
                             v
                  Execute Business Logic (200 OK)
"""
    story.append(make_diagram(diag_s22, title="Four-Stage Multi-Tenant Authorization Pipeline"))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 23: ORGANIZATION ISOLATION SECURITY
    # =========================================================================
    story.append(Paragraph("SECTION 23 — MULTI-TENANT ORGANIZATION ISOLATION SECURITY", h1_style))
    story.append(Paragraph(
        "Multi-tenancy is partitioned at the database schema layer. Every primary table in PostgreSQL (including <code>branches</code>, <code>staff</code>, <code>cards</code>, <code>products</code>, <code>sessions</code>, <code>transactions</code>, and <code>inventory_items</code>) contains an <code>organizationId</code> foreign key.",
        body_style
    ))

    story.append(make_callout(
        "<b>Zero Cross-Tenant Leakage:</b> An Organization Admin or Staff member belonging to Organization A can never query, mutate, scan, recharge, or access cards, products, or transactions belonging to Organization B. Attempting to manipulate organization IDs in API request bodies or URLs produces an immediate <code>403 ORGANIZATION_ACCESS_DENIED</code>.",
        title="SECURITY MANDATE: CRYPTOGRAPHIC TENANT PARTITIONING",
        border_color="#ef4444",
        bg_color="#fef2f2"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 24: ERROR, LOADING & EMPTY STATE HANDLING
    # =========================================================================
    story.append(Paragraph("SECTION 24 — ERROR, LOADING & EMPTY STATE HANDLING", h1_style))
    story.append(Paragraph(
        "Both the React Web Portal and Flutter Staff app adhere to standardized UI state machines to provide a predictable, resilient user experience during network volatility.",
        body_style
    ))

    states_data = [
        [
            Paragraph("<b>APPLICATION STATE</b>", table_header),
            Paragraph("<b>TRIGGER CONDITION</b>", table_header),
            Paragraph("<b>UI PRESENTATION & RECOVERY ACTION</b>", table_header),
        ],
        [
            Paragraph("<b>Loading State</b>", table_cell_bold),
            Paragraph("Async network fetch or transaction processing.", table_cell),
            Paragraph("Renders non-blocking animated skeleton loaders or spinners with descriptive message (e.g. <i>'Calculating organization metrics...'</i>). Disables interactive buttons to prevent duplicate submissions.", table_cell),
        ],
        [
            Paragraph("<b>Error State</b>", table_cell_bold),
            Paragraph("HTTP 4xx/5xx or network timeout.", table_cell),
            Paragraph("Displays contextual error banner with clear explanation and an explicit <b>[ Retry ]</b> button to re-trigger the failed network operation without refreshing the entire page.", table_cell),
        ],
        [
            Paragraph("<b>Empty State</b>", table_cell_bold),
            Paragraph("Query returns 0 records.", table_cell),
            Paragraph("Renders illustrative icon, helpful description (e.g. <i>'No active card sessions found'</i>), and primary action button (e.g. <i>'Issue New Card'</i>).", table_cell),
        ],
        [
            Paragraph("<b>Offline / Poor Network</b>", table_cell_bold),
            Paragraph("Socket timeout / DNS failure.", table_cell),
            Paragraph("Notifies user of connection interruption; queues retry logic and ensures local forms do not discard user input.", table_cell),
        ],
    ]
    states_table = Table(states_data, colWidths=[100, 140, 300])
    states_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(states_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 25: MOCK API DUAL-ENGINE ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("SECTION 25 — MOCK API DUAL-ENGINE ARCHITECTURE", h1_style))
    story.append(Paragraph(
        "To enable continuous development, QA testing, and demo presentation without live database dependencies, both the React Web and Flutter clients feature an in-memory Mock API engine that precisely mirrors the M0 V10 shared contract.",
        body_style
    ))

    diag_s25 = """
                       DUAL-ENGINE CLIENT SWITCHING ARCHITECTURE

                             Client Application Environment (.env)
                                               |
                     +-------------------------+-------------------------+
                     | (API_MODE=mock)                                   | (API_MODE=real)
                     v                                                   v
         +-----------------------+                           +-----------------------+
         |    Mock API Engine    |                           |     Dio / Axios       |
         |  (In-Memory Database) |                           |     HTTP Client       |
         +-----------------------+                           +-----------------------+
                     |                                                   | (HTTPS)
                     | Simulates 58 Endpoints                            v
                     | Full CRUD + Transactions              +-----------------------+
                     | Error Simulation                      |  Node.js API Gateway  |
                     v                                       |      (/api/v1)        |
         +-----------------------+                           +-----------------------+
         | Instant Test Feedback |                                       |
         | & Offline Resilience  |                                       v
         +-----------------------+                           +-----------------------+
                                                             |  PostgreSQL Database  |
                                                             +-----------------------+
"""
    story.append(make_diagram(diag_s25, title="Dual-Mode Mock / Real API Execution Architecture"))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Mock Error Simulation Capabilities:", h2_style))
    story.append(Paragraph("The Mock engine supports dynamic HTTP error simulation to validate client-side recovery: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Server Error, and Network Socket Timeouts.", body_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 26: REAL API INTEGRATION & PHYSICAL DEVICE LAN SETUP
    # =========================================================================
    story.append(Paragraph("SECTION 26 — REAL API INTEGRATION & PHYSICAL DEVICE LAN SETUP", h1_style))
    story.append(Paragraph(
        "When transitioning from Mock mode to a live local development backend, specific networking configurations are required for physical Android devices.",
        body_style
    ))

    story.append(make_callout(
        "<b>Physical Android Device Networking:</b> A physical Android tablet or phone cannot reach the host computer's backend via <code>http://localhost:3000</code> or <code>http://127.0.0.1:3000</code>. Physical devices must connect via the development computer's Local Area Network (LAN) Wi-Fi IP address (e.g. <code>http://192.168.1.50:3000/api/v1</code>). Furthermore, <code>android:usesCleartextTraffic='true'</code> is configured in <code>AndroidManifest.xml</code> for non-HTTPS local development.",
        title="CRITICAL NETWORK INTEGRATION DIRECTIVE",
        border_color="#f59e0b",
        bg_color="#fffbeb"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 27: COMPLETE MASTER END-TO-END BUSINESS LIFECYCLE
    # =========================================================================
    story.append(Paragraph("SECTION 27 — MASTER END-TO-END BUSINESS LIFECYCLE SEQUENCE", h1_style))
    story.append(Paragraph(
        "This master diagram illustrates the complete, unbroken business and operational lifecycle of the Money Card ecosystem—from initial organization provisioning down to POS purchase, cash refund, and PDF executive reporting.",
        body_style
    ))

    diag_s27 = """
                     MASTER END-TO-END ENTERPRISE BUSINESS CYCLE

  [ SUPER ADMIN ]
        |
        |-- 1. Creates Organization ('XYZ Foods') + Org Admin Account (POST /admin/organizations)
        v
  [ ORG ADMIN ]
        |
        |-- 2. Logs in to Web Portal (POST /auth/login)
        |-- 3. Creates Branch ('Downtown Food Court') (POST /branches)
        |-- 4. Creates Staff ('John Doe') + Assigns Branch & Permissions (POST /staff)
        |-- 5. Creates Catalog Products ('Burger' @ 120, 'Juice' @ 60) (POST /products)
        |-- 6. Generates Physical Card Batch (MC-001 to MC-100) (POST /cards)
        v
  [ CUSTOMER & STAFF POS ]
        |
        |-- 7. Customer arrives; Staff scans Card MC-042 (POST /public/cards/resolve)
        |-- 8. Customer deposits INR 500 Cash (POST /card-sessions/:id/recharge) -> Balance: 500.00
        |-- 9. Customer orders 2 Burgers & 1 Juice (Total: INR 300.00)
        |-- 10. Staff confirms POS Cart (POST /card-sessions/:id/purchase)
        |       * Balance debited: 500.00 - 300.00 = INR 200.00 remaining
        |       * Inventory auto-decremented: Burgers -2, Juice -1
        |       * Digital Bill PDF generated
        v
  [ SETTLEMENT & RECONCILIATION ]
        |
        |-- 11. Customer finishes visit & returns Card MC-042 to Counter
        |-- 12. Staff initiates Settle & Return (POST /card-sessions/:id/return)
        |       * Remaining INR 200.00 refunded in Cash
        |       * Session marked SETTLED; Card MC-042 reset to AVAILABLE
        v
  [ EXECUTIVE REPORTING ]
        |
        |-- 13. Org Admin & Super Admin export verified formal PDF Analytics Reports
"""
    story.append(make_diagram(diag_s27, title="Master End-to-End Enterprise Business Cycle Flow"))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 28: CORE ENTITY DATA FLOWS & SCHEMA RELATIONSHIPS
    # =========================================================================
    story.append(Paragraph("SECTION 28 — CORE ENTITY DATA FLOWS & SCHEMA RELATIONSHIPS", h1_style))
    story.append(Paragraph(
        "The relational entity model establishes strict cascading integrity and tenant partitioning across all database tables in PostgreSQL.",
        body_style
    ))

    diag_s28 = """
                       CORE RELATIONAL DATA SCHEMA HIERARCHY

  Organization (1) ------------< (N) Branches (1) -------------< (N) Inventory Items
       |                                   |                                 |
       | (1:N)                             | (1:N)                           | (1:1)
       v                                   v                                 v
  Org Users / Staff (1)                Products (1) ------------------------+
       |
       | (Operates)
       v
  Physical Cards (1) ----------< (N) Card Sessions (1) --------< (N) Transactions
                                           |                                 |
                                           +---------------------------------+
"""
    story.append(make_diagram(diag_s28, title="Relational Database Entity Relationship Hierarchy"))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 29: FRONTEND / BACKEND SHARED API CONTRACT (/api/v1)
    # =========================================================================
    story.append(Paragraph("SECTION 29 — FRONTEND / BACKEND SHARED API CONTRACT", h1_style))
    story.append(Paragraph(
        "Both the React Web Portal and Flutter Staff application consume the identical <code>/api/v1</code> REST API contract. There are zero client-specific endpoints. All responses adhere to standard JSON envelopes.",
        body_style
    ))

    story.append(Paragraph("Standard API Response Envelopes:", h2_style))
    story.append(Paragraph("• <b>Success Envelope:</b> <code>{ 'success': true, 'data': T, 'message'?: string }</code>", bullet_style))
    story.append(Paragraph("• <b>Error Envelope:</b> <code>{ 'success': false, 'error': { 'code': string, 'message': string, 'details'?: any } }</code>", bullet_style))
    story.append(Paragraph("• <b>Paginated Envelope:</b> <code>{ 'success': true, 'data': { 'items': T[], 'total': number, 'page': number, 'limit': number } }</code>", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 30: LOCAL DEVELOPMENT WORKFLOW & PORTS
    # =========================================================================
    story.append(Paragraph("SECTION 30 — LOCAL DEVELOPMENT WORKFLOW & ENVIRONMENT", h1_style))
    story.append(Paragraph(
        "The standard local development environment coordinates four parallel processes running across designated network ports.",
        body_style
    ))

    ports_data = [
        [
            Paragraph("<b>SERVICE / COMPONENT</b>", table_header),
            Paragraph("<b>LOCAL PORT / BINDING</b>", table_header),
            Paragraph("<b>COMMAND TO RUN</b>", table_header),
            Paragraph("<b>ROLE & FUNCTIONALITY</b>", table_header),
        ],
        [
            Paragraph("<b>PostgreSQL 16</b>", table_cell_bold),
            Paragraph("<code>localhost:5432</code>", table_cell),
            Paragraph("<code>docker run -p 5432:5432 postgres</code>", table_cell),
            Paragraph("Authoritative relational database instance.", table_cell),
        ],
        [
            Paragraph("<b>Backend API Gateway</b>", table_cell_bold),
            Paragraph("<code>localhost:3000</code>", table_cell),
            Paragraph("<code>npm run dev (Backend)</code>", table_cell),
            Paragraph("Node.js / Express / Prisma API service.", table_cell),
        ],
        [
            Paragraph("<b>React Web Admin</b>", table_cell_bold),
            Paragraph("<code>localhost:5173</code>", table_cell),
            Paragraph("<code>npm run dev (Web)</code>", table_cell),
            Paragraph("Vite development server for Web Admin portal.", table_cell),
        ],
        [
            Paragraph("<b>Flutter Staff POS</b>", table_cell_bold),
            Paragraph("<code>Physical USB / WiFi</code>", table_cell),
            Paragraph("<code>flutter run -d &lt;device-id&gt;</code>", table_cell),
            Paragraph("Compiles and deploys debug APK to Android device.", table_cell),
        ],
        [
            Paragraph("<b>Prisma Studio</b>", table_cell_bold),
            Paragraph("<code>localhost:5555</code>", table_cell),
            Paragraph("<code>npx prisma studio</code>", table_cell),
            Paragraph("Visual database browser and record editor.", table_cell),
        ],
    ]
    ports_table = Table(ports_data, colWidths=[90, 85, 135, 230])
    ports_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(ports_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 31: INTEGRATION & CROSS-PLATFORM TESTING WORKFLOW
    # =========================================================================
    story.append(Paragraph("SECTION 31 — INTEGRATION & CROSS-PLATFORM TESTING WORKFLOW", h1_style))
    story.append(Paragraph(
        "Quality assurance is enforced through an automated 11-step verification sequence spanning unit tests, contract suites, and end-to-end integration flows.",
        body_style
    ))

    test_steps = [
        ("Step 1 — Database Migrations:", "Execute <code>npx prisma migrate dev</code> to apply DDL schema updates and index configurations to local PostgreSQL."),
        ("Step 2 — Backend Service Boot:", "Launch Node.js API gateway and verify database connection pool initialization."),
        ("Step 3 — API Contract Runner (58 Tests):", "Execute <code>npx tsx scripts/run-api-contract-tests.ts</code>. Validates 100% compliance across all 58 REST endpoints with zero schema deviations."),
        ("Step 4 — Flutter Staff Test Suite (135 Tests):", "Execute <code>flutter test</code>. Executes 135 automated unit, widget, and provider lifecycle tests across auth, QR resolution, cart, recharge, and settlements."),
        ("Step 5 — TypeScript Static Check:", "Execute <code>npx tsc --noEmit</code>. Verifies 0 compilation or type errors in the React Web codebase."),
        ("Step 6 — Cross-Client End-to-End E2E Testing:", "Simulate live workflow: Admin creates Org -> Org Admin creates branch/products -> Staff logs in on Android -> scans QR -> processes purchase -> settles card."),
    ]
    for st_title, st_desc in test_steps:
        story.append(Paragraph(f"• <b>{st_title}</b> {st_desc}", bullet_style))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 32: PRODUCTION DEPLOYMENT TOPOLOGY
    # =========================================================================
    story.append(Paragraph("SECTION 32 — PRODUCTION DEPLOYMENT TOPOLOGY", h1_style))
    story.append(Paragraph(
        "In production, the backend and database reside within a hardened Virtual Private Cloud (VPC), while client applications connect securely over HTTPS.",
        body_style
    ))

    diag_s32 = """
                         PRODUCTION DEPLOYMENT TOPOLOGY

      React Web Admin                 Staff Android POS             Public Customer Web
     (Hosted CDN / HTTPS)          (Installed Standalone APK)      (Hosted CDN / HTTPS)
              |                               |                             |
              +-------------------------------+-----------------------------+
                                              | HTTPS (Port 443 / TLS 1.3)
                                              v
                              +-------------------------------+
                              |    Cloudflare / Edge Proxy    | (DDoS Mitigation, WAF)
                              +-------------------------------+
                                              |
                                              v
                              +-------------------------------+
                              |  Node.js API Cluster (VPC)    | (PM2 / Docker Containers,
                              |          (/api/v1)            |  Auto-Scaling Group)
                              +-------------------------------+
                                              | (Encrypted Private VPC Subnet)
                                              v
                              +-------------------------------+
                              | Managed PostgreSQL RDS / HA   | (Multi-AZ Replication,
                              |      (Port 5432)              |  Automated Continuous Backups)
                              +-------------------------------+
"""
    story.append(make_diagram(diag_s32, title="Production Infrastructure & High-Availability Network Topology"))
    story.append(Spacer(1, 6))

    story.append(make_callout(
        "<b>Flutter Standalone Deployment Model:</b> The Flutter Staff mobile app is compiled as a standalone release APK / AAB. It is installed directly on merchant Android POS devices. It does not require a web server; it connects directly to the production backend API over encrypted TLS 1.3.",
        title="MOBILE POS DEPLOYMENT INVARIANT",
        border_color="#6366f1"
    ))
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 33: HARDWARE ECOSYSTEM & FUTURE ROADMAP
    # =========================================================================
    story.append(Paragraph("SECTION 33 — HARDWARE ECOSYSTEM & FUTURE ROADMAP", h1_style))
    story.append(Paragraph(
        "The Money Card platform clearly segregates active, implemented capabilities from planned roadmap expansions.",
        body_style
    ))

    roadmap_data = [
        [
            Paragraph("<b>CAPABILITY / HARDWARE</b>", table_header),
            Paragraph("<b>CURRENT STATUS</b>", table_header),
            Paragraph("<b>IMPLEMENTATION DETAIL & ROADMAP MILESTONE</b>", table_header),
        ],
        [
            Paragraph("<b>Optical QR Scanning</b>", table_cell_bold),
            Paragraph("<font color='#059669'><b>IMPLEMENTED</b></font>", table_cell),
            Paragraph("High-speed optical scanning via device camera with debouncing and haptic feedback.", table_cell),
        ],
        [
            Paragraph("<b>Digital PDF Receipts</b>", table_cell_bold),
            Paragraph("<font color='#059669'><b>IMPLEMENTED</b></font>", table_cell),
            Paragraph("Full vector PDF sales and recharge receipts with view, share, and manual print capabilities.", table_cell),
        ],
        [
            Paragraph("<b>Manual Static UPI QR</b>", table_cell_bold),
            Paragraph("<font color='#059669'><b>IMPLEMENTED</b></font>", table_cell),
            Paragraph("Counter standee QR payment with manual staff verification and UTR recording.", table_cell),
        ],
        [
            Paragraph("<b>ESC/POS Thermal Printers</b>", table_cell_bold),
            Paragraph("<font color='#d97706'><b>FUTURE / PLANNED</b></font>", table_cell),
            Paragraph("Direct Bluetooth / USB thermal receipt printer protocol driver integration.", table_cell),
        ],
        [
            Paragraph("<b>NFC / RFID Smart Cards</b>", table_cell_bold),
            Paragraph("<font color='#d97706'><b>FUTURE / PLANNED</b></font>", table_cell),
            Paragraph("NFC tap-to-pay using Mifare Classic / Ultralight contactless card readers.", table_cell),
        ],
        [
            Paragraph("<b>Automated Gateway UPI</b>", table_cell_bold),
            Paragraph("<font color='#d97706'><b>FUTURE / PLANNED</b></font>", table_cell),
            Paragraph("Dynamic on-screen UPI QR generation with automated webhook reconciliation.", table_cell),
        ],
        [
            Paragraph("<b>App Store Distribution</b>", table_cell_bold),
            Paragraph("<font color='#d97706'><b>FUTURE / PLANNED</b></font>", table_cell),
            Paragraph("Public distribution on Google Play Store and Apple App Store.", table_cell),
        ],
    ]
    roadmap_table = Table(roadmap_data, colWidths=[120, 100, 320])
    roadmap_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(roadmap_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 34: COMPLETE STATE MACHINES & ENTITY LIFECYCLES
    # =========================================================================
    story.append(Paragraph("SECTION 34 — COMPLETE STATE MACHINES & ENTITY LIFECYCLES", h1_style))
    story.append(Paragraph(
        "State transitions across primary entities are strictly finite and enforced by database check constraints and Prisma transaction triggers.",
        body_style
    ))

    sm_data = [
        [
            Paragraph("<b>ENTITY</b>", table_header),
            Paragraph("<b>VALID STATES</b>", table_header),
            Paragraph("<b>INITIAL STATE</b>", table_header),
            Paragraph("<b>TRANSITION TRIGGERS & RULES</b>", table_header),
        ],
        [
            Paragraph("<b>Physical Card</b>", table_cell_bold),
            Paragraph("<code>AVAILABLE</code><br/><code>ACTIVE</code><br/><code>BLOCKED</code>", table_cell),
            Paragraph("<code>AVAILABLE</code>", table_cell),
            Paragraph("AVAILABLE -> ACTIVE upon session creation.<br/>ACTIVE -> AVAILABLE upon card return & settlement.<br/>ANY -> BLOCKED upon admin lock.<br/>BLOCKED -> AVAILABLE upon admin unlock.", table_cell),
        ],
        [
            Paragraph("<b>Card Session</b>", table_cell_bold),
            Paragraph("<code>ACTIVE</code><br/><code>SETTLED</code>", table_cell),
            Paragraph("<code>ACTIVE</code>", table_cell),
            Paragraph("ACTIVE -> SETTLED upon cashier settlement and cash refund. Once SETTLED, session is completely immutable.", table_cell),
        ],
        [
            Paragraph("<b>Inventory Stock</b>", table_cell_bold),
            Paragraph("<code>IN_STOCK</code><br/><code>LOW_STOCK</code><br/><code>OUT_OF_STOCK</code>", table_cell),
            Paragraph("<code>IN_STOCK</code>", table_cell),
            Paragraph("Quantity > 10 = IN_STOCK.<br/>1 <= Quantity <= 10 = LOW_STOCK.<br/>Quantity = 0 = OUT_OF_STOCK. Purchases decrement quantity atomically.", table_cell),
        ],
        [
            Paragraph("<b>Subscription</b>", table_cell_bold),
            Paragraph("<code>PENDING_PAYMENT</code><br/><code>ACTIVE</code><br/><code>EXPIRED</code><br/><code>CANCELLED</code>", table_cell),
            Paragraph("<code>ACTIVE</code>", table_cell),
            Paragraph("ACTIVE -> RENEWAL_DUE at billing cycle end.<br/>RENEWAL_DUE -> ACTIVE upon payment confirmation.<br/>RENEWAL_DUE -> EXPIRED after grace period.", table_cell),
        ],
    ]
    sm_table = Table(sm_data, colWidths=[75, 95, 75, 295])
    sm_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(sm_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 35: MASTER ROLE RESPONSIBILITY & AUTHORIZATION MATRIX
    # =========================================================================
    story.append(Paragraph("SECTION 35 — MASTER ROLE RESPONSIBILITY & AUTHORIZATION MATRIX", h1_style))
    story.append(Paragraph(
        "This master matrix defines the comprehensive operational authorities granted to each user role across all 25 core system capabilities.",
        body_style
    ))

    matrix_data = [
        [
            Paragraph("<b>FUNCTIONAL CAPABILITY</b>", table_header),
            Paragraph("<b>SUPER ADMIN</b>", table_header),
            Paragraph("<b>ORG ADMIN</b>", table_header),
            Paragraph("<b>STAFF</b>", table_header),
            Paragraph("<b>PUBLIC USER</b>", table_header),
        ],
        [Paragraph("Create Organization & Org Admin", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Manage Global Subscription Plans", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Export Platform-Wide PDF Analytics", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Manage Branches & Locations", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Create Staff & Assign Permissions", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Create Catalog Products & Set Prices", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Modify Product Unit Prices", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Bulk CSV Inventory Import", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Adjust Branch Inventory Quantities", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("IF PERMITTED", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("Export Organization PDF Analytics", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell)],
        [Paragraph("Optical QR Card Scanning", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("Open Active Card Session", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("Execute POS Cart Purchase", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("Accept Cash Wallet Recharge", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("Verify & Record Manual UPI Recharge", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("Settle Session & Refund Cash", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("Block / Unblock Physical Card", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("IF PERMITTED", table_cell_bold), Paragraph("NO", table_cell)],
        [Paragraph("View Public Balance & Ledger via QR", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold)],
    ]
    matrix_table = Table(matrix_data, colWidths=[200, 85, 85, 90, 80])
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(matrix_table)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 36: FINAL UNIFIED ARCHITECTURE SUMMARY
    # =========================================================================
    story.append(Paragraph("SECTION 36 — FINAL UNIFIED SYSTEM ARCHITECTURE SUMMARY", h1_style))
    story.append(Paragraph(
        "The Money Card platform unifies cross-platform client applications, strict role-based authorization, and high-performance transactional accounting into one cohesive multi-tenant ecosystem.",
        body_style
    ))

    diag_s36 = """
                         FINAL UNIFIED TRANSACTION & STATE EXECUTION

                                          [ USER / ACTOR ]
                                                 |
                                                 v
                               +-----------------------------------+
                               |   Web Admin / Flutter Mobile POS  |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |  JWT Authentication (15m Access)  |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               | RBAC + 20 Frozen M0 Permissions   |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |  Strict Organization & Branch     |
                               |  Cryptographic Isolation Guard    |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |   Backend Gateway Engine (/api/v1)|
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |  Prisma ORM Atomic $transaction   |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |  PostgreSQL Authoritative Ledger  |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |   Instant Multi-Client State Sync |
                               |   * Card Balance Updated          |
                               |   * Branch Inventory Decremented  |
                               |   * Immutable Transaction Logged  |
                               |   * Analytics & PDF Ready         |
                               +-----------------------------------+
"""
    story.append(make_diagram(diag_s36, title="Complete Unified End-to-End System Execution Graph"))
    story.append(Spacer(1, 8))

    story.append(make_callout(
        "<b>Architectural Sign-Off & Verification:</b> This document represents the verified, fully tested technical implementation of the Money Card ecosystem as codified in M0 V10. All 58 API contract tests and 135 Flutter mobile tests pass with 100% success rate. The platform is ready for production integration and staging deployment.",
        title="SYSTEM ARCHITECTURE VERIFICATION & RELEASE SIGN-OFF",
        border_color="#059669",
        bg_color="#f0fdf4"
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Generated {output_filename} successfully!")

if __name__ == "__main__":
    build_pdf()
