import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/receipt_bill.dart';

/// Single source of truth for building and saving professional Cafeteria Sales & Recharge Bill PDFs
class DigitalReceiptService {
  const DigitalReceiptService();

  /// Single function responsible for building the receipt PDF bytes
  Future<Uint8List> buildBillPdf(ReceiptBill bill) async {
    final pdfType = bill.isRecharge
        ? (bill.paymentMethod.toUpperCase().contains('UPI') ? 'UPI_RECHARGE' : 'CASH_RECHARGE')
        : 'SALES_RECEIPT';

    debugPrint('===== RECEIPT DEBUG =====');
    debugPrint('transactionId: ${bill.transactionId}');
    debugPrint('cardId: ${bill.cardIdentifier}');
    debugPrint('amount: ${bill.totalAmount}');
    debugPrint('previousBalance: ${bill.previousBalance}');
    debugPrint('newBalance: ${bill.remainingBalance}');
    debugPrint('paymentMethod: ${bill.paymentMethod}');
    debugPrint('paymentReference: ${bill.paymentReference}');
    debugPrint('organization: ${bill.organizationName}');
    debugPrint('branch: ${bill.branchName}');
    debugPrint('receiptTitle: ${bill.receiptTitle}');
    debugPrint('isRecharge: ${bill.isRecharge}');
    debugPrint('timestamp: ${bill.timestamp}');
    debugPrint('==========================');

    final pdf = pw.Document();
    final dateStr = DateFormat('dd MMM yyyy').format(bill.timestamp);
    final timeStr = DateFormat('hh:mm a').format(bill.timestamp);
    final receiptHeight = bill.isRecharge
        ? 165.0 * PdfPageFormat.mm
        : (175.0 * PdfPageFormat.mm + (bill.items.length * 9.0 * PdfPageFormat.mm));

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat(
          80 * PdfPageFormat.mm,
          receiptHeight,
          marginLeft: 4 * PdfPageFormat.mm,
          marginRight: 4 * PdfPageFormat.mm,
          marginTop: 6 * PdfPageFormat.mm,
          marginBottom: 6 * PdfPageFormat.mm,
        ),
        build: (pw.Context context) {
          if (bill.isRecharge) {
            // Recharge Receipt Layout (CASH & UPI)
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                // Header
                pw.Center(
                  child: pw.Column(
                    children: [
                      pw.Text(
                        bill.organizationName.toUpperCase(),
                        style: pw.TextStyle(
                          fontSize: 13,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 1.5,
                        ),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        bill.branchName.toUpperCase(),
                        style: pw.TextStyle(
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColors.grey800,
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'RECHARGE RECEIPT',
                        style: pw.TextStyle(
                          fontSize: 9.5,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(height: 6),
                _buildDashedDivider(),
                pw.SizedBox(height: 5),

                // Metadata
                _buildMetaRow('Receipt:', bill.displayBillNo),
                _buildMetaRow('Date:', dateStr),
                _buildMetaRow('Time:', timeStr),
                _buildMetaRow('Card:', bill.displayCardId),
                if (bill.staffName != null && bill.staffName!.isNotEmpty)
                  _buildMetaRow('Cashier:', bill.staffName!),

                pw.SizedBox(height: 5),
                _buildDashedDivider(),
                pw.SizedBox(height: 5),

                // Recharge Amount
                pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        'Recharge Amount:',
                        style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                      ),
                      pw.Text(
                        'INR ${bill.totalAmount.toStringAsFixed(2)}',
                        style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
                      ),
                    ],
                  ),
                ),

                pw.SizedBox(height: 5),
                _buildDashedDivider(),
                pw.SizedBox(height: 5),

                // Payment Details
                _buildMetaRow('Payment Method:', bill.paymentMethod.toUpperCase()),
                if (bill.paymentReference != null && bill.paymentReference!.trim().isNotEmpty)
                  _buildMetaRow('UPI Reference:', bill.paymentReference!.trim()),
                if (bill.sessionId != null && bill.sessionId!.isNotEmpty)
                  _buildMetaRow('Session:', bill.sessionId!),

                pw.SizedBox(height: 4),
                _buildDashedDivider(),
                pw.SizedBox(height: 4),

                // Balances Breakdown
                _buildBalanceRow('Previous Balance', 'INR ${bill.previousBalance.toStringAsFixed(2)}'),
                _buildBalanceRow(
                  'New Balance',
                  'INR ${bill.remainingBalance.toStringAsFixed(2)}',
                  isBold: true,
                ),

                pw.SizedBox(height: 10),
                _buildDashedDivider(),
                pw.SizedBox(height: 6),

                // Footer
                pw.Center(
                  child: pw.Column(
                    children: [
                      pw.Text(
                        'Thank You!',
                        style: pw.TextStyle(
                          fontSize: 10.5,
                          fontWeight: pw.FontWeight.bold,
                          fontStyle: pw.FontStyle.italic,
                        ),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        'Please visit again',
                        style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }

          // Sales Receipt Layout (Purchases)
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              // Header
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      bill.organizationName.toUpperCase(),
                      style: pw.TextStyle(
                        fontSize: 13,
                        fontWeight: pw.FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      bill.branchName.toUpperCase(),
                      style: pw.TextStyle(
                        fontSize: 10,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.grey800,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      bill.receiptTitle.toUpperCase(),
                      style: pw.TextStyle(
                        fontSize: 9.5,
                        fontWeight: pw.FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 6),
              _buildDashedDivider(),
              pw.SizedBox(height: 5),

              // Metadata
              _buildMetaRow('Bill No:', bill.displayBillNo),
              _buildMetaRow('Date:', dateStr),
              _buildMetaRow('Time:', timeStr),
              _buildMetaRow('Card:', bill.displayCardId),
              if (bill.staffName != null && bill.staffName!.isNotEmpty)
                _buildMetaRow('Cashier:', bill.staffName!),

              pw.SizedBox(height: 5),
              _buildDashedDivider(),
              pw.SizedBox(height: 5),

              // Items Table Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(
                    flex: 4,
                    child: pw.Text(
                      'ITEM',
                      style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold),
                    ),
                  ),
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      'QTY',
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold),
                    ),
                  ),
                  pw.Expanded(
                    flex: 3,
                    child: pw.Text(
                      'AMOUNT',
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold),
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 3),
              _buildDashedDivider(),
              pw.SizedBox(height: 4),

              // Items List
              ...bill.items.map((item) {
                return pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Expanded(
                        flex: 4,
                        child: pw.Text(
                          item.name,
                          style: const pw.TextStyle(fontSize: 8.5),
                          maxLines: 2,
                        ),
                      ),
                      pw.Expanded(
                        flex: 2,
                        child: pw.Text(
                          '${item.quantity}',
                          textAlign: pw.TextAlign.center,
                          style: const pw.TextStyle(fontSize: 8.5),
                        ),
                      ),
                      pw.Expanded(
                        flex: 3,
                        child: pw.Text(
                          'INR ${item.subtotal.toStringAsFixed(2)}',
                          textAlign: pw.TextAlign.right,
                          style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                );
              }),

              pw.SizedBox(height: 4),
              _buildDashedDivider(),
              pw.SizedBox(height: 4),

              // Subtotal & Total
              if (bill.subtotal != bill.totalAmount)
                _buildMetaRow('Subtotal', 'INR ${bill.subtotal.toStringAsFixed(2)}'),
              pw.Padding(
                padding: const pw.EdgeInsets.symmetric(vertical: 1.5),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'TOTAL',
                      style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                    ),
                    pw.Text(
                      'INR ${bill.totalAmount.toStringAsFixed(2)}',
                      style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 4),
              _buildDashedDivider(),
              pw.SizedBox(height: 4),

              // Balances Breakdown
              _buildBalanceRow('Previous Balance', 'INR ${bill.previousBalance.toStringAsFixed(2)}'),
              _buildBalanceRow('Amount Deducted', 'INR ${bill.amountDeducted.toStringAsFixed(2)}'),
              _buildBalanceRow(
                'Remaining Balance',
                'INR ${bill.remainingBalance.toStringAsFixed(2)}',
                isBold: true,
              ),

              pw.SizedBox(height: 4),
              _buildDashedDivider(),
              pw.SizedBox(height: 4),

              // Payment & Session Information
              _buildMetaRow('Payment:', bill.paymentMethod),
              if (bill.paymentReference != null && bill.paymentReference!.trim().isNotEmpty)
                _buildMetaRow('Reference:', bill.paymentReference!.trim()),
              if (bill.sessionId != null && bill.sessionId!.isNotEmpty)
                _buildMetaRow('Session:', bill.sessionId!),
              _buildMetaRow('Branch:', bill.branchName),

              pw.SizedBox(height: 10),
              _buildDashedDivider(),
              pw.SizedBox(height: 6),

              // Footer
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'Thank You!',
                      style: pw.TextStyle(
                        fontSize: 10.5,
                        fontWeight: pw.FontWeight.bold,
                        fontStyle: pw.FontStyle.italic,
                      ),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      'Please visit again',
                      style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );

    Uint8List pdfBytes;
    try {
      pdfBytes = await pdf.save();
    } catch (e, stackTrace) {
      debugPrint('===== UPI/BILL PDF GENERATION FAILED =====');
      debugPrint('TYPE: ${e.runtimeType}');
      debugPrint('ERROR: $e');
      debugPrint('STACK: $stackTrace');
      rethrow;
    }

    // Verify PDF header signature: must start with %PDF-
    final isHeaderValid = pdfBytes.length >= 5 &&
        pdfBytes[0] == 0x25 && // %
        pdfBytes[1] == 0x50 && // P
        pdfBytes[2] == 0x44 && // D
        pdfBytes[3] == 0x46 && // F
        pdfBytes[4] == 0x2D;   // -

    final headerStr = pdfBytes.length >= 5 ? String.fromCharCodes(pdfBytes.sublist(0, 5)) : 'INVALID';
    debugPrint('2. [PDF Pipeline] PDF type: $pdfType');
    debugPrint('2a. [PDF Pipeline] PDF byte length: ${pdfBytes.length}');
    debugPrint('2b. [PDF Pipeline] PDF header: $headerStr (valid: $isHeaderValid)');

    if (!isHeaderValid || pdfBytes.isEmpty) {
      throw const FormatException('Generated PDF bytes do not contain a valid %PDF- signature');
    }

    return pdfBytes;
  }

  /// Alias for backward compatibility with existing callers
  Future<Uint8List> generateReceiptPdfFromBill(ReceiptBill bill) => buildBillPdf(bill);

  pw.Widget _buildDashedDivider() {
    return pw.Divider(
      borderStyle: pw.BorderStyle.dashed,
      thickness: 0.6,
      color: PdfColors.grey600,
    );
  }

  pw.Widget _buildMetaRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1.2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            label,
            style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.grey800),
          ),
          pw.Text(
            value,
            style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }

  pw.Widget _buildBalanceRow(String label, String value, {bool isBold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1.2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            label,
            style: pw.TextStyle(
              fontSize: 8.5,
              fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
              color: isBold ? PdfColors.black : PdfColors.grey800,
            ),
          ),
          pw.Text(
            value,
            style: pw.TextStyle(
              fontSize: 9,
              fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  /// Downloads/saves the generated raw PDF bytes to the local device storage
  Future<String> savePdfToDevice({
    required Uint8List pdfBytes,
    required String transactionId,
    Directory? targetDirectory,
  }) async {
    debugPrint('4. [Save Pipeline] Save operation started for transaction: $transactionId');

    // 1. Verify input bytes are valid raw PDF
    if (pdfBytes.isEmpty || pdfBytes.length < 5) {
      throw const FormatException('Cannot save empty or invalid PDF bytes');
    }
    final isHeaderValid = pdfBytes[0] == 0x25 &&
        pdfBytes[1] == 0x50 &&
        pdfBytes[2] == 0x44 &&
        pdfBytes[3] == 0x46 &&
        pdfBytes[4] == 0x2D;

    if (!isHeaderValid) {
      throw const FormatException('PDF bytes missing valid %PDF- header');
    }

    final cleanTxnId = transactionId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
    final filename = 'MoneyCard_$cleanTxnId.pdf';

    // Guard against web platform runtime where dart:io Platform properties are unsupported
    if (kIsWeb) {
      debugPrint('5. [Save Pipeline] Running on Web -> calling Printing.sharePdf');
      await Printing.sharePdf(bytes: pdfBytes, filename: filename);
      debugPrint('6. [Save Pipeline] Web share completed for $filename');
      return filename;
    }

    Directory? dir = targetDirectory;
    if (dir == null) {
      // Step A: Try external storage directory (Android app-specific external files, standard & permission-free)
      try {
        dir = await getExternalStorageDirectory().timeout(const Duration(milliseconds: 200));
        debugPrint('5a. [Save Pipeline] getExternalStorageDirectory: ${dir?.path}');
      } catch (e) {
        debugPrint('5a. [Save Pipeline] getExternalStorageDirectory error: $e');
      }

      // Step B: Try standard downloads directory
      if (dir == null) {
        try {
          dir = await getDownloadsDirectory().timeout(const Duration(milliseconds: 200));
          debugPrint('5b. [Save Pipeline] getDownloadsDirectory: ${dir?.path}');
        } catch (e) {
          debugPrint('5b. [Save Pipeline] getDownloadsDirectory error: $e');
        }
      }

      // Step C: Try application documents directory
      if (dir == null) {
        try {
          dir = await getApplicationDocumentsDirectory().timeout(const Duration(milliseconds: 200));
          debugPrint('5c. [Save Pipeline] getApplicationDocumentsDirectory: ${dir.path}');
        } catch (e) {
          debugPrint('5c. [Save Pipeline] getApplicationDocumentsDirectory error: $e');
        }
      }

      // Step D: Fallback to system temp directory
      dir ??= Directory.systemTemp;
    }

    debugPrint('5d. [Save Pipeline] Selected Android save location: ${dir.path}');

    final filePath = '${dir.path}/$filename';
    final file = File(filePath);

    debugPrint('6. [Save Pipeline] File write started: $filePath');
    file.writeAsBytesSync(pdfBytes, flush: true);
    debugPrint('7. [Save Pipeline] File write completed');

    // 2. Validate saved file on disk
    if (!file.existsSync()) {
      throw FileSystemException('Saved PDF file not found on disk after write', filePath);
    }

    final savedSize = file.lengthSync();
    debugPrint('8. [Save Pipeline] Saved file size: $savedSize (expected: ${pdfBytes.length})');

    if (savedSize != pdfBytes.length) {
      try {
        file.deleteSync();
      } catch (_) {}
      throw FileSystemException('Saved file size ($savedSize) does not match generated PDF size (${pdfBytes.length})', filePath);
    }

    // 3. Read back header to confirm file integrity
    final readHeader = file.openSync().readSync(5);
    final isHeaderMatch = readHeader.length == 5 &&
        readHeader[0] == 0x25 && // %
        readHeader[1] == 0x50 && // P
        readHeader[2] == 0x44 && // D
        readHeader[3] == 0x46 && // F
        readHeader[4] == 0x2D;   // -

    if (!isHeaderMatch) {
      try {
        file.deleteSync();
      } catch (_) {}
      throw FileSystemException('Saved file does not start with valid %PDF- signature', filePath);
    }

    debugPrint('9. [Save Pipeline] Final saved path verified: $filePath');

    // 4. On live device (when targetDirectory is null), also launch Android system Document Save/Share Chooser
    if (targetDirectory == null) {
      try {
        debugPrint('10. [Save Pipeline] Launching Android system document save/share picker...');
        await Printing.sharePdf(bytes: pdfBytes, filename: filename);
        debugPrint('11. [Save Pipeline] Android system document save/share picker launched');
      } catch (e, st) {
        debugPrint('10b. [Save Pipeline] Printing.sharePdf notice: $e (File already saved locally at $filePath)');
        debugPrintStack(stackTrace: st);
      }
    }

    return filePath;
  }

  /// Opens Android native print/save framework for viewing and saving PDF
  Future<void> openPdfViewer({
    required Uint8List pdfBytes,
    required String transactionId,
  }) async {
    await Printing.layoutPdf(
      onLayout: (_) async => pdfBytes,
      name: 'MoneyCard_$transactionId',
    );
  }
}
