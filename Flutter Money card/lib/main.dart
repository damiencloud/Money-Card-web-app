import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/config/app_config.dart';
import 'core/network/mdns_discovery_service.dart';
import 'core/storage/server_config_storage.dart';
import 'core/theme/app_theme.dart';
import 'routing/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ServerConfigStorage().initialize();

  // In development mode on physical devices or desktop, initiate mDNS discovery asynchronously
  if (AppConfig.isDevelopment) {
    unawaited(
      MdnsDiscoveryService.instance.discoverAndVerifyBackend(
        timeout: const Duration(seconds: 10),
        testStoredFirst: true,
      ),
    );
  }

  runApp(
    const ProviderScope(
      child: MoneyCardStaffApp(),
    ),
  );
}

class MoneyCardStaffApp extends ConsumerWidget {
  const MoneyCardStaffApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Money Card Staff',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
