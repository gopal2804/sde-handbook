// Firebase web settings for "Sign in with Google" + progress sync.
// These values are meant to be public: they only identify the Firebase project.
// Access is protected by the Firestore rules in firestore.rules (each user can only read/write their own progress).
// Leave apiKey empty to turn sign-in off: the site then keeps progress in the browser only.
export const firebaseConfig = {
  apiKey: "AIzaSyC0XIY-59myywCyD_Q0YrJdArnHtkVo35o",
  authDomain: "sde-handbook.firebaseapp.com",
  projectId: "sde-handbook",
  appId: "1:1041155771610:web:7126f52d7795244e0da9e3"
};

// Progress for this site is stored at users/{uid}/sites/{SITE_ID}, so other sites can share the same project later.
export const SITE_ID = "sde-handbook";
