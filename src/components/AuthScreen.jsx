import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase.js';

export default function AuthScreen() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function getAuthErrorMessage(errorCode, fallbackMessage) {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Bitte gib eine gültige E-Mail-Adresse ein.';
      case 'auth/missing-password':
        return 'Bitte gib dein Passwort ein.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Login falsch. Prüfe E-Mail und Passwort oder setze dein Passwort zurück.';
      case 'auth/email-already-in-use':
        return 'Diese E-Mail-Adresse ist bereits registriert.';
      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach. Nutze mindestens 6 Zeichen.';
      case 'auth/too-many-requests':
        return 'Zu viele Versuche. Bitte warte kurz und versuche es später erneut.';
      default:
        return fallbackMessage || 'Es ist ein Fehler aufgetreten.';
    }
  }

  async function login() {
    setError('');
    setInfo('');
    setShowReset(false);

    try {
      await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
    } catch (e) {
      setError(getAuthErrorMessage(e.code, e.message));
      setShowReset(true);
    }
  }

  async function register() {
    setError('');
    setInfo('');
    setShowReset(false);

    if (!form.name.trim()) return setError('Name fehlt.');

    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(cred.user, { displayName: form.name.trim() });
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: form.name.trim(),
        status: '',
        avatarColor: '#2D3142',
        avatarIcon: '🧗',
        sessions: 0,
        tops: 0,
        flashes: 0,
        points: 0,
        matchHistory: [],
      });
    } catch (e) {
      setError(getAuthErrorMessage(e.code, e.message));
    }
  }

  async function resetPassword() {
    const email = form.email.trim();
    setError('');
    setInfo('');

    if (!email) {
      setShowReset(true);
      return setError('Bitte gib zuerst deine E-Mail-Adresse ein.');
    }

    try {
      setIsResettingPassword(true);
      await sendPasswordResetEmail(auth, email);
      setInfo('Passwort-Reset wurde gesendet. Prüfe dein E-Mail-Postfach.');
      setShowReset(false);
    } catch (e) {
      setError(getAuthErrorMessage(e.code, e.message));
      setShowReset(true);
    } finally {
      setIsResettingPassword(false);
    }
  }

  return <main className="screen active" id="screen-auth">
    <div style={{ paddingTop: 18, marginBottom: 24 }}><div className="logo">Boulder<em>Base</em></div><div className="tag" style={{ marginTop: 4 }}>Training · Gruppen · Challenges</div></div>
    <div className="tabs"><button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setInfo(''); }}>Anmelden</button><button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setInfo(''); setShowReset(false); }}>Registrieren</button></div>
    {error && <div className="error-box">{error}</div>}
    {info && <div className="success-box">{info}</div>}
    {tab === 'login' ? <><div className="card"><label>E-Mail</label><input type="email" value={form.email} onChange={update('email')} className="mb8" /><label>Passwort</label><input type="password" value={form.password} onChange={update('password')} onKeyDown={(e) => e.key === 'Enter' && login()} /></div><button className="btn btn-primary" onClick={login}>Anmelden</button>{showReset && <button className="btn btn-secondary" onClick={resetPassword} disabled={isResettingPassword}>{isResettingPassword ? 'Reset wird gesendet...' : 'Passwort zurücksetzen'}</button>}<button className="btn btn-secondary" onClick={() => signInAnonymously(auth).catch((e) => setError(e.message))}>Als Gast fortfahren</button></> : <><div className="card"><label>Name</label><input value={form.name} onChange={update('name')} className="mb8" /><label>E-Mail</label><input type="email" value={form.email} onChange={update('email')} className="mb8" /><label>Passwort</label><input type="password" value={form.password} onChange={update('password')} /></div><button className="btn btn-primary" onClick={register}>Konto erstellen</button></>}
  </main>;
}
