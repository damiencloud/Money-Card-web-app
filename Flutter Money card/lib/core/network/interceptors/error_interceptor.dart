import 'package:dio/dio.dart';
import '../../errors/api_exception.dart';

/// Interceptor that converts raw DioExceptions into strongly typed [ApiException]s.
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final apiException = ApiException.fromDioException(err);
    // Attach converted ApiException into error's error object for downstream catch blocks
    final customErr = DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      type: err.type,
      error: apiException,
      message: apiException.message,
    );
    handler.next(customErr);
  }
}
