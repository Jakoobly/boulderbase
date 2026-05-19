// src/components/LoadingState.jsx
export default function LoadingState({ text = 'Lädt...' }) {
  return (
    <main className="screen active">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="logo">Boulder<em>Base</em></div>
        <div className="spinner" />
        <div className="sub">{text}</div>
      </div>
    </main>
  );
}
