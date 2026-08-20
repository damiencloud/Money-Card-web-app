class QrValidator {
  QrValidator._();

  /// Extracts the opaque QR token from a scanned QR payload.
  /// M0 V10 Spec: QR contains HTTPS URL with opaque token (e.g., https://.../c/{token})
  /// or a raw opaque token.
  /// Does NOT parse or trust card balance, secrets, or DB UUIDs from QR.
  static String? extractToken(String? rawPayload) {
    if (rawPayload == null || rawPayload.trim().isEmpty) {
      return null;
    }

    final trimmed = rawPayload.trim();

    // Check if payload is a URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        final uri = Uri.parse(trimmed);
        final segments = uri.pathSegments;
        if (segments.isNotEmpty) {
          // If URL path is /c/{token} or /card/{token}
          return segments.last;
        }
      } catch (_) {
        return null;
      }
    }

    // Direct token string
    if (trimmed.length >= 4) {
      return trimmed;
    }

    return null;
  }

  /// Returns true if the raw payload contains a valid token structure.
  static bool isValidQr(String? rawPayload) {
    return extractToken(rawPayload) != null;
  }
}
