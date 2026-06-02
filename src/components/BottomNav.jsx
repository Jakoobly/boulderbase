import { Home, UserRound, Users } from 'lucide-react';
import Avatar from './Avatar.jsx';

export default function BottomNav({ profile, screen, setScreen }) {
  const items = [
    { key: 'home', label: 'Start', icon: <Home size={23} strokeWidth={2.4} />, action: () => setScreen('home') },
    { key: 'groups', label: 'Gruppen', icon: <Users size={23} strokeWidth={2.4} />, action: () => setScreen('groups') },
    { key: 'friends', label: 'Freunde', icon: <UserRound size={23} strokeWidth={2.4} />, action: () => setScreen('friends') },
    { key: 'profile', label: 'Profil', icon: <Avatar profile={profile} />, action: () => setScreen('profile') },
  ];

  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {items.map((item) => (
        <button
          type="button"
          key={item.key}
          className={`bottom-nav-item ${screen === item.key ? 'active' : ''}`}
          onClick={item.action}
          aria-label={item.label}
          aria-current={screen === item.key ? 'page' : undefined}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
}
