
import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const categories = [
  "Pothole",
  "Road Crack",
  "Garbage",
  "Waterlogging",
  "Broken Streetlight",
];

function App() {
  const [form, setForm] = useState({
    category: "Pothole",
    description: "",
    latitude: "",
    longitude: "",
  });

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [complaint, setComplaint] = useState(null);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];

    setPhoto(file || null);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  function getLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Your browser does not support GPS location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previous) => ({
          ...previous,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setMessage("Location captured successfully.");
      },
      () => {
        setError(
          "Could not access your location. Allow location permission or enter coordinates manually."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submitComplaint(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setComplaint(null);

    try {
      const data = new FormData();
      data.append("category", form.category);
      data.append("description", form.description.trim());
      data.append("latitude", form.latitude);
      data.append("longitude", form.longitude);

      if (photo) {
        data.append("photo", photo);
      }

      const response = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Could not submit the complaint. Check your details."
        );
      }

      setComplaint(result);
      setMessage("Your complaint was submitted successfully!");

      setForm({
        category: "Pothole",
        description: "",
        latitude: "",
        longitude: "",
      });
      setPhoto(null);
      setPreview("");
      event.target.reset();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot connect to the server. Check that the backend is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">I</span>
          <span>Infra<span className="brand-light">Sense</span></span>
        </a>
        <span className="topbar-label">CITIZEN PORTAL</span>
      </header>

      <main id="home">
        <section className="hero">
          <div className="eyebrow">
            <span className="live-dot" />
            SMARTER INFRASTRUCTURE. BETTER COMMUNITIES.
          </div>
          <h1>
            See a problem?
            <br />
            <span>Help us fix it.</span>
          </h1>
          <p>
            Report road damage, garbage, waterlogging, and other
            public infrastructure issues in your area.
          </p>

          <div className="hero-stats">
            <div>
              <strong>01</strong>
              <span>Report an issue</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Add location</span>
            </div>
            <div>
              <strong>03</strong>
              <span>Submit report</span>
            </div>
          </div>
        </section>

        <section className="report-layout">
          <div className="form-card">
            <div className="card-heading">
              <div>
                <span className="section-kicker">CITIZEN REPORT</span>
                <h2>Report an issue</h2>
                <p>Fields marked * are required.</p>
              </div>
              <span className="form-number">01 / REPORT</span>
            </div>

            <form onSubmit={submitComplaint}>
              <label htmlFor="category">What is the problem? *</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={updateField}
                required
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <label htmlFor="description">Describe the issue *</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Explain what happened and where the problem is..."
                rows="4"
                maxLength={1000}
                required
              />
              <div className="field-note">
                {form.description.length}/1000 characters
              </div>

              <label htmlFor="photo">Upload a photo</label>
              <div className="upload-box">
                <input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhoto}
                />
                <span className="upload-help">
                  JPG, PNG or WebP. A clear photo helps document the issue.
                </span>
                {preview && (
                  <img
                    className="photo-preview"
                    src={preview}
                    alt="Selected issue preview"
                  />
                )}
              </div>

              <div className="location-heading">
                <div>
                  <label>Issue location *</label>
                  <p>Pinpoint where the issue was observed.</p>
                </div>
                <button
                  type="button"
                  className="location-button"
                  onClick={getLocation}
                >
                  ◎ Use my GPS
                </button>
              </div>

              <div className="coordinate-grid">
                <div>
                  <label htmlFor="latitude">Latitude *</label>
                  <input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={updateField}
                    placeholder="e.g. 23.5204"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="longitude">Longitude *</label>
                  <input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={updateField}
                    placeholder="e.g. 87.3119"
                    required
                  />
                </div>
              </div>

              <p className="privacy-note">
                Location access is optional. You can enter coordinates
                manually. Your browser may ask permission to access GPS.
              </p>

              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}

              {message && (
                <div className="notice success" role="status">
                  {message}
                </div>
              )}

              {complaint && (
                <div className="confirmation">
                  <span className="confirmation-check">✓</span>
                  <div>
                    <strong>Report received</strong>
                    <p>
                      Complaint ID: <code>{complaint.id}</code>
                    </p>
                    <p>Status: {complaint.status}</p>
                  </div>
                </div>
              )}

              <button className="submit-button" type="submit" disabled={loading}>
                {loading ? "Submitting report..." : "Submit complaint →"}
              </button>
              <p className="submit-footnote">
                Your report will be recorded in the InfraSense system.
              </p>
            </form>
          </div>

          <aside className="side-panel">
            <div className="side-illustration" aria-hidden="true">
              <div className="illustration-sun" />
              <div className="illustration-building building-one" />
              <div className="illustration-building building-two" />
              <div className="illustration-road">
                <span />
                <span />
                <span />
              </div>
              <div className="illustration-pin">!</div>
            </div>

            <span className="section-kicker">WHY YOUR REPORT MATTERS</span>
            <h3>Small reports can lead to meaningful change.</h3>
            <p>
              Each report helps build a clearer picture of public
              infrastructure issues and supports better maintenance planning.
            </p>

            <div className="benefit">
              <span>01</span>
              <div>
                <strong>Document problems</strong>
                <p>Share a description, photo, and location.</p>
              </div>
            </div>
            <div className="benefit">
              <span>02</span>
              <div>
                <strong>Build a shared record</strong>
                <p>Reports can be reviewed together by authorities.</p>
              </div>
            </div>
            <div className="benefit">
              <span>03</span>
              <div>
                <strong>Support better decisions</strong>
                <p>Reliable reports can help inform maintenance priorities.</p>
              </div>
            </div>

            <div className="disclaimer">
              <strong>Prototype notice</strong>
              <p>
                This is a student project prototype. Submitting a report
                does not yet notify a government authority or guarantee
                that the issue will be repaired.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon">I</span>
          <span>Infra<span className="brand-light">Sense</span></span>
        </a>
        <span>Building better infrastructure, together.</span>
        <span>Student project prototype</span>
      </footer>
    </div>
  );
}

export default App;
