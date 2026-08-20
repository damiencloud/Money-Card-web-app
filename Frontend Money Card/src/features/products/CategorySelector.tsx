// ─── Product Category Multi-Select Component ─────────────────
// Uses the Staff Permission assignment UI design pattern for Multi-Select Category & Attributes.

import { Utensils, Clock, Layers, Sparkles, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui';

export interface CategoryOption {
  value: string;
  label: string;
}

export interface CategoryGroupConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  options: CategoryOption[];
}

const PRODUCT_CATEGORY_GROUPS: CategoryGroupConfig[] = [
  {
    id: 'food_type',
    title: 'Food Type',
    icon: <Utensils className="h-4 w-4 text-emerald-400" />,
    options: [
      { value: 'Veg', label: 'Veg' },
      { value: 'Non-Veg', label: 'Non-Veg' },
      { value: 'Vegan', label: 'Vegan' },
      { value: 'Vegetarian', label: 'Vegetarian' },
      { value: 'Egg', label: 'Egg' },
      { value: 'Contains Dairy', label: 'Contains Dairy' },
    ],
  },
  {
    id: 'meal_type',
    title: 'Meal Type',
    icon: <Clock className="h-4 w-4 text-violet-400" />,
    options: [
      { value: 'Breakfast', label: 'Breakfast' },
      { value: 'Lunch', label: 'Lunch' },
      { value: 'Dinner', label: 'Dinner' },
      { value: 'Snack', label: 'Snack' },
      { value: 'Beverage', label: 'Beverage' },
      { value: 'Dessert', label: 'Dessert' },
    ],
  },
  {
    id: 'food_category',
    title: 'Food Category',
    icon: <Layers className="h-4 w-4 text-amber-400" />,
    options: [
      { value: 'Main Course', label: 'Main Course' },
      { value: 'Starter', label: 'Starter' },
      { value: 'Rice', label: 'Rice' },
      { value: 'Curry', label: 'Curry' },
      { value: 'Bread', label: 'Bread' },
      { value: 'Salad', label: 'Salad' },
      { value: 'Soup', label: 'Soup' },
      { value: 'Sandwich', label: 'Sandwich' },
      { value: 'Fast Food', label: 'Fast Food' },
      { value: 'Bakery', label: 'Bakery' },
    ],
  },
  {
    id: 'dietary_attributes',
    title: 'Dietary / Product Attributes',
    icon: <Sparkles className="h-4 w-4 text-rose-400" />,
    options: [
      { value: 'Spicy', label: 'Spicy' },
      { value: 'Mild', label: 'Mild' },
      { value: 'Sweet', label: 'Sweet' },
      { value: 'Sugar-Free', label: 'Sugar-Free' },
      { value: 'Gluten-Free', label: 'Gluten-Free' },
      { value: 'High Protein', label: 'High Protein' },
    ],
  },
];

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function CategorySelector({
  selectedCategories,
  onChange,
  error,
  disabled = false,
}: CategorySelectorProps) {
  const isSelected = (val: string) =>
    selectedCategories.some((c) => c.toLowerCase() === val.toLowerCase());

  // Toggle option selection
  const handleToggle = (val: string) => {
    if (disabled) return;

    if (isSelected(val)) {
      onChange(selectedCategories.filter((c) => c.toLowerCase() !== val.toLowerCase()));
    } else {
      onChange([...selectedCategories, val]);
    }
  };

  // Remove individual selection
  const handleRemove = (val: string) => {
    if (disabled) return;
    onChange(selectedCategories.filter((c) => c.toLowerCase() !== val.toLowerCase()));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Categories & Attributes <span className="text-rose-400">*</span>
        </label>
        <span className="text-xs text-slate-400 font-medium">
          {selectedCategories.length} selected
        </span>
      </div>

      {/* Selected Summary Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Selected Summary:
        </span>
        {selectedCategories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-2.5 min-h-[38px] items-center">
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 border border-violet-500/30 px-2.5 py-1 text-xs text-violet-200 font-medium"
              >
                <span>{cat}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(cat)}
                    className="rounded p-0.5 text-violet-400 hover:text-violet-100 hover:bg-violet-500/20 transition-colors"
                    title={`Remove ${cat}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 text-xs text-slate-500 italic">
            No categories or attributes selected yet. Select one or more options below.
          </div>
        )}
      </div>

      {/* Grouped Category Cards Grid */}
      <div className="space-y-3.5">
        {PRODUCT_CATEGORY_GROUPS.map((group) => {
          const groupOptions = group.options.map((o) => o.value);
          const groupSelectedCount = groupOptions.filter((val) => isSelected(val)).length;

          return (
            <div
              key={group.id}
              className={`rounded-xl border p-3.5 transition-all ${
                groupSelectedCount > 0
                  ? 'border-violet-500/40 bg-slate-900/60'
                  : 'border-slate-800 bg-slate-900/30'
              }`}
            >
              {/* Group Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  {group.icon}
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    {group.title}
                  </h4>
                </div>
                {groupSelectedCount > 0 && (
                  <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">
                    {groupSelectedCount} selected
                  </Badge>
                )}
              </div>

              {/* Options Grid (Staff Permissions Tile Design) */}
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                {group.options.map((option) => {
                  const active = isSelected(option.value);

                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                        active
                          ? 'border-violet-500/50 bg-violet-500/20 text-slate-100 ring-1 ring-violet-500/30'
                          : 'border-slate-800/90 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleToggle(option.value)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          active
                            ? 'border-violet-500 bg-violet-600 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </div>
                      <span className={`truncate ${active ? 'font-semibold text-white' : ''}`}>
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
