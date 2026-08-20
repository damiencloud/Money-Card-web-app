import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/core/errors/api_exception.dart';
import 'package:money_card_staff/core/network/dio_client.dart';
import 'package:money_card_staff/core/network/interceptors/mock_api_interceptor.dart';
import 'package:money_card_staff/core/storage/secure_storage_service.dart';
import 'package:money_card_staff/features/more/mock_qr_codes_screen.dart';
import 'package:money_card_staff/models/card.dart';
import 'package:money_card_staff/models/card_session.dart';
import 'package:money_card_staff/repositories/card_repository.dart';
import 'package:money_card_staff/repositories/session_repository.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/card_service.dart';
import 'package:money_card_staff/services/session_service.dart';
import 'package:qr_flutter/qr_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late CardRepository cardRepository;
  late SessionRepository sessionRepository;

  setUp(() {
    MockApiInterceptor.resetMockData();
    final tokenStorage = InMemoryTokenStorage();
    final dioClient = DioClient.create(
      tokenStorage: tokenStorage,
      useMockApi: true,
    );
    final apiService = ApiService(dioClient.dio);
    cardRepository = CardRepository(CardService(apiService));
    sessionRepository = SessionRepository(SessionService(apiService));
  });

  group('Mock QR Code Resolution Tests', () {
    test('QR-MOCK-001 resolves to CARD001 with ACTIVE status and balance ₹750', () async {
      final result = await cardRepository.resolveCardByQr('QR-MOCK-001');

      expect(result.card.id, equals('CARD001'));
      expect(result.card.physicalCardNumber, equals('MC-001'));
      expect(result.card.status, equals(CardStatus.active));
      expect(result.session, isNotNull);
      expect(result.session!.balance, equals(750.0));
      expect(result.session!.status, equals(SessionStatus.active));
    });

    test('Issuing CARD004 (AVAILABLE) creates an ACTIVE session and transitions card to ACTIVE', () async {
      // 1. Resolve available card
      final resolveResult = await cardRepository.resolveCardByQr('QR-MOCK-004');
      expect(resolveResult.card.status, equals(CardStatus.available));

      // 2. Issue card session
      final session = await sessionRepository.createSession(
        cardId: resolveResult.card.id,
        branchId: 'branch-001',
      );

      expect(session.status, equals(SessionStatus.active));
      expect(session.cardId, equals('CARD004'));
      expect(session.balance, equals(0.0));

      // 3. Verify card is now ACTIVE
      final updatedResolve = await cardRepository.resolveCardByQr('QR-MOCK-004');
      expect(updatedResolve.card.status, equals(CardStatus.active));
    });

    test('QR-MOCK-002 resolves to CARD002 with ACTIVE status and session balance ₹350', () async {
      final result = await cardRepository.resolveCardByQr('QR-MOCK-002');

      expect(result.card.id, equals('CARD002'));
      expect(result.card.physicalCardNumber, equals('MC-002'));
      expect(result.card.status, equals(CardStatus.active));
      expect(result.session, isNotNull);
      expect(result.session!.balance, equals(350.0));
      expect(result.session!.status, equals(SessionStatus.active));
    });

    test('QR-MOCK-003 resolves to CARD003 with BLOCKED status', () async {
      final result = await cardRepository.resolveCardByQr('QR-MOCK-003');

      expect(result.card.id, equals('CARD003'));
      expect(result.card.physicalCardNumber, equals('MC-003'));
      expect(result.card.status, equals(CardStatus.blocked));
    });

    test('Unknown QR code throws 404 ApiException NOT_FOUND', () async {
      expect(
        () => cardRepository.resolveCardByQr('QR-UNKNOWN-RANDOM-TOKEN-999'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.statusCode,
            'statusCode',
            404,
          ),
        ),
      );
    });
  });

  group('MockQrCodesScreen Widget Tests', () {
    testWidgets('Renders all mock QR cards with QrImageView and tokens', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: MockQrCodesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check header banner
      expect(find.text('Mock QR Codes (Dev Tools)'), findsOneWidget);
      expect(find.textContaining('Point your physical camera'), findsOneWidget);

      // Check QR Cards & Tokens
      expect(find.text('MC-001'), findsOneWidget);
      expect(find.text('Token: QR-MOCK-001'), findsOneWidget);
      expect(find.text('ACTIVE'), findsWidgets);

      await tester.scrollUntilVisible(
        find.text('Token: QR-MOCK-002'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('MC-002'), findsOneWidget);
      expect(find.text('Token: QR-MOCK-002'), findsOneWidget);
      expect(find.text('ACTIVE'), findsWidgets);

      // Scroll to see MC-003
      await tester.scrollUntilVisible(
        find.text('Token: QR-MOCK-003'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('MC-003'), findsOneWidget);
      expect(find.text('Token: QR-MOCK-003'), findsOneWidget);
      expect(find.text('BLOCKED'), findsWidgets);

      // Check that QrImageView widgets exist
      expect(find.byType(QrImageView), findsWidgets);
    });
  });
}
