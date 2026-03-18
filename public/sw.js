// public/sw.js — SafeDoc Service Worker (PWA)
const CACHE_NAME   = 'safedoc-v1'
const STATIC_CACHE = 'safedoc-static-v1'

// 오프라인에서도 동작해야 하는 정적 리소스
const STATIC_URLS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
]

// ── 설치: 정적 리소스 프리캐시 ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll(STATIC_URLS).catch(() => {})
    ).then(() => self.skipWaiting())
  )
})

// ── 활성화: 오래된 캐시 삭제 ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: Network First (API) / Cache First (정적) ──────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // API 요청 → Network First (오프라인 시 캐시 폴백)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then(response => {
        // GET 요청만 캐시 (POST/PATCH/DELETE 제외)
        if (request.method === 'GET' && response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      }).catch(() =>
        caches.match(request).then(cached =>
          cached ?? new Response(JSON.stringify({ error: '오프라인 상태입니다.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    )
    return
  }

  // 정적 리소스 → Cache First
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then(cache => cache.put(request, response.clone()))
          }
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }

  // 페이지 탐색 → Network First, 오프라인 시 /offline 폴백
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline') ?? fetch('/offline')
      )
    )
    return
  }
})

// ── Push 알림 (카카오/이메일 폴백용) ────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'SafeDoc 알림', {
      body:    data.body ?? '',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-72.png',
      tag:     data.tag ?? 'safedoc',
      data:    data.url ? { url: data.url } : undefined,
      actions: data.url ? [{ action: 'open', title: '열기' }] : [],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  }
})
