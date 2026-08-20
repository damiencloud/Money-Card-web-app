import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/permission_constants.dart';
import '../../core/network/interceptors/mock_api_interceptor.dart';
import '../../providers/auth_provider.dart';
import '../../providers/branch_provider.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/section_header.dart';
import '../../widgets/guards/permission_guard.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final branch = ref.watch(currentBranchProvider);

    return ListView(
      padding: AppSpacing.paddingMd,
      children: [
        // Staff Profile Summary Card
        AppCard(
          padding: AppSpacing.paddingMd,
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.primaryLight,
                child: Text(
                  (user?.name.isNotEmpty ?? false) ? user!.name[0] : 'S',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.name ?? 'Staff User',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimaryLight,
                      ),
                    ),
                    Text(
                      '${user?.email ?? ''} • ${user?.role ?? 'STAFF'}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxs),
                    Text(
                      'Active Branch: ${branch?.name ?? 'Not Assigned'}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Features Section
        const SectionHeader(title: 'Operations & Management'),
        const SizedBox(height: AppSpacing.xs),

        PermissionGuard.single(
          permission: AppPermission.productView,
          child: _buildMenuTile(
            icon: Icons.fastfood_outlined,
            title: 'Products & Menu',
            subtitle: 'View and manage cafeteria menu items',
            onTap: () => context.push('/app/products'),
          ),
        ),

        PermissionGuard.single(
          permission: AppPermission.inventoryView,
          child: _buildMenuTile(
            icon: Icons.inventory_2_outlined,
            title: 'Inventory Stock',
            subtitle: 'Check stock levels and inventory',
            onTap: () => context.push('/app/inventory'),
          ),
        ),

        PermissionGuard.single(
          permission: AppPermission.viewAnalytics,
          child: _buildMenuTile(
            icon: Icons.bar_chart_outlined,
            title: 'Analytics & Reports',
            subtitle: 'Branch sales and performance metrics',
            onTap: () => context.push('/app/analytics'),
          ),
        ),


        const SizedBox(height: AppSpacing.lg),

        // Account / Session Section
        const SectionHeader(title: 'Account'),
        const SizedBox(height: AppSpacing.xs),

        _buildMenuTile(
          icon: Icons.logout,
          title: 'Sign Out',
          subtitle: 'End current staff session',
          iconColor: AppColors.error,
          titleColor: AppColors.error,
          onTap: () => ref.read(authNotifierProvider.notifier).logout(),
        ),

        // Development Tools Section (Mock Mode only)
        if (AppConfig.useMockApi) ...[
          const SizedBox(height: AppSpacing.lg),
          const SectionHeader(title: 'Development Tools (Mock Mode)'),
          const SizedBox(height: AppSpacing.xs),

          _buildMenuTile(
            icon: Icons.restart_alt,
            title: 'Reset Mock Data',
            subtitle: 'Restore initial cards, balances & inventory',
            iconColor: AppColors.primary,
            onTap: () {
              MockApiInterceptor.resetMockData();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Mock database reset to initial test state.'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
          ),

          _buildMenuTile(
            icon: Icons.qr_code_2,
            title: 'Mock QR Codes (Camera Test)',
            subtitle: 'Display scannable QR tokens (QR-MOCK-001, etc.)',
            iconColor: AppColors.primary,
            onTap: () => context.push('/app/more/mock-qr'),
          ),

          _buildMenuTile(
            icon: Icons.bug_report_outlined,
            title: 'Simulate API Error',
            subtitle: MockApiInterceptor.simulatedError == MockErrorSimulation.none
                ? 'Current: Normal (No error)'
                : 'Current: ${MockApiInterceptor.simulatedError.name}',
            iconColor: AppColors.warning,
            onTap: () => _showErrorSimulationSheet(context),
          ),
        ],
      ],
    );
  }

  void _showErrorSimulationSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          padding: AppSpacing.paddingMd,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Simulate Backend Error',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              const Text(
                'Select an error condition to test frontend resilience:',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: MockErrorSimulation.values.map((sim) {
                  final isCurrent = MockApiInterceptor.simulatedError == sim;
                  return ChoiceChip(
                    label: Text(sim.name),
                    selected: isCurrent,
                    onSelected: (_) {
                      MockApiInterceptor.simulatedError = sim;
                      Navigator.of(context).pop();
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMenuTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Widget? trailing,
    Color? iconColor,
    Color? titleColor,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: AppCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: 12,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: (iconColor ?? AppColors.primary).withValues(alpha: 0.1),
                borderRadius: AppSpacing.roundedSm,
              ),
              child: Icon(
                icon,
                size: 22,
                color: iconColor ?? AppColors.primary,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: titleColor ?? AppColors.textPrimaryLight,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                ],
              ),
            ),
            if (trailing != null)
              trailing
            else
              const Icon(
                Icons.chevron_right,
                size: 20,
                color: AppColors.textTertiaryLight,
              ),
          ],
        ),
      ),
    );
  }
}
