import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/permission_constants.dart';
import '../../providers/permission_provider.dart';
import '../states/app_unauthorized_state.dart';

enum PermissionGuardMode {
  any,
  all,
}

/// Declarative widget that conditionally displays UI based on Staff permissions.
class PermissionGuard extends ConsumerWidget {
  final List<AppPermission> permissions;
  final PermissionGuardMode mode;
  final Widget child;
  final Widget? fallback;
  final bool showUnauthorizedScreen;

  const PermissionGuard({
    super.key,
    required this.permissions,
    this.mode = PermissionGuardMode.all,
    required this.child,
    this.fallback,
    this.showUnauthorizedScreen = false,
  });

  factory PermissionGuard.single({
    Key? key,
    required AppPermission permission,
    required Widget child,
    Widget? fallback,
    bool showUnauthorizedScreen = false,
  }) {
    return PermissionGuard(
      key: key,
      permissions: [permission],
      mode: PermissionGuardMode.all,
      fallback: fallback,
      showUnauthorizedScreen: showUnauthorizedScreen,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final checker = ref.watch(permissionCheckerProvider);
    final hasAccess = mode == PermissionGuardMode.all
        ? checker.canPerform(permissions)
        : checker.canAccess(permissions);

    if (hasAccess) {
      return child;
    }

    if (showUnauthorizedScreen) {
      return const Scaffold(
        body: SafeArea(
          child: AppUnauthorizedState(),
        ),
      );
    }

    return fallback ?? const SizedBox.shrink();
  }
}
