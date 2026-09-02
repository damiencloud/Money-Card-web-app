// ─── Permission Matrix Component (M6) ──────────────────────
// Data-driven Permission Matrix using ONLY M0 permission identifiers.

import type { Permission } from '@/types';
import { Badge } from '@/components/ui';
import { Check } from 'lucide-react';
import { PERMISSION_GROUPS, type PermissionCategoryConfig } from './constants';

interface PermissionMatrixProps {
  selectedPermissions: Permission[];
  onChange?: (permissions: Permission[]) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({
  selectedPermissions,
  onChange,
  readOnly = false,
}: PermissionMatrixProps) {
  const isSelected = (perm: Permission) => selectedPermissions.includes(perm);

  const togglePermission = (perm: Permission) => {
    if (readOnly || !onChange) return;
    if (isSelected(perm)) {
      onChange(selectedPermissions.filter((p) => p !== perm));
    } else {
      onChange([...selectedPermissions, perm]);
    }
  };

  const toggleCategory = (group: PermissionCategoryConfig) => {
    if (readOnly || !onChange) return;
    const groupPerms = group.permissions.map((p) => p.key);
    const allSelected = groupPerms.every((p) => isSelected(p));

    if (allSelected) {
      // Unselect all in group
      onChange(selectedPermissions.filter((p) => !groupPerms.includes(p)));
    } else {
      // Select all in group
      const newPerms = new Set([...selectedPermissions, ...groupPerms]);
      onChange(Array.from(newPerms));
    }
  };

  return (
    <div className="space-y-6">
      {PERMISSION_GROUPS.map((group) => {
        const groupPerms = group.permissions.map((p) => p.key);
        const selectedCount = groupPerms.filter((p) => isSelected(p)).length;
        const allSelected = selectedCount === groupPerms.length && groupPerms.length > 0;

        return (
          <div
            key={group.id}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                {group.icon}
                <h4 className="text-sm font-semibold text-slate-100">{group.title}</h4>
                <Badge variant="outline" className="text-[10px]">
                  {selectedCount} / {groupPerms.length} selected
                </Badge>
              </div>

              {!readOnly && onChange && (
                <button
                  type="button"
                  onClick={() => toggleCategory(group)}
                  className="text-xs font-medium text-violet-400 hover:text-violet-300 focus:outline-none"
                >
                  {allSelected ? 'Unselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Checkbox Grid */}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.permissions.map((perm) => {
                const active = isSelected(perm.key);

                if (readOnly) {
                  return (
                    <div
                      key={perm.key}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                        active
                          ? 'border-violet-500/30 bg-violet-500/10 text-slate-100'
                          : 'border-slate-800/50 bg-slate-950/40 text-slate-500 opacity-60'
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          active
                            ? 'border-violet-500 bg-violet-600 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <p className="font-mono text-xs font-medium">{perm.label}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{perm.description}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    role="checkbox"
                    aria-checked={active}
                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs text-left transition-all select-none ${
                      active
                        ? 'border-violet-500/40 bg-violet-500/15 text-slate-100'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${
                        active
                          ? 'border-violet-500 bg-violet-600 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold text-slate-100">
                        {perm.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{perm.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
