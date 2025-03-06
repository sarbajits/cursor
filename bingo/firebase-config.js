// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAiAglabUcKHcvGhFTpLRDBXqnRYIX4pU4",
    authDomain: "bingo-game-e29fa.firebaseapp.com",
    databaseURL: "https://bingo-game-e29fa-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bingo-game-e29fa",
    storageBucket: "bingo-game-e29fa.firebasestorage.app",
    messagingSenderId: "1047350421359",
    appId: "1:1047350421359:web:12d290170dc2990065ea9a",
    measurementId: "G-BK35QKJ6W2"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database(); 