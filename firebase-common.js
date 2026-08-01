// ============================================================
// Shared Firebase setup + auth UI logic.
// Used by index.html and scrabbleslam.html (wordle.html keeps its
// own copy inline so it keeps working standalone).
// Expects these element IDs to exist on the page:
//   authform, name-row, auth-name, auth-email, auth-password,
//   auth-submit, auth-toggle, auth-error, userinfo, user-name, signout-btn
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDvG6332Cv80BquFauULZebnm2gmFGqZ6Y",
  authDomain: "wordle-72684.firebaseapp.com",
  projectId: "wordle-72684",
  storageBucket: "wordle-72684.firebasestorage.app",
  messagingSenderId: "739361469009",
  appId: "1:739361469009:web:88efe9c8cbab56de44fe70",
  measurementId: "G-1CMGQMMYF1"
};

window.firebaseEnabled = true;
try{
  firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
}catch(e){
  console.warn("Firebase not configured — sign-in disabled.", e);
  window.firebaseEnabled = false;
}

window.currentUser = null;

function friendlyAuthError(err){
  const map = {
    'auth/email-already-in-use': "That email already has an account. Try logging in instead.",
    'auth/invalid-email': "That email address doesn't look right.",
    'auth/weak-password': "Password should be at least 6 characters.",
    'auth/wrong-password': "Wrong password.",
    'auth/invalid-credential': "Email or password is incorrect.",
    'auth/user-not-found': "No account found with that email.",
    'auth/too-many-requests': "Too many attempts. Wait a bit and try again."
  };
  return map[err.code] || "Something went wrong. Try again.";
}

function initAuthUI(){
  const authform = document.getElementById('authform');
  const nameRow = document.getElementById('name-row');
  const nameInput = document.getElementById('auth-name');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const submitBtn = document.getElementById('auth-submit');
  const toggleBtn = document.getElementById('auth-toggle');
  const errorEl = document.getElementById('auth-error');
  const signoutBtn = document.getElementById('signout-btn');
  const userinfo = document.getElementById('userinfo');
  const nameEl = document.getElementById('user-name');
  const guestRow = document.getElementById('guest-row');
  const guestNameInput = document.getElementById('guest-name');
  const guestBtn = document.getElementById('guest-btn');

  if(!authform) return; // page doesn't have an auth bar

  let mode = 'login';

  if(!window.firebaseEnabled){
    submitBtn.disabled = true;
    submitBtn.textContent = "Not configured";
    toggleBtn.style.display = 'none';
    errorEl.textContent = "Sign-in isn't set up yet.";
    if(guestBtn) guestBtn.disabled = true;
    return;
  }

  toggleBtn.addEventListener('click', ()=>{
    mode = mode === 'login' ? 'signup' : 'login';
    nameRow.style.display = mode === 'signup' ? 'flex' : 'none';
    submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Log in';
    toggleBtn.textContent = mode === 'signup' ? 'Have an account? Log in' : 'Need an account? Sign up';
    errorEl.textContent = "";
  });

  authform.addEventListener('submit', async (e)=>{
    e.preventDefault();
    errorEl.textContent = "";
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if(!email || !password){
      errorEl.textContent = "Enter an email and password.";
      return;
    }
    submitBtn.disabled = true;
    try{
      if(mode === 'signup'){
        const displayName = nameInput.value.trim() || email.split('@')[0];
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName });
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
      authform.reset();
    }catch(err){
      errorEl.textContent = friendlyAuthError(err);
    }
    submitBtn.disabled = false;
  });

  if(guestBtn){
    guestBtn.addEventListener('click', async ()=>{
      errorEl.textContent = "";
      const name = guestNameInput.value.trim();
      if(!name){
        errorEl.textContent = "Enter a display name to play as a guest.";
        return;
      }
      guestBtn.disabled = true;
      try{
        const cred = await auth.signInAnonymously();
        await cred.user.updateProfile({ displayName: name });
        // updateProfile doesn't refresh the user object onAuthStateChanged already fired with,
        // so make sure the app sees the name right away.
        window.currentUser = auth.currentUser;
        nameEl.textContent = name;
        document.dispatchEvent(new CustomEvent('authchange', { detail: { user: auth.currentUser } }));
      }catch(err){
        errorEl.textContent = friendlyAuthError(err);
      }
      guestBtn.disabled = false;
    });
  }

  signoutBtn.addEventListener('click', ()=> auth.signOut());

  auth.onAuthStateChanged(user=>{
    window.currentUser = user;
    if(user){
      authform.style.display = 'none';
      if(guestRow) guestRow.style.display = 'none';
      userinfo.style.display = 'flex';
      nameEl.textContent = user.displayName || (user.email ? user.email.split('@')[0] : 'Player');
    } else {
      authform.style.display = 'flex';
      if(guestRow) guestRow.style.display = 'flex';
      userinfo.style.display = 'none';
    }
    document.dispatchEvent(new CustomEvent('authchange', { detail: { user } }));
  });
}

document.addEventListener('DOMContentLoaded', initAuthUI);
