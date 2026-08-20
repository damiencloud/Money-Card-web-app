class Plan {
  final String id;
  final String name;
  final String status;
  final double price;
  final String currency;
  final String billingInterval;
  final int branchLimit;
  final int staffLimit;
  final int cardLimit;
  final String inventoryLevel;
  final String reportsLevel;
  final String analyticsLevel;
  final bool multiBranchEnabled;
  final bool whiteLabelEnabled;
  final String supportLevel;

  const Plan({
    required this.id,
    required this.name,
    this.status = 'ACTIVE',
    required this.price,
    this.currency = 'INR',
    this.billingInterval = 'MONTHLY',
    required this.branchLimit,
    required this.staffLimit,
    required this.cardLimit,
    this.inventoryLevel = 'Advanced',
    this.reportsLevel = 'Yes',
    this.analyticsLevel = 'Advanced',
    this.multiBranchEnabled = true,
    this.whiteLabelEnabled = true,
    this.supportLevel = 'Priority',
  });

  factory Plan.fromJson(Map<String, dynamic> json) {
    return Plan(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'INR',
      billingInterval: json['billingInterval'] as String? ?? json['billing_interval'] as String? ?? 'MONTHLY',
      branchLimit: (json['branchLimit'] as num?)?.toInt() ?? (json['branch_limit'] as num?)?.toInt() ?? 1,
      staffLimit: (json['staffLimit'] as num?)?.toInt() ?? (json['staff_limit'] as num?)?.toInt() ?? 5,
      cardLimit: (json['cardLimit'] as num?)?.toInt() ?? (json['card_limit'] as num?)?.toInt() ?? 50,
      inventoryLevel: json['inventoryLevel'] as String? ?? json['inventory_level'] as String? ?? 'Advanced',
      reportsLevel: json['reportsLevel'] as String? ?? json['reports_level'] as String? ?? 'Yes',
      analyticsLevel: json['analyticsLevel'] as String? ?? json['analytics_level'] as String? ?? 'Advanced',
      multiBranchEnabled: json['multiBranchEnabled'] as bool? ?? json['multi_branch_enabled'] as bool? ?? true,
      whiteLabelEnabled: json['whiteLabelEnabled'] as bool? ?? json['white_label_enabled'] as bool? ?? true,
      supportLevel: json['supportLevel'] as String? ?? json['support_level'] as String? ?? 'Priority',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'status': status,
        'price': price,
        'currency': currency,
        'billingInterval': billingInterval,
        'branchLimit': branchLimit,
        'staffLimit': staffLimit,
        'cardLimit': cardLimit,
        'inventoryLevel': inventoryLevel,
        'reportsLevel': reportsLevel,
        'analyticsLevel': analyticsLevel,
        'multiBranchEnabled': multiBranchEnabled,
        'whiteLabelEnabled': whiteLabelEnabled,
        'supportLevel': supportLevel,
      };
}

class Subscription {
  final String id;
  final String organizationId;
  final String planId;
  final String status;
  final String startDate;
  final String endDate;
  final String renewalDate;
  final String paymentStatus;

  const Subscription({
    required this.id,
    required this.organizationId,
    required this.planId,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.renewalDate,
    required this.paymentStatus,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id'] as String? ?? '',
      organizationId: json['organizationId'] as String? ?? json['organization_id'] as String? ?? '',
      planId: json['planId'] as String? ?? json['plan_id'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      startDate: json['startDate'] as String? ?? json['start_date'] as String? ?? '',
      endDate: json['endDate'] as String? ?? json['end_date'] as String? ?? '',
      renewalDate: json['renewalDate'] as String? ?? json['renewal_date'] as String? ?? '',
      paymentStatus: json['paymentStatus'] as String? ?? json['payment_status'] as String? ?? 'SUCCESS',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'organizationId': organizationId,
        'planId': planId,
        'status': status,
        'startDate': startDate,
        'endDate': endDate,
        'renewalDate': renewalDate,
        'paymentStatus': paymentStatus,
      };
}
