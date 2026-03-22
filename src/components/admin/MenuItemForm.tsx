'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { MenuItem } from '@/lib/admin/menu';

interface MenuItemFormProps {
  item?: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<MenuItem>) => void;
  category: string;
}

const categoryHasSize = (cat: string) => ['pizza', 'set_menu'].includes(cat);

export const MenuItemForm = ({ item, isOpen, onClose, onSave, category }: MenuItemFormProps) => {
  const isEdit = !!item;
  const [formData, setFormData] = useState<Partial<MenuItem>>({});

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({
        id: '',
        category,
        name_ko: '',
        name_en: '',
        name_zh: '',
        name_ja: '',
        description_en: '',
        description_zh: '',
        description_ja: '',
        description_ko: '',
        price: undefined,
        price_R: undefined,
        price_L: undefined,
        badge: null,
        is_half_half_available: false,
      });
    }
  }, [item, category]);

  const handleChange = (field: string, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name_en) return;
    onSave({
      ...formData,
      id: formData.id || formData.name_en!.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category,
    });
    onClose();
  };

  const hasSize = categoryHasSize(category);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? '메뉴 수정' : '메뉴 추가'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Names */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">메뉴명</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">한국어</label>
                <Input
                  value={formData.name_ko || ''}
                  onChange={(e) => handleChange('name_ko', e.target.value)}
                  placeholder="한국어 이름"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">English</label>
                <Input
                  value={formData.name_en || ''}
                  onChange={(e) => handleChange('name_en', e.target.value)}
                  placeholder="English name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">中文</label>
                <Input
                  value={formData.name_zh || ''}
                  onChange={(e) => handleChange('name_zh', e.target.value)}
                  placeholder="中文名称"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">日本語</label>
                <Input
                  value={formData.name_ja || ''}
                  onChange={(e) => handleChange('name_ja', e.target.value)}
                  placeholder="日本語名"
                />
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">설명</h3>
            <div>
              <label className="text-xs text-gray-500">English</label>
              <Textarea
                value={formData.description_en || ''}
                onChange={(e) => handleChange('description_en', e.target.value)}
                placeholder="English description"
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">中文</label>
              <Textarea
                value={formData.description_zh || ''}
                onChange={(e) => handleChange('description_zh', e.target.value)}
                placeholder="中文描述"
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">日本語</label>
              <Textarea
                value={formData.description_ja || ''}
                onChange={(e) => handleChange('description_ja', e.target.value)}
                placeholder="日本語の説明"
                rows={2}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">가격 (₩)</h3>
            {hasSize ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Regular (R)</label>
                  <Input
                    type="number"
                    value={formData.price_R || ''}
                    onChange={(e) => handleChange('price_R', parseInt(e.target.value) || 0)}
                    placeholder="R 가격"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Large (L)</label>
                  <Input
                    type="number"
                    value={formData.price_L || ''}
                    onChange={(e) => handleChange('price_L', parseInt(e.target.value) || 0)}
                    placeholder="L 가격"
                  />
                </div>
              </div>
            ) : (
              <Input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', parseInt(e.target.value) || 0)}
                placeholder="가격"
              />
            )}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">옵션</h3>
            <div className="flex gap-3">
              <select
                value={formData.badge || ''}
                onChange={(e) => handleChange('badge', e.target.value || null)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="">뱃지 없음</option>
                <option value="popular">인기</option>
                <option value="chefs_pick">셰프 추천</option>
                <option value="signature">시그니처</option>
                <option value="new">신메뉴</option>
              </select>

              {category === 'pizza' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.is_half_half_available || false}
                    onChange={(e) => handleChange('is_half_half_available', e.target.checked)}
                    className="rounded"
                  />
                  반반 가능
                </label>
              )}
            </div>

            {/* sub_category removed — not in DB schema */}
          </div>

          {/* Image URL */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-1">이미지 URL</h3>
            <Input
              value={formData.image_url || ''}
              onChange={(e) => handleChange('image_url', e.target.value)}
              placeholder="이미지 URL (추후 업로드 기능 추가)"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-pizza-red hover:bg-red-700 text-white"
            >
              {isEdit ? '수정 완료' : '메뉴 추가'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              취소
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
