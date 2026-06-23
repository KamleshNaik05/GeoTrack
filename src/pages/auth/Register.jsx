import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Field states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('trainee');
  const [institution, setInstitution] = useState('');
  const [division, setDivision] = useState('RMHP');
  const [contact, setContact] = useState('');
  const [employeeId, setEmployeeId] = useState('');



  // Validation / Error states
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const tempErrors = {};
    if (!fullName.trim()) tempErrors.fullName = 'Full Name is required.';
    if (!email.trim()) {
      tempErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Invalid email format.';
    }
    if (!password) {
      tempErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters.';
    }
    if (!institution.trim()) tempErrors.institution = 'Institution is required.';
    if (!contact.trim()) {
      tempErrors.contact = 'Contact is required.';
    } else if (!/^\d{10}$/.test(contact.trim())) {
      tempErrors.contact = 'Contact must be a 10-digit number.';
    }
    if (!employeeId.trim()) tempErrors.employeeId = 'Employee/Trainee ID is required.';

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    setIsLoading(true);
    const { data, error } = await signUp(email, password, {
      full_name: fullName,
      role: role,
      institution: institution,
      division: division,
      contact: contact,
      employee_id: employeeId,
    });

    if (error) {
      toast.error(error.message || 'Registration failed. Try again.');
      setIsLoading(false);
    } else {
      toast.success('Registration successful! Please sign in.');
      navigate('/login');
    }
  };

  const getInputClass = (fieldName) => {
    const base = "w-full h-11 md:h-10 px-3 bg-white border rounded-lg text-sm text-gray-800 focus:outline-none disabled:opacity-50 transition-colors";
    if (errors[fieldName]) {
      return `${base} border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500`;
    }
    return `${base} border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500`;
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-surface relative select-none">
      {/* 8px top border decoration */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-primary-500"></div>

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md border border-gray-150 p-4 sm:p-8 space-y-6 mx-2 sm:mx-4">
        
        {/* Header Title */}
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-1 font-bold text-sm mb-2">
            <span className="text-primary-500">GeoTrack</span>
            <span className="text-accent-600">RSP</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Create an Account
          </h2>
          <p className="text-xs text-gray-500">
            Register to join the safety and tracking system
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Responsive Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* ROW 1: Full Name & Email */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                disabled={isLoading}
                className={getInputClass('fullName')}
              />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@geotrack.com"
                disabled={isLoading}
                className={getInputClass('email')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* ROW 2: Password & Role */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={isLoading}
                className={getInputClass('password')}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                System Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 md:h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="trainee">Trainee (Location Share)</option>
                <option value="admin">Admin (Safety Operations)</option>
              </select>
            </div>

            {/* ROW 3: Institution & Division */}
            <div>
              <label htmlFor="institution" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                College / Institution
              </label>
              <input
                id="institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. NIT Rourkela"
                disabled={isLoading}
                className={getInputClass('institution')}
              />
              {errors.institution && <p className="text-xs text-red-500 mt-1">{errors.institution}</p>}
            </div>

            <div>
              <label htmlFor="division" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                SAIL Plant Division
              </label>
              <select
                id="division"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 md:h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="RMHP">Raw Material Handling Plant (RMHP)</option>
                <option value="Blast Furnace">Blast Furnace</option>
                <option value="Rolling Mill">Rolling Mill</option>
                <option value="Plate Mill">Plate Mill</option>
                <option value="Power Plant">Power Plant</option>
              </select>
            </div>



            {/* ROW 4: Contact Number & Employee/Trainee ID */}
            <div>
              <label htmlFor="contact" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Contact Number (10 digits)
              </label>
              <input
                id="contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. 9876543210"
                disabled={isLoading}
                className={getInputClass('contact')}
              />
              {errors.contact && <p className="text-xs text-red-500 mt-1">{errors.contact}</p>}
            </div>

            <div>
              <label htmlFor="employeeId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Employee / Trainee ID
              </label>
              <input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. TR-2026-981"
                disabled={isLoading}
                className={getInputClass('employeeId')}
              />
              {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId}</p>}
            </div>

          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 md:h-10 bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors duration-150 flex items-center justify-center disabled:opacity-50 mt-6 shadow-sm"
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        {/* Back to Login link */}
        <div className="text-center pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Already registered? </span>
          <Link to="/login" className="text-xs font-semibold text-primary-500 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
