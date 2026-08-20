import 'product.dart';

/// Represents an item in the Staff POS cart
class CartItem {
  final Product product;
  final int quantity;

  const CartItem({
    required this.product,
    required this.quantity,
  });

  double get unitPrice => product.price;
  double get itemTotal => product.price * quantity;

  CartItem copyWith({
    Product? product,
    int? quantity,
  }) {
    return CartItem(
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
    );
  }

  Map<String, dynamic> toPurchaseJson() => {
        'productId': product.id,
        'quantity': quantity,
      };
}
