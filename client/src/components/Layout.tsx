import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageActions } from '@/contexts/PageActionsContext';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui';

function LinkyLogoMark() {
  return <img src="/favicon.svg" width={28} height={28} alt="Linky" className="shrink-0" />;
}

function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

function EditLayoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4.5 3A1.5 1.5 0 003 4.5v4A1.5 1.5 0 004.5 10h4A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-4zM11.5 3A1.5 1.5 0 0010 4.5v4a1.5 1.5 0 001.5 1.5h4A1.5 1.5 0 0017 8.5v-4A1.5 1.5 0 0015.5 3h-4zM4.5 10A1.5 1.5 0 003 11.5v4A1.5 1.5 0 004.5 17h4a1.5 1.5 0 001.5-1.5v-4A1.5 1.5 0 008.5 10h-4zM11.5 10a1.5 1.5 0 00-1.5 1.5v4a1.5 1.5 0 001.5 1.5h4a1.5 1.5 0 001.5-1.5v-4a1.5 1.5 0 00-1.5-1.5h-4z" />
    </svg>
  );
}

function NewLinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
    </svg>
  );
}

export default function Layout() {
  const { theme } = useTheme();
  const { onNewLink, onEditLayout, editLayoutActive } = usePageActions();
  return (
    <div className="desktop bg-bg text-text">
      <header
        className="sticky top-0 z-40 w-full flex items-center box-border shrink-0 backdrop-blur-md"
        style={{
          height: 'var(--header-height)',
          background: `${theme.surface}dd`,
          borderBottom: `1px solid ${theme.border}`,
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
            <NavLink
              to="/"
              end
              aria-label="Dashboard"
              style={({ isActive }) => ({
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px',
                background: isActive ? `${theme.accent}18` : 'transparent',
                color: isActive ? theme.accent : theme.text2,
                fontSize: '14px', fontWeight: 500,
              })}
            >
              <DashboardIcon />
              <span className="hidden sm:inline">Dashboard</span>
            </NavLink>
            {onNewLink && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onNewLink}
                className="hidden sm:inline-flex"
                leadingIcon={<NewLinkIcon />}
              >
                New link
              </Button>
            )}
            {onEditLayout && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onEditLayout}
                className="px-2 sm:px-3"
                aria-label="Edit layout"
                style={{
                  background: editLayoutActive ? `${theme.accent}18` : 'transparent',
                  color: editLayoutActive ? theme.accent : theme.text2,
                }}
                leadingIcon={<EditLayoutIcon />}
              >
                <span className="hidden sm:inline">Edit layout</span>
              </Button>
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
              })}
            >
              <svg fill="currentColor" viewBox="0 0 20 20" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Settings</span>
            </NavLink>
          </nav>
        </div>
      </header>
      {editLayoutActive && onEditLayout && (
        <div
          className="sticky z-30 w-full backdrop-blur-md"
          style={{
            top: 'var(--header-height)',
            background: `${theme.surface}ee`,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-2 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onEditLayout}
              leadingIcon={(
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.478-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                </svg>
              )}
            >
              Save layout
            </Button>
          </div>
        </div>
      )}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
