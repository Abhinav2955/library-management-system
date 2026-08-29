import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../features/auth/AuthContext';

// Mirrors the backend's Zod password rule so the person sees the same
// requirement client-side before ever hitting the server.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (form.name.trim().length < 2) errors.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address';
    if (!PASSWORD_RULE.test(form.password)) {
      errors.password = 'At least 8 characters, with an uppercase letter, a lowercase letter, and a number';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(form);
      // Registration doesn't log the user in server-side, so chain a login
      // immediately for a one-step signup experience.
      await login({ email: form.email, password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Something went wrong. Please try again.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join the library to borrow and reserve titles.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div className="rounded-card border border-status-danger bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
            {formError}
          </div>
        )}

        <Input
          id="name"
          label="Full name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange('name')}
          error={fieldErrors.name}
        />
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange('email')}
          error={fieldErrors.email}
        />
        <Input
          id="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange('phone')}
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange('password')}
          error={fieldErrors.password}
        />

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brass hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}