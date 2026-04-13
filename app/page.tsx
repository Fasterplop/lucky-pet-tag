import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 20px',
        background: '#f3faf6',
        color: '#151d1b',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: '#ffffff',
          border: '1px solid #e3ede7',
          borderRadius: 28,
          padding: 32,
          boxShadow: '0 18px 48px rgba(11, 105, 70, 0.08)',
        }}
      >
        <p
          style={{
            margin: 0,
            color: '#0b6946',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Lucky Pet Tag
        </p>

        <h1
          style={{
            margin: '14px 0 0',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            lineHeight: 1,
            letterSpacing: '-0.05em',
            fontWeight: 800,
          }}
        >
          Smart pet profiles that help families reunite faster.
        </h1>

        <p
          style={{
            margin: '16px 0 0',
            fontSize: 16,
            lineHeight: 1.7,
            color: '#486c59',
          }}
        >
          This deployment powers the owner portal, admin dashboard, and public
          pet profiles.
        </p>

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Link
            href="/login"
            style={{
              textDecoration: 'none',
              background: '#0b6946',
              color: '#ffffff',
              padding: '12px 18px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Owner Login
          </Link>

          <Link
            href="/admin"
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              color: '#151d1b',
              border: '1px solid #e3ede7',
              padding: '12px 18px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Admin Dashboard
          </Link>

          <a
            href="https://luckypetag.com"
            style={{
              textDecoration: 'none',
              background: '#ffffff',
              color: '#151d1b',
              border: '1px solid #e3ede7',
              padding: '12px 18px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Visit Store
          </a>
        </div>
      </div>
    </main>
  );
}