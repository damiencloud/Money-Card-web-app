import 'package:money_card_staff/core/config/app_config.dart';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/features/receipt/bill_receipt_screen.dart';
import 'package:money_card_staff/models/hardware_settings.dart';
import 'package:money_card_staff/models/receipt_bill.dart';
import 'package:money_card_staff/models/transaction.dart';
import 'package:money_card_staff/providers/hardware_settings_provider.dart';
import 'package:money_card_staff/services/digital_receipt_service.dart';
import 'package:money_card_staff/widgets/receipt/digital_receipt_dialog.dart';
import 'package:printing/printing.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  TestWidgetsFlutterBinding.ensureInitialized();

  group('HardwareSettings & Device Feedback Tests', () {
    test('Default values are phone-first and haptics enabled by default and always on', () {
      const settings = HardwareSettings();
      expect(settings.vibrationFeedbackEnabled, isTrue);
      expect(settings.soundFeedbackEnabled, isTrue);
    });

    test('toJson and fromJson serialize accurately', () {
      const settings = HardwareSettings(
        vibrationFeedbackEnabled: true,
        soundFeedbackEnabled: true,
      );

      final json = settings.toJson();
      expect(json['vibrationFeedbackEnabled'], isTrue);
      expect(json['soundFeedbackEnabled'], isTrue);

      final deserialized = HardwareSettings.fromJson(json);
      expect(deserialized.vibrationFeedbackEnabled, isTrue);
      expect(deserialized.soundFeedbackEnabled, isTrue);
    });

    test('Scan haptic triggers feedback reliably', () {
      final notifier = HardwareSettingsNotifier();
      expect(notifier.state.vibrationFeedbackEnabled, isTrue);

      expect(() => notifier.triggerScanHaptic(), returnsNormally);
      expect(() => notifier.triggerLightHaptic(), returnsNormally);
    });
  });

  group('ReceiptBill Model & Mock Data Tests', () {
    test('ReceiptBill.mockPurchase contains complete realistic cafeteria bill data', () {
      final mockBill = ReceiptBill.mockPurchase();

      expect(mockBill.organizationName, equals('MONEY CARD'));
      expect(mockBill.branchName, equals('Main Cafeteria'));
      expect(mockBill.transactionId, equals('TXN-MOCK-001'));
      expect(mockBill.cardIdentifier, equals('MC-001'));
      expect(mockBill.sessionId, equals('SESSION-MOCK-001'));
      expect(mockBill.items.length, equals(2));
      expect(mockBill.items[0].name, equals('Veg Burger'));
      expect(mockBill.items[0].quantity, equals(2));
      expect(mockBill.items[0].unitPrice, equals(120.0));
      expect(mockBill.items[0].subtotal, equals(240.0));
      expect(mockBill.items[1].name, equals('Fresh Juice'));
      expect(mockBill.items[1].quantity, equals(1));
      expect(mockBill.items[1].unitPrice, equals(60.0));
      expect(mockBill.items[1].subtotal, equals(60.0));
      expect(mockBill.subtotal, equals(300.0));
      expect(mockBill.totalAmount, equals(300.0));
      expect(mockBill.previousBalance, equals(750.0));
      expect(mockBill.amountDeducted, equals(300.0));
      expect(mockBill.remainingBalance, equals(450.0));
      expect(mockBill.paymentMethod, equals('Card Session'));
      expect(mockBill.sessionStatus, equals('ACTIVE'));
    });

    test('toJson and fromJson serialize ReceiptBill accurately', () {
      final mockBill = ReceiptBill.mockPurchase();
      final json = mockBill.toJson();
      final deserialized = ReceiptBill.fromJson(json);

      expect(deserialized.transactionId, equals('TXN-MOCK-001'));
      expect(deserialized.items.length, equals(2));
      expect(deserialized.totalAmount, equals(300.0));
      expect(deserialized.remainingBalance, equals(450.0));
    });
  });

  group('DigitalReceiptService Real Bill PDF Generation & Download Tests', () {
    const service = DigitalReceiptService();

    test('buildBillPdf produces real cafeteria bill layout with valid %PDF- signature', () async {
      final mockBill = ReceiptBill.mockPurchase();
      final Uint8List pdfBytes = await service.buildBillPdf(mockBill);

      expect(pdfBytes, isNotEmpty);
      expect(pdfBytes.length, greaterThan(100));
      expect(String.fromCharCodes(pdfBytes.sublist(0, 5)), equals('%PDF-'));
    });

    test('buildBillPdf produces valid non-empty %PDF- bytes for UPI recharge with UPI Reference', () async {
      final mockUpiRecharge = ReceiptBill.mockRecharge(
        paymentMethod: PaymentMethod.upi,
        paymentReference: 'UPI-MOCK-001',
      );
      expect(mockUpiRecharge.isRecharge, isTrue);
      expect(mockUpiRecharge.paymentMethod, equals('UPI'));
      expect(mockUpiRecharge.paymentReference, equals('UPI-MOCK-001'));

      final Uint8List upiPdfBytes = await service.buildBillPdf(mockUpiRecharge);

      expect(upiPdfBytes, isNotEmpty);
      expect(upiPdfBytes.length, greaterThan(100));
      expect(String.fromCharCodes(upiPdfBytes.sublist(0, 5)), equals('%PDF-'));
    });

    test('buildBillPdf produces valid non-empty %PDF- bytes for CASH recharge', () async {
      final mockCashRecharge = ReceiptBill.mockRecharge(
        paymentMethod: PaymentMethod.cash,
      );
      expect(mockCashRecharge.isRecharge, isTrue);
      expect(mockCashRecharge.paymentMethod, equals('CASH'));

      final Uint8List cashPdfBytes = await service.buildBillPdf(mockCashRecharge);

      expect(cashPdfBytes, isNotEmpty);
      expect(cashPdfBytes.length, greaterThan(100));
      expect(String.fromCharCodes(cashPdfBytes.sublist(0, 5)), equals('%PDF-'));
    });

    test('savePdfToDevice writes MoneyCard_<txnId>.pdf to device path, verifies exact byte length and %PDF- header', () async {
      final mockBill = ReceiptBill.mockPurchase();
      final Uint8List pdfBytes = await service.buildBillPdf(mockBill);

      final filePath = await service.savePdfToDevice(
        pdfBytes: pdfBytes,
        transactionId: mockBill.transactionId,
        targetDirectory: Directory.systemTemp,
      );

      expect(filePath, isNotEmpty);
      expect(filePath.contains('MoneyCard_TXN-MOCK-001.pdf'), isTrue);
      final savedFile = File(filePath);
      expect(savedFile.existsSync(), isTrue);
      expect(savedFile.lengthSync(), equals(pdfBytes.length));

      final readHeader = savedFile.openSync().readSync(5);
      expect(String.fromCharCodes(readHeader), equals('%PDF-'));
    });

    test('savePdfToDevice writes and validates UPI recharge PDF file correctly on disk', () async {
      final mockUpiRecharge = ReceiptBill.mockRecharge(
        paymentMethod: PaymentMethod.upi,
        paymentReference: 'UPI-MOCK-001',
      );
      final Uint8List upiPdfBytes = await service.buildBillPdf(mockUpiRecharge);

      final filePath = await service.savePdfToDevice(
        pdfBytes: upiPdfBytes,
        transactionId: mockUpiRecharge.transactionId,
        targetDirectory: Directory.systemTemp,
      );

      expect(filePath, isNotEmpty);
      expect(filePath.contains('MoneyCard_TXN-MOCK-RCH-001.pdf'), isTrue);
      final savedFile = File(filePath);
      expect(savedFile.existsSync(), isTrue);
      expect(savedFile.lengthSync(), equals(upiPdfBytes.length));

      final readHeader = savedFile.openSync().readSync(5);
      expect(String.fromCharCodes(readHeader), equals('%PDF-'));
    });
  });

  group('BillReceiptScreen Dedicated Screen Tests', () {
    testWidgets('Renders complete non-empty bill and provides exactly 3 buttons', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      bool doneCalled = false;
      final mockBill = ReceiptBill.mockPurchase();

      await tester.pumpWidget(
        MaterialApp(
          home: BillReceiptScreen(
            bill: mockBill,
            targetDownloadDirectory: Directory.systemTemp,
            onDone: () {
              doneCalled = true;
            },
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify complete bill details are displayed directly on screen
      expect(find.text('Bill'), findsOneWidget);
      expect(find.text('MONEY CARD'), findsOneWidget);
      expect(find.text('MAIN CAFETERIA'), findsOneWidget);
      expect(find.text('SALES RECEIPT'), findsOneWidget);
      expect(find.text('TXN-MOCK-001'), findsOneWidget);
      expect(find.text('MC-001'), findsOneWidget);

      // Verify item list
      expect(find.text('Veg Burger'), findsOneWidget);
      expect(find.text('2 × ₹120'), findsOneWidget);
      expect(find.text('₹240.00'), findsOneWidget);
      expect(find.text('Fresh Juice'), findsOneWidget);
      expect(find.text('1 × ₹60'), findsOneWidget);
      expect(find.text('₹60.00'), findsOneWidget);

      // Verify totals and financial balances
      expect(find.text('TOTAL'), findsOneWidget);
      expect(find.text('₹300.00'), findsWidgets);
      expect(find.text('Previous Balance'), findsOneWidget);
      expect(find.text('₹750.00'), findsOneWidget);
      expect(find.text('Deducted'), findsOneWidget);
      expect(find.text('Remaining Balance'), findsOneWidget);
      expect(find.text('₹450.00'), findsOneWidget);
      expect(find.text('Card Session'), findsOneWidget);
      expect(find.text('SESSION-MOCK-001'), findsOneWidget);
      expect(find.text('Thank You!'), findsOneWidget);

      // VERIFY: EXACTLY 3 buttons exist
      expect(find.text('Generate & View PDF'), findsOneWidget);
      expect(find.text('Download PDF'), findsOneWidget);
      expect(find.text('Done'), findsOneWidget);

      // VERIFY: All other actions REMOVED
      expect(find.text('View Bill'), findsNothing);
      expect(find.text('View PDF'), findsNothing);
      expect(find.text('Generate PDF'), findsNothing);
      expect(find.text('Share PDF'), findsNothing);
      expect(find.text('Print'), findsNothing);

      // 1. Tap Generate & View PDF -> opens viewer modal
      await tester.ensureVisible(find.text('Generate & View PDF'));
      await tester.tap(find.text('Generate & View PDF'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Bill PDF'), findsOneWidget);
      expect(find.byType(PdfPreview), findsOneWidget);

      // Close modal
      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();

      // 2. Tap Download PDF -> generates & saves file to storage
      await tester.ensureVisible(find.text('Download PDF'));
      await tester.tap(find.text('Download PDF'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 300));

      // Verify success feedback
      expect(find.text('Bill PDF downloaded successfully.'), findsOneWidget);

      // 3. Tap Done -> triggers callback
      await tester.ensureVisible(find.text('Done'));
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(doneCalled, isTrue);
    });
  });

  group('DigitalReceiptDialog 3-Button Action Widget Tests', () {
    testWidgets('Dialog presents exactly Generate & View PDF, Download PDF, and Done', (tester) async {
      bool doneCalled = false;
      final mockBill = ReceiptBill.mockPurchase();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DigitalReceiptDialog(
              bill: mockBill,
              title: 'Purchase Successful',
              targetDownloadDirectory: Directory.systemTemp,
              onDone: () {
                doneCalled = true;
              },
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify transaction summary displayed
      expect(find.text('Purchase Successful'), findsOneWidget);
      expect(find.text('₹300.00'), findsOneWidget);
      expect(find.text('₹450.00'), findsOneWidget);
      expect(find.text('MC-001'), findsOneWidget);
      expect(find.text('TXN-MOCK-001'), findsOneWidget);

      // VERIFY: Exactly 3 buttons exist
      expect(find.text('Generate & View PDF'), findsOneWidget);
      expect(find.text('Download PDF'), findsOneWidget);
      expect(find.text('Done'), findsOneWidget);

      // VERIFY: All other actions REMOVED
      expect(find.text('View Bill'), findsNothing);
      expect(find.text('View PDF'), findsNothing);
      expect(find.text('Generate PDF'), findsNothing);
      expect(find.text('Share PDF'), findsNothing);
      expect(find.text('Print'), findsNothing);

      // Tap Download PDF
      await tester.tap(find.text('Download PDF'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Bill PDF downloaded successfully.'), findsOneWidget);

      // Tap Done
      await tester.tap(find.text('Done'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(doneCalled, isTrue);
    });
  });
}
