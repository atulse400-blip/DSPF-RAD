import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard  from './components/Dashboard';
import Students   from './components/Students';
import Courses    from './components/Courses';
import TakeAtnd   from './components/TakeAtnd';
import Reports    from './components/Reports';

export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🎓</span>
          <span className="brand-text">Attendance<br/>System</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard"  className={navCls}>Dashboard</NavLink>
          <NavLink to="/students"   className={navCls}>Students</NavLink>
          <NavLink to="/courses"    className={navCls}>Courses</NavLink>
          <NavLink to="/take"       className={navCls}>Take Attendance</NavLink>
          <NavLink to="/reports"    className={navCls}>Reports</NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="ibmi-badge">IBM i Backend</span>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/students/*" element={<Students />} />
          <Route path="/courses/*"  element={<Courses />} />
          <Route path="/take"       element={<TakeAtnd />} />
          <Route path="/reports"    element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}

const navCls = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');
