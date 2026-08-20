import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hardware_settings.dart';

class HardwareSettingsNotifier extends StateNotifier<HardwareSettings> {
  HardwareSettingsNotifier() : super(const HardwareSettings());

  void setVibrationEnabled(bool enabled) {
    state = state.copyWith(vibrationFeedbackEnabled: enabled);
    if (enabled) {
      triggerScanHaptic();
    }
  }

  void setSoundEnabled(bool enabled) {
    state = state.copyWith(soundFeedbackEnabled: enabled);
  }

  /// Triggers haptic feedback upon successful scan
  void triggerScanHaptic() {
    if (state.vibrationFeedbackEnabled) {
      HapticFeedback.mediumImpact();
    }
  }

  /// Triggers light selection haptic
  void triggerLightHaptic() {
    if (state.vibrationFeedbackEnabled) {
      HapticFeedback.selectionClick();
    }
  }
}

final StateNotifierProvider<HardwareSettingsNotifier, HardwareSettings> hardwareSettingsProvider =
    StateNotifierProvider<HardwareSettingsNotifier, HardwareSettings>((ref) {
  return HardwareSettingsNotifier();
});
