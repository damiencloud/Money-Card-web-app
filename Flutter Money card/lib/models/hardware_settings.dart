class HardwareSettings {
  final bool vibrationFeedbackEnabled;
  final bool soundFeedbackEnabled;

  const HardwareSettings({
    this.vibrationFeedbackEnabled = true,
    this.soundFeedbackEnabled = true,
  });

  HardwareSettings copyWith({
    bool? vibrationFeedbackEnabled,
    bool? soundFeedbackEnabled,
  }) {
    return HardwareSettings(
      vibrationFeedbackEnabled:
          vibrationFeedbackEnabled ?? this.vibrationFeedbackEnabled,
      soundFeedbackEnabled: soundFeedbackEnabled ?? this.soundFeedbackEnabled,
    );
  }

  Map<String, dynamic> toJson() => {
        'vibrationFeedbackEnabled': vibrationFeedbackEnabled,
        'soundFeedbackEnabled': soundFeedbackEnabled,
      };

  factory HardwareSettings.fromJson(Map<String, dynamic> json) {
    return HardwareSettings(
      vibrationFeedbackEnabled:
          json['vibrationFeedbackEnabled'] as bool? ?? true,
      soundFeedbackEnabled: json['soundFeedbackEnabled'] as bool? ?? true,
    );
  }
}
