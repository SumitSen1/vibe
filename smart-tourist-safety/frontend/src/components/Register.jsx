import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ── Password Strength Utility ──────────────────────────────────────────────
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;
  if (score <= 2) return { score, label: "Weak", color: "#ef4444" };
  if (score <= 4) return { score, label: "Fair", color: "#f59e0b" };
  if (score <= 5) return { score, label: "Good", color: "#3b82f6" };
  return { score, label: "Strong", color: "#10b981" };
};

const INITIAL_FORM = {
  fullName: "", email: "", nationality: "",
  aadhaarNumber: "", digitalTouristId: "",
  passportNumber: "", currentLocation: "", destinationLocation: "",
  phoneNumber: "", alternativePhoneNumber: "",
  emergencyContactName: "", emergencyContactNumber: "", emergencyContactRelation: "",
  password: "", confirmPassword: "",
  consentLocationTracking: false, consentBlockchainStorage: false,
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const strength = getPasswordStrength(form.password);
  const totalSteps = 4;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (submitError) setSubmitError("");
  };

  // ── Per-step Validation ────────────────────────────────────────────────
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!form.fullName.trim() || form.fullName.length < 2)
        newErrors.fullName = "Full name must be at least 2 characters";
      if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email))
        newErrors.email = "Please enter a valid email address";
      if (!form.nationality)
        newErrors.nationality = "Please select your nationality";
    }

    if (step === 2) {
      if (form.nationality === "Indian") {
        if (!form.aadhaarNumber || !/^\d{12}$/.test(form.aadhaarNumber))
          newErrors.aadhaarNumber = "Aadhaar number must be exactly 12 digits";
        if (!form.digitalTouristId.trim())
          newErrors.digitalTouristId = "Digital Tourist ID is required";
      } else if (form.nationality === "Foreign") {
        if (!form.passportNumber || !/^[A-Za-z]{1,2}[0-9]{6,9}$/.test(form.passportNumber))
          newErrors.passportNumber = "Invalid passport format (e.g. A1234567 or AB1234567)";
        if (!form.currentLocation.trim())
          newErrors.currentLocation = "Current location is required";
        if (!form.destinationLocation.trim())
          newErrors.destinationLocation = "Destination is required";
        if (!form.phoneNumber || !/^\+?[1-9]\d{6,14}$/.test(form.phoneNumber))
          newErrors.phoneNumber = "Enter a valid phone number (e.g. +91XXXXXXXXXX)";
      }
    }

    if (step === 3) {
      if (!form.emergencyContactName.trim())
        newErrors.emergencyContactName = "Emergency contact name is required";
      if (!form.emergencyContactNumber || !/^\+?[1-9]\d{6,14}$/.test(form.emergencyContactNumber))
        newErrors.emergencyContactNumber = "Enter a valid emergency contact phone number";
      if (!form.emergencyContactRelation.trim())
        newErrors.emergencyContactRelation = "Relationship is required";
    }

    if (step === 4) {
      if (!form.password || form.password.length < 8)
        newErrors.password = "Password must be at least 8 characters";
      else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password))
        newErrors.password = "Must include uppercase, lowercase, number, and special character";
      if (form.password !== form.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
      if (!form.consentLocationTracking)
        newErrors.consentLocationTracking = "You must consent to location tracking";
      if (!form.consentBlockchainStorage)
        newErrors.consentBlockchainStorage = "You must consent to blockchain storage";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep((s) => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setLoading(true);
    setSubmitError("");
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        nationality: form.nationality,
        password: form.password,
        confirmPassword: form.confirmPassword,
        emergencyContact: {
          name: form.emergencyContactName,
          phone: form.emergencyContactNumber,
          relation: form.emergencyContactRelation,
        },
        consentLocationTracking: String(form.consentLocationTracking),
        consentBlockchainStorage: String(form.consentBlockchainStorage),
      };

      if (form.nationality === "Indian") {
        payload.aadhaarNumber = form.aadhaarNumber;
        payload.digitalTouristId = form.digitalTouristId;
      } else {
        payload.passportNumber = form.passportNumber;
        payload.currentLocation = form.currentLocation;
        payload.destinationLocation = form.destinationLocation;
        payload.phoneNumber = form.phoneNumber;
        if (form.alternativePhoneNumber) payload.alternativePhoneNumber = form.alternativePhoneNumber;
      }

      await register(payload);
      navigate("/dashboard");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Registration failed. Please try again.");
      if (err.response?.data?.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach((e) => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step Indicators ────────────────────────────────────────────────────
  const stepLabels = ["Basic Info", "ID Verification", "Emergency Contact", "Security"];

  return (
    <div className="auth-wrapper register-wrapper">
      <div className="auth-left reg-left">
        <div className="auth-left-content">
          <div className="gov-badge">🇮🇳 Government of India</div>
          <div className="shield-icon">🛡️</div>
          <h1 className="system-title">Tourist Registration</h1>
          <p className="system-subtitle">Smart Safety Monitoring System</p>
          <div className="step-guide">
            {stepLabels.map((label, i) => (
              <div key={i} className={`step-guide-item ${currentStep > i + 1 ? "done" : ""} ${currentStep === i + 1 ? "active" : ""}`}>
                <span className="step-num">{currentStep > i + 1 ? "✓" : i + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card register-card">
          {/* Header */}
          <div className="auth-header">
            <h2>Tourist Registration</h2>
            <p>Step {currentStep} of {totalSteps}: <strong>{stepLabels[currentStep - 1]}</strong></p>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-wrapper">
            <div className="progress-bar" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
          </div>

          {submitError && (
            <div className="alert alert-error"><span>⚠️</span> {submitError}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ── STEP 1: Basic Details ──────────────────────────────── */}
            {currentStep === 1 && (
              <div className="form-step">
                <div className="section-heading">
                  <span>👤</span> Basic Details
                </div>

                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">👤</span>
                    <input name="fullName" value={form.fullName} onChange={handleChange}
                      placeholder="Enter your full legal name" type="text" />
                  </div>
                  {errors.fullName && <span className="field-error">⚠ {errors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label>Email Address <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">✉️</span>
                    <input name="email" value={form.email} onChange={handleChange}
                      placeholder="Enter your email address" type="email" />
                  </div>
                  {errors.email && <span className="field-error">⚠ {errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Nationality <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">🌍</span>
                    <select name="nationality" value={form.nationality} onChange={handleChange}>
                      <option value="">-- Select Nationality --</option>
                      <option value="Indian">🇮🇳 Indian</option>
                      <option value="Foreign">🌐 Foreign National</option>
                    </select>
                  </div>
                  {errors.nationality && <span className="field-error">⚠ {errors.nationality}</span>}
                </div>
              </div>
            )}

            {/* ── STEP 2: ID Verification ────────────────────────────── */}
            {currentStep === 2 && (
              <div className="form-step">
                {form.nationality === "Indian" ? (
                  <>
                    <div className="section-heading"><span>🪪</span> Indian National Verification</div>
                    <div className="nationality-badge indian">🇮🇳 Indian National</div>

                    <div className="form-group">
                      <label>Aadhaar Card Number <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <span className="input-icon">🪪</span>
                        <input name="aadhaarNumber" value={form.aadhaarNumber} onChange={handleChange}
                          placeholder="12-digit Aadhaar number" type="text" maxLength={12} inputMode="numeric" />
                      </div>
                      {errors.aadhaarNumber && <span className="field-error">⚠ {errors.aadhaarNumber}</span>}
                    </div>

                    <div className="form-group">
                      <label>Digital Tourist ID <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <span className="input-icon">🎫</span>
                        <input name="digitalTouristId" value={form.digitalTouristId} onChange={handleChange}
                          placeholder="Enter Digital Tourist ID" type="text" />
                      </div>
                      {errors.digitalTouristId && <span className="field-error">⚠ {errors.digitalTouristId}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="section-heading"><span>🛂</span> Foreign National Verification</div>
                    <div className="nationality-badge foreign">🌐 Foreign National</div>

                    <div className="form-group">
                      <label>Passport Number <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <span className="input-icon">🛂</span>
                        <input name="passportNumber" value={form.passportNumber} onChange={handleChange}
                          placeholder="e.g. A1234567 or AB1234567" type="text" />
                      </div>
                      {errors.passportNumber && <span className="field-error">⚠ {errors.passportNumber}</span>}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Current Location <span className="required">*</span></label>
                        <div className="input-wrapper">
                          <span className="input-icon">📍</span>
                          <input name="currentLocation" value={form.currentLocation} onChange={handleChange}
                            placeholder="Your current city/location" type="text" />
                        </div>
                        {errors.currentLocation && <span className="field-error">⚠ {errors.currentLocation}</span>}
                      </div>
                      <div className="form-group">
                        <label>Destination <span className="required">*</span></label>
                        <div className="input-wrapper">
                          <span className="input-icon">🗺️</span>
                          <input name="destinationLocation" value={form.destinationLocation} onChange={handleChange}
                            placeholder="Your destination" type="text" />
                        </div>
                        {errors.destinationLocation && <span className="field-error">⚠ {errors.destinationLocation}</span>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone Number <span className="required">*</span></label>
                        <div className="input-wrapper">
                          <span className="input-icon">📱</span>
                          <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange}
                            placeholder="+CountryCode Number" type="tel" />
                        </div>
                        {errors.phoneNumber && <span className="field-error">⚠ {errors.phoneNumber}</span>}
                      </div>
                      <div className="form-group">
                        <label>Alternative Phone</label>
                        <div className="input-wrapper">
                          <span className="input-icon">📞</span>
                          <input name="alternativePhoneNumber" value={form.alternativePhoneNumber} onChange={handleChange}
                            placeholder="+CountryCode Number" type="tel" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 3: Emergency Contact ──────────────────────────── */}
            {currentStep === 3 && (
              <div className="form-step">
                <div className="section-heading"><span>🚨</span> Emergency Contact Details</div>
                <div className="info-box">
                  This information will be used to contact your emergency contact in case of an incident.
                </div>

                <div className="form-group">
                  <label>Emergency Contact Name <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">👤</span>
                    <input name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange}
                      placeholder="Full name of emergency contact" type="text" />
                  </div>
                  {errors.emergencyContactName && <span className="field-error">⚠ {errors.emergencyContactName}</span>}
                </div>

                <div className="form-group">
                  <label>Emergency Contact Phone <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">📱</span>
                    <input name="emergencyContactNumber" value={form.emergencyContactNumber} onChange={handleChange}
                      placeholder="+CountryCode Number" type="tel" />
                  </div>
                  {errors.emergencyContactNumber && <span className="field-error">⚠ {errors.emergencyContactNumber}</span>}
                </div>

                <div className="form-group">
                  <label>Relationship <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">❤️</span>
                    <select name="emergencyContactRelation" value={form.emergencyContactRelation} onChange={handleChange}>
                      <option value="">-- Select Relationship --</option>
                      <option value="Parent">Parent</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Friend">Friend</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Colleague">Colleague</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {errors.emergencyContactRelation && <span className="field-error">⚠ {errors.emergencyContactRelation}</span>}
                </div>
              </div>
            )}

            {/* ── STEP 4: Security & Consent ─────────────────────────── */}
            {currentStep === 4 && (
              <div className="form-step">
                <div className="section-heading"><span>🔐</span> Account Security</div>

                <div className="form-group">
                  <label>Password <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input name="password" value={form.password} onChange={handleChange}
                      type={showPassword ? "text" : "password"} placeholder="Create a strong password" />
                    <button type="button" className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {form.password && (
                    <div className="password-strength">
                      <div className="strength-bars">
                        {[1,2,3,4].map((i) => (
                          <div key={i} className="strength-bar"
                            style={{ background: strength.score >= i * 1.5 ? strength.color : "#e2e8f0" }} />
                        ))}
                      </div>
                      <span style={{ color: strength.color, fontSize: "0.8rem", fontWeight: 600 }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                  {errors.password && <span className="field-error">⚠ {errors.password}</span>}
                  <p className="hint">Min 8 chars with uppercase, lowercase, number & special char</p>
                </div>

                <div className="form-group">
                  <label>Confirm Password <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                      type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" />
                    <button type="button" className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <span className="match-ok">✅ Passwords match</span>
                  )}
                  {errors.confirmPassword && <span className="field-error">⚠ {errors.confirmPassword}</span>}
                </div>

                {/* Consent Section */}
                <div className="section-heading" style={{ marginTop: "1.5rem" }}>
                  <span>📋</span> Consent & Permissions
                </div>
                <div className="consent-box">
                  <div className="consent-item">
                    <label className="checkbox-label">
                      <input type="checkbox" name="consentLocationTracking"
                        checked={form.consentLocationTracking} onChange={handleChange} />
                      <span className="checkbox-custom" />
                      <span>
                        I consent to <strong>real-time location tracking</strong> for safety and emergency response purposes
                      </span>
                    </label>
                    {errors.consentLocationTracking && (
                      <span className="field-error">⚠ {errors.consentLocationTracking}</span>
                    )}
                  </div>

                  <div className="consent-item">
                    <label className="checkbox-label">
                      <input type="checkbox" name="consentBlockchainStorage"
                        checked={form.consentBlockchainStorage} onChange={handleChange} />
                      <span className="checkbox-custom" />
                      <span>
                        I consent to <strong>storing my credentials on blockchain</strong> for secure verification and data protection
                      </span>
                    </label>
                    {errors.consentBlockchainStorage && (
                      <span className="field-error">⚠ {errors.consentBlockchainStorage}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation Buttons ─────────────────────────────────── */}
            <div className="step-actions">
              {currentStep > 1 && (
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
              )}
              {currentStep < totalSteps ? (
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              ) : (
                <button type="submit" className="btn-primary btn-success" disabled={loading}>
                  {loading ? (
                    <><span className="btn-spinner" /> Registering...</>
                  ) : (
                    <><span>✅</span> Complete Registration</>
                  )}
                </button>
              )}
            </div>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Login here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}       