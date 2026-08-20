import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/models/receipt_bill.dart';
import 'package:money_card_staff/models/transaction.dart';
import 'package:money_card_staff/services/digital_receipt_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Flutter Unit & Regression Tests: CASH & UPI Recharge Receipts & PDF Pipeline', () {
    const receiptService = DigitalReceiptService();

    test('CASH Recharge Receipt correctly builds data model with null reference', () {
      final cashReceipt = ReceiptBill.mockRecharge(
        paymentMethod: PaymentMethod.cash,
        paymentReference: null,
      );

      expect(cashReceipt.isRecharge, isTrue);
      expect(cashReceipt.receiptTitle, 'RECHARGE RECEIPT');
      expect(cashReceipt.paymentMethod, 'CASH');
      expect(cashReceipt.paymentReference, isNull);
      expect(cashReceipt.previousBalance, 250.0);
      expect(cashReceipt.totalAmount, 500.0);
      expect(cashReceipt.remainingBalance, 750.0);
      expect(cashReceipt.remainingBalance, cashReceipt.previousBalance + cashReceipt.totalAmount);
    });

    test('UPI Recharge Receipt correctly preserves payment reference and receipt metadata', () {
      const upiRef = 'UPI-TXN-REFERENCE-2026-XYZ';
      final upiReceipt = ReceiptBill.mockRecharge(
        paymentMethod: PaymentMethod.upi,
        paymentReference: upiRef,
      );

      expect(upiReceipt.isRecharge, isTrue);
      expect(upiReceipt.receiptTitle, 'RECHARGE RECEIPT');
      expect(upiReceipt.paymentMethod, 'UPI');
      expect(upiReceipt.paymentReference, isNotNull);
      expect(upiReceipt.paymentReference, upiRef);
      expect(upiReceipt.previousBalance, 250.0);
      expect(upiReceipt.totalAmount, 500.0);
      expect(upiReceipt.remainingBalance, 750.0);

      // Verify JSON serialization preserves paymentReference
      final json = upiReceipt.toJson();
      expect(json['paymentMethod'], 'UPI');
      expect(json['paymentReference'], upiRef);

      final reconstructed = ReceiptBill.fromJson(json);
      expect(reconstructed.paymentReference, upiRef);
      expect(reconstructed.isRecharge, isTrue);
    });

    test('DigitalReceiptService generates valid PDF bytes for CASH recharge without crashing', () async {
      final cashReceipt = ReceiptBill.mockRecharge(
        paymentMethod: PaymentMethod.cash,
        paymentReference: null,
      );

      final pdfBytes = await receiptService.buildBillPdf(cashReceipt);
      expect(pdfBytes, isNotNull);
      expect(pdfBytes.isNotEmpty, isTrue);

      // Verify valid PDF magic header (%PDF-)
      final header = String.fromCharCodes(pdfBytes.take(5));
      expect(header, '%PDF-');
    });

    test('DigitalReceiptService generates valid PDF bytes for UPI recharge with reference without crashing', () async {
      final upiReceipt = ReceiptBill.mockRecharge(
        paymentMethod: PaymentMethod.upi,
        paymentReference: 'UPI-TXN-REF-98765',
      );

      final pdfBytes = await receiptService.buildBillPdf(upiReceipt);
      expect(pdfBytes, isNotNull);
      expect(pdfBytes.isNotEmpty, isTrue);

      // Verify valid PDF magic header (%PDF-)
      final header = String.fromCharCodes(pdfBytes.take(5));
      expect(header, '%PDF-');
    });
  });
}
