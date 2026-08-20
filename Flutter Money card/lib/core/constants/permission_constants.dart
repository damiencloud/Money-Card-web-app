/// Exactly 20 permissions defined in M0 V10 Shared System Contract.
enum AppPermission {
  // Card (5)
  cardView('CARD_VIEW'),
  cardIssue('CARD_ISSUE'),
  cardReturn('CARD_RETURN'),
  cardBlock('CARD_BLOCK'),
  cardUnblock('CARD_UNBLOCK'),

  // Sessions / Payments (4)
  recharge('RECHARGE'),
  purchase('PURCHASE'),
  refund('REFUND'),
  sessionView('SESSION_VIEW'),

  // Products / Inventory (5)
  productView('PRODUCT_VIEW'),
  productManage('PRODUCT_MANAGE'),
  inventoryView('INVENTORY_VIEW'),
  inventoryManage('INVENTORY_MANAGE'),
  inventoryImport('INVENTORY_IMPORT'),

  // Analytics / Reports (2)
  viewAnalytics('VIEW_ANALYTICS'),
  viewReports('VIEW_REPORTS'),

  // Staff (2)
  staffView('STAFF_VIEW'),
  staffManage('STAFF_MANAGE'),

  // Branch (2)
  branchView('BRANCH_VIEW'),
  branchManage('BRANCH_MANAGE');

  const AppPermission(this.value);

  final String value;

  static AppPermission? fromString(String val) {
    for (final perm in AppPermission.values) {
      if (perm.value == val) return perm;
    }
    return null;
  }

  static List<AppPermission> fromStringList(List<dynamic>? list) {
    if (list == null) return [];
    return list
        .map((e) => AppPermission.fromString(e.toString()))
        .whereType<AppPermission>()
        .toList();
  }
}
