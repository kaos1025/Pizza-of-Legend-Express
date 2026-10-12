// ============================================================
// Supabase Storage 객체 이전: 호스티드 → self-hosted
//
// 레포 루트에서 실행 (레포의 @supabase/supabase-js 를 그대로 사용):
//
//   node deploy/scripts/migrate-storage.mjs
//
// 필요 환경변수:
//   OLD_SUPABASE_URL          예: https://xxxx.supabase.co
//   OLD_SERVICE_ROLE_KEY      기존 프로젝트 secret key (sb_secret_* 가능)
//   NEW_SUPABASE_URL          예: https://api.pizzalegend.example.com
//   NEW_SERVICE_ROLE_KEY      self-hosted SERVICE_ROLE_KEY (JWT)
//
// PowerShell 예:
//   $env:OLD_SUPABASE_URL="https://xxxx.supabase.co"; `
//   $env:OLD_SERVICE_ROLE_KEY="..."; `
//   $env:NEW_SUPABASE_URL="https://api.example.com"; `
//   $env:NEW_SERVICE_ROLE_KEY="..."; `
//   node deploy/scripts/migrate-storage.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';

const required = [
  'OLD_SUPABASE_URL',
  'OLD_SERVICE_ROLE_KEY',
  'NEW_SUPABASE_URL',
  'NEW_SERVICE_ROLE_KEY',
];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`[migrate-storage] 환경변수 누락: ${name}`);
    process.exit(1);
  }
}

const BUCKET = 'menu-images';
const PAGE_SIZE = 100;

const src = createClient(process.env.OLD_SUPABASE_URL, process.env.OLD_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const dst = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function ensureBucket() {
  const { data: buckets, error } = await dst.storage.listBuckets();
  if (error) throw new Error(`대상 버킷 목록 조회 실패: ${error.message}`);
  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error: createError } = await dst.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (createError) throw new Error(`버킷 생성 실패: ${createError.message}`);
    console.log(`[migrate-storage] 버킷 생성: ${BUCKET}`);
  }
}

async function listAllObjects() {
  const names = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await src.storage.from(BUCKET).list('', {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`원본 객체 목록 조회 실패: ${error.message}`);
    const files = (data ?? []).filter((item) => item.id); // 폴더 제외
    names.push(...files.map((f) => f.name));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return names;
}

async function copyObject(name) {
  const { data: blob, error: downloadError } = await src.storage.from(BUCKET).download(name);
  if (downloadError) throw new Error(`다운로드 실패 (${name}): ${downloadError.message}`);

  const buffer = Buffer.from(await blob.arrayBuffer());
  const { error: uploadError } = await dst.storage.from(BUCKET).upload(name, buffer, {
    contentType: blob.type || 'image/webp',
    upsert: true,
  });
  if (uploadError) throw new Error(`업로드 실패 (${name}): ${uploadError.message}`);
}

const main = async () => {
  await ensureBucket();
  const names = await listAllObjects();
  console.log(`[migrate-storage] 이전 대상 ${names.length}개`);

  let ok = 0;
  const failed = [];
  for (const name of names) {
    try {
      await copyObject(name);
      ok += 1;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed.push(name);
      console.error(`  ✗ ${err.message}`);
    }
  }

  console.log(`[migrate-storage] 완료: 성공 ${ok} / 실패 ${failed.length}`);
  if (failed.length > 0) {
    console.error(`[migrate-storage] 실패 목록: ${failed.join(', ')}`);
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(`[migrate-storage] 중단: ${err.message}`);
  process.exit(1);
});
