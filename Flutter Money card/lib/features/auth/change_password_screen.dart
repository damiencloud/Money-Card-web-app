import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/app_button.dart';

/// Screen displayed when staff voluntarily update their password from settings.
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscureCurrentPassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  bool _isSubmitting = false;
  String? _localError;

  @override
  void initState() {
    super.initState();
    _newPasswordController.addListener(() => setState(() {}));
    _confirmPasswordController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  // Password policy checks
  bool get _hasMinLength => _newPasswordController.text.length >= 8;
  bool get _hasMaxLength => _newPasswordController.text.length <= 128;
  bool get _hasUppercase => _newPasswordController.text.contains(RegExp(r'[A-Z]'));
  bool get _hasLowercase => _newPasswordController.text.contains(RegExp(r'[a-z]'));
  bool get _hasNumber => _newPasswordController.text.contains(RegExp(r'[0-9]'));
  bool get _hasSpecialChar => _newPasswordController.text.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'));
  bool get _passwordsMatch =>
      _newPasswordController.text.isNotEmpty &&
      _newPasswordController.text == _confirmPasswordController.text;

  Future<void> _handleSubmit() async {
    setState(() => _localError = null);

    if (_currentPasswordController.text.trim().isEmpty) {
      setState(() => _localError = 'Please enter your current password');
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    if (!_hasMinLength || !_hasMaxLength || !_hasUppercase || !_hasLowercase || !_hasNumber || !_hasSpecialChar) {
      setState(() {
        _localError = 'Please ensure your new password meets all security requirements.';
      });
      return;
    }

    if (!_passwordsMatch) {
      setState(() {
        _localError = 'New passwords do not match.';
      });
      return;
    }

    setState(() => _isSubmitting = true);

    final authNotifier = ref.read(authNotifierProvider.notifier);
    final success = await authNotifier.changePassword(
      currentPassword: _currentPasswordController.text.trim(),
      newPassword: _newPasswordController.text.trim(),
      confirmPassword: _confirmPasswordController.text.trim(),
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password updated successfully!'),
          backgroundColor: AppColors.success,
          duration: Duration(seconds: 3),
        ),
      );
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/app/home');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final errorToShow = _localError ?? authState.errorMessage;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text('Change Password'),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimaryLight,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
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
                          color: AppColors.primary.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.shield_outlined,
                          size: 34,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    const Text(
                      'Update Your Password',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),

                    const Text(
                      'Enter your current password and choose a new secure password.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondaryLight,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    if (errorToShow != null && errorToShow.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, size: 18, color: AppColors.error),
                            const SizedBox(width: 10),
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
                      'Current Password',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    TextFormField(
                      controller: _currentPasswordController,
                      obscureText: _obscureCurrentPassword,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        hintText: 'Enter your current password',
                        prefixIcon: const Icon(Icons.lock_outline, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureCurrentPassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            size: 20,
                          ),
                          onPressed: () {
                            setState(() => _obscureCurrentPassword = !_obscureCurrentPassword);
                          },
                        ),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Current password is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),

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
                        hintText: 'Enter new password',
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
                          _buildRequirementItem(r'At least 1 special character (!@#$%^&*...)', _hasSpecialChar),
                          _buildRequirementItem('Passwords match', _passwordsMatch),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    AppButton(
                      label: 'Update Password',
                      isLoading: _isSubmitting || authState.isAuthenticating,
                      onPressed: (_isSubmitting || authState.isAuthenticating)
                          ? null
                          : () => _handleSubmit(),
                    ),
                  ],
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
