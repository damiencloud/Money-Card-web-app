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
  /// Clean user-facing card display number without internal cycle suffixes.
  String get displayCardNumber {
    if (physicalCardNumber.trim().isNotEmpty) {
      return cleanDisplayCardNumber(physicalCardNumber);
    }
    return 'Card';
  }

  final String id;
  final String organizationId;
  final String qrToken;
  final String physicalCardNumber;
  final CardStatus status;
  final String? blockedReason;
  final String? blockedBy;
  final String? currentBranchId;
  final String? currentBranchName;
  final CardSession? activeSession;
  final String? createdAt;
  final String? updatedAt;

  const Card({
    required this.id,
    required this.organizationId,
    required this.qrToken,
    required this.physicalCardNumber,
    required this.status,
    this.blockedReason,
    this.blockedBy,
    this.currentBranchId,
    this.currentBranchName,
    this.activeSession,
    this.createdAt,
    this.updatedAt,
  });

  factory Card.fromJson(Map<String, dynamic> json) {
    CardSession? session;
    if (json['activeSession'] != null && json['activeSession'] is Map<String, dynamic>) {
      session = CardSession.fromJson(json['activeSession'] as Map<String, dynamic>);
    } else if (json['sessions'] != null && json['sessions'] is List && (json['sessions'] as List).isNotEmpty) {
      final sessList = json['sessions'] as List;
      final activeJson = sessList.firstWhere(
        (s) => s is Map<String, dynamic> && (s['status'] == 'ACTIVE' || s['sessionStatus'] == 'ACTIVE'),
        orElse: () => sessList.first,
      );
      if (activeJson is Map<String, dynamic>) {
        session = CardSession.fromJson(activeJson);
      }
    }

    String? branchName = json['currentBranchName'] as String? ??
        session?.branchName ??
        (json['branch'] != null && json['branch'] is Map ? json['branch']['name'] as String? : null);

    return Card(
      id: json['id'] as String? ?? '',
      organizationId: json['organizationId'] as String? ?? '',
      qrToken: json['qrToken'] as String? ?? '',
      physicalCardNumber: json['physicalCardNumber'] as String? ?? '',
      status: CardStatus.fromString(json['status'] as String?),
      blockedReason: json['blockedReason'] as String?,
      blockedBy: json['blockedBy'] as String?,
      currentBranchId: json['currentBranchId'] as String? ?? session?.branchId,
      currentBranchName: branchName,
      activeSession: session,
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
        if (blockedReason != null) 'blockedReason': blockedReason,
        if (blockedBy != null) 'blockedBy': blockedBy,
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
    String? blockedReason,
    String? blockedBy,
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
      blockedReason: blockedReason ?? this.blockedReason,
      blockedBy: blockedBy ?? this.blockedBy,
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
      final sessionData = json['activeSession'] ?? json['session'];
      return ResolveQrResponseData(
        card: Card.fromJson(json['card'] as Map<String, dynamic>),
        session: sessionData != null && sessionData is Map<String, dynamic>
            ? CardSession.fromJson(sessionData)
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
