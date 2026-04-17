import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./Navbar.css";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMe().then(setUser).catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      navigate("/login");
    } catch {
      // ignore
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/services" className="navbar-brand">
          <span className="navbar-logo">⚡</span>
          <span className="navbar-title">Services</span>
        </Link>

        {user && (
          <div className="navbar-user">
            <img
              src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6c5ce7&color=fff`}
              alt={user.name}
              className="navbar-avatar"
              referrerPolicy="no-referrer"
            />
            <span className="navbar-name">{user.name}</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
