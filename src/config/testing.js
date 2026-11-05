// Testing switches for the deployed build.
//
// SIGN_IN_REQUIRED — false during testing: the game skips the Supabase sign-in
// screen and starts in local-only play (progress saves in this browser only,
// no cloud sync, tester feedback cannot be submitted). Set it back to true to
// restore accounts and cloud saves for everyone.
//
// Either way, adding ?signin to the URL (…/The-Village/?signin) brings the
// sign-in screen back for that visit, e.g. to submit feedback or check a
// cloud save.
export const SIGN_IN_REQUIRED = false;

export function signInRequired() {
  try {
    if (new URLSearchParams(location.search).has('signin')) return true;
  } catch (_) {}
  return SIGN_IN_REQUIRED;
}
