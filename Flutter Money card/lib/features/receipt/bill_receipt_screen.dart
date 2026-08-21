import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/receipt_bill.dart';
import '../../services/digital_receipt_service.dart';
import '../../widgets/common/app_button.dart';

class BillReceiptScreen extends StatefulWidget {
  final ReceiptBill bill;
  final Directory? targetDownloadDirectory;
  final VoidCallback? onDone;

  const BillReceiptScreen({
    super.key,
    required this.bill,
    this.targetDownloadDirectory,
    this.onDone,
  });

  @override
  State<BillReceiptScreen> createState() => _BillReceiptScreenState();
}

class _BillReceiptScreenState extends State<BillReceiptScreen> {
  final DigitalReceiptService _receiptService = const DigitalReceiptService();
  Uint8List? _generatedPdfBytes;
  bool _isGeneratingAndViewing = false;
  bool _isDownloading = false;

  /// Action 1: [ Generate & View PDF ]
  Future<void> _handleGenerateAndViewPdf() async {
    setState(() => _isGeneratingAndViewing = true);
    try {
      if (_generatedPdfBytes == null) {
        final bytes = await _receiptService.buildBillPdf(widget.bill);
        if (!mounted) return;
        setState(() {
          _generatedPdfBytes = bytes;
        });
      }

      if (!mounted) return;
      setState(() => _isGeneratingAndViewing = false);

      _openPdfViewerModal(_generatedPdfBytes!);
    } catch (e, st) {
      debugPrint('BILL PDF GENERATE ERROR: $e');
      debugPrintStack(stackTrace: st);
      if (mounted) {
        setState(() => _isGeneratingAndViewing = false);
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Unable to generate bill PDF.'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 4),
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: _handleGenerateAndViewPdf,
            ),
          ),
        );
      }
    }
  }

  /// Action 2: [ Download PDF ]
  Future<void> _handleDownloadPdf() async {
    setState(() => _isDownloading = true);
    try {
      debugPrint('===> [Download PDF] Initiated for transaction: ${widget.bill.transactionId}');
      if (_generatedPdfBytes == null) {
        debugPrint('===> [Download PDF] _generatedPdfBytes is null. Calling buildBillPdf...');
        final bytes = await _receiptService.buildBillPdf(widget.bill);
        debugPrint('===> [Download PDF] buildBillPdf returned ${bytes.length} bytes');
        if (!mounted) return;
        setState(() {
          _generatedPdfBytes = bytes;
        });
      } else {
        debugPrint('===> [Download PDF] Reusing existing _generatedPdfBytes (${_generatedPdfBytes!.length} bytes)');
      }

      await _receiptService.savePdfToDevice(
        pdfBytes: _generatedPdfBytes!,
        transactionId: widget.bill.transactionId,
        targetDirectory: widget.targetDownloadDirectory,
      );

      if (!mounted) return;
      setState(() => _isDownloading = false);

      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bill PDF downloaded successfully.'),
          backgroundColor: AppColors.success,
          duration: Duration(seconds: 3),
        ),
      );
    } catch (e, st) {
      debugPrint('========== BILL PDF ERROR ==========');
      debugPrint('ERROR TYPE: ${e.runtimeType}');
      debugPrint('ERROR: $e');
      debugPrint('STACK TRACE: $st');
      debugPrint('====================================');
      if (mounted) {
        setState(() => _isDownloading = false);
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Unable to save bill PDF: $e'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: _handleDownloadPdf,
            ),
          ),
        );
      }
    }
  }

  /// Action 3: [ Done ]
  void _handleDone() {
    if (widget.onDone != null) {
      widget.onDone!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  void _openPdfViewerModal(Uint8List pdfBytes) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            AppBar(
              title: const Text('Bill PDF'),
              leading: IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
            Expanded(
              child: PdfPreview(
                build: (format) async => pdfBytes,
                canChangeOrientation: false,
                canChangePageFormat: false,
                canDebug: false,
                allowPrinting: false,
                allowSharing: false,
                pdfFileName: 'MoneyCard_${widget.bill.transactionId}.pdf',
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bill = widget.bill;
    final dateStr = DateFormat('dd MMM yyyy').format(bill.timestamp);
    final timeStr = DateFormat('hh:mm a').format(bill.timestamp);

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text('Bill', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _handleDone,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // Real Bill / Receipt Ticket Container
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE0E0E0)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header: Organization & Branch
                    Center(
                      child: Column(
                        children: [
                          Text(
                            bill.organizationName.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.5,
                              color: AppColors.textPrimaryLight,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            bill.branchName.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF616161),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            bill.receiptTitle.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildDashedLine(),
                    const SizedBox(height: 10),

                    // Bill Metadata
                    _buildReceiptRow('Bill No:', bill.displayBillNo),
                    _buildReceiptRow('Card:', bill.displayCardId),
                    _buildReceiptRow('Date:', '$dateStr  $timeStr'),
                    if (bill.staffName != null && bill.staffName!.isNotEmpty)
                      _buildReceiptRow('Cashier:', bill.staffName!),

                    const SizedBox(height: 10),
                    _buildDashedLine(),
                    const SizedBox(height: 10),

                    // Item Table Header
                    if (bill.items.isNotEmpty) ...[
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            flex: 4,
                            child: Text(
                              'ITEM',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF757575)),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              'QTY × RATE',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF757575)),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              'AMOUNT',
                              textAlign: TextAlign.right,
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF757575)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      _buildDashedLine(),
                      const SizedBox(height: 8),

                      // Item Rows
                      ...bill.items.map((item) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 4,
                                child: Text(
                                  item.name,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              ),
                              Expanded(
                                flex: 3,
                                child: Text(
                                  '${item.quantity} × ₹${item.unitPrice.toStringAsFixed(0)}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF616161)),
                                ),
                              ),
                              Expanded(
                                flex: 3,
                                child: Text(
                                  '₹${item.subtotal.toStringAsFixed(2)}',
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),

                      const SizedBox(height: 10),
                      _buildDashedLine(),
                      const SizedBox(height: 10),
                    ],

                    // Subtotal & Prominent Total
                    if (!bill.isRecharge && bill.subtotal != bill.totalAmount)
                      _buildReceiptRow('Subtotal', '₹${bill.subtotal.toStringAsFixed(2)}'),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            bill.isRecharge ? 'RECHARGE AMOUNT' : 'TOTAL',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight),
                          ),
                          Text(
                            '₹${bill.totalAmount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildDashedLine(),
                    const SizedBox(height: 10),

                    // Financial Breakdown
                    _buildReceiptRow('Previous Balance', '₹${bill.previousBalance.toStringAsFixed(2)}'),
                    if (!bill.isRecharge)
                      _buildReceiptRow('Deducted', '₹${bill.amountDeducted.toStringAsFixed(2)}'),
                    _buildReceiptRow(
                      bill.isRecharge ? 'New Balance' : 'Remaining Balance',
                      '₹${bill.remainingBalance.toStringAsFixed(2)}',
                      isBold: true,
                    ),

                    const SizedBox(height: 10),
                    _buildDashedLine(),
                    const SizedBox(height: 10),

                    // Payment and Session Information
                    _buildReceiptRow('Payment:', bill.paymentMethod),
                    if (bill.paymentReference != null && bill.paymentReference!.isNotEmpty)
                      _buildReceiptRow('UPI Reference:', bill.paymentReference!),
                    if (bill.sessionId != null && bill.sessionId!.isNotEmpty)
                      _buildReceiptRow('Session:', bill.sessionId!),
                    _buildReceiptRow('Branch:', bill.branchName),

                    const SizedBox(height: 16),
                    _buildDashedLine(),
                    const SizedBox(height: 12),

                    // Footer
                    const Center(
                      child: Column(
                        children: [
                          Text(
                            'Thank You!',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              fontStyle: FontStyle.italic,
                              color: AppColors.textPrimaryLight,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Please visit again',
                            style: TextStyle(fontSize: 11, color: Color(0xFF757575)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Button 1: [ Generate & View PDF ]
              AppButton(
                label: _isGeneratingAndViewing ? 'Generating PDF...' : 'Generate & View PDF',
                icon: _isGeneratingAndViewing ? null : Icons.picture_as_pdf_outlined,
                isLoading: _isGeneratingAndViewing,
                onPressed: (_isGeneratingAndViewing || _isDownloading) ? null : _handleGenerateAndViewPdf,
              ),
              const SizedBox(height: AppSpacing.sm),

              // Button 2: [ Download PDF ]
              AppOutlinedButton(
                label: _isDownloading ? 'Downloading PDF...' : 'Download PDF',
                icon: _isDownloading ? null : Icons.download_outlined,
                isLoading: _isDownloading,
                onPressed: (_isGeneratingAndViewing || _isDownloading) ? null : _handleDownloadPdf,
              ),
              const SizedBox(height: AppSpacing.sm),

              // Button 3: [ Done ]
              AppOutlinedButton(
                label: 'Done',
                icon: Icons.check,
                borderColor: AppColors.primary,
                textColor: AppColors.primary,
                onPressed: (_isGeneratingAndViewing || _isDownloading) ? null : _handleDone,
              ),

              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDashedLine() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final boxWidth = constraints.constrainWidth();
        const dashWidth = 4.0;
        const dashHeight = 1.0;
        final dashCount = (boxWidth / (2 * dashWidth)).floor();
        return Flex(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          direction: Axis.horizontal,
          children: List.generate(dashCount, (_) {
            return const SizedBox(
              width: dashWidth,
              height: dashHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(color: Color(0xFFBDBDBD)),
              ),
            );
          }),
        );
      },
    );
  }

  Widget _buildReceiptRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isBold ? AppColors.textPrimaryLight : const Color(0xFF616161),
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Flexible(
            child: Text(
              value,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
                color: isBold ? AppColors.primaryDark : AppColors.textPrimaryLight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
