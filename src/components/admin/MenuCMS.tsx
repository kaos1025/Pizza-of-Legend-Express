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
  const [hasSideItems, setHasSideItems] = useState(true);

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

  // 사이드 항목 존재 여부 확인 — 없으면 '사이드' 탭을 숨긴다. (사장님이 사이드 제거)
  useEffect(() => {
    let cancelled = false;
    const checkSide = async () => {
      try {
        const res = await fetch('/api/admin/menu?category=side');
        if (!res.ok) return;
        const data = (await res.json()) as { items: MenuItem[] };
        const has = Array.isArray(data.items) && data.items.length > 0;
        if (cancelled) return;
        setHasSideItems(has);
        // 현재 사이드 탭을 보고 있는데 항목이 없어졌다면 피자 탭으로 복귀
        if (!has) setCategory((c) => (c === 'side' ? 'pizza' : c));
      } catch {
        // 확인 실패 시 기본값(노출) 유지
      }
    };
    void checkSide();
    return () => {
      cancelled = true;
    };
  }, [items]);

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

      <CategoryTabs
        activeCategory={category}
        onCategoryChange={setCategory}
        hiddenCategories={hasSideItems ? [] : ['side']}
      />

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
