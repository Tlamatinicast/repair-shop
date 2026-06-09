/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

// Cabeceras de seguridad. Nota: NO se incluye CSP estricta porque next-pwa y
// algunos scripts inline requieren ajuste fino; se puede añadir después con pruebas.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },                       // anti clickjacking
  { key: 'X-Content-Type-Options', value: 'nosniff' },                   // no adivinar MIME
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // La cámara la usa el escáner QR (self); micrófono y geolocalización off.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  // HSTS: fuerza HTTPS. Railway sirve por HTTPS, así que es seguro.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = withPWA(nextConfig);
