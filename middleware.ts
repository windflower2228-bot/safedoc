import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const canonicalHost = 'safedoc-windflower2228-bots-projects.vercel.app'
  const shouldRedirectToCanonical =
    process.env.VERCEL_ENV === 'production' &&
    host.endsWith('-windflower2228-bots-projects.vercel.app') &&
    host !== canonicalHost

  if (shouldRedirectToCanonical) {
    const url = request.nextUrl.clone()
    url.protocol = 'https'
    url.host = canonicalHost
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register') ||
                     request.nextUrl.pathname.startsWith('/forgot-password')

  const isPublicApi =
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/api/company/create' ||
    request.nextUrl.pathname === '/api/companies/search' ||
    request.nextUrl.pathname.startsWith('/api/company-join-requests')
  const isPublicAsset =
    request.nextUrl.pathname === '/sw.js' ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname.startsWith('/icons/')

  // 미인증 → 로그인 페이지로
  if (!user && !isAuthPage && !isPublicApi && !isPublicAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // 인증된 사용자가 auth 페이지 접근 → 대시보드로
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
