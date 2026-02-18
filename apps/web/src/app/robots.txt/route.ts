export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://calling-agent-mocha.vercel.app';
  const body = `User-agent: *
Allow: /
Allow: /welcome
Allow: /pricing
Disallow: /api/
Disallow: /settings
Disallow: /onboarding
Disallow: /tasks/

Sitemap: ${appUrl}/sitemap.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
