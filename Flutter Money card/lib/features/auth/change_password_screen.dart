import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/app_button.dart';

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSubmitting = false;
  String? _localErrorMessage;

  @override
  void initState() {
    super.initState();
    _newPasswordController.addListener(_onPasswordChanged);
    _confirmPasswordController.addListener(_onPasswordChanged);
  }

  void _onPasswordChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _newPasswordController.removeListener(_onPasswordChanged);
    _confirmPasswordController.removeListener(_onPasswordChanged);
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  // Password Policy Checks
  bool get _hasMinLength => _newPasswordController.text.length >= 8;
  bool get _hasMaxLength => _newPasswordController.text.length <= 128;
  bool get _hasUppercase => RegExp(r'[A-Z]').hasMatch(_newPasswordController.text);
  bool get _hasLowercase => RegExp(r'[a-z]').hasMatch(_newPasswordController.text);
  bool get _hasNumber => RegExp(r'[0-9]').hasMatch(_newPasswordController.text);
  bool get _hasSpecialChar =>
      RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(_newPasswordController.text);
  bool get _passwordsMatch =>
      _newPasswordController.text.isNotEmpty &&
      _newPasswordController.text == _confirmPasswordController.text;

  Future<void> _handleSubmit() async {
    FocusScope.of(context).unfocus();
    setState(() => _localErrorMessage = null);

    if (!_formKey.currentState!.validate()) return;

    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (newPassword != confirmPassword) {
      setState(() => _localErrorMessage = 'Passwords do not match.');
      return;
    }

    if (!_hasMinLength || !_hasMaxLength || !_hasUppercase || !_hasLowercase || !_hasNumber || !_hasSpecialChar) {
      setState(() => _localErrorMessage = 'Password does not meet the required security requirements.');
      return;
    }

    setState(() => _isSubmitting = true);

    final success = await ref.read(authNotifierProvider.notifier).changeTemporaryPassword(
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle_outline, color: Colors.white),
                SizedBox(width: 8),
                Text('Password changed successfully.'),
              ],
            ),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log Out'),
        content: const Text('Are you sure you want to log out? You will need your temporary credentials to log in again.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Log Out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(authNotifierProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final errorToShow = _localErrorMessage ?? authState.errorMessage;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        // Prevent back navigation
      },
      child: Scaffold(
        backgroundColor: AppColors.backgroundLight,
        appBar: AppBar(
          title: const Text(
            'Security Update',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          automaticallyImplyLeading: false,
          elevation: 0,
          backgroundColor: Colors.white,
          actions: [
            IconButton(
              icon: const Icon(Icons.logout, color: AppColors.textSecondaryLight),
              tooltip: 'Log Out',
              onPressed: _isSubmitting ? null : _handleLogout,
            ),
          ],
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: AppSpacing.paddingLg,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.lock_reset_rounded,
                            size: 36,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      const Text(
                        'Change Your Password',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimaryLight,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),

                      const Text(
                        'Your password was reset by your organization administrator. Please create a new password before continuing.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondaryLight,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      if (errorToShow != null && errorToShow.isNotEmpty) ...[
                        Container(
                          padding: AppSpacing.paddingMd,
                          decoration: BoxDecoration(
                            color: AppColors.errorLight,
                            borderRadius: AppSpacing.roundedMd,
                            border: Border.all(color: AppColors.error, width: 1.2),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: Text(
                                  errorToShow,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.error,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                      ],

                      const Text(
                        'New Password',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      TextFormField(
                        controller: _newPasswordController,
                        obscureText: _obscureNewPassword,
                        textInputAction: TextInputAction.next,
                        decoration: InputDecoration(
                          hintText: 'Enter new permanent password',
                          prefixIcon: const Icon(Icons.lock_outline, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureNewPassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              size: 20,
                            ),
                            onPressed: () {
                              setState(() => _obscureNewPassword = !_obscureNewPassword);
                            },
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.isEmpty) {
                            return 'New password is required';
                          }
                          if (val.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      const Text(
                        'Confirm New Password',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _handleSubmit(),
                        decoration: InputDecoration(
                          hintText: 'Re-enter new password',
                          prefixIcon: const Icon(Icons.lock_clock_outlined, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureConfirmPassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              size: 20,
                            ),
                            onPressed: () {
                              setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
                            },
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.isEmpty) {
                            return 'Please confirm your new password';
                          }
                          if (val != _newPasswordController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Password Requirements:',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondaryLight,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildRequirementItem('At least 8 characters', _hasMinLength),
                            _buildRequirementItem('At least 1 uppercase letter (A-Z)', _hasUppercase),
                            _buildRequirementItem('At least 1 lowercase letter (a-z)', _hasLowercase),
                            _buildRequirementItem('At least 1 number (0-9)', _hasNumber),
                            _buildRequirementItem('At least 1 special character (!@#\$%...)', _hasSpecialChar),
                            _buildRequirementItem('Passwords match', _passwordsMatch),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      AppButton(
                        label: 'Set New Password',
                        isLoading: _isSubmitting || authState.isAuthenticating,
                        onPressed: (_isSubmitting || authState.isAuthenticating) ? null : _handleSubmit,
                      ),
                      const SizedBox(height: AppSpacing.md),

                      Center(
                        child: TextButton.icon(
                          onPressed: _isSubmitting ? null : _handleLogout,
                          icon: const Icon(Icons.arrow_back, size: 16),
                          label: const Text('Log out and return to login'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.textSecondaryLight,
                            textStyle: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRequirementItem(String text, bool met) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        children: [
          Icon(
            met ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 14,
            color: met ? AppColors.success : const Color(0xFF94A3B8),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: met ? const Color(0xFF0F172A) : const Color(0xFF64748B),
              fontWeight: met ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}
