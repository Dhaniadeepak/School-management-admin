import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { baseApi } from '../api/baseApi';
import { useDashboardQuery, useLogoutMutation, useNotificationsQuery } from '../api/adminApi';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { loggedOut } from '../features/auth/authSlice';
import { Button } from './ui';

export default function Layout() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logout] = useLogoutMutation();
  const { data: dash } = useDashboardQuery(undefined, { pollingInterval: 60_000 });
  const { data: notes } = useNotificationsQuery(undefined, { pollingInterval: 60_000 });

  const pendingTeachers = dash?.approvals.pendingTeachers.length ?? 0;
  const pendingLeave = dash?.approvals.pendingLeaves.length ?? 0;

  const links: { to: string; label: string; count?: number }[] = [
    { to: '/', label: 'Dashboard' },
    { to: '/teachers', label: 'Teacher approvals', count: pendingTeachers },
    { to: '/classes', label: 'Classes' },
    { to: '/students', label: 'Students' },
    { to: '/timetable', label: 'Timetable' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/leave', label: 'Leave requests', count: pendingLeave },
    { to: '/announcements', label: 'Notices & events' },
    { to: '/fees', label: 'Fees' },
    { to: '/settings', label: 'Settings' },
  ];

  const signOut = async () => {
    try {
      await logout().unwrap();
    } catch {
      /* sign out locally anyway */
    }
    dispatch(loggedOut());
    dispatch(baseApi.util.resetApiState());
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="brand">
          {user?.schoolName || 'School'}
          <small>Admin website</small>
        </div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span>{l.label}</span>
            {l.count ? <span className="badge badge-red">{l.count}</span> : null}
          </NavLink>
        ))}
      </aside>
      <main className="main">
        <div className="topbar">
          <Button variant="secondary" className="menu-toggle" onClick={() => setOpen((o) => !o)}>
            ☰ Menu
          </Button>
          <NavLink to="/notifications" className="btn btn-secondary">
            🔔 {notes?.unreadCount ? <span className="badge badge-red">{notes.unreadCount}</span> : null}
          </NavLink>
          <span className="muted small">{user?.name}</span>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
