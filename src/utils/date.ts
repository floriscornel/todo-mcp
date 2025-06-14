/**
 * Format a date as a relative time string (e.g., "2 minutes ago", "just now")
 */
export function formatRelativeTime(date: Date | string): string {
	const now = new Date();
	const past = new Date(date);
	const diffMs = now.getTime() - past.getTime();

	// If it's in the future or just happened, return "just now"
	if (diffMs < 1000) {
		return "just now";
	}

	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffMonths = Math.floor(diffDays / 30);
	const diffYears = Math.floor(diffDays / 365);

	if (diffYears > 0) {
		return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
	}
	if (diffMonths > 0) {
		return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
	}
	if (diffDays > 0) {
		return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
	}
	if (diffHours > 0) {
		return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
	}
	if (diffMinutes > 0) {
		return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
	}
	return `${diffSeconds} second${diffSeconds > 1 ? "s" : ""} ago`;
}
