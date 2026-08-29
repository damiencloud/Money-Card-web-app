import 'package:money_card_staff/core/config/app_config.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/errors/error_codes.dart';

void main() {
  AppConfig.apiMode = ApiMode.mock;
  group('ApiErrorCode & ApiException Mapping Tests', () {
    test('should correctly parse known M0 V10 ApiErrorCodes', () {
      expect(ApiErrorCode.fromString('UNAUTHORIZED'), ApiErrorCode.unauthorized);
      expect(ApiErrorCode.fromString('CARD_NOT_FOUND'), ApiErrorCode.cardNotFound);
      expect(ApiErrorCode.fromString('CARD_BLOCKED'), ApiErrorCode.cardBlocked);
      expect(ApiErrorCode.fromString('SESSION_NOT_FOUND'), ApiErrorCode.sessionNotFound);
      expect(ApiErrorCode.fromString('INSUFFICIENT_BALANCE'), ApiErrorCode.insufficientBalance);
      expect(ApiErrorCode.fromString('NON_EXISTENT_CODE'), ApiErrorCode.unknownError);
    });

    test('should map HTTP status codes to corresponding ApiException', () {
      final e400 = ApiException.fromStatusCode(400);
      expect(e400.code, ApiErrorCode.validationError);
      expect(e400.statusCode, 400);

      final e401 = ApiException.fromStatusCode(401);
      expect(e401.code, ApiErrorCode.unauthorized);
      expect(e401.statusCode, 401);

      final e403 = ApiException.fromStatusCode(403);
      expect(e403.code, ApiErrorCode.forbidden);
      expect(e403.statusCode, 403);

      final e404 = ApiException.fromStatusCode(404);
      expect(e404.code, ApiErrorCode.notFound);
      expect(e404.statusCode, 404);

      final e500 = ApiException.fromStatusCode(500);
      expect(e500.code, ApiErrorCode.serverError);
      expect(e500.statusCode, 500);
    });
  });
}
