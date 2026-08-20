import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/utils/qr_validator.dart';
import '../states/app_loading_view.dart';

/// Hardened QR Scanner screen and overlay with low-light torch controls,
/// haptic vibration feedback, and duplicate scan debouncing.
class QrScannerView extends StatefulWidget {
  final ValueChanged<String> onQrScanned;
  final String title;
  final String prompt;
  final Duration debounceDuration;

  const QrScannerView({
    super.key,
    required this.onQrScanned,
    this.title = 'Scan Money Card',
    this.prompt = 'Point your camera at the card QR code',
    this.debounceDuration = const Duration(milliseconds: 1500),
  });

  @override
  State<QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<QrScannerView>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  late final MobileScannerController _scannerController;
  bool _isPermissionGranted = false;
  bool _isCheckingPermission = true;
  bool _isProcessingScan = false;
  bool _isTorchOn = false;
  DateTime? _lastScanTime;
  String? _lastScannedToken;
  String? _invalidQrMessage;

  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _pulseAnimation = CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    );

    _checkCameraPermission();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pulseController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_scannerController.value.isInitialized) return;
    if (state == AppLifecycleState.resumed) {
      _checkCameraPermission();
    }
  }

  Future<void> _checkCameraPermission() async {
    setState(() => _isCheckingPermission = true);
    final status = await Permission.camera.status;
    if (status.isGranted) {
      setState(() {
        _isPermissionGranted = true;
        _isCheckingPermission = false;
      });
    } else {
      final requestResult = await Permission.camera.request();
      setState(() {
        _isPermissionGranted = requestResult.isGranted;
        _isCheckingPermission = false;
      });
    }
  }

  void _toggleTorch() async {
    try {
      await _scannerController.toggleTorch();
      setState(() {
        _isTorchOn = !_isTorchOn;
      });
      HapticFeedback.selectionClick();
    } catch (_) {}
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessingScan) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final rawValue = barcodes.first.rawValue;
    if (rawValue == null || rawValue.isEmpty) return;

    final token = QrValidator.extractToken(rawValue) ?? rawValue.trim();

    // Debounce duplicate scans within debounceDuration
    final now = DateTime.now();
    if (_lastScannedToken == token &&
        _lastScanTime != null &&
        now.difference(_lastScanTime!) < widget.debounceDuration) {
      return;
    }

    _lastScanTime = now;
    _lastScannedToken = token;

    // Short vibration/haptic feedback (Always ON, enabled by default, 1x per scan)
    HapticFeedback.mediumImpact();
    _pulseController.forward(from: 0.0);

    // Pause scanner lock to prevent duplicate scans/vibrations while processing
    setState(() {
      _isProcessingScan = true;
      _invalidQrMessage = null;
    });

    widget.onQrScanned(token);
  }

  void resumeScanning() {
    if (mounted) {
      setState(() {
        _isProcessingScan = false;
        _invalidQrMessage = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: Icon(
              _isTorchOn ? Icons.flash_on : Icons.flash_off,
              color: _isTorchOn ? AppColors.warning : Colors.white,
            ),
            tooltip: _isTorchOn ? 'Turn Flash Off' : 'Turn Flash On',
            onPressed: _toggleTorch,
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            tooltip: 'Switch Camera',
            onPressed: () => _scannerController.switchCamera(),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isCheckingPermission) {
      return const AppLoadingView(message: 'Checking camera access...');
    }

    if (!_isPermissionGranted) {
      return _buildPermissionDeniedView();
    }

    return Stack(
      children: [
        MobileScanner(
          controller: _scannerController,
          onDetect: _onDetect,
        ),
        _buildScannerOverlay(),
        if (_invalidQrMessage != null) _buildInvalidQrBanner(),
        if (_isProcessingScan)
          const AppLoadingView(
            message: 'Resolving card...',
            isOverlay: true,
          ),
      ],
    );
  }

  Widget _buildScannerOverlay() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final scanSize = (constraints.maxWidth * 0.72).clamp(180.0, 260.0);
        return Column(
          children: [
            Expanded(
              child: Container(
                color: Colors.black.withValues(alpha: 0.5),
                alignment: Alignment.bottomCenter,
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: InkWell(
                  onTap: _toggleTorch,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: _isTorchOn
                          ? AppColors.warning.withValues(alpha: 0.25)
                          : Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _isTorchOn ? AppColors.warning : Colors.white30,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _isTorchOn ? Icons.flash_on : Icons.flash_off,
                          size: 16,
                          color: _isTorchOn ? AppColors.warning : Colors.white,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _isTorchOn ? 'Torch Active' : 'Low Light? Tap Flash',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _isTorchOn ? AppColors.warning : Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Row(
              children: [
                Expanded(child: Container(color: Colors.black.withValues(alpha: 0.5))),
                AnimatedBuilder(
                  animation: _pulseAnimation,
                  builder: (context, child) {
                    final isPulsing = _pulseController.isAnimating;
                    final borderColor = isPulsing ? AppColors.success : AppColors.primary;

                    return Container(
                      width: scanSize,
                      height: scanSize,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: borderColor,
                          width: isPulsing ? 4 : 3,
                        ),
                        borderRadius: AppSpacing.roundedLg,
                        boxShadow: isPulsing
                            ? [
                                BoxShadow(
                                  color: AppColors.success.withValues(alpha: 0.5),
                                  blurRadius: 16,
                                  spreadRadius: 2,
                                ),
                              ]
                            : null,
                      ),
                      child: child,
                    );
                  },
                  child: Stack(
                    children: [
                      // Corner accents
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(width: 20, height: 4, color: Colors.white),
                      ),
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(width: 4, height: 20, color: Colors.white),
                      ),
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: Container(width: 20, height: 4, color: Colors.white),
                      ),
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: Container(width: 4, height: 20, color: Colors.white),
                      ),
                    ],
                  ),
                ),
                Expanded(child: Container(color: Colors.black.withValues(alpha: 0.5))),
              ],
            ),
            Expanded(
              child: Container(
                color: Colors.black.withValues(alpha: 0.5),
                padding: AppSpacing.paddingMd,
                alignment: Alignment.topCenter,
                child: Text(
                  widget.prompt,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildInvalidQrBanner() {
    return Positioned(
      bottom: 80,
      left: 20,
      right: 20,
      child: Container(
        padding: AppSpacing.paddingMd,
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: AppSpacing.roundedMd,
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                _invalidQrMessage!,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionDeniedView() {
    return Center(
      child: Padding(
        padding: AppSpacing.paddingLg,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.camera_alt_outlined,
              size: 64,
              color: AppColors.error,
            ),
            const SizedBox(height: AppSpacing.md),
            const Text(
              'Camera Permission Required',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            const Text(
              'Please allow camera permission in device settings to scan Money Card QR codes.',
              style: TextStyle(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton(
              onPressed: () => openAppSettings(),
              child: const Text('Open Settings'),
            ),
          ],
        ),
      ),
    );
  }
}
