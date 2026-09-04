// ─── Permission Matrix Component (M6) ──────────────────────
// Data-driven Permission Matrix with Collapsible Dropdowns and Logical Permission Dependencies.

import { useState } from 'react';
import type { Permission } from '@/types';
import { Badge } from '@/components/ui';
import { Check, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import {
  PERMISSION_GROUPS,
  PERMISSION_DEPENDENCIES,
  PERMISSION_CHILDREN,
  type PermissionCategoryConfig,
  type PermissionItemConfig,
} from './constants';

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
  // Dropdown / Accordion open state for each category group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    cards: true,
    sessions: true,
    products: true,
    admin_analytics: true,
  });

  // Filter by category dropdown
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const toggleGroupOpen = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAll = () => {
    const allOpen = PERMISSION_GROUPS.reduce((acc, g) => ({ ...acc, [g.id]: true }), {});
    setOpenGroups(allOpen);
  };

  const collapseAll = () => {
    const allClosed = PERMISSION_GROUPS.reduce((acc, g) => ({ ...acc, [g.id]: false }), {});
    setOpenGroups(allClosed);
  };

  const isSelected = (permKey: Permission, linkedKeys?: Permission[]) => {
    if (linkedKeys && linkedKeys.length > 0) {
      return (
        selectedPermissions.includes(permKey) ||
        linkedKeys.some((k) => selectedPermissions.includes(k))
      );
    }
    return selectedPermissions.includes(permKey);
  };

  // ── Logical Permission Toggle with Parent/Child Cascading ──
  const togglePermission = (permItem: PermissionItemConfig) => {
    if (readOnly || !onChange) return;

    const allKeys = [permItem.key, ...(permItem.linkedKeys || [])];
    const active = isSelected(permItem.key, permItem.linkedKeys);

    if (active) {
      // Deactivating:
      // Recursively deactivate any child permissions that require this permission or its linked keys
      const toRemove = new Set<Permission>(allKeys);
      const collectChildren = (p: Permission) => {
        const children = PERMISSION_CHILDREN[p] || [];
        children.forEach((child) => {
          if (!toRemove.has(child)) {
            toRemove.add(child);
            collectChildren(child);
          }
        });
      };
      allKeys.forEach((k) => collectChildren(k));

      onChange(selectedPermissions.filter((p) => !toRemove.has(p)));
    } else {
      // Activating:
      // Recursively activate any required prerequisite parent permissions
      const toAdd = new Set<Permission>(allKeys);
      const collectParents = (p: Permission) => {
        const parents = PERMISSION_DEPENDENCIES[p] || [];
        parents.forEach((parent) => {
          if (!toAdd.has(parent)) {
            toAdd.add(parent);
            collectParents(parent);
          }
        });
      };
      allKeys.forEach((k) => collectParents(k));

      const updated = new Set([...selectedPermissions, ...Array.from(toAdd)]);
      onChange(Array.from(updated));
    }
  };

  // ── Group Toggle ──
  const toggleCategory = (group: PermissionCategoryConfig) => {
    if (readOnly || !onChange) return;
    const allGroupKeys = group.permissions.flatMap((p) => [p.key, ...(p.linkedKeys || [])]);
    const allSelected = group.permissions.every((p) => isSelected(p.key, p.linkedKeys));

    if (allSelected) {
      // Unselect all in group and any dependent children
      const toRemove = new Set<Permission>(allGroupKeys);
      allGroupKeys.forEach((p) => {
        const children = PERMISSION_CHILDREN[p] || [];
        children.forEach((c) => toRemove.add(c));
      });
      onChange(selectedPermissions.filter((p) => !toRemove.has(p)));
    } else {
      // Select all in group and their prerequisites
      const toAdd = new Set<Permission>(allGroupKeys);
      allGroupKeys.forEach((p) => {
        const parents = PERMISSION_DEPENDENCIES[p] || [];
        parents.forEach((parent) => toAdd.add(parent));
      });
      const newPerms = new Set([...selectedPermissions, ...Array.from(toAdd)]);
      onChange(Array.from(newPerms));
    }
  };

  const displayedGroups = activeCategoryFilter === 'ALL'
    ? PERMISSION_GROUPS
    : PERMISSION_GROUPS.filter((g) => g.id === activeCategoryFilter);

  return (
    <div className="space-y-4">
      {/* ── Top Dropdown & Accordion Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-violet-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-400">Category View:</span>
          <select
            value={activeCategoryFilter}
            onChange={(e) => setActiveCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 font-medium focus:border-violet-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories ({PERMISSION_GROUPS.length})</option>
            {PERMISSION_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({g.permissions.length})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
          >
            Expand All
          </button>
          <span className="text-slate-700">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Category Dropdown Accordion Cards ── */}
      {displayedGroups.map((group) => {
        const selectedCount = group.permissions.filter((p) => isSelected(p.key, p.linkedKeys)).length;
        const allSelected = selectedCount === group.permissions.length && group.permissions.length > 0;
        const isOpen = openGroups[group.id] ?? true;

        return (
          <div
            key={group.id}
            className="rounded-xl border border-slate-800 bg-slate-900/40 transition-all overflow-hidden"
          >
            {/* Category Header (Click to toggle Dropdown) */}
            <div
              onClick={() => toggleGroupOpen(group.id)}
              className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label={isOpen ? 'Collapse category' : 'Expand category'}
                  className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-violet-400 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform" />
                  )}
                </button>
                {group.icon}
                <h4 className="text-sm font-semibold text-slate-100">{group.title}</h4>
                <Badge
                  variant={selectedCount > 0 ? 'info' : 'outline'}
                  className="text-[10px] ml-1 font-mono"
                >
                  {selectedCount} / {group.permissions.length} Active
                </Badge>
              </div>

              {!readOnly && onChange && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(group);
                  }}
                  className="text-xs font-medium text-violet-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-violet-500/10 focus:outline-none transition-colors"
                >
                  {allSelected ? 'Clear Category' : 'Select All'}
                </button>
              )}
            </div>

            {/* Collapsible Dropdown Content Grid */}
            {isOpen && (
              <div className="border-t border-slate-800/80 p-4 pt-3 bg-slate-950/20">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {group.permissions.map((perm) => {
                    const active = isSelected(perm.key, perm.linkedKeys);
                    const missingPrereq = perm.prerequisite && !isSelected(perm.prerequisite);

                    if (readOnly) {
                      return (
                        <div
                          key={perm.key}
                          className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
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
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-mono text-xs font-medium text-slate-200">{perm.label}</p>
                              {perm.prerequisite && (
                                <span className="text-[10px] text-amber-400/90 font-mono">
                                  (Needs {perm.prerequisite})
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{perm.description}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        key={perm.key}
                        onClick={() => togglePermission(perm)}
                        role="checkbox"
                        aria-checked={active}
                        className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs text-left transition-all select-none ${
                          active
                            ? 'border-violet-500/40 bg-violet-500/15 text-slate-100 shadow-sm'
                            : 'border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${
                            active
                              ? 'border-violet-500 bg-violet-600 text-white shadow'
                              : 'border-slate-700 bg-slate-900 group-hover:border-slate-600'
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-100">
                              {perm.label}
                            </span>
                            {missingPrereq && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                Auto-enables {perm.prerequisite}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">{perm.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
