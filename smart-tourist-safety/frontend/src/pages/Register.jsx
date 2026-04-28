import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    nationality: 'Indian',
    aadhaarNumber: '',
    digitalTouristId: '',
    passportNumber: '',
    currentLocation: '',
    destinationLocation: '',
    phoneNumber: '',
    alternativePhoneNumber: '',
    emergencyContact: {
      name: '',
      number: '',
      relation: ''
    },
    password: '',
    confirmPassword: '',
    consentLocationTracking: false,
    consentBlockchainStorage: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        emergencyContact: {
          ...formData.emergencyContact,
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
    setError('');
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length > 7) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(formData.password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-yellow-500', 'bg-safety-400', 'bg-safety-600'];

  const validateForm = () => {
    if (!formData.consentLocationTracking || !formData.consentBlockchainStorage) {
      setError('You must accept all required consents to register.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    if (formData.nationality === 'Indian') {
      if (formData.aadhaarNumber && !/^\d{12}$/.test(formData.aadhaarNumber)) {
        setError('Aadhaar number must be exactly 12 digits.');
        return false;
      }
    } else {
      if (!formData.passportNumber) {
        setError('Passport number is required for foreign nationals.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Registration Successful! Please login.');
        navigate('/login');
      } else {
        const errorMsg = data.errors ? data.errors[0].message : data.message;
        setError(errorMsg || 'Registration failed');
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gov-800 px-6 py-8 sm:p-10 text-white text-center">
          <h2 className="text-3xl font-bold tracking-tight">Create an Account</h2>
          <p className="mt-2 text-gov-100">Smart Tourist Safety Monitoring & Incident Response System</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-8 sm:p-10 space-y-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Basic Details Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gov-900 border-b pb-2">Basic Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label-text">Full Name</label>
                <input required type="text" name="fullName" className="input-field" value={formData.fullName} onChange={handleChange} />
              </div>
              <div>
                <label className="label-text">Username</label>
                <input required type="text" name="username" className="input-field" value={formData.username} onChange={handleChange} />
              </div>
              <div>
                <label className="label-text">Email ID</label>
                <input required type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} />
              </div>
              <div>
                <label className="label-text">Nationality</label>
                <select name="nationality" className="input-field" value={formData.nationality} onChange={handleChange}>
                  <option value="Indian">Indian</option>
                  <option value="Foreign">Foreign</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nationality Specific Section */}
          <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="text-lg font-medium leading-6 text-gov-900 border-b pb-2">
              {formData.nationality === 'Indian' ? 'National ID Details' : 'Passport & Travel Details'}
            </h3>
            
            {formData.nationality === 'Indian' ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="label-text">Aadhaar Card Number</label>
                  <input required type="text" maxLength="12" name="aadhaarNumber" className="input-field" placeholder="12 Digit Aadhaar Number" value={formData.aadhaarNumber} onChange={handleChange} />
                </div>
                <div>
                  <label className="label-text">Digital Tourist ID</label>
                  <input required type="text" name="digitalTouristId" className="input-field" placeholder="Optional DL or Tourist ID" value={formData.digitalTouristId} onChange={handleChange} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="label-text">Passport Number</label>
                  <input required type="text" name="passportNumber" className="input-field" value={formData.passportNumber} onChange={handleChange} />
                </div>
                <div>
                  <label className="label-text">Phone Number</label>
                  <input required type="tel" name="phoneNumber" className="input-field" placeholder="+Country Code" value={formData.phoneNumber} onChange={handleChange} />
                </div>
                <div>
                  <label className="label-text">Current Location</label>
                  <input required type="text" name="currentLocation" className="input-field" placeholder="e.g. Hotel Name, City" value={formData.currentLocation} onChange={handleChange} />
                </div>
                <div>
                  <label className="label-text">Destination Location</label>
                  <input required type="text" name="destinationLocation" className="input-field" placeholder="e.g. Next City" value={formData.destinationLocation} onChange={handleChange} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-text">Alternative Phone Number</label>
                  <input type="tel" name="alternativePhoneNumber" className="input-field" value={formData.alternativePhoneNumber} onChange={handleChange} />
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gov-900 border-b pb-2">Emergency Contact</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="label-text">Contact Name</label>
                <input required type="text" name="emergencyContact.name" className="input-field" value={formData.emergencyContact.name} onChange={handleChange} />
              </div>
              <div>
                <label className="label-text">Contact Number</label>
                <input required type="tel" name="emergencyContact.number" className="input-field" value={formData.emergencyContact.number} onChange={handleChange} />
              </div>
              <div>
                <label className="label-text">Relation</label>
                <input required type="text" name="emergencyContact.relation" className="input-field" placeholder="e.g. Father, Spouse" value={formData.emergencyContact.relation} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Account Security Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gov-900 border-b pb-2">Account Security</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label-text">Password</label>
                <div className="relative">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    className="input-field pr-10" 
                    value={formData.password} 
                    onChange={handleChange} 
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 mt-1 flex items-center text-slate-400" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500">Strength: {strengthLabels[Math.min(passwordStrength, 3)]}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 flex overflow-hidden">
                      <div className={`h-1.5 ${strengthColors[Math.min(passwordStrength - 1, 3)]}`} style={{ width: `${(passwordStrength / 4) * 100}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="label-text">Confirm Password</label>
                <input required type={showPassword ? "text" : "password"} name="confirmPassword" className="input-field" value={formData.confirmPassword} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Consents Section */}
          <div className="space-y-4 bg-safety-50 p-6 rounded-xl border border-safety-200">
            <h3 className="text-lg font-medium leading-6 text-safety-900 border-b border-safety-200 pb-2">Consent & Permissions</h3>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input required id="consentLocation" name="consentLocationTracking" type="checkbox" className="focus:ring-gov-500 h-4 w-4 text-gov-600 border-slate-300 rounded" checked={formData.consentLocationTracking} onChange={handleChange} />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="consentLocation" className="font-medium text-slate-700">I consent to real-time location tracking for safety and emergency response purposes.</label>
                <p className="text-slate-500">Required for SOS dispatch entirely.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input required id="consentBlockchain" name="consentBlockchainStorage" type="checkbox" className="focus:ring-gov-500 h-4 w-4 text-gov-600 border-slate-300 rounded" checked={formData.consentBlockchainStorage} onChange={handleChange} />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="consentBlockchain" className="font-medium text-slate-700">I consent to storing my credentials on blockchain for secure verification and data protection.</label>
                <p className="text-slate-500">Creates an immutable proof of your authenticated status.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <Link to="/login" className="text-sm font-medium text-gov-600 hover:text-gov-500">
              &larr; Back to Login
            </Link>
            <button type="submit" disabled={loading} className="btn-primary w-auto px-8">
              {loading ? 'Registering...' : 'Register Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
