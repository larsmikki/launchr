import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageActions } from '@/contexts/PageActionsContext';
import Footer from '@/components/Footer';

function LinkyLogoMark() {
  return <img src="/favicon.svg" width={28} height={28} alt="Linky" className="shrink-0" />;
}

export default function Layout() {
  const { theme } = useTheme();
  const { onNewLink, onEditLayout, editLayoutActive } = usePageActions();
  return (
    <div className="desktop" style={{ background: theme.bg }}>
      <header
        className="sticky top-0 z-40 w-full flex items-center box-border shrink-0"
        style={{
          height: '64px',
          background: `${theme.surface}dd`,
          borderBottom: `1px solid ${theme.border}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="w-full px-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <LinkyLogoMark />
            <span className="text-xl font-extrabold tracking-tight gradient-text select-none">
              Linky
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {onNewLink && (
              <button
                onClick={onNewLink}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: 'transparent', border: 'none',
                  color: theme.text2, fontSize: '14px', fontWeight: 500,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Link
              </button>
            )}
            {onEditLayout && (
              <button
                onClick={onEditLayout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: editLayoutActive ? `${theme.accent}18` : 'transparent',
                  border: 'none',
                  color: editLayoutActive ? theme.accent : theme.text2,
                  fontSize: '14px', fontWeight: 500,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                {editLayoutActive ? 'Save Layout' : 'Edit Layout'}
              </button>
            )}
            <NavLink
              to="/settings"
              style={({ isActive }) => ({
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px',
                background: isActive ? `${theme.accent}18` : 'transparent',
                color: isActive ? theme.accent : theme.text2,
                fontSize: '14px', fontWeight: 500,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              })}
            >
              <svg fill="currentColor" viewBox="0 0 20 20" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
