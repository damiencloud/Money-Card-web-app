import 'package:intl/intl.dart';

class AppFormatters {
  AppFormatters._();

  static final NumberFormat _currencyFormatter = NumberFormat.currency(
    symbol: '₹',
    decimalDigits: 2,
  );

  static final NumberFormat _compactCurrencyFormatter = NumberFormat.compactCurrency(
    symbol: '₹',
  );

  static final DateFormat _dateTimeFormatter = DateFormat('dd MMM yyyy, hh:mm a');
  static final DateFormat _dateFormatter = DateFormat('dd MMM yyyy');
  static final DateFormat _timeFormatter = DateFormat('hh:mm a');

  static String formatCurrency(num? amount) {
    if (amount == null) return '₹0.00';
    return _currencyFormatter.format(amount);
  }

  static String formatCompactCurrency(num? amount) {
    if (amount == null) return '₹0';
    return _compactCurrencyFormatter.format(amount);
  }

  static String formatDateTime(DateTime? dateTime) {
    if (dateTime == null) return '-';
    return _dateTimeFormatter.format(dateTime);
  }

  static String formatDate(DateTime? dateTime) {
    if (dateTime == null) return '-';
    return _dateFormatter.format(dateTime);
  }

  static String formatTime(DateTime? dateTime) {
    if (dateTime == null) return '-';
    return _timeFormatter.format(dateTime);
  }

  static String formatIsoDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '-';
    try {
      final dt = DateTime.parse(isoString);
      return formatDateTime(dt);
    } catch (_) {
      return isoString;
    }
  }
}
