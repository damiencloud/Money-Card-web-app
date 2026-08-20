import '../core/errors/error_codes.dart';

/// Standard M0 V10 Success Response envelope
class ApiResponse<T> {
  final bool success;
  final T data;

  const ApiResponse({
    this.success = true,
    required this.data,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic rawData) fromJsonT,
  ) {
    return ApiResponse<T>(
      success: json['success'] as bool? ?? true,
      data: fromJsonT(json['data']),
    );
  }

  Map<String, dynamic> toJson(dynamic Function(T value) toJsonT) => {
        'success': success,
        'data': toJsonT(data),
      };
}

/// Standard M0 V10 Error Details
class ApiErrorDetails {
  final ApiErrorCode code;
  final String message;
  final Map<String, dynamic>? details;

  const ApiErrorDetails({
    required this.code,
    required this.message,
    this.details,
  });

  factory ApiErrorDetails.fromJson(Map<String, dynamic> json) {
    return ApiErrorDetails(
      code: ApiErrorCode.fromString(json['code'] as String?),
      message: json['message'] as String? ?? 'An error occurred',
      details: json['details'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'code': code.value,
        'message': message,
        if (details != null) 'details': details,
      };
}

/// Standard M0 V10 Error Response envelope
class ApiErrorResponse {
  final bool success;
  final ApiErrorDetails error;

  const ApiErrorResponse({
    this.success = false,
    required this.error,
  });

  factory ApiErrorResponse.fromJson(Map<String, dynamic> json) {
    return ApiErrorResponse(
      success: json['success'] as bool? ?? false,
      error: ApiErrorDetails.fromJson(json['error'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() => {
        'success': success,
        'error': error.toJson(),
      };
}

/// Standard M0 V10 Pagination Metadata
class PaginationMeta {
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  const PaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'page': page,
        'limit': limit,
        'total': total,
        'totalPages': totalPages,
      };
}

/// Paginated data container
class PaginatedData<T> {
  final List<T> items;
  final PaginationMeta pagination;

  const PaginatedData({
    required this.items,
    required this.pagination,
  });

  factory PaginatedData.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic itemJson) fromJsonT,
  ) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return PaginatedData<T>(
      items: rawItems.map((item) => fromJsonT(item)).toList(),
      pagination: PaginationMeta.fromJson(
        json['pagination'] as Map<String, dynamic>? ?? {},
      ),
    );
  }

  Map<String, dynamic> toJson(dynamic Function(T value) toJsonT) => {
        'items': items.map((item) => toJsonT(item)).toList(),
        'pagination': pagination.toJson(),
      };
}

/// Paginated ApiResponse envelope
class PaginatedResponse<T> {
  final bool success;
  final PaginatedData<T> data;

  const PaginatedResponse({
    this.success = true,
    required this.data,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic itemJson) fromJsonT,
  ) {
    return PaginatedResponse<T>(
      success: json['success'] as bool? ?? true,
      data: PaginatedData<T>.fromJson(
        json['data'] as Map<String, dynamic>? ?? {},
        fromJsonT,
      ),
    );
  }
}
