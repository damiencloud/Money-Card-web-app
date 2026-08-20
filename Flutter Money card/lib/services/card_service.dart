import '../core/constants/api_endpoints.dart';
import '../models/card.dart';
import 'api_service.dart';

class CardService {
  final ApiService _apiService;

  CardService(this._apiService);

  /// Resolve card by scanned opaque QR token (POST /api/v1/cards/resolve)
  Future<ResolveQrResponseData> resolveQr(String qrToken) async {
    return _apiService.post<ResolveQrResponseData>(
      ApiEndpoints.resolveQr,
      data: {'qrToken': qrToken},
      fromJson: (data) => ResolveQrResponseData.fromJson(data as Map<String, dynamic>),
    );
  }

  /// List cards in branch/org (GET /api/v1/cards)
  Future<List<Card>> getCards({
    String? branchId,
    String? status,
    String? search,
    int? page,
    int? limit,
  }) async {
    final queryParameters = <String, dynamic>{
      'branchId': ?branchId,
      'status': ?status,
      if (search != null && search.isNotEmpty) 'search': search,
      'page': ?page,
      'limit': ?limit,
    };

    return _apiService.get<List<Card>>(
      ApiEndpoints.cards,
      queryParameters: queryParameters,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((item) => Card.fromJson(item as Map<String, dynamic>))
              .toList();
        } else if (data is Map<String, dynamic> && data['items'] is List) {
          return (data['items'] as List)
              .map((item) => Card.fromJson(item as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }

  /// Get card details by card ID (GET /api/v1/cards/:id)
  Future<Card> getCardById(String id) async {
    return _apiService.get<Card>(
      ApiEndpoints.cardById(id),
      fromJson: (data) => Card.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Issue/Create a new physical card (POST /api/v1/cards)
  Future<Card> createCard({
    required String physicalCardNumber,
    required String branchId,
  }) async {
    return _apiService.post<Card>(
      ApiEndpoints.cards,
      data: {
        'physicalCardNumber': physicalCardNumber,
        'branchId': branchId,
      },
      fromJson: (data) => Card.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Block card with reason (POST /api/v1/cards/:id/block)
  Future<Card> blockCard({
    required String id,
    required String reason,
  }) async {
    return _apiService.post<Card>(
      ApiEndpoints.blockCard(id),
      data: {'reason': reason},
      fromJson: (data) => Card.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Unblock card (POST /api/v1/cards/:id/unblock)
  Future<Card> unblockCard(String id) async {
    return _apiService.post<Card>(
      ApiEndpoints.unblockCard(id),
      fromJson: (data) => Card.fromJson(data as Map<String, dynamic>),
    );
  }
}
