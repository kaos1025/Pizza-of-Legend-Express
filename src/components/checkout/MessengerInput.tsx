'use client';

import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';

const MESSENGER_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'wechat', label: 'WeChat', icon: '💬' },
  { value: 'line', label: 'LINE', icon: '💬' },
  { value: 'kakaotalk', label: 'KakaoTalk', icon: '💬' },
] as const;

interface MessengerInputProps {
  platform: string;
  onPlatformChange: (platform: string) => void;
  messengerId: string;
  onMessengerIdChange: (id: string) => void;
}

export const MessengerInput = ({
  platform,
  onPlatformChange,
  messengerId,
  onMessengerIdChange,
}: MessengerInputProps) => {
  const t = useTranslations('checkout');

  const selectedOption = MESSENGER_OPTIONS.find((o) => o.value === platform);
  const platformLabel = selectedOption?.label || 'Messenger';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-pizza-dark" />
        <label className="text-sm font-medium text-pizza-dark">
          {t('messengerPlatformLabel')} <span className="text-pizza-red">*</span>
        </label>
      </div>

      <select
        value={platform}
        onChange={(e) => onPlatformChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pizza-red/20 focus:border-pizza-red"
      >
        <option value="">{t('messengerPlatformPlaceholder')}</option>
        {MESSENGER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.icon} {opt.label}
          </option>
        ))}
      </select>

      <div>
        <label className="block text-sm font-medium text-pizza-dark mb-1">
          {t('messengerIdLabel')} <span className="text-pizza-red">*</span>
        </label>
        <input
          type="text"
          value={messengerId}
          onChange={(e) => onMessengerIdChange(e.target.value)}
          placeholder={t('messengerIdPlaceholder', { platform: platformLabel })}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pizza-red/20 focus:border-pizza-red"
        />
      </div>

      <p className="text-xs text-gray-500 flex items-start gap-1">
        <span>📱</span>
        <span>{t('messengerRequiredNote')}</span>
      </p>

      <p className="text-xs text-orange-600 font-medium flex items-start gap-1">
        <span>⚠️</span>
        <span>{t('messengerWarning')}</span>
      </p>
    </div>
  );
};
