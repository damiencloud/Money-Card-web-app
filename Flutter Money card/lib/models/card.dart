import 'card_session.dart';

enum CardStatus {
  available('AVAILABLE'),
  active('ACTIVE'),
  blocked('BLOCKED');

  const CardStatus(this.value);

  final String value;

  static CardStatus fromString(String? val) {
    if (val == null) return CardStatus.available;
    for (final status in CardStatus.values) {
      if (status.value == val) return status;
    }
    return CardStatus.available;
  }
}

/// Physical card entity according to M0 V10 specification.
class Card {
  final String id;
  final String organizationId;
  final String qrToken;
  final String physicalCardNumber;
  final CardStatus status;
  final String? currentBranchId;
  final String? createdAt;
  final String? updatedAt;

  const Card({
    required this.id,
    required this.organizationId,
    required this.qrToken,
    required this.physicalCardNumber,
    required this.status,
    this.currentBranchId,
    this.createdAt,
    this.updatedAt,
  });

  factory Card.fromJson(Map<String, dynamic> json) {
    return Card(
      id: json['id'] as String? ?? '',
      organizationId: json['organizationId'] as String? ?? '',
      qrToken: json['qrToken'] as String? ?? '',
      physicalCardNumber: json['physicalCardNumber'] as String? ?? '',
      status: CardStatus.fromString(json['status'] as String?),
      currentBranchId: json['currentBranchId'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'organizationId': organizationId,
        'qrToken': qrToken,
        'physicalCardNumber': physicalCardNumber,
        'status': status.value,
        if (currentBranchId != null) 'currentBranchId': currentBranchId,
        if (createdAt != null) 'createdAt': createdAt,
        if (updatedAt != null) 'updatedAt': updatedAt,
      };

  Card copyWith({
    String? id,
    String? organizationId,
    String? qrToken,
    String? physicalCardNumber,
    CardStatus? status,
    String? currentBranchId,
    String? createdAt,
    String? updatedAt,
  }) {
    return Card(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      qrToken: qrToken ?? this.qrToken,
      physicalCardNumber: physicalCardNumber ?? this.physicalCardNumber,
      status: status ?? this.status,
      currentBranchId: currentBranchId ?? this.currentBranchId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Response payload from resolving a scanned QR token
class ResolveQrResponseData {
  final Card card;
  final CardSession? session;

  const ResolveQrResponseData({
    required this.card,
    this.session,
  });

  factory ResolveQrResponseData.fromJson(Map<String, dynamic> json) {
    if (json.containsKey('card') && json['card'] is Map<String, dynamic>) {
      return ResolveQrResponseData(
        card: Card.fromJson(json['card'] as Map<String, dynamic>),
        session: json['session'] != null && json['session'] is Map<String, dynamic>
            ? CardSession.fromJson(json['session'] as Map<String, dynamic>)
            : null,
      );
    }

    // Flat structure support
    final cardId = json['cardId'] as String? ?? json['id'] as String? ?? '';
    final physicalCardNumber = json['physicalCardNumber'] as String? ?? '';
    final qrToken = json['qrToken'] as String? ?? 'QR-$physicalCardNumber';
    final orgId = json['organizationId'] as String? ?? '';
    final branchId = json['branchId'] as String? ?? json['currentBranchId'] as String?;
    final statusStr = json['status'] as String? ?? 'AVAILABLE';

    final card = Card(
      id: cardId,
      organizationId: orgId,
      qrToken: qrToken,
      physicalCardNumber: physicalCardNumber,
      status: CardStatus.fromString(statusStr),
      currentBranchId: branchId,
    );

    final activeSessionId = json['activeSessionId'] as String?;
    final activeBalance = (json['activeBalance'] as num?)?.toDouble() ?? 0.0;
    final session = activeSessionId != null
        ? CardSession(
            id: activeSessionId,
            cardId: cardId,
            branchId: branchId ?? '',
            status: SessionStatus.active,
            balance: activeBalance,
            startedAt: DateTime.now().toIso8601String(),
          )
        : null;

    return ResolveQrResponseData(
      card: card,
      session: session,
    );
  }

  Map<String, dynamic> toJson() => {
        'card': card.toJson(),
        if (session != null) 'session': session!.toJson(),
      };
}
