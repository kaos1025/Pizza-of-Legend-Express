'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { CategoryTabs } from './CategoryTabs';
import { SortableMenuList } from './SortableMenuList';
import { MenuItemForm } from './MenuItemForm';
import type { MenuItem } from '@/lib/admin/menu';

export const MenuCMS = () => {
  const [category, setCategory] = useState('pizza');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/menu?category=${category}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [fetchItems]);

  const handleReorder = async (orderedIds: string[]) => {
    // Optimistic update
    const reordered = orderedIds
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean) as MenuItem[];
    setItems(reordered);

    await fetch('/api/admin/menu/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, orderedIds }),
    });
  };

  const handleToggleSoldOut = async (id: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_sold_out: !i.is_sold_out } : i))
    );
    await fetch(`/api/admin/menu/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_sold_out: true }), // Server toggles
    });
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
  };

  const handleSave = async (data: Partial<MenuItem>) => {
    if (editingItem) {
      // Update
      const res = await fetch(`/api/admin/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) fetchItems();
    } else {
      // Create
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) fetchItems();
    }
    setEditingItem(null);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">메뉴 관리</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 bg-pizza-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" />
          메뉴 추가
        </button>
      </div>

      <CategoryTabs activeCategory={category} onCategoryChange={setCategory} />

      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <p>로딩 중...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>이 카테고리에 메뉴가 없습니다</p>
        </div>
      ) : (
        <SortableMenuList
          items={items}
          onReorder={handleReorder}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleSoldOut={handleToggleSoldOut}
        />
      )}

      <MenuItemForm
        item={editingItem}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
        onSave={handleSave}
        category={category}
      />
    </div>
  );
};
