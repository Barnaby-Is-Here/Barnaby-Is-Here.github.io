import { getSupabaseClient } from './supabase-client.js';

function getCleanRedirectUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('error_code');
  url.searchParams.delete('error_description');
  url.hash = '';
  return url;
}

function replaceBrowserUrl(url) {
  window.history.replaceState({}, document.title, url.toString());
}

export async function completeRecipeAuthRedirect() {
  const url = new URL(window.location.href);
  const authCode = url.searchParams.get('code');

  if (!authCode) {
    return false;
  }

  const { error } = await getSupabaseClient().auth.exchangeCodeForSession(authCode);
  if (error) {
    throw error;
  }

  replaceBrowserUrl(getCleanRedirectUrl());
  return true;
}

export async function sendRecipeEditorMagicLink(emailAddress) {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email: emailAddress,
    options: {
      emailRedirectTo: getCleanRedirectUrl().toString()
    }
  });

  if (error) {
    throw error;
  }
}

export async function getRecipeEditorState() {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    return {
      user: null,
      isEditor: false
    };
  }

  const membershipResponse = await getSupabaseClient()
    .from('recipe_editors')
    .select('user_id, note')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipResponse.error) {
    throw membershipResponse.error;
  }

  return {
    user,
    isEditor: Boolean(membershipResponse.data),
    membership: membershipResponse.data
  };
}

export function subscribeToRecipeAuthChanges(callback) {
  return getSupabaseClient().auth.onAuthStateChange(() => {
    callback();
  });
}

export async function signOutRecipeEditor() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    throw error;
  }
}
