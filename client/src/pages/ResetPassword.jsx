import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import PasswordInput from '../components/common/PasswordInput';
import Button from '../components/common/Button';
import { resetPassword } from '../api/auth.api';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const validate = () => {
    const errors = {};
    if (!PASSWORD_RULE.test(password)) {
      errors.password = 'At least 8 characters, with an uppercase letter, a lowercase letter, and a number';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!token) {
      setFormError('This reset link is missing its token.');
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setSucceeded(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'This reset link is invalid or has expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <AuthLayout title="Password reset">
        <div className="rounded-card border border-status-success bg-status-successBg px-3 py-2 text-sm text-status-success">
          Your password has been reset. All previous sessions have been signed out for your security.
        </div>
        <Button className="mt-4 w-full" onClick={() => navigate('/login', { replace: true })}>
          Continue to sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div className="rounded-card border border-status-danger bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
            {formError}
          </div>
        )}

        <PasswordInput
          id="password"
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
        />

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        <Link to="/login" className="font-medium text-brass hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}