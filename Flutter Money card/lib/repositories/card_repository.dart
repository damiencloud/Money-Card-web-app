import '../models/card.dart';
import '../services/card_service.dart';

class CardRepository {
  final CardService _cardService;

  CardRepository(this._cardService);

  Future<ResolveQrResponseData> resolveCardByQr(String qrToken) async {
    return _cardService.resolveQr(qrToken);
  }

  Future<List<Card>> getCards({
    String? branchId,
    String? status,
    String? search,
    int? page,
    int? limit,
  }) async {
    return _cardService.getCards(
      branchId: branchId,
      status: status,
      search: search,
      page: page,
      limit: limit,
    );
  }

  Future<Card> getCardById(String id) async {
    return _cardService.getCardById(id);
  }

  Future<Card> issueCard({
    required String physicalCardNumber,
    required String branchId,
  }) async {
    return _cardService.createCard(
      physicalCardNumber: physicalCardNumber,
      branchId: branchId,
    );
  }

  Future<Card> blockCard({
    required String id,
    required String reason,
  }) async {
    return _cardService.blockCard(id: id, reason: reason);
  }

  Future<Card> unblockCard(String id) async {
    return _cardService.unblockCard(id);
  }
}
