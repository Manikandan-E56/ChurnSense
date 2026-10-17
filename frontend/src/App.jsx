import { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

// Preset customer personas for instant 1-click evaluation
const PERSONAS = [
  {
    id: "high-risk",
    name: "Elena Vance",
    role: "New Streamer · High Attrition",
    badge: "High Risk Risk Profile",
    badgeType: "danger",
    description: "New fiber optic customer on month-to-month with no security add-ons and electronic check payment.",
    data: {
      gender: "Female",
      SeniorCitizen: 0,
      Partner: "No",
      Dependents: "No",
      tenure: 2,
      PhoneService: "Yes",
      MultipleLines: "No",
      InternetService: "Fiber optic",
      OnlineSecurity: "No",
      OnlineBackup: "No",
      DeviceProtection: "No",
      TechSupport: "No",
      StreamingTV: "Yes",
      StreamingMovies: "Yes",
      Contract: "Month-to-month",
      PaperlessBilling: "Yes",
      PaymentMethod: "Electronic check",
      MonthlyCharges: 95.0,
      TotalCharges: 190.0,
    },
  },
  {
    id: "loyal-champion",
    name: "David Chen",
    role: "Long-term VIP · Retained",
    badge: "Low Risk VIP",
    badgeType: "success",
    description: "5+ year customer with family package, 2-year contract, full security suite, and automated billing.",
    data: {
      gender: "Male",
      SeniorCitizen: 0,
      Partner: "Yes",
      Dependents: "Yes",
      tenure: 65,
      PhoneService: "Yes",
      MultipleLines: "Yes",
      InternetService: "DSL",
      OnlineSecurity: "Yes",
      OnlineBackup: "Yes",
      DeviceProtection: "Yes",
      TechSupport: "Yes",
      StreamingTV: "Yes",
      StreamingMovies: "Yes",
      Contract: "Two year",
      PaperlessBilling: "No",
      PaymentMethod: "Credit card (automatic)",
      MonthlyCharges: 65.0,
      TotalCharges: 4225.0,
    },
  },
  {
    id: "moderate-streamer",
    name: "Marcus Miller",
    role: "Mid-Tenure Cord-Cutter",
    badge: "Elevated Risk",
    badgeType: "warning",
    description: "14 months tenure, fiber optic, month-to-month contract with streaming services but lacking tech support.",
    data: {
      gender: "Male",
      SeniorCitizen: 0,
      Partner: "No",
      Dependents: "No",
      tenure: 14,
      PhoneService: "Yes",
      MultipleLines: "Yes",
      InternetService: "Fiber optic",
      OnlineSecurity: "No",
      OnlineBackup: "Yes",
      DeviceProtection: "No",
      TechSupport: "No",
      StreamingTV: "Yes",
      StreamingMovies: "No",
      Contract: "Month-to-month",
      PaperlessBilling: "Yes",
      PaymentMethod: "Bank transfer (automatic)",
      MonthlyCharges: 84.5,
      TotalCharges: 1183.0,
    },
  },
  {
    id: "budget-senior",
    name: "Beatrice Hall",
    role: "Senior Fixed-Line Saver",
    badge: "Stable Account",
    badgeType: "info",
    description: "Senior citizen with 38 months tenure, annual contract, basic DSL and telephone service.",
    data: {
      gender: "Female",
      SeniorCitizen: 1,
      Partner: "Yes",
      Dependents: "No",
      tenure: 38,
      PhoneService: "Yes",
      MultipleLines: "No",
      InternetService: "DSL",
      OnlineSecurity: "Yes",
      OnlineBackup: "No",
      DeviceProtection: "No",
      TechSupport: "Yes",
      StreamingTV: "No",
      StreamingMovies: "No",
      Contract: "One year",
      PaperlessBilling: "No",
      PaymentMethod: "Mailed check",
      MonthlyCharges: 45.2,
      TotalCharges: 1717.6,
    },
  },
];

const initialForm = PERSONAS[0].data;

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePersona, setActivePersona] = useState(PERSONAS[0].id);
  const [apiOnline, setApiOnline] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [autoCalculateTotal, setAutoCalculateTotal] = useState(true);

  // Check backend health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) {
          const data = await res.json();
          setApiOnline(data.model_loaded === true);
        } else {
          setApiOnline(false);
        }
      } catch {
        setApiOnline(false);
      }
    }
    checkHealth();
  }, []);

  // Update a single form property
  const updateField = useCallback((name, value) => {
    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      // Handle Internet Service dependencies
      if (name === "InternetService" && value === "No") {
        updated.OnlineSecurity = "No internet service";
        updated.OnlineBackup = "No internet service";
        updated.DeviceProtection = "No internet service";
        updated.TechSupport = "No internet service";
        updated.StreamingTV = "No internet service";
        updated.StreamingMovies = "No internet service";
      } else if (name === "InternetService" && prev.InternetService === "No" && value !== "No") {
        updated.OnlineSecurity = "No";
        updated.OnlineBackup = "No";
        updated.DeviceProtection = "No";
        updated.TechSupport = "No";
        updated.StreamingTV = "No";
        updated.StreamingMovies = "No";
      }

      // Handle Phone Service dependencies
      if (name === "PhoneService" && value === "No") {
        updated.MultipleLines = "No phone service";
      } else if (name === "PhoneService" && prev.PhoneService === "No" && value === "Yes") {
        updated.MultipleLines = "No";
      }

      // Auto-recalculate TotalCharges when tenure or monthly changes if sync is active
      if (autoCalculateTotal && (name === "tenure" || name === "MonthlyCharges")) {
        const tenureVal = name === "tenure" ? Number(value) : Number(prev.tenure);
        const monthlyVal = name === "MonthlyCharges" ? Number(value) : Number(prev.MonthlyCharges);
        if (!isNaN(tenureVal) && !isNaN(monthlyVal)) {
          updated.TotalCharges = Math.max(0, Math.round(tenureVal * monthlyVal * 100) / 100);
        }
      }

      return updated;
    });
    setActivePersona(null); // Custom state
  }, [autoCalculateTotal]);

  // Request prediction from FastAPI
  const executePrediction = useCallback(async (customPayload = null) => {
    setLoading(true);
    setError("");

    const targetPayload = customPayload || form;
    const payload = {
      ...targetPayload,
      SeniorCitizen: Number(targetPayload.SeniorCitizen),
      tenure: Number(targetPayload.tenure),
      MonthlyCharges: Number(targetPayload.MonthlyCharges),
      TotalCharges: Number(targetPayload.TotalCharges),
    };

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Model inference failed. Verify input schema."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot connect to the FastAPI inference engine (127.0.0.1:8000). Ensure uvicorn is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [form]);

  // Run initial prediction on first render
  useEffect(() => {
    let ignore = false;
    async function initPredict() {
      try {
        const response = await fetch(`${API_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...initialForm,
            SeniorCitizen: Number(initialForm.SeniorCitizen),
            tenure: Number(initialForm.tenure),
            MonthlyCharges: Number(initialForm.MonthlyCharges),
            TotalCharges: Number(initialForm.TotalCharges),
          }),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) {
          setResult(data);
        }
      } catch {
        // Silently handled on initial background load
      }
    }
    initPredict();
    return () => {
      ignore = true;
    };
  }, []);

  // Handle Form Submission
  function handleSubmit(e) {
    e.preventDefault();
    executePrediction();
  }

  // Load a persona preset
  function handleSelectPersona(persona) {
    setActivePersona(persona.id);
    setForm(persona.data);
    executePrediction(persona.data);
    showToast(`Loaded ${persona.name}'s profile`);
  }

  // Helper toast notification
  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3200);
  }

  // What-If Simulation handlers
  function applySimulation(keyValues, actionTitle) {
    const updated = { ...form, ...keyValues };
    if (autoCalculateTotal && (keyValues.tenure || keyValues.MonthlyCharges)) {
      const t = keyValues.tenure !== undefined ? Number(keyValues.tenure) : Number(updated.tenure);
      const m = keyValues.MonthlyCharges !== undefined ? Number(keyValues.MonthlyCharges) : Number(updated.MonthlyCharges);
      updated.TotalCharges = Math.round(t * m * 100) / 100;
    }
    setForm(updated);
    setActivePersona(null);
    executePrediction(updated);
    showToast(`Applied: ${actionTitle}`);
  }

  // Copy Executive Report to Clipboard
  function copyReport() {
    if (!result) return;
    const report = `
========================================
CHURNSENSE EXECUTIVE CHURN RISK REPORT
========================================
Risk Assessment: ${result.prediction.toUpperCase()}
Estimated Churn Probability: ${result.risk_percentage}%
Model Engine: ${result.model_version} (Production Tuned)

CUSTOMER SUMMARY:
- Tenure: ${form.tenure} months
- Contract: ${form.Contract}
- Monthly Charges: $${Number(form.MonthlyCharges).toFixed(2)}
- Total Lifetime Revenue: $${Number(form.TotalCharges).toFixed(2)}
- Internet Service: ${form.InternetService}
- Tech Support: ${form.TechSupport}
- Payment Method: ${form.PaymentMethod}

RECOMMENDATION:
${result.risk_percentage > 50
  ? "Immediate retention intervention recommended: Offer annual contract incentive, complimentary security bundle, or automated billing discount."
  : "Customer profile shows strong retention metrics. Focus on loyalty rewards and value-added upsells."}
========================================
Generated by ChurnSense AI Studio
`.trim();

    navigator.clipboard.writeText(report).then(() => {
      showToast("Report copied to clipboard!");
    });
  }

  // Calculate dynamic behavioral risk drivers (Explainability)
  const riskInsights = useMemo(() => {
    const drivers = [];
    const mitigators = [];

    // Drivers
    if (form.Contract === "Month-to-month") {
      drivers.push({
        title: "Month-to-Month Contract",
        impact: "Severe Risk (+32%)",
        desc: "Lacks contractual lock-in and demonstrates highest historical drop-off.",
      });
    }
    if (form.PaymentMethod === "Electronic check") {
      drivers.push({
        title: "Electronic Check Billing",
        impact: "Elevated (+18%)",
        desc: "Manual payment channels show 2.4x higher involuntary & voluntary churn.",
      });
    }
    if (Number(form.tenure) <= 6) {
      drivers.push({
        title: "Early Onboarding Window",
        impact: "Vulnerable (+22%)",
        desc: "Customers under 6 months tenure have not yet established habituation.",
      });
    }
    if (form.InternetService === "Fiber optic" && (form.TechSupport === "No" || form.OnlineSecurity === "No")) {
      drivers.push({
        title: "Unassisted Fiber Optic Tier",
        impact: "Friction (+15%)",
        desc: "High bandwidth demands without tech assistance increase support frustration.",
      });
    }

    // Mitigators
    if (form.Contract === "Two year") {
      mitigators.push({
        title: "2-Year Long Term Contract",
        impact: "Strong Anchor (-35%)",
        desc: "Substantial commitment barrier ensuring stable customer retention.",
      });
    }
    if (form.Contract === "One year") {
      mitigators.push({
        title: "Annual Service Agreement",
        impact: "Moderate Anchor (-18%)",
        desc: "Predictable 12-month commitment stabilizing account lifecycle.",
      });
    }
    if (Number(form.tenure) >= 36) {
      mitigators.push({
        title: "Matured Brand Loyalty",
        impact: "High Retention (-25%)",
        desc: "Over 3 years continuous tenure reflects strong product-market fit.",
      });
    }
    if (form.TechSupport === "Yes" && form.OnlineSecurity === "Yes") {
      mitigators.push({
        title: "Comprehensive Security Suite",
        impact: "Ecosystem (-16%)",
        desc: "Multi-service ecosystem integration significantly reduces vendor switching.",
      });
    }
    if (form.PaymentMethod.includes("automatic")) {
      mitigators.push({
        title: "Automated Autopay Enabled",
        impact: "Seamless (-12%)",
        desc: "Reduces payment friction, expiration lapses, and active billing renegotiations.",
      });
    }

    return { drivers, mitigators };
  }, [form]);

  // Gauge calculation
  const riskPercent = result ? result.risk_percentage : 0;
  const isHighRisk = riskPercent >= 60;
  const isMediumRisk = riskPercent >= 35 && riskPercent < 60;

  const riskStatusText = isHighRisk
    ? "Critical Attrition Risk"
    : isMediumRisk
    ? "Elevated Churn Risk"
    : "Secure / Retained Account";

  const riskColor = isHighRisk
    ? "#f43f5e"
    : isMediumRisk
    ? "#f59e0b"
    : "#10b981";

  // SVG Gauge calculations (radius = 78, arc 240 degrees)
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  // Let's use a 240-degree gauge or 360 ring
  const strokeDashoffset = circumference - (riskPercent / 100) * circumference;

  return (
    <div className="churn-app">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="floating-toast" role="status">
          <span className="toast-icon">✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="navbar">
        <div className="nav-container">
          <div className="brand-group">
            <div className="brand-badge">
              <svg className="brand-svg" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  fill="url(#brandGrad)"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="url(#brandGrad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="url(#brandGrad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="brandGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#818cf8" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div className="brand-title-wrap">
                <span className="brand-title">ChurnSense</span>
                <span className="brand-pill">AI 2.0</span>
              </div>
              <p className="brand-tagline">Predictive Customer Retention Studio</p>
            </div>
          </div>

          <div className="nav-actions">
            <div className="api-badge" title="FastAPI Model Service Status">
              <span className={`status-indicator ${apiOnline ? "online" : "offline"}`} />
              <span>{apiOnline ? "Model Engine Online · v1.0.0" : "Engine Reconnecting..."}</span>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setForm(initialForm);
                setActivePersona(PERSONAS[0].id);
                executePrediction(initialForm);
                showToast("Reset to default profile");
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-eyebrow">
            <span className="sparkle">✦</span> MACHINE LEARNING BEHAVIORAL ANALYTICS
          </div>
          <h1 className="hero-heading">
            Anticipate Customer Churn. <br />
            <span className="text-gradient">Protect Enterprise Revenue.</span>
          </h1>
          <p className="hero-subtext">
            Simulate customer profiles across contract types, payment methods, and digital service bundles to forecast attrition probability and test retention interventions in real time.
          </p>

          {/* Quick Persona Selector */}
          <div className="persona-bar">
            <div className="persona-header">
              <span className="persona-label">QUICK PERSONA BENCHMARKS:</span>
              <span className="persona-hint">Click any archetype to load and evaluate instantly</span>
            </div>
            <div className="persona-grid">
              {PERSONAS.map((p) => {
                const isSelected = activePersona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`persona-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectPersona(p)}
                  >
                    <div className="persona-card-header">
                      <span className="persona-name">{p.name}</span>
                      <span className={`badge-pill badge-${p.badgeType}`}>{p.badge}</span>
                    </div>
                    <p className="persona-role">{p.role}</p>
                    <p className="persona-desc">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Studio Workspace Layout */}
        <div className="workspace-grid">
          {/* LEFT: Customer Profile Form */}
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="section-header">
              <div>
                <span className="section-step">CONFIGURATION STUDIO</span>
                <h2 className="section-title">Customer Behavioral Profile</h2>
              </div>
              <button
                type="submit"
                className="btn-primary desktop-predict-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Analyzing Risk...
                  </>
                ) : (
                  <>
                    Run Model Analysis
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Category 1: Demographics & Account Tenure */}
            <div className="category-card">
              <div className="category-title-row">
                <div className="category-icon">👤</div>
                <div>
                  <h3 className="category-title">Account Demographics & Lifecycle</h3>
                  <p className="category-desc">Tenure length, household structure, and senior citizen status</p>
                </div>
              </div>

              <div className="form-group-grid">
                {/* Tenure Slider */}
                <div className="form-item span-full">
                  <div className="slider-label-row">
                    <label htmlFor="tenure-input">
                      Account Tenure
                      <span className="tenure-tier-pill">
                        {Number(form.tenure) <= 6
                          ? "New Account (High Risk Window)"
                          : Number(form.tenure) <= 24
                          ? "Established Customer"
                          : Number(form.tenure) <= 48
                          ? "Core Loyal Account"
                          : "VIP Long-term Advocate"}
                      </span>
                    </label>
                    <div className="tenure-value-display">
                      <input
                        id="tenure-input"
                        type="number"
                        min="0"
                        max="100"
                        value={form.tenure}
                        onChange={(e) => updateField("tenure", e.target.value)}
                        className="num-pill-input"
                      />
                      <span>months</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="72"
                    value={form.tenure}
                    onChange={(e) => updateField("tenure", e.target.value)}
                    className="styled-slider"
                  />
                  <div className="slider-ticks">
                    <span>0m</span>
                    <span>12m (1y)</span>
                    <span>24m (2y)</span>
                    <span>36m (3y)</span>
                    <span>48m (4y)</span>
                    <span>72m+</span>
                  </div>
                </div>

                {/* Gender Segmented */}
                <div className="form-item">
                  <label>Customer Gender</label>
                  <div className="segmented-control">
                    {["Female", "Male"].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        className={`seg-btn ${form.gender === gender ? "active" : ""}`}
                        onClick={() => updateField("gender", gender)}
                      >
                        {gender === "Female" ? "👩 Female" : "👨 Male"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Senior Citizen */}
                <div className="form-item">
                  <label>Senior Citizen</label>
                  <div className="segmented-control">
                    {[
                      { label: "No (Under 65)", value: "0" },
                      { label: "Yes (65+)", value: "1" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`seg-btn ${String(form.SeniorCitizen) === opt.value ? "active" : ""}`}
                        onClick={() => updateField("SeniorCitizen", opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partner */}
                <div className="form-item">
                  <label>Has Partner?</label>
                  <div className="segmented-control">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`seg-btn ${form.Partner === v ? "active" : ""}`}
                        onClick={() => updateField("Partner", v)}
                      >
                        {v === "Yes" ? "💍 Yes" : "Single / No"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dependents */}
                <div className="form-item">
                  <label>Has Dependents?</label>
                  <div className="segmented-control">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`seg-btn ${form.Dependents === v ? "active" : ""}`}
                        onClick={() => updateField("Dependents", v)}
                      >
                        {v === "Yes" ? "👶 Yes" : "None / No"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Category 2: Connectivity & Core Telecom Services */}
            <div className="category-card">
              <div className="category-title-row">
                <div className="category-icon">🌐</div>
                <div>
                  <h3 className="category-title">Core Connectivity & Telephony</h3>
                  <p className="category-desc">Broadband backbone infrastructure and voice lines</p>
                </div>
              </div>

              <div className="form-group-grid">
                {/* Internet Service */}
                <div className="form-item span-full">
                  <label>Internet Service Provider Technology</label>
                  <div className="service-cards-row">
                    {[
                      {
                        value: "Fiber optic",
                        title: "Fiber Optic",
                        badge: "High ARPU",
                        desc: "Gigabit ultra-speed tier",
                        icon: "⚡",
                      },
                      {
                        value: "DSL",
                        title: "DSL Cable",
                        badge: "Standard",
                        desc: "Copper broadband line",
                        icon: "📶",
                      },
                      {
                        value: "No",
                        title: "No Internet",
                        badge: "Voice-only",
                        desc: "Landline phone only",
                        icon: "🚫",
                      },
                    ].map((srv) => (
                      <button
                        key={srv.value}
                        type="button"
                        className={`srv-card ${form.InternetService === srv.value ? "active" : ""}`}
                        onClick={() => updateField("InternetService", srv.value)}
                      >
                        <div className="srv-icon">{srv.icon}</div>
                        <div className="srv-details">
                          <div className="srv-title-row">
                            <span className="srv-name">{srv.title}</span>
                            <span className="srv-badge">{srv.badge}</span>
                          </div>
                          <span className="srv-desc">{srv.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Service */}
                <div className="form-item">
                  <label>Landline Phone Service</label>
                  <div className="segmented-control">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`seg-btn ${form.PhoneService === v ? "active" : ""}`}
                        onClick={() => updateField("PhoneService", v)}
                      >
                        {v === "Yes" ? "📞 Subscribed" : "🚫 No Phone"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multiple Lines */}
                <div className="form-item">
                  <label>Multiple Voice Lines</label>
                  <select
                    className="styled-select"
                    value={form.MultipleLines}
                    onChange={(e) => updateField("MultipleLines", e.target.value)}
                    disabled={form.PhoneService === "No"}
                  >
                    <option value="No">Single Line</option>
                    <option value="Yes">Multiple Lines Subscribed</option>
                    <option value="No phone service">No phone service</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category 3: Value-Added Security & Entertainment */}
            <div className="category-card">
              <div className="category-title-row">
                <div className="category-icon">🛡️</div>
                <div>
                  <h3 className="category-title">Security & Entertainment Add-ons</h3>
                  <p className="category-desc">
                    {form.InternetService === "No"
                      ? "⚠️ Internet add-ons inactive (No Internet subscription active)"
                      : "Value-added services heavily improve customer retention and ecosystem lock-in"}
                  </p>
                </div>
              </div>

              <div className="addons-grid">
                {[
                  {
                    key: "OnlineSecurity",
                    name: "Online Security",
                    icon: "🔒",
                    sub: "Malware & Phishing shield",
                  },
                  {
                    key: "OnlineBackup",
                    name: "Cloud Backup",
                    icon: "☁️",
                    sub: "Encrypted automatic backup",
                  },
                  {
                    key: "DeviceProtection",
                    name: "Device Protection",
                    icon: "📱",
                    sub: "Hardware warranty & coverage",
                  },
                  {
                    key: "TechSupport",
                    name: "24/7 Tech Support",
                    icon: "🎧",
                    sub: "Priority expert assistance",
                  },
                  {
                    key: "StreamingTV",
                    name: "Streaming TV",
                    icon: "📺",
                    sub: "Live channels & on-demand",
                  },
                  {
                    key: "StreamingMovies",
                    name: "Streaming Movies",
                    icon: "🍿",
                    sub: "Cinema & studio releases",
                  },
                ].map((item) => {
                  const isEnabled = form[item.key] === "Yes";
                  const isDisabled = form.InternetService === "No";

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={isDisabled}
                      className={`addon-pill-card ${isEnabled ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                      onClick={() => {
                        if (!isDisabled) {
                          updateField(item.key, isEnabled ? "No" : "Yes");
                        }
                      }}
                    >
                      <span className="addon-icon">{item.icon}</span>
                      <div className="addon-text">
                        <span className="addon-name">{item.name}</span>
                        <span className="addon-sub">{item.sub}</span>
                      </div>
                      <span className={`addon-switch ${isEnabled ? "on" : "off"}`}>
                        {isDisabled ? "N/A" : isEnabled ? "ON" : "OFF"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category 4: Contract, Invoicing & Billing */}
            <div className="category-card">
              <div className="category-title-row">
                <div className="category-icon">💳</div>
                <div>
                  <h3 className="category-title">Contract Agreement & Financials</h3>
                  <p className="category-desc">Commitment duration, payment processing channel, and charges</p>
                </div>
              </div>

              <div className="form-group-grid">
                {/* Contract Type Cards */}
                <div className="form-item span-full">
                  <label>Contract Commitment Duration</label>
                  <div className="contract-cards-row">
                    {[
                      {
                        value: "Month-to-month",
                        title: "Month-to-Month",
                        badge: "High Volatility",
                        risk: "high",
                        desc: "No long-term commitment. Highest churn risk.",
                      },
                      {
                        value: "One year",
                        title: "1-Year Agreement",
                        badge: "Standard",
                        risk: "med",
                        desc: "12-month contract with rate guarantee.",
                      },
                      {
                        value: "Two year",
                        title: "2-Year Agreement",
                        badge: "Maximum Lock-in",
                        risk: "low",
                        desc: "24-month loyalty terms with lowest attrition.",
                      },
                    ].map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`contract-card ${form.Contract === c.value ? "active" : ""} risk-${c.risk}`}
                        onClick={() => updateField("Contract", c.value)}
                      >
                        <div className="contract-header">
                          <span className="contract-title">{c.title}</span>
                          <span className={`contract-badge ${c.risk}`}>{c.badge}</span>
                        </div>
                        <p className="contract-desc">{c.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="form-item">
                  <label>Payment Method</label>
                  <select
                    className="styled-select"
                    value={form.PaymentMethod}
                    onChange={(e) => updateField("PaymentMethod", e.target.value)}
                  >
                    <option value="Electronic check">Electronic check (Highest Churn)</option>
                    <option value="Mailed check">Mailed paper check</option>
                    <option value="Bank transfer (automatic)">Bank transfer (Automatic Autopay)</option>
                    <option value="Credit card (automatic)">Credit card (Automatic Autopay)</option>
                  </select>
                </div>

                {/* Paperless Billing */}
                <div className="form-item">
                  <label>Paperless Billing Delivery</label>
                  <div className="segmented-control">
                    {["Yes", "No"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`seg-btn ${form.PaperlessBilling === v ? "active" : ""}`}
                        onClick={() => updateField("PaperlessBilling", v)}
                      >
                        {v === "Yes" ? "📄 Paperless (Email)" : "📬 Paper Mail Invoice"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Charges */}
                <div className="form-item">
                  <div className="slider-label-row">
                    <label htmlFor="monthly-input">Monthly Recurring Charges ($)</label>
                    <div className="tenure-value-display">
                      <span>$</span>
                      <input
                        id="monthly-input"
                        type="number"
                        step="0.1"
                        min="15"
                        max="140"
                        value={form.MonthlyCharges}
                        onChange={(e) => updateField("MonthlyCharges", e.target.value)}
                        className="num-pill-input"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="125"
                    step="0.5"
                    value={form.MonthlyCharges}
                    onChange={(e) => updateField("MonthlyCharges", e.target.value)}
                    className="styled-slider"
                  />
                </div>

                {/* Total Charges */}
                <div className="form-item">
                  <div className="slider-label-row">
                    <label htmlFor="total-input">Total Lifetime Charges ($)</label>
                    <button
                      type="button"
                      className="calc-helper-btn"
                      onClick={() => {
                        const calculated = Math.round(Number(form.tenure) * Number(form.MonthlyCharges) * 100) / 100;
                        updateField("TotalCharges", calculated);
                        showToast(`Recalculated: $${calculated.toFixed(2)}`);
                      }}
                      title="Sync Total Charges = Tenure × Monthly"
                    >
                      ⚡ Auto-Sync
                    </button>
                  </div>
                  <input
                    id="total-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.TotalCharges}
                    onChange={(e) => updateField("TotalCharges", e.target.value)}
                    className="styled-input"
                  />
                  <div className="field-hint">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={autoCalculateTotal}
                        onChange={(e) => setAutoCalculateTotal(e.target.checked)}
                      />
                      <span>Auto-update Total Charges when tenure/charges change</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Submit Action */}
            <div className="form-bottom-actions">
              <button
                type="submit"
                className="btn-primary full-width-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Analyzing Customer Profile...
                  </>
                ) : (
                  <>
                    Run Churn Prediction Analysis →
                  </>
                )}
              </button>
              <p className="privacy-note">
                Predictions generated via Tuned Gradient Boosted ensemble model trained on telecom behavioral cohorts.
              </p>
            </div>
          </form>

          {/* RIGHT: Model Intelligence Telemetry Panel */}
          <aside className="telemetry-panel">
            <div className="telemetry-card">
              <div className="telemetry-header">
                <div>
                  <span className="section-step">PREDICTIVE TELEMETRY</span>
                  <h2 className="telemetry-title">Retention Intelligence</h2>
                </div>
                {result && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={copyReport}
                    title="Copy Executive Summary to Clipboard"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy Brief</span>
                  </button>
                )}
              </div>

              {/* Error State */}
              {error && (
                <div className="error-alert" role="alert">
                  <div className="error-icon">⚠️</div>
                  <div>
                    <h4 className="error-title">Inference Engine Error</h4>
                    <p className="error-desc">{error}</p>
                    <button
                      type="button"
                      className="btn-retry"
                      onClick={() => executePrediction()}
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              )}

              {/* Empty / Initializing State */}
              {!result && !error && !loading && (
                <div className="empty-state-box">
                  <div className="radar-animation">
                    <div className="radar-circle circle-1" />
                    <div className="radar-circle circle-2" />
                    <div className="radar-core">📊</div>
                  </div>
                  <h3>Awaiting Telemetry</h3>
                  <p>
                    Submit the customer configuration or choose a persona benchmark to evaluate churn risk probability.
                  </p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="loading-card-box">
                  <div className="loading-pulsar" />
                  <p className="loading-text">Computing churn probability vectors...</p>
                  <span className="loading-sub">Evaluating 19 behavioral feature tensors</span>
                </div>
              )}

              {/* Active Result State */}
              {result && !loading && (
                <div className="results-container">
                  {/* Gauge & Main Score Card */}
                  <div className={`score-card ${isHighRisk ? "theme-danger" : isMediumRisk ? "theme-warning" : "theme-success"}`}>
                    <div className="gauge-wrapper">
                      <svg className="gauge-svg" viewBox="0 0 180 180">
                        {/* Background Track */}
                        <circle
                          cx="90"
                          cy="90"
                          r={radius}
                          className="gauge-track"
                          strokeWidth="14"
                        />
                        {/* Fill Arc */}
                        <circle
                          cx="90"
                          cy="90"
                          r={radius}
                          className="gauge-fill"
                          strokeWidth="14"
                          stroke={riskColor}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          transform="rotate(-90 90 90)"
                        />
                      </svg>

                      <div className="gauge-center-content">
                        <span className="gauge-percent">{result.risk_percentage}%</span>
                        <span className="gauge-label">CHURN RISK</span>
                      </div>
                    </div>

                    <div className="score-meta">
                      <div className={`risk-badge-large badge-${isHighRisk ? "danger" : isMediumRisk ? "warning" : "success"}`}>
                        <span className="status-dot" style={{ backgroundColor: riskColor }} />
                        {riskStatusText}
                      </div>

                      <p className="score-summary">
                        {isHighRisk
                          ? "High flight probability detected. Customer exhibits critical early-attrition behavioral indicators."
                          : isMediumRisk
                          ? "Moderate vulnerability detected. Account is responsive to proactive retention incentives."
                          : "Strong retention stability. Customer demonstrates high brand affinity and ecosystem integration."}
                      </p>
                    </div>
                  </div>

                  {/* Financial Risk & Exposure Metrics */}
                  <div className="exposure-grid">
                    <div className="exposure-stat-card">
                      <span className="exposure-label">MONTHLY REVENUE AT RISK</span>
                      <span className="exposure-value">${Number(form.MonthlyCharges).toFixed(2)}<span className="exposure-unit">/mo</span></span>
                      <span className="exposure-hint">Direct recurring cashflow</span>
                    </div>

                    <div className="exposure-stat-card">
                      <span className="exposure-label">ANNUALIZED RUN-RATE</span>
                      <span className="exposure-value">${(Number(form.MonthlyCharges) * 12).toFixed(0)}<span className="exposure-unit">/yr</span></span>
                      <span className="exposure-hint">Contractual risk window</span>
                    </div>
                  </div>

                  {/* Behavioral Drivers & Explainability (XAI) */}
                  <div className="insights-box">
                    <div className="insights-header">
                      <span className="insights-icon">🔍</span>
                      <h4>Key Behavioral Risk Factors</h4>
                    </div>

                    {riskInsights.drivers.length > 0 && (
                      <div className="factor-list">
                        <span className="factor-category-tag danger">ATTRITION ACCELERATORS</span>
                        {riskInsights.drivers.map((d, i) => (
                          <div key={i} className="factor-row factor-danger">
                            <span className="factor-marker">⚠️</span>
                            <div>
                              <div className="factor-title-row">
                                <span className="factor-name">{d.title}</span>
                                <span className="factor-impact danger">{d.impact}</span>
                              </div>
                              <p className="factor-desc">{d.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {riskInsights.mitigators.length > 0 && (
                      <div className="factor-list">
                        <span className="factor-category-tag success">RETENTION ANCHORS</span>
                        {riskInsights.mitigators.map((m, i) => (
                          <div key={i} className="factor-row factor-success">
                            <span className="factor-marker">🛡️</span>
                            <div>
                              <div className="factor-title-row">
                                <span className="factor-name">{m.title}</span>
                                <span className="factor-impact success">{m.impact}</span>
                              </div>
                              <p className="factor-desc">{m.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Retention Playbook Simulator (What-If Analysis) */}
                  <div className="playbook-box">
                    <div className="playbook-header">
                      <span className="playbook-icon">🎯</span>
                      <div>
                        <h4>Retention Intervention Simulator</h4>
                        <p className="playbook-sub">1-Click "What-If" intervention scenarios</p>
                      </div>
                    </div>

                    <div className="playbook-actions">
                      {form.Contract !== "One year" && form.Contract !== "Two year" && (
                        <button
                          type="button"
                          className="simulation-btn"
                          onClick={() => applySimulation({ Contract: "One year" }, "1-Year Contract Lock-in")}
                        >
                          <div className="sim-btn-content">
                            <span className="sim-title">Offer 1-Year Retention Agreement</span>
                            <span className="sim-desc">Locks in contract rate and introduces commitment anchor</span>
                          </div>
                          <span className="sim-action-tag">Simulate →</span>
                        </button>
                      )}

                      {(form.TechSupport === "No" || form.OnlineSecurity === "No") && form.InternetService !== "No" && (
                        <button
                          type="button"
                          className="simulation-btn"
                          onClick={() =>
                            applySimulation(
                              { TechSupport: "Yes", OnlineSecurity: "Yes", OnlineBackup: "Yes" },
                              "VIP Tech Support & Security Bundle"
                            )
                          }
                        >
                          <div className="sim-btn-content">
                            <span className="sim-title">Bundle Tech Support & Security Suite</span>
                            <span className="sim-desc">Resolves user friction and builds multi-service stickiness</span>
                          </div>
                          <span className="sim-action-tag">Simulate →</span>
                        </button>
                      )}

                      {form.PaymentMethod === "Electronic check" && (
                        <button
                          type="button"
                          className="simulation-btn"
                          onClick={() =>
                            applySimulation(
                              { PaymentMethod: "Credit card (automatic)" },
                              "Switch to Autopay Billing"
                            )
                          }
                        >
                          <div className="sim-btn-content">
                            <span className="sim-title">Incentivize Automatic Autopay Billing</span>
                            <span className="sim-desc">Replaces manual electronic check with seamless credit card</span>
                          </div>
                          <span className="sim-action-tag">Simulate →</span>
                        </button>
                      )}

                      {form.Contract === "One year" && (
                        <button
                          type="button"
                          className="simulation-btn"
                          onClick={() => applySimulation({ Contract: "Two year" }, "2-Year VIP Agreement")}
                        >
                          <div className="sim-btn-content">
                            <span className="sim-title">Upgrade to 2-Year VIP Commitment</span>
                            <span className="sim-desc">Maximizes customer lifetime value and tenure security</span>
                          </div>
                          <span className="sim-action-tag">Simulate →</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Engine Details Footer */}
                  <div className="telemetry-footer">
                    <div className="footer-meta-item">
                      <span>CLASSIFICATION</span>
                      <strong>{result.prediction}</strong>
                    </div>
                    <div className="footer-meta-item">
                      <span>CONFIDENCE</span>
                      <strong>{result.churn_probability}</strong>
                    </div>
                    <div className="footer-meta-item">
                      <span>PIPELINE</span>
                      <strong>XGBoost / v{result.model_version}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="footer-logo">ChurnSense AI</span>
            <span>· Enterprise Customer Churn Intelligence & Retention Studio</span>
          </div>
          <div className="footer-links">
            <span className="footer-tag">FastAPI ML Backend</span>
            <span className="footer-bullet">•</span>
            <span className="footer-tag">React 19 Frontend</span>
            <span className="footer-bullet">•</span>
            <span className="footer-tag">Tuned Ensemble Classifier</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
