import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/models/branch.dart';
import 'package:money_card_staff/providers/branch_provider.dart';
import 'package:money_card_staff/repositories/branch_repository.dart';
import 'package:money_card_staff/services/api_service.dart';
import 'package:money_card_staff/services/branch_service.dart';

class FakeBranchService extends BranchService {
  FakeBranchService() : super(ApiService(Dio()));

  @override
  Future<List<Branch>> getBranches() async {
    return const [
      Branch(
        id: 'branch-1',
        organizationId: 'org-1',
        name: 'Main Cafeteria',
        status: 'ACTIVE',
      ),
      Branch(
        id: 'branch-2',
        organizationId: 'org-1',
        name: 'North Kiosk',
        status: 'ACTIVE',
      ),
      Branch(
        id: 'branch-3',
        organizationId: 'org-1',
        name: 'South Cafe',
        status: 'ACTIVE',
      ),
    ];
  }
}

void main() {
  group('BranchNotifier Unit Tests', () {
    test('loads only assigned branches and selects the first one by default', () async {
      final repo = BranchRepository(FakeBranchService());
      final notifier = BranchNotifier(repo);

      await notifier.loadAssignedBranches(['branch-2', 'branch-3']);

      expect(notifier.state.assignedBranches.length, 2);
      expect(notifier.state.assignedBranches.map((b) => b.id), containsAll(['branch-2', 'branch-3']));
      expect(notifier.state.currentBranch?.id, 'branch-2');
    });

    test('selectBranch changes active branch when present in assigned list', () async {
      final repo = BranchRepository(FakeBranchService());
      final notifier = BranchNotifier(repo);

      await notifier.loadAssignedBranches(['branch-1', 'branch-2']);

      expect(notifier.state.currentBranch?.id, 'branch-1');

      final branch2 = notifier.state.assignedBranches.firstWhere((b) => b.id == 'branch-2');
      notifier.selectBranch(branch2);

      expect(notifier.state.currentBranch?.id, 'branch-2');
    });
  });
}
