import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import ServiceCard from "../components/ServiceCard";
import "./Services.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [userData, servicesData] = await Promise.all([
          api.getMe(),
          api.getServices(),
        ]);
        setUser(userData);
        setServices(servicesData);
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const handleServiceClick = (service) => {
    if (cancellingId) return; // Don't navigate while cancelling
    if (user?.activeServices?.includes(service.id)) {
      navigate("/dashboard");
    } else {
      navigate(`/setup/${service.id}`);
    }
  };

  const handleCancel = async (service) => {
    if (cancellingId) return;
    setCancellingId(service.id);

    try {
      const result = await api.cancelCalendarBuddy();
      // Update user state to reflect the cancelled service
      setUser((prev) => ({
        ...prev,
        activeServices: result.activeServices || prev.activeServices.filter((s) => s !== service.id),
      }));
    } catch (err) {
      console.error("Failed to cancel service:", err.message);
    } finally {
      setCancellingId(null);
    }
  };

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
        <h1>Choose a Service</h1>
        <p>Select an AI agent to connect with your tools and supercharge your workflow</p>
      </div>

      <div className="services-grid animate-fade-in-up delay-200">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            active={user?.activeServices?.includes(service.id)}
            onClick={() => handleServiceClick(service)}
            onCancel={handleCancel}
            cancelling={cancellingId === service.id}
          />
        ))}
      </div>

      {services.length === 0 && (
        <div className="services-empty glass-card animate-fade-in">
          <p>No services available yet. Check back soon! 🚀</p>
        </div>
      )}
    </div>
  );
}
