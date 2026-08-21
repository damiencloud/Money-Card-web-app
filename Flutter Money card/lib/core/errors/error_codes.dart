/// All API Error Codes according to M0 V10 Shared System Contract (Section 9).
enum ApiErrorCode {
  // 400
  validationError('VALIDATION_ERROR'),
  csvValidationError('CSV_VALIDATION_ERROR'),

  // 401
  unauthorized('UNAUTHORIZED'),

  // 403
  forbidden('FORBIDDEN'),
  permissionDenied('PERMISSION_DENIED'),
  organizationAccessDenied('ORGANIZATION_ACCESS_DENIED'),
  branchAccessDenied('BRANCH_ACCESS_DENIED'),

  // 404
  notFound('NOT_FOUND'),
  cardNotFound('CARD_NOT_FOUND'),
  sessionNotFound('SESSION_NOT_FOUND'),
  subscriptionNotFound('SUBSCRIPTION_NOT_FOUND'),

  // 409
  cardNotAvailable('CARD_NOT_AVAILABLE'),
  alreadySettled('ALREADY_SETTLED'),
  refundAlreadyProcessed('REFUND_ALREADY_PROCESSED'),
  duplicateRequest('DUPLICATE_REQUEST'),
  planLimitReached('PLAN_LIMIT_REACHED'),
  downgradeLimitExceeded('DOWNGRADE_LIMIT_EXCEEDED'),
  cardBlocked('CARD_BLOCKED'),

  // 410
  portalSessionExpired('PORTAL_SESSION_EXPIRED'),

  // 422
  insufficientBalance('INSUFFICIENT_BALANCE'),
  insufficientInventory('INSUFFICIENT_INVENTORY'),
  paymentVerificationFailed('PAYMENT_VERIFICATION_FAILED'),
  invalidBusinessState('INVALID_BUSINESS_STATE'),

  // 500
  internalServerError('INTERNAL_SERVER_ERROR'),
  serverError('SERVER_ERROR'),

  // Client / Network fallbacks
  networkError('NETWORK_ERROR'),
  timeoutError('TIMEOUT_ERROR'),
  unknownError('UNKNOWN_ERROR');

  const ApiErrorCode(this.value);

  final String value;

  static ApiErrorCode fromString(String? val) {
    if (val == null) return ApiErrorCode.unknownError;
    for (final code in ApiErrorCode.values) {
      if (code.value == val) return code;
    }
    return ApiErrorCode.unknownError;
  }

  String get defaultMessage {
    switch (this) {
      case ApiErrorCode.validationError:
        return 'Invalid request data.';
      case ApiErrorCode.csvValidationError:
        return 'CSV file validation error.';
      case ApiErrorCode.unauthorized:
        return 'Session expired. Please log in.';
      case ApiErrorCode.forbidden:
        return 'You do not have permission to perform this action.';
      case ApiErrorCode.permissionDenied:
        return 'Staff permission denied.';
      case ApiErrorCode.organizationAccessDenied:
        return 'Access denied for this organization.';
      case ApiErrorCode.branchAccessDenied:
        return 'Access denied for this branch.';
      case ApiErrorCode.notFound:
        return 'Resource not found.';
      case ApiErrorCode.cardNotFound:
        return 'Card not found.';
      case ApiErrorCode.sessionNotFound:
        return 'Active card session not found.';
      case ApiErrorCode.subscriptionNotFound:
        return 'Subscription not found.';
      case ApiErrorCode.cardNotAvailable:
        return 'Card is not available.';
      case ApiErrorCode.alreadySettled:
        return 'Card session is already settled.';
      case ApiErrorCode.refundAlreadyProcessed:
        return 'Refund has already been processed.';
      case ApiErrorCode.duplicateRequest:
        return 'Duplicate request detected.';
      case ApiErrorCode.planLimitReached:
        return 'Organization plan limit reached.';
      case ApiErrorCode.downgradeLimitExceeded:
        return 'Downgrade limit exceeded.';
      case ApiErrorCode.cardBlocked:
        return 'Card is currently blocked.';
      case ApiErrorCode.portalSessionExpired:
        return 'User Portal session has expired.';
      case ApiErrorCode.insufficientBalance:
        return 'Insufficient card balance.';
      case ApiErrorCode.insufficientInventory:
        return 'Insufficient product inventory.';
      case ApiErrorCode.paymentVerificationFailed:
        return 'Payment verification failed.';
      case ApiErrorCode.invalidBusinessState:
        return 'Operation is invalid in the current business state.';
      case ApiErrorCode.internalServerError:
      case ApiErrorCode.serverError:
        return 'Internal server error occurred.';
      case ApiErrorCode.networkError:
        return 'Unable to connect to the network. Check your connection.';
      case ApiErrorCode.timeoutError:
        return 'The request timed out. Please try again.';
      case ApiErrorCode.unknownError:
        return 'An unexpected error occurred.';
    }
  }
}
