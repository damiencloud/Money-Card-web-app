import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/permission_constants.dart';
import 'auth_provider.dart';

/// Provider for current user's permissions list
final userPermissionsProvider = Provider<List<AppPermission>>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.permissions ?? [];
});

/// Provider family to check a single permission
final hasPermissionProvider =
    Provider.family<bool, AppPermission>((ref, permission) {
  final permissions = ref.watch(userPermissionsProvider);
  return permissions.contains(permission);
});

/// Provider family to check if user has ANY of the specified permissions
final canAccessProvider =
    Provider.family<bool, List<AppPermission>>((ref, requiredPermissions) {
  if (requiredPermissions.isEmpty) return true;
  final permissions = ref.watch(userPermissionsProvider);
  return requiredPermissions.any((p) => permissions.contains(p));
});

/// Provider family to check if user has ALL of the specified permissions
final canPerformProvider =
    Provider.family<bool, List<AppPermission>>((ref, requiredPermissions) {
  if (requiredPermissions.isEmpty) return true;
  final permissions = ref.watch(userPermissionsProvider);
  return requiredPermissions.every((p) => permissions.contains(p));
});

/// Helper class for imperative permission checks
class PermissionChecker {
  final List<AppPermission> permissions;

  const PermissionChecker(this.permissions);

  bool hasPermission(AppPermission permission) => permissions.contains(permission);

  bool canAccess(List<AppPermission> requiredPermissions) {
    if (requiredPermissions.isEmpty) return true;
    return requiredPermissions.any((p) => permissions.contains(p));
  }

  bool canPerform(List<AppPermission> requiredPermissions) {
    if (requiredPermissions.isEmpty) return true;
    return requiredPermissions.every((p) => permissions.contains(p));
  }
}

final permissionCheckerProvider = Provider<PermissionChecker>((ref) {
  final permissions = ref.watch(userPermissionsProvider);
  return PermissionChecker(permissions);
});
