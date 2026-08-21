import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/errors/api_exception.dart';
import '../models/card.dart';
import '../models/card_session.dart';
import '../repositories/card_repository.dart';
import '../repositories/session_repository.dart';
import 'api_providers.dart';
import 'branch_provider.dart';
import 'session_operations_provider.dart';

// ==========================================
// 1. CARDS LIST STATE & NOTIFIER
// ==========================================

class CardListState {
  final bool isLoading;
  final List<Card> cards;
  final String selectedStatusFilter; // 'ALL', 'AVAILABLE', 'ACTIVE', 'BLOCKED'
  final String searchQuery;
  final String? errorMessage;

  const CardListState({
    this.isLoading = false,
    this.cards = const [],
    this.selectedStatusFilter = 'ALL',
    this.searchQuery = '',
    this.errorMessage,
  });

  CardListState copyWith({
    bool? isLoading,
    List<Card>? cards,
    String? selectedStatusFilter,
    String? searchQuery,
    String? errorMessage,
  }) {
    return CardListState(
      isLoading: isLoading ?? this.isLoading,
      cards: cards ?? this.cards,
      selectedStatusFilter: selectedStatusFilter ?? this.selectedStatusFilter,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class CardListNotifier extends StateNotifier<CardListState> {
  final CardRepository _cardRepository;
  final String? _currentBranchId;

  CardListNotifier(this._cardRepository, this._currentBranchId)
      : super(const CardListState()) {
    loadCards();
  }

  Future<void> loadCards() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final statusParam =
          state.selectedStatusFilter == 'ALL' ? null : state.selectedStatusFilter;

      final cards = await _cardRepository.getCards(
        branchId: _currentBranchId,
        status: statusParam,
        search: state.searchQuery.isNotEmpty ? state.searchQuery : null,
      );

      state = state.copyWith(
        isLoading: false,
        cards: cards,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load cards. Please try again.',
      );
    }
  }

  void setStatusFilter(String status) {
    state = state.copyWith(selectedStatusFilter: status);
    loadCards();
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
    loadCards();
  }
}

final StateNotifierProvider<CardListNotifier, CardListState> cardListNotifierProvider =
    StateNotifierProvider<CardListNotifier, CardListState>((ref) {
  final cardRepository = ref.watch(cardRepositoryProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  return CardListNotifier(cardRepository, currentBranch?.id);
});

// ==========================================
// 2. AVAILABLE CARDS STATE & NOTIFIER
// ==========================================

class AvailableCardsState {
  final bool isLoading;
  final List<Card> availableCards;
  final String searchQuery;
  final String? errorMessage;

  const AvailableCardsState({
    this.isLoading = false,
    this.availableCards = const [],
    this.searchQuery = '',
    this.errorMessage,
  });

  List<Card> get filteredCards {
    if (searchQuery.trim().isEmpty) return availableCards;
    final query = searchQuery.trim().toLowerCase();
    return availableCards.where((c) {
      final pcn = c.physicalCardNumber.toLowerCase();
      final id = c.id.toLowerCase();
      return pcn.contains(query) || id.contains(query);
    }).toList();
  }

  AvailableCardsState copyWith({
    bool? isLoading,
    List<Card>? availableCards,
    String? searchQuery,
    String? errorMessage,
  }) {
    return AvailableCardsState(
      isLoading: isLoading ?? this.isLoading,
      availableCards: availableCards ?? this.availableCards,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage,
    );
  }
}

class AvailableCardsNotifier extends StateNotifier<AvailableCardsState> {
  final CardRepository _cardRepository;
  final String? _currentBranchId;

  AvailableCardsNotifier(this._cardRepository, this._currentBranchId)
      : super(const AvailableCardsState()) {
    loadAvailableCards();
  }

  Future<void> loadAvailableCards() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final cards = await _cardRepository.getCards(
        branchId: _currentBranchId,
        status: 'AVAILABLE',
      );
      state = state.copyWith(
        isLoading: false,
        availableCards: cards,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load available cards.',
      );
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }
}

final StateNotifierProvider<AvailableCardsNotifier, AvailableCardsState> availableCardsNotifierProvider =
    StateNotifierProvider<AvailableCardsNotifier, AvailableCardsState>((ref) {
  final cardRepository = ref.watch(cardRepositoryProvider);
  final currentBranch = ref.watch(currentBranchProvider);
  return AvailableCardsNotifier(cardRepository, currentBranch?.id);
});

// ==========================================
// 3. CARD DETAILS STATE & NOTIFIER
// ==========================================

class CardDetailsState {
  final bool isLoading;
  final bool isSubmitting;
  final Card? card;
  final CardSession? activeSession;
  final String? errorMessage;
  final String? successMessage;

  const CardDetailsState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.card,
    this.activeSession,
    this.errorMessage,
    this.successMessage,
  });

  CardDetailsState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    Card? card,
    CardSession? activeSession,
    String? errorMessage,
    String? successMessage,
  }) {
    return CardDetailsState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      card: card ?? this.card,
      activeSession: activeSession ?? this.activeSession,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

class CardDetailsNotifier extends StateNotifier<CardDetailsState> {
  final CardRepository _cardRepository;
  final SessionRepository _sessionRepository;
  final void Function()? _onSessionCreated;

  CardDetailsNotifier(this._cardRepository, this._sessionRepository, [this._onSessionCreated])
      : super(const CardDetailsState());

  /// Resolve card by scanned QR
  Future<bool> resolveCardByQr(String qrToken) async {
    state = state.copyWith(isLoading: true, errorMessage: null, successMessage: null);
    try {
      final result = await _cardRepository.resolveCardByQr(qrToken);
      state = state.copyWith(
        isLoading: false,
        card: result.card,
        activeSession: result.session,
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to resolve card QR. Please try again.',
      );
      return false;
    }
  }

  /// Load card by ID
  Future<void> loadCardById(String cardId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final card = await _cardRepository.getCardById(cardId);
      state = state.copyWith(
        isLoading: false,
        card: card,
        activeSession: card.activeSession,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load card details.',
      );
    }
  }

  /// Issue an existing AVAILABLE card and start active session (POST /api/v1/card-sessions)
  Future<CardSession?> issueCardSession({
    required String cardId,
    required String branchId,
  }) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      final session = await _sessionRepository.createSession(
        cardId: cardId,
        branchId: branchId,
      );

      final updatedCard = state.card?.copyWith(
            status: CardStatus.active,
            currentBranchId: branchId,
          ) ??
          Card(
            id: cardId,
            organizationId: '',
            qrToken: '',
            physicalCardNumber: cardId,
            status: CardStatus.active,
            currentBranchId: branchId,
          );

      state = state.copyWith(
        isSubmitting: false,
        card: updatedCard,
        activeSession: session,
        successMessage: 'Card issued and active session started successfully.',
      );

      _onSessionCreated?.call();

      return session;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to issue card. Please try again.',
      );
      return null;
    }
  }

  /// Create a new physical card (legacy helper)
  Future<Card?> issueNewCard({
    required String physicalCardNumber,
    required String branchId,
  }) async {
    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      final newCard = await _cardRepository.issueCard(
        physicalCardNumber: physicalCardNumber,
        branchId: branchId,
      );
      state = state.copyWith(
        isSubmitting: false,
        card: newCard,
        successMessage: 'Card ${newCard.physicalCardNumber} created successfully.',
      );
      return newCard;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return null;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to issue card. Please try again.',
      );
      return null;
    }
  }

  /// Block card
  Future<bool> blockCard({required String reason}) async {
    if (state.card == null || state.isSubmitting) return false;

    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      final updatedCard = await _cardRepository.blockCard(
        id: state.card!.id,
        reason: reason,
      );
      state = state.copyWith(
        isSubmitting: false,
        card: updatedCard,
        successMessage: 'Card blocked successfully.',
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to block card. Please try again.',
      );
      return false;
    }
  }

  /// Unblock card
  Future<bool> unblockCard() async {
    if (state.card == null || state.isSubmitting) return false;

    state = state.copyWith(isSubmitting: true, errorMessage: null);
    try {
      final updatedCard = await _cardRepository.unblockCard(state.card!.id);
      state = state.copyWith(
        isSubmitting: false,
        card: updatedCard,
        successMessage: 'Card unblocked successfully.',
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to unblock card. Please try again.',
      );
      return false;
    }
  }

  void setResolvedCard(Card card, CardSession? session) {
    state = CardDetailsState(
      card: card,
      activeSession: session,
    );
  }

  void clearMessages() {
    state = state.copyWith(errorMessage: null, successMessage: null);
  }
}

final StateNotifierProvider<CardDetailsNotifier, CardDetailsState> cardDetailsNotifierProvider =
    StateNotifierProvider<CardDetailsNotifier, CardDetailsState>((ref) {
  final cardRepository = ref.watch(cardRepositoryProvider);
  final sessionRepository = ref.watch(sessionRepositoryProvider);
  return CardDetailsNotifier(cardRepository, sessionRepository, () {
    try {
      ref.read(sessionListNotifierProvider.notifier).loadSessions();
    } catch (_) {}
  });
});
