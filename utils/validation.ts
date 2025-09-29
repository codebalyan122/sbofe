export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUsername(username: string) {
  return /^[a-zA-Z0-9_]+$/.test(username);
}