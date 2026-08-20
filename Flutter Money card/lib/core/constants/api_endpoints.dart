class ApiEndpoints {
  ApiEndpoints._();

  // Auth endpoints (M0 V10 Section 7)
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String changePassword = '/auth/change-password';

  // Cards endpoints (M0 V10 Section 7)
  static const String cards = '/cards';
  static const String resolveCard = '/cards/resolve';
  static const String resolveQr = '/cards/resolve'; // Alias for QR resolve
  static String cardById(String id) => '/cards/$id';
  static String blockCard(String id) => '/cards/$id/block';
  static String unblockCard(String id) => '/cards/$id/unblock';
  static const String cardsImport = '/cards/import';
  static const String cardsImportTemplate = '/cards/import/template';

  // Card Sessions endpoints (M0 V10 Section 7)
  static const String cardSessions = '/card-sessions';
  static const String sessions = '/card-sessions'; // Alias
  static String cardSessionById(String id) => '/card-sessions/$id';
  static String sessionById(String id) => '/card-sessions/$id';
  static String rechargeCardSession(String id) => '/card-sessions/$id/recharge';
  static String rechargeSession(String id) => '/card-sessions/$id/recharge';
  static String purchaseCardSession(String id) => '/card-sessions/$id/purchase';
  static String purchaseSession(String id) => '/card-sessions/$id/purchase';
  static String returnCardSession(String id) => '/card-sessions/$id/return';
  static String returnSession(String id) => '/card-sessions/$id/return';
  static String refundCardSession(String id) => '/card-sessions/$id/refund';

  // Products & Inventory endpoints (M0 V10 Section 7)
  static const String products = '/products';
  static String productById(String id) => '/products/$id';
  static const String inventory = '/inventory';
  static String inventoryById(String id) => '/inventory/$id';
  static const String inventoryImport = '/inventory/import';
  static const String inventoryImportTemplate = '/inventory/import/template';

  // Branch & Staff endpoints (M0 V10 Section 7)
  static const String branches = '/branches';
  static String branchById(String id) => '/branches/$id';
  static const String staff = '/staff';
  static String staffById(String id) => '/staff/$id';
  static String staffBranches(String id) => '/staff/$id/branches';
  static String staffPermissions(String id) => '/staff/$id/permissions';
  static const String permissions = '/permissions';

  // Analytics & Reports endpoints (M0 V10 Section 7)
  static const String analytics = '/analytics';
  static const String analyticsExport = '/analytics/export';
  static const String reports = '/reports';
  static String reportPdfById(String id) => '/reports/$id/pdf';
}
