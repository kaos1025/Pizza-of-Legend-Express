import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Cloudflare Workers 배포용 OpenNext 설정.
// 현재 앱은 ISR / fetch 캐시에 의존하지 않으므로 incremental cache 없이 기본값으로 둔다.
// 캐시가 필요해지면 R2 incremental cache + WORKER_SELF_REFERENCE 바인딩을 wrangler.jsonc 에 추가하고
// 여기서 `incrementalCache: r2IncrementalCache` 를 지정한다. https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
