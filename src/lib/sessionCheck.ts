const LAST_ACTIVITY_KEY = 'casa_franco_last_activity';
const INACTIVITY_DAYS = 7;

export function updateLastActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, new Date().toISOString());
}

export function checkSessionTimeout(): boolean {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

  if (!lastActivity) {
    updateLastActivity();
    return false;
  }

  const lastDate = new Date(lastActivity);
  const daysSinceLastActivity = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceLastActivity >= INACTIVITY_DAYS;
}
