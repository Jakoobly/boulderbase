export function initialProfile(user) {
  return {
    name: user.displayName || user.email?.split('@')[0] || 'Gast',
    status: '',
    avatarColor: '#2D3142',
    avatarIcon: '🧗',
    sessions: 0,
    tops: 0,
    flashes: 0,
    points: 0,
    matchHistory: []
  };
}
