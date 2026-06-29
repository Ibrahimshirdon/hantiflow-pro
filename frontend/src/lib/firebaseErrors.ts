import { FirebaseError } from "firebase/app";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "That email address looks invalid.",
  "auth/user-disabled": "This account has been suspended.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Couldn't reach Firebase — check your internet connection.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? `Sign-in failed (${error.code}).`;
  }
  if (error instanceof Error) {
    return `Sign-in failed: ${error.message}`;
  }
  return "Sign-in failed for an unknown reason.";
}
