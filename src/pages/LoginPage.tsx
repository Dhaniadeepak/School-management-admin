import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForgotPasswordMutation, useLoginMutation, useResetPasswordMutation } from '../api/adminApi';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Alert, Button, Card, Field } from '../components/ui';
import { sessionStarted } from '../features/auth/authSlice';
import { errorMessage } from '../lib/utils';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const signedIn = useAppSelector((s) => !!s.auth.accessToken);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const [doLogin, loginState] = useLoginMutation();
  const [forgot, forgotState] = useForgotPasswordMutation();
  const [reset, resetState] = useResetPasswordMutation();

  if (signedIn) return <Navigate to="/" replace />;

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    const session = await doLogin({ login, password }).unwrap().catch(() => null);
    if (!session) return;
    dispatch(sessionStarted(session));
    navigate('/');
  };

  const onForgot = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await forgot({ phone }).unwrap().catch(() => null);
    if (ok) {
      setMessage('If this number belongs to an admin account, a 6-digit code has been sent by SMS.');
      setMode('reset');
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await reset({ phone, code, newPassword: password }).unwrap().catch(() => null);
    if (ok) {
      setMessage('Password changed. Please sign in with your new password.');
      setPassword('');
      setMode('login');
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>School office</h1>
        <p className="muted">Sign in to manage your school.</p>
        <div className="stack">
          <Alert kind="success">{message}</Alert>
          {mode === 'login' && (
            <form className="stack" onSubmit={onLogin}>
              <Field label="Email or phone">
                <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" required />
              </Field>
              <Field label="Password">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </Field>
              <Alert>{errorMessage(loginState.error)}</Alert>
              <Button className="block" loading={loginState.isLoading}>
                Sign in
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setMessage(''); setMode('forgot'); }}>
                Forgot password?
              </Button>
            </form>
          )}
          {mode === 'forgot' && (
            <form className="stack" onSubmit={onForgot}>
              <Field label="Registered mobile number">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required />
              </Field>
              <Alert>{errorMessage(forgotState.error)}</Alert>
              <Button className="block" loading={forgotState.isLoading}>
                Send code
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode('login')}>
                Back to sign in
              </Button>
            </form>
          )}
          {mode === 'reset' && (
            <form className="stack" onSubmit={onReset}>
              <Field label="6-digit code">
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </Field>
              <Alert>{errorMessage(resetState.error)}</Alert>
              <Button className="block" loading={resetState.isLoading}>
                Change password
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
