class Branch {
  final String id;
  final String organizationId;
  final String name;
  final String status; // 'ACTIVE' | 'INACTIVE'
  final String? upiId;
  final String? upiQrPayload;
  final String? createdAt;
  final String? updatedAt;

  const Branch({
    required this.id,
    required this.organizationId,
    required this.name,
    this.status = 'ACTIVE',
    this.upiId,
    this.upiQrPayload,
    this.createdAt,
    this.updatedAt,
  });

  factory Branch.fromJson(Map<String, dynamic> json) {
    return Branch(
      id: json['id'] as String? ?? '',
      organizationId: json['organizationId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      upiId: json['upiId'] as String?,
      upiQrPayload: json['upiQrPayload'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'organizationId': organizationId,
        'name': name,
        'status': status,
        'upiId': ?upiId,
        'upiQrPayload': ?upiQrPayload,
        'createdAt': ?createdAt,
        'updatedAt': ?updatedAt,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Branch && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}
