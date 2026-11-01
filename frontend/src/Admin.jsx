
import { useEffect, useMemo, useState } from "react";
import "./Admin.css";

const API_URL = "http://127.0.0.1:8000";

const STATUSES = ["Received", "In Progress", "Resolved"];

function Admin() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadComplaints() {
    try {
      setError("");
      const response = await fetch(`${API_URL}/complaints`);

      if (!response.ok) {
        throw new Error("Could not load complaints.");
      }

      const data = await response.json();
      setComplaints(data.complaints || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    if (newStatus === "Resolved") {
      const confirmed = window.confirm(
        "Are you sure this complaint has been resolved?"
      );

      if (!confirmed) return;
    }

    try {
      setError("");
      setUpdatingId(id);

      const response = await fetch(
        `${API_URL}/complaints/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not update complaint status.");
      }

      await loadComplaints();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadComplaints();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => ({
    total: complaints.length,
    received: complaints.filter(c => c.status === "Received").length,
    progress: complaints.filter(c => c.status === "In Progress").length,
    resolved: complaints.filter(c => c.status === "Resolved").length,
  }), [complaints]);

  const filteredComplaints = complaints.filter((c) => {
    const matchesFilter =
      filter === "All" || c.status === filter;

    const text =
      `${c.id} ${c.category} ${c.description}`.toLowerCase();

    return matchesFilter && text.includes(search.toLowerCase());
  });

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <a href="/" className="admin-brand">
          <span className="admin-logo">I</span>
          InfraSense
          <span className="admin-tag">ADMIN</span>
        </a>

        <div className="admin-header-actions">
          <button onClick={loadComplaints} className="refresh-button">
            ↻ Refresh
          </button>
          <a href="/" className="citizen-link">
            Citizen Portal →
          </a>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-intro">
          <div>
            <span className="admin-kicker">INFRASTRUCTURE MANAGEMENT</span>
            <h1>Authority Dashboard</h1>
            <p>
              Monitor reported infrastructure issues in one place.
            </p>
          </div>
          <span className="live-label">
            <span /> LIVE DATABASE
          </span>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <section className="stat-grid">
          <div className="stat-card">
            <span className="stat-icon blue">▤</span>
            <span className="stat-label">Total complaints</span>
            <strong>{stats.total}</strong>
            <small>All submitted reports</small>
          </div>

          <div className="stat-card">
            <span className="stat-icon amber">◷</span>
            <span className="stat-label">Received</span>
            <strong>{stats.received}</strong>
            <small>Awaiting review</small>
          </div>

          <div className="stat-card">
            <span className="stat-icon violet">⚙</span>
            <span className="stat-label">In progress</span>
            <strong>{stats.progress}</strong>
            <small>Maintenance underway</small>
          </div>

          <div className="stat-card">
            <span className="stat-icon green">✓</span>
            <span className="stat-label">Resolved</span>
            <strong>{stats.resolved}</strong>
            <small>Marked as completed</small>
          </div>
        </section>

        <section className="complaint-section">
          <div className="table-heading">
            <div>
              <h2>Complaint records</h2>
              <p>All reports submitted through the citizen portal.</p>
            </div>
            <span className="record-count">
              {filteredComplaints.length} records
            </span>
          </div>

          <div className="table-controls">
            <input
              type="search"
              placeholder="Search category, description or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Received">Received</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">Loading complaints...</div>
          ) : filteredComplaints.length === 0 ? (
            <div className="empty-state">
              <span>▤</span>
              <strong>No complaints found</strong>
              <p>
                Try another filter or submit a report through the citizen portal.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="complaint-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Issue type</th>
                    <th>Description</th>
                    <th>Photo</th>
                    <th>Location</th>
                    <th>Reported on</th>
                    <th>Status</th>
                    <th>Update status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredComplaints.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <code title={c.id}>{c.id.slice(0, 8)}...</code>
                      </td>

                      <td><strong>{c.category}</strong></td>

                      <td className="description-cell">
                        {c.description}
                      </td>

                      <td>
                      {c.photo_filename ? (
                        <a
                          className="map-link"
                          href={`${API_URL}/uploads/${encodeURIComponent(c.photo_filename)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>📷 View Photo ↗</span>
                        </a>
                      ) : (
                        <span style={{ color: "#999", fontSize: "13px" }}>
                          No photo uploaded
                        </span>
                      )}
                    </td>

                      <td>
                        <span className="coordinates">
                          {Number(c.latitude).toFixed(4)},
                          {" "}
                          {Number(c.longitude).toFixed(4)}
                        </span>

                        <a
                          className="map-link"
                          href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(c.latitude)}&mlon=${encodeURIComponent(c.longitude)}#map=17/${encodeURIComponent(c.latitude)}/${encodeURIComponent(c.longitude)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View map ↗
                        </a>
                      </td>

                      <td>{formatDate(c.reported_at)}</td>

                      <td>
                        <span className={`status-pill ${
                          c.status === "Resolved"
                            ? "resolved"
                            : c.status === "In Progress"
                            ? "progress"
                            : "received"
                        }`}>
                          {c.status}
                        </span>
                      </td>

                      <td>
                        <select
                          value={c.status}
                          disabled={updatingId === c.id}
                          onChange={(e) =>
                            updateStatus(c.id, e.target.value)
                          }
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        {updatingId === c.id && (
                          <small>Updating...</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="admin-footer">
          InfraSense · Infrastructure monitoring prototype
          <span>Data sourced from the local SQLite database</span>
        </div>
      </main>
    </div>
  );
}

export default Admin;
