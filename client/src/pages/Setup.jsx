import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import PhoneInput from "../components/PhoneInput";
import "./Setup.css";

export default function Setup() {
  const [step, setStep] = useState(1); // 1: calendar auth, 2: phone, 3: activating
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [calendarAuthorized, setCalendarAuthorized] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if returning from calendar OAuth
    if (searchParams.get("calendar") === "authorized") {
      setCalendarAuthorized(true);
      setStep(2);
    }

    if (searchParams.get("error")) {
      setError("Authorization failed. Please try again.");
    }

    // Check current user status
    api.getCalendarBuddyStatus().then((status) => {
      if (status.active) {
        navigate("/dashboard");
      } else if (status.hasCalendarAccess) {
        setCalendarAuthorized(true);
        setStep(2);
      }
    }).catch(() => {
      navigate("/login");
    });
  }, [navigate, searchParams]);

  const handleCalendarAuth = () => {
    window.location.href = api.getCalendarAuthorizeUrl();
  };

  const handleActivate = async () => {
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.activateCalendarBuddy(phone);
      setStep(3);
      // Brief pause to show success, then redirect
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      setError(err.message || "Activation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-center">
      <div className="setup-container animate-fade-in-up">
        <div className="setup-card glass-card">
          {/* Steps indicator */}
          <div className="steps">
            <div className={`step-dot ${step >= 1 ? (calendarAuthorized ? "completed" : "active") : ""}`}></div>
            <div className={`step-line ${calendarAuthorized ? "completed" : ""}`}></div>
            <div className={`step-dot ${step >= 2 ? (step === 3 ? "completed" : "active") : ""}`}></div>
            <div className={`step-line ${step === 3 ? "completed" : ""}`}></div>
            <div className={`step-dot ${step === 3 ? "completed" : ""}`}></div>
          </div>

          <div className="setup-header">
            <span className="setup-icon">📅</span>
            <h2>Set up Calendar Buddy</h2>
          </div>

          {/* Step 1: Calendar Permission */}
          {step === 1 && !calendarAuthorized && (
            <div className="setup-step animate-fade-in">
              <p className="setup-desc">
                First, grant access to your Google Calendar so Calendar Buddy can manage your events.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleCalendarAuth}
                id="grant-calendar-btn"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                  <path d="M36 8H12a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V12a4 4 0 0 0-4-4z" stroke="currentColor" strokeWidth="3"/>
                  <path d="M8 18h32M18 8v32M30 26l-6 6-3-3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Grant Calendar Access
              </button>
            </div>
          )}

          {/* Step 2: Phone Number */}
          {step === 2 && (
            <div className="setup-step animate-fade-in">
              <div className="setup-check">
                <span className="check-icon">✅</span>
                <span>Calendar access granted</span>
              </div>

              <p className="setup-desc">
                Enter your WhatsApp phone number. We'll send you a welcome message to activate the agent.
              </p>

              <div className="input-group">
                <label htmlFor="phone-number-input">WhatsApp Phone Number</label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  disabled={loading}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleActivate}
                disabled={loading || !phone}
                id="activate-btn"
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Activating...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Activate Calendar Buddy
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="setup-step setup-success animate-scale-in">
              <div className="success-icon-big">🎉</div>
              <h3>Calendar Buddy is Active!</h3>
              <p>Check your WhatsApp — we've sent you a welcome message. Redirecting to dashboard...</p>
              <div className="spinner" style={{ margin: "0 auto" }}></div>
            </div>
          )}

          {error && (
            <div className="setup-error animate-fade-in">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
