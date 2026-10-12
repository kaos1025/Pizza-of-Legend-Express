-- ============================================================
-- 메뉴 이미지 URL 을 호스티드 Supabase → self-hosted 도메인으로 교정
--
-- 실행 전 치환할 것:
--   __OLD_PROJECT_REF__ → 기존 프로젝트 ref (예: sdvcaisxutdnagncxcgd)
--   __API_DOMAIN__      → 예: api.pizzalegend.example.com
--
-- Storage 객체 복사(deploy/scripts/migrate-storage.mjs) 이후 실행.
-- ============================================================

-- 변경 대상 미리 보기
SELECT id, image_url FROM public.menu_items
WHERE image_url LIKE 'https://__OLD_PROJECT_REF__.supabase.co/%';

UPDATE public.menu_items
SET image_url = replace(
  image_url,
  'https://__OLD_PROJECT_REF__.supabase.co',
  'https://__API_DOMAIN__'
)
WHERE image_url LIKE 'https://__OLD_PROJECT_REF__.supabase.co/%';
