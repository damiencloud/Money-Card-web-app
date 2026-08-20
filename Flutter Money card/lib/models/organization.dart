class Organization {
  final String id;
  final String name;
  final String status; // 'ACTIVE' | 'INACTIVE'
  final String planId;
  final String? createdAt;
  final String? updatedAt;

  const Organization({
    required this.id,
    required this.name,
    this.status = 'ACTIVE',
    required this.planId,
    this.createdAt,
    this.updatedAt,
  });

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      planId: json['planId'] as String? ?? '',
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'status': status,
        'planId': planId,
        if (createdAt != null) 'createdAt': createdAt,
        if (updatedAt != null) 'updatedAt': updatedAt,
      };
}
