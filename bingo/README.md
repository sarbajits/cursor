# Multiplayer Bingo Game

A real-time multiplayer Bingo game built with HTML, CSS, JavaScript, and Firebase Realtime Database.

## Features

- Create or join game rooms using Room IDs
- Real-time synchronization between players
- Automatic turn management
- Winner detection
- Responsive design for mobile and desktop
- Modern UI with smooth animations

## Setup Instructions

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the Realtime Database in your Firebase project
3. Get your Firebase configuration object from Project Settings
4. Replace the placeholder values in `firebase-config.js` with your actual Firebase configuration
5. Host the files on a web server (local or remote)

## How to Play

1. Open the game in two different browser windows
2. In the first window:
   - Click "Create New Room"
   - Copy the Room ID that appears
3. In the second window:
   - Paste the Room ID
   - Click "Join Room"
4. Players take turns:
   - Drawing numbers using the "Draw Number" button
   - Clicking on matching numbers on their board
5. The game continues until a player wins by completing a row, column, or diagonal

## Technical Details

- Built with vanilla JavaScript (ES6+)
- Uses Firebase Realtime Database for real-time synchronization
- Responsive design using CSS Grid and Flexbox
- No external dependencies except Firebase SDK

## Security Rules

Make sure to set up appropriate security rules in your Firebase Console:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## License

MIT License - feel free to use this project for your own purposes. 