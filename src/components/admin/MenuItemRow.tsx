'use client';

import { useState } from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { MenuItem } from '@/lib/admin/menu';

interface MenuItemRowProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleSoldOut: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export const MenuItemRow = ({ item, onEdit, onDelete, onToggleSoldOut, dragHandleProps }: MenuItemRowProps) => {
  const [deleting, setDeleting] = useState(false);

  const priceDisplay = item.price
    ? formatPrice(item.price)
    : item.price_R && item.price_L
    ? `R ${formatPrice(item.price_R)} / L ${formatPrice(item.price_L)}`
    : '-';

  const handleDelete = async () => {
    if (!confirm(`"${item.name_ko}" 메뉴를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    onDelete(item.id);
  };

  return (
    <div className={`flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3 ${
      item.is_sold_out ? 'opacity-50' : ''
    } ${deleting ? 'opacity-30 pointer-events-none' : ''}`}>
      {/* Drag handle */}
      <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">
            {item.category === 'pizza' ? '🍕' :
             item.category === 'side' ? '🍗' :
             item.category === 'drink' ? '🥤' :
             item.category === 'sauce' ? '🫙' : '🎁'}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.name_ko}</span>
          {item.badge && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-cheese-yellow/20 text-orange-700">
              {item.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{item.name_en}</p>
        <p className="text-sm font-medium text-pizza-red mt-0.5">{priceDisplay}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Sold out toggle */}
        <button
          onClick={() => onToggleSoldOut(item.id)}
          className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
            item.is_sold_out
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-600'
          }`}
        >
          {item.is_sold_out ? '품절' : '판매중'}
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
