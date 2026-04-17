import "./ServiceCard.css";

export default function ServiceCard({ service, onClick, active }) {
  return (
    <div
      className={`service-card glass-card ${active ? "service-card-active" : ""}`}
      onClick={onClick}
      id={`service-${service.id}`}
    >
      <div className="service-card-icon">{service.icon}</div>
      <div className="service-card-content">
        <h3 className="service-card-name">{service.name}</h3>
        <p className="service-card-desc">{service.description}</p>
        {active && (
          <span className="badge badge-success">
            <span className="status-dot status-dot-active"></span>
            Active
          </span>
        )}
      </div>
      <div className="service-card-arrow">→</div>
    </div>
  );
}
