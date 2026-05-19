// src/friends/FriendsScreen.jsx
import FriendSearch from './FriendSearch.jsx';
import FriendRequests from './FriendRequests.jsx';
import FriendsList from './FriendsList.jsx';
import { useFriends } from '../hooks/useFriends.js';

export default function FriendsScreen({ user, profile, setScreen, notify }) {
  const friendState = useFriends(user);

  return (
    <main className="screen active">
      <div className="topbar">
        <button className="back-btn" onClick={() => setScreen('home')}>← zurück</button>
        <div className="logo" style={{ fontSize: 18 }}>Freunde</div>
      </div>

      <FriendSearch
        user={user}
        profile={profile}
        friendStatus={friendState.friendStatus}
        onChanged={friendState.reloadFriends}
        notify={notify}
      />

      <FriendRequests
        user={user}
        profile={profile}
        incomingRequests={friendState.incomingRequests}
        outgoingRequests={friendState.outgoingRequests}
        onChanged={friendState.reloadFriends}
        notify={notify}
      />

      <FriendsList
        user={user}
        friends={friendState.friends}
        onChanged={friendState.reloadFriends}
        notify={notify}
      />
    </main>
  );
}
