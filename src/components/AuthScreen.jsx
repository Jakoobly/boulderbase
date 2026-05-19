import { useState } from 'react';
import { createUserWithEmailAndPassword, signInAnonymously, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase.js';

export default function AuthScreen() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function login() {
    setError('');
    try { await signInWithEmailAndPassword(auth, form.email.trim(), form.password); }
    catch (e) { setError(e.code === 'auth/invalid-credential' ? 'Login falsch.' : e.message); }
  }
  async function register() {
    setError('');
    if (!form.name.trim()) return setError('Name fehlt.');
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(cred.user, { displayName: form.name.trim() });
      await setDoc(doc(db, 'users', cred.user.uid), { name: form.name.trim(), status: '', avatarColor: '#2D3142', avatarIcon: '🧗', sessions: 0, tops: 0, flashes: 0, points: 0, matchHistory: [] });
    } catch (e) { setError(e.message); }
  }

  return <main className="screen active" id="screen-auth">
    <div style={{ paddingTop: 18, marginBottom: 24 }}><div className="logo">Boulder<em>Base</em></div><div className="tag" style={{ marginTop: 4 }}>Training · Gruppen · Challenges</div></div>
    <div className="tabs"><button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Anmelden</button><button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Registrieren</button></div>
    {error && <div className="error-box">{error}</div>}
    {tab === 'login' ? <><div className="card"><label>E-Mail</label><input type="email" value={form.email} onChange={update('email')} className="mb8" /><label>Passwort</label><input type="password" value={form.password} onChange={update('password')} onKeyDown={(e) => e.key === 'Enter' && login()} /></div><button className="btn btn-primary" onClick={login}>Anmelden</button><button className="btn btn-secondary" onClick={() => signInAnonymously(auth).catch((e) => setError(e.message))}>Als Gast fortfahren</button></> : <><div className="card"><label>Name</label><input value={form.name} onChange={update('name')} className="mb8" /><label>E-Mail</label><input type="email" value={form.email} onChange={update('email')} className="mb8" /><label>Passwort</label><input type="password" value={form.password} onChange={update('password')} /></div><button className="btn btn-primary" onClick={register}>Konto erstellen</button></>}
  </main>;
}
