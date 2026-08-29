import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/models/api_response.dart';
import 'package:money_card_staff/models/auth_user.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/models/card.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/models/product.dart';
import 'package:money_card_staff/models/subscription.dart';
import 'package:money_card_staff/models/transaction.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('M0 V10 Data Models Serialization Tests', () {
    test('AuthUser serialization & deserialization', () {
      final json = {
        'id': 'staff-1',
        'email': 'staff@moneycard.io',
        'name': 'Alex Morgan',
        'role': 'STAFF',
        'organizationId': 'org-1',
        'assignedBranchIds': ['branch-1', 'branch-2'],
        'permissions': ['CARD_VIEW', 'RECHARGE', 'PURCHASE'],
      };

      final user = AuthUser.fromJson(json);
      expect(user.id, 'staff-1');
      expect(user.email, 'staff@moneycard.io');
      expect(user.role, 'STAFF');
      expect(user.permissions.length, 3);
      expect(user.hasPermission(AppPermission.cardView), isTrue);
      expect(user.hasPermission(AppPermission.staffManage), isFalse);
      expect(user.isAssignedToBranch('branch-1'), isTrue);
      expect(user.isAssignedToBranch('branch-3'), isFalse);

      final userJson = user.toJson();
      expect(userJson['email'], 'staff@moneycard.io');
      expect((userJson['permissions'] as List).contains('CARD_VIEW'), isTrue);
    });

    test('Branch serialization & deserialization', () {
      final json = {
        'id': 'b-101',
        'organizationId': 'org-1',
        'name': 'Main Cafeteria',
        'status': 'ACTIVE',
      };

      final branch = Branch.fromJson(json);
      expect(branch.id, 'b-101');
      expect(branch.name, 'Main Cafeteria');
      expect(branch.status, 'ACTIVE');

      expect(branch.toJson()['name'], 'Main Cafeteria');
    });

    test('Card & CardSession serialization & deserialization', () {
      final cardJson = {
        'id': 'card-1',
        'organizationId': 'org-1',
        'qrToken': 'qr-token-abc',
        'physicalCardNumber': 'MC-001',
        'status': 'ACTIVE',
        'currentBranchId': 'b-101',
      };

      final card = Card.fromJson(cardJson);
      expect(card.id, 'card-1');
      expect(card.physicalCardNumber, 'MC-001');
      expect(card.status, CardStatus.active);

      final sessionJson = {
        'id': 'sess-1',
        'cardId': 'card-1',
        'branchId': 'b-101',
        'status': 'ACTIVE',
        'balance': 250.50,
        'startedAt': '2026-08-14T10:00:00Z',
      };

      final session = CardSession.fromJson(sessionJson);
      expect(session.id, 'sess-1');
      expect(session.balance, 250.50);
      expect(session.status, SessionStatus.active);
    });

    test('Product serialization with multi-select category array and no tags', () {
      final prodJson = {
        'id': 'p-1',
        'branchId': 'b-101',
        'itemName': 'Veg Burger',
        'category': ['Veg', 'Fast Food'],
        'price': 120.0,
        'status': 'ACTIVE',
      };

      final product = Product.fromJson(prodJson);
      expect(product.id, 'p-1');
      expect(product.itemName, 'Veg Burger');
      expect(product.category, containsAll(['Veg', 'Fast Food']));
      expect(product.price, 120.0);

      final productMap = product.toJson();
      expect(productMap['category'], isA<List>());
      expect(productMap.containsKey('tags'), isFalse);
    });

    test('Plan serialization without transaction limit field (M0 V10)', () {
      final planJson = {
        'id': 'plan-pro',
        'name': 'Pro',
        'status': 'ACTIVE',
        'price': 4999.0,
        'currency': 'INR',
        'billingInterval': 'MONTHLY',
        'branchLimit': 10,
        'staffLimit': 75,
        'cardLimit': 5000,
      };

      final plan = Plan.fromJson(planJson);
      expect(plan.id, 'plan-pro');
      expect(plan.name, 'Pro');
      expect(plan.cardLimit, 5000);
      expect(plan.toJson().containsKey('transactionLimit'), isFalse);
    });

    test('Transaction serialization & deserialization', () {
      final txJson = {
        'id': 'tx-1',
        'sessionId': 'sess-1',
        'branchId': 'b-101',
        'type': 'RECHARGE',
        'amount': 200.0,
        'status': 'SUCCESS',
        'paymentMethod': 'UPI',
      };

      final tx = Transaction.fromJson(txJson);
      expect(tx.id, 'tx-1');
      expect(tx.type, TransactionType.recharge);
      expect(tx.paymentMethod, PaymentMethod.upi);
      expect(tx.amount, 200.0);
    });

    test('ApiResponse and ApiErrorResponse envelopes', () {
      final successJson = {
        'success': true,
        'data': {'id': '123', 'name': 'Item'},
      };

      final successResp = ApiResponse<Map<String, dynamic>>.fromJson(
        successJson,
        (data) => data as Map<String, dynamic>,
      );
      expect(successResp.success, isTrue);
      expect(successResp.data['id'], '123');

      final errorJson = {
        'success': false,
        'error': {
          'code': 'VALIDATION_ERROR',
          'message': 'Invalid input data',
        },
      };

      final errorResp = ApiErrorResponse.fromJson(errorJson);
      expect(errorResp.success, isFalse);
      expect(errorResp.error.message, 'Invalid input data');
    });
  });
}
