import "./ServiceCard.css";

export default function ServiceCard({ service, onClick, active, onCancel, cancelling }) {
  const handleCancel = (e) => {
    e.stopPropagation(); // Don't trigger the card click
    if (onCancel) onCancel(service);
  };

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
          <div className="service-card-actions">
            <span className="badge badge-success">
              <span className="status-dot status-dot-active"></span>
              Active
            </span>
            <button
              className="btn-cancel"
              onClick={handleCancel}
              disabled={cancelling}
              id={`cancel-${service.id}`}
            >
              {cancelling ? (
                <>
                  <span className="btn-cancel-spinner"></span>
                  Cancelling…
                </>
              ) : (
                "Cancel"
              )}
            </button>
          </div>
        )}
      </div>
      <div className="service-card-arrow">→</div>
    </div>
  );
}
