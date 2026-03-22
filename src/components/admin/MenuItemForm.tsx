'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import type { MenuItem } from '@/lib/admin/menu';

interface MenuItemFormProps {
  item?: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<MenuItem>) => void;
  category: string;
}

const categoryHasSize = (cat: string) => ['pizza', 'set_menu', 'half_half'].includes(cat);

const descTabs = [
  { key: 'description_ko', label: 'KO' },
  { key: 'description_en', label: 'EN' },
  { key: 'description_zh', label: 'ZH' },
  { key: 'description_ja', label: 'JA' },
] as const;

export const MenuItemForm = ({ item, isOpen, onClose, onSave, category }: MenuItemFormProps) => {
  const isEdit = !!item;
  const [formData, setFormData] = useState<Partial<MenuItem>>({});
  const [activeDescTab, setActiveDescTab] = useState('description_ko');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        description_ko: '',
        description_en: '',
        description_zh: '',
        description_ja: '',
        price: undefined,
        price_R: undefined,
        price_L: undefined,
        badge: null,
        is_half_half_available: false,
        image_url: '',
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

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    setUploadError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('JPG, PNG, WebP 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setUploading(true);
    try {
      // Client-side compression: max 800px, WebP, quality 80%
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        maxSizeMB: 1,
        fileType: 'image/webp',
        initialQuality: 0.8,
        useWebWorker: true,
      });

      const formDataUpload = new FormData();
      formDataUpload.append('file', compressed, 'image.webp');
      if (formData.id) {
        formDataUpload.append('menu_item_id', formData.id);
      }

      const res = await fetch('/api/admin/menu/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await res.json();
      if (res.ok) {
        // Add cache buster to force refresh
        handleChange('image_url', result.url + '?t=' + Date.now());
      } else {
        setUploadError(result.error || '업로드 실패');
      }
    } catch {
      setUploadError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  }, [formData.id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const hasSize = categoryHasSize(category);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-pizza-dark">
            {isEdit ? '메뉴 수정' : '메뉴 추가'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Image Upload */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">이미지</h3>
            {formData.image_url ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.image_url}
                  alt="메뉴 이미지"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="opacity-0 group-hover:opacity-100 bg-white text-pizza-dark text-sm font-medium px-4 py-2 rounded-lg transition-opacity"
                  >
                    변경
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-pizza-red bg-red-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-pizza-red rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">업로드 중...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-sm text-gray-400">클릭 또는 드래그하여 업로드</span>
                    <span className="text-xs text-gray-300 mt-1">JPG, PNG, WebP (최대 5MB, 자동 압축)</span>
                  </>
                )}
              </div>
            )}
            {uploadError && (
              <p className="text-xs text-red-500 mt-1">{uploadError}</p>
            )}
            {uploading && formData.image_url && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-pizza-red rounded-full animate-spin" />
                <span className="text-xs text-gray-400">업로드 중...</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
          </div>

          {/* Names — 2x2 grid */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">메뉴명</h3>
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

          {/* Descriptions — tab-based */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">설명</h3>
            <div className="flex gap-1 mb-2">
              {descTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDescTab(tab.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeDescTab === tab.key
                      ? 'bg-pizza-dark text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {descTabs.map((tab) => (
              <div key={tab.key} className={activeDescTab === tab.key ? 'block' : 'hidden'}>
                <Textarea
                  value={(formData[tab.key as keyof typeof formData] as string) || ''}
                  onChange={(e) => handleChange(tab.key, e.target.value)}
                  placeholder={`${tab.label} 설명 입력`}
                  rows={3}
                  className="resize-none"
                />
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">가격 (₩)</h3>
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

          {/* Options — single row */}
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">옵션</h3>
            <div className="flex items-center gap-3">
              <select
                value={formData.badge || ''}
                onChange={(e) => handleChange('badge', e.target.value || null)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">뱃지 없음</option>
                <option value="popular">인기</option>
                <option value="chefs_pick">셰프 추천</option>
                <option value="signature">시그니처</option>
                <option value="new">신메뉴</option>
              </select>

              {category === 'pizza' && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_half_half_available || false}
                    onChange={(e) => handleChange('is_half_half_available', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  반반 가능
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer — fixed at bottom */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-pizza-red hover:bg-red-700 text-white font-semibold"
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
    </div>
  );
};
