// Navbar — top navigation bar with links and user info
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiSearch, FiList, FiBarChart2, FiTarget, FiLogOut, FiUser, FiCpu } from 'react-icons/fi';
import { GiAvocado } from 'react-icons/gi';
import './Navbar.css';

const navLinks = [
  { path: '/dashboard',      label: 'Dashboard',  icon: <FiHome /> },
  { path: '/detect',         label: 'Detect Food', icon: <FiSearch /> },
  { path: '/ai-coach',       label: 'AI Coach',   icon: <FiCpu /> },
  { path: '/log',            label: 'Food Log',   icon: <FiList /> },
  { path: '/diet-planner',   label: 'Diet Plan',  icon: <FiTarget /> },
  { path: '/progress',       label: 'Progress',   icon: <FiBarChart2 /> },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo">
          <span className="logo-icon">🥗</span>
          <span className="logo-text">NutriAI</span>
        </Link>

        {/* Navigation Links */}
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* User menu */}
        <div className="navbar-user">
          <div className="user-avatar">
            <FiUser />
          </div>
          <span className="user-name">{user?.name?.split(' ')[0] || 'User'}</span>
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <FiLogOut />
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        {navLinks.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
