import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#E3E2DE',
            margin: '0 0 4px',
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          404
        </p>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#37352F',
            marginBottom: 8,
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#787774',
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: '#2383E2',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
