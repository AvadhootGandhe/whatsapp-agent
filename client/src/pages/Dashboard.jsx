import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [userData, statusData] = await Promise.all([
          api.getMe(),
          api.getCalendarBuddyStatus(),
        ]);
        setUser(userData);
        setStatus(statusData);

        if (!statusData.active) {
          navigate("/setup/calendar-buddy");
        }
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="page page-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header animate-fade-in-up">
        <h1>Dashboard</h1>
        <p>Your active AI agents and services</p>
      </div>

      <div className="dashboard-content animate-fade-in-up delay-200">
        {/* Active Service Card */}
        <div className="dashboard-card glass-card">
          <div className="dashboard-card-header">
            <div className="dashboard-service-info">
              <span className="dashboard-service-icon">📅</span>
              <div>
                <h3>Calendar Buddy</h3>
                <span className="badge badge-success">
                  <span className="status-dot status-dot-active"></span>
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="dashboard-card-body">
            <div className="dashboard-detail">
              <span className="detail-label">Connected Account</span>
              <span className="detail-value">{user?.email}</span>
            </div>
            <div className="dashboard-detail">
              <span className="detail-label">WhatsApp Number</span>
              <span className="detail-value">+{status?.phone}</span>
            </div>
            <div className="dashboard-detail">
              <span className="detail-label">Calendar Access</span>
              <span className="detail-value badge badge-success" style={{ fontSize: "0.8rem" }}>
                ✅ Granted
              </span>
            </div>
          </div>

          <div className="dashboard-card-footer">
            <div className="dashboard-tip glass-card">
              <span className="tip-icon">💡</span>
              <div>
                <p className="tip-title">How to use</p>
                <p className="tip-text">
                  Send a WhatsApp message to your Calendar Buddy number. Try:
                  <br />
                  <em>"Meeting with Raj tomorrow at 3pm"</em>
                  <br />
                  <em>"What's my schedule today?"</em>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
