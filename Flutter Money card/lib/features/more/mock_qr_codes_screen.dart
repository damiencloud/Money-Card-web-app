import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../widgets/common/app_badge.dart';
import '../../widgets/common/app_card.dart';

class MockQrCardData {
  final String qrToken;
  final String cardId;
  final String physicalCardNumber;
  final String status;
  final double balance;
  final String branchName;
  final String description;

  const MockQrCardData({
    required this.qrToken,
    required this.cardId,
    required this.physicalCardNumber,
    required this.status,
    required this.balance,
    required this.branchName,
    required this.description,
  });
}

class MockQrCodesScreen extends StatelessWidget {
  const MockQrCodesScreen({super.key});

  static const List<MockQrCardData> mockQrs = [
    MockQrCardData(
      qrToken: 'QR-MOCK-001',
      cardId: 'CARD001',
      physicalCardNumber: 'MC-001',
      status: 'ACTIVE',
      balance: 750.0,
      branchName: 'Main Cafeteria (Branch 1)',
      description: 'Active card with active session. Opens the Active Card Action Hub.',
    ),
    MockQrCardData(
      qrToken: 'QR-MOCK-002',
      cardId: 'CARD002',
      physicalCardNumber: 'MC-002',
      status: 'ACTIVE',
      balance: 350.0,
      branchName: 'Main Cafeteria (Branch 1)',
      description: 'Active card with active session. Opens the Active Card Action Hub.',
    ),
    MockQrCardData(
      qrToken: 'QR-MOCK-003',
      cardId: 'CARD003',
      physicalCardNumber: 'MC-003',
      status: 'BLOCKED',
      balance: 0.0,
      branchName: 'Main Cafeteria (Branch 1)',
      description: 'Blocked card for fraud/loss. Cannot perform operations.',
    ),
    MockQrCardData(
      qrToken: 'QR-MOCK-004',
      cardId: 'CARD004',
      physicalCardNumber: 'MC-004',
      status: 'AVAILABLE',
      balance: 0.0,
      branchName: 'Main Cafeteria (Branch 1)',
      description: 'Available card ready to be issued with a new active session.',
    ),
    MockQrCardData(
      qrToken: 'QR-MOCK-005',
      cardId: 'CARD005',
      physicalCardNumber: 'MC-005',
      status: 'AVAILABLE',
      balance: 0.0,
      branchName: 'Main Cafeteria (Branch 1)',
      description: 'Available card ready to be issued with a new active session.',
    ),
    MockQrCardData(
      qrToken: 'QR-UNKNOWN-999',
      cardId: 'UNKNOWN',
      physicalCardNumber: 'UNREGISTERED',
      status: 'NOT REGISTERED',
      balance: 0.0,
      branchName: 'N/A',
      description: 'Unregistered token to test 404 "Card not registered" error handling.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mock QR Codes (Dev Tools)'),
      ),
      body: ListView(
        padding: AppSpacing.paddingMd,
        children: [
          // Banner
          Container(
            padding: AppSpacing.paddingMd,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: AppSpacing.roundedMd,
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: const [
                Icon(Icons.qr_code_2, color: AppColors.primaryDark, size: 28),
                SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Point your physical camera at any QR code below to test offline card resolution & issue flows.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // QR Cards List
          ...mockQrs.map((item) => _buildQrCard(context, item)),
        ],
      ),
    );
  }

  Widget _buildQrCard(BuildContext context, MockQrCardData item) {
    final isAvailable = item.status == 'AVAILABLE';
    final isActive = item.status == 'ACTIVE';
    final isBlocked = item.status == 'BLOCKED';

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: AppCard(
        padding: AppSpacing.paddingLg,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Header Info
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.physicalCardNumber,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'ID: ${item.cardId}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
                AppBadge(
                  label: item.status,
                  variant: isAvailable
                      ? AppBadgeVariant.primary
                      : isActive
                          ? AppBadgeVariant.success
                          : isBlocked
                              ? AppBadgeVariant.error
                              : AppBadgeVariant.neutral,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // High-Contrast Large Scannable QR Code Image
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: AppSpacing.roundedMd,
                border: Border.all(color: AppColors.borderLight, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: QrImageView(
                data: item.qrToken,
                version: QrVersions.auto,
                size: 200,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: Colors.black,
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: Colors.black,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Encoded Payload display
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariantLight,
                borderRadius: BorderRadius.circular(6),
              ),
              child: SelectableText(
                'Token: ${item.qrToken}',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimaryLight,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xs),

            // Details
            if (isActive)
              Text(
                'Active Session Balance: ₹${item.balance.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.success,
                ),
              ),
            const SizedBox(height: 4),
            Text(
              item.description,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondaryLight,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
