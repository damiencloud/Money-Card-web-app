import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/receipt_bill.dart';
import '../../services/digital_receipt_service.dart';
import '../common/app_button.dart';
import '../common/app_card.dart';

class DigitalReceiptDialog extends StatefulWidget {
  final ReceiptBill bill;
  final String title;
  final Directory? targetDownloadDirectory;
  final VoidCallback onDone;

  const DigitalReceiptDialog({
    super.key,
    required this.bill,
    this.title = 'Purchase Successful',
    this.targetDownloadDirectory,
    required this.onDone,
  });

  /// Factory helper that accepts a ReceiptBill directly
  static Future<void> showBill(
    BuildContext context, {
    required ReceiptBill bill,
    String title = 'Purchase Successful',
    Directory? targetDownloadDirectory,
    required VoidCallback onDone,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => DigitalReceiptDialog(
        bill: bill,
        title: title,
        targetDownloadDirectory: targetDownloadDirectory,
        onDone: onDone,
      ),
    );
  }

  /// Convenience helper for screens passing individual parameters
  static Future<void> show(
    BuildContext context, {
    required String branchName,
    required String transactionId,
    required DateTime timestamp,
    required String cardIdentifier,
    required List<Map<String, dynamic>> items,
    required double totalAmount,
    required double remainingBalance,
    double? previousBalance,
    double? amountDeducted,
    double? subtotal,
    String? sessionId,
    String? staffName,
    String title = 'Purchase Successful',
    String receiptTitle = 'SALES RECEIPT',
    String paymentMethod = 'Card Session',
    String? paymentReference,
    String sessionStatus = 'ACTIVE',
    Directory? targetDownloadDirectory,
    required VoidCallback onDone,
  }) {
    final billItems = items
        .map((item) => ReceiptBillItem.fromJson(item))
        .toList();
    final deduct = amountDeducted ?? totalAmount;
    final prevBal = previousBalance ?? (remainingBalance + deduct);
    final sub = subtotal ?? totalAmount;

    final bill = ReceiptBill(
      organizationName: 'MONEY CARD',
      branchName: branchName,
      receiptTitle: receiptTitle,
      transactionId: transactionId,
      timestamp: timestamp,
      cardIdentifier: cardIdentifier,
      sessionId: sessionId,
      staffName: staffName,
      items: billItems,
      subtotal: sub,
      totalAmount: totalAmount,
      previousBalance: prevBal,
      amountDeducted: deduct,
      remainingBalance: remainingBalance,
      paymentMethod: paymentMethod,
      paymentReference: paymentReference,
      sessionStatus: sessionStatus,
    );

    return showBill(
      context,
      bill: bill,
      title: title,
      targetDownloadDirectory: targetDownloadDirectory,
      onDone: onDone,
    );
  }

  @override
  State<DigitalReceiptDialog> createState() => _DigitalReceiptDialogState();
}

class _DigitalReceiptDialogState extends State<DigitalReceiptDialog> {
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
    Navigator.of(context).pop();
    widget.onDone();
  }

  void _openPdfViewerModal(Uint8List pdfBytes) {
    showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
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
    final dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(widget.bill.timestamp);
    final isRecharge = widget.bill.isRecharge;

    return AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: AppSpacing.roundedLg),
      contentPadding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      title: Row(
        children: [
          const Icon(Icons.check_circle, color: AppColors.success, size: 28),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              widget.title,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Total & Balance Card
            AppCard(
              padding: AppSpacing.paddingMd,
              backgroundColor: AppColors.primaryLight.withValues(alpha: 0.35),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isRecharge ? 'Recharge Amount:' : 'Total Paid:',
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondaryLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        '₹${widget.bill.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Divider(height: 1),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isRecharge ? 'New Balance:' : 'Remaining Balance:',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondaryLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        '₹${widget.bill.remainingBalance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Metadata summary
            _buildInfoRow('Card ID:', widget.bill.cardIdentifier),
            _buildInfoRow(isRecharge ? 'Receipt No:' : 'Bill No:', widget.bill.transactionId),
            _buildInfoRow('Date:', dateStr),
            _buildInfoRow('Payment:', widget.bill.paymentMethod),
            if (widget.bill.paymentReference != null && widget.bill.paymentReference!.isNotEmpty)
              _buildInfoRow('UPI Ref:', widget.bill.paymentReference!),
            if (!isRecharge && widget.bill.items.isNotEmpty)
              _buildInfoRow('Items:', '${widget.bill.items.length} items purchased'),

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
              onPressed: (_isGeneratingAndViewing || _isDownloading) ? null : _handleDone,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
