import '../core/constants/permission_constants.dart';

/// Staff User representation conforming to M0 V10 Shared System Contract.
class AuthUser {
  final String id;
  final String email;
  final String name;
  final String role; // 'STAFF'
  final String? organizationId;
  final List<AppPermission> permissions;
  final List<String> assignedBranchIds;
  final String? createdAt;
  final String? updatedAt;

  const AuthUser({
    required this.id,
    required this.email,
    required this.name,
    this.role = 'STAFF',
    this.organizationId,
    required this.permissions,
    required this.assignedBranchIds,
    this.createdAt,
    this.updatedAt,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'STAFF',
      organizationId: json['organizationId'] as String?,
      permissions: AppPermission.fromStringList(json['permissions'] as List<dynamic>?),
      assignedBranchIds: (json['assignedBranchIds'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'organizationId': organizationId,
        'permissions': permissions.map((p) => p.value).toList(),
        'assignedBranchIds': assignedBranchIds,
        if (createdAt != null) 'createdAt': createdAt,
        if (updatedAt != null) 'updatedAt': updatedAt,
      };

  bool hasPermission(AppPermission permission) {
    return permissions.contains(permission);
  }

  bool isAssignedToBranch(String branchId) {
    return assignedBranchIds.contains(branchId);
  }
}

/// Authentication payload returned upon successful login / refresh
class AuthResponseData {
  final String accessToken;
  final String? refreshToken;
  final AuthUser user;

  const AuthResponseData({
    required this.accessToken,
    this.refreshToken,
    required this.user,
  });

  factory AuthResponseData.fromJson(Map<String, dynamic> json) {
    return AuthResponseData(
      accessToken: json['accessToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String?,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>? ?? {}),
    );
  }

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        if (refreshToken != null) 'refreshToken': refreshToken,
        'user': user.toJson(),
      };
}
