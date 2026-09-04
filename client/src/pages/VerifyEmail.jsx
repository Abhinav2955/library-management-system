import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/common/Button';
import { verifyEmail } from '../api/auth.api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'This verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <AuthLayout title="Email Verification">
      {status === 'loading' && <p className="text-sm text-ink-muted">Verifying your email…</p>}

      {status === 'success' && (
        <div>
          <div className="rounded-card border border-status-success bg-status-successBg px-3 py-2 text-sm text-status-success">
            Your email has been verified successfully.
          </div>
          <Link to="/login">
            <Button className="mt-4 w-full">Continue to sign in</Button>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="rounded-card border border-status-danger bg-status-dangerBg px-3 py-2 text-sm text-status-danger">
            {message}
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            You can request a fresh link from your dashboard once signed in, or{' '}
            <Link to="/login" className="font-medium text-brass hover:underline">
              sign in
            </Link>{' '}
            to try again.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}