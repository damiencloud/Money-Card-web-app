import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/constants/permission_constants.dart';
import 'package:money_card_staff/providers/permission_provider.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('PermissionChecker Unit Tests', () {
    test('hasPermission returns true only if permission exists', () {
      const checker = PermissionChecker([
        AppPermission.cardView,
        AppPermission.cardIssue,
        AppPermission.recharge,
      ]);

      expect(checker.hasPermission(AppPermission.cardView), isTrue);
      expect(checker.hasPermission(AppPermission.cardIssue), isTrue);
      expect(checker.hasPermission(AppPermission.recharge), isTrue);
      expect(checker.hasPermission(AppPermission.cardBlock), isFalse);
      expect(checker.hasPermission(AppPermission.staffManage), isFalse);
    });

    test('canAccess returns true if ANY of the permissions match', () {
      const checker = PermissionChecker([
        AppPermission.cardView,
      ]);

      expect(
        checker.canAccess([AppPermission.cardView, AppPermission.cardIssue]),
        isTrue,
      );

      expect(
        checker.canAccess([AppPermission.cardBlock, AppPermission.cardReturn]),
        isFalse,
      );
    });

    test('canPerform returns true only if ALL permissions match', () {
      const checker = PermissionChecker([
        AppPermission.cardView,
        AppPermission.cardIssue,
      ]);

      expect(
        checker.canPerform([AppPermission.cardView, AppPermission.cardIssue]),
        isTrue,
      );

      expect(
        checker.canPerform([AppPermission.cardView, AppPermission.cardBlock]),
        isFalse,
      );
    });
  });
}
