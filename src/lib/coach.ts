// Coach panel: the client list and each client's data.
import type { Coach } from './owner';
import type { OfflineSnapshot } from './offline/types';
import { addDays } from './owner';
import { weekStart } from './utils/progression';

export interface ClientSummary {
	id: string;
	username: string;
	disabled: boolean;
	createdAt: string;
	lastSessionDate?: string;
	/** Session dates of the last few weeks, newest first. */
	recentSessionDates: string[];
}

export interface CoachClients {
	coach: Coach;
	clients: ClientSummary[];
}

export interface CoachClient {
	client: ClientSummary;
	snapshot: OfflineSnapshot;
}

/** Days without training that make a client show up as an alert. */
export const INACTIVE_DAYS = 7;

export interface ClientActivity {
	/** Null when the client never logged a session. */
	daysSince: number | null;
	sessionsThisWeek: number;
	inactive: boolean;
}

function daysBetween(from: string, to: string): number {
	const [y1, m1, d1] = from.split('-').map(Number);
	const [y2, m2, d2] = to.split('-').map(Number);
	return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Works on local calendar dates, like the rest of the progress maths. */
export function clientActivity(client: ClientSummary, today: string): ClientActivity {
	const daysSince = client.lastSessionDate
		? Math.max(0, daysBetween(client.lastSessionDate, today))
		: null;
	const monday = weekStart(today);
	const sunday = addDays(monday, 6);
	return {
		daysSince,
		sessionsThisWeek: client.recentSessionDates.filter((date) => date >= monday && date <= sunday)
			.length,
		inactive: daysSince === null || daysSince >= INACTIVE_DAYS
	};
}

export function lastSessionLabel(activity: ClientActivity): string {
	if (activity.daysSince === null) return 'Nunca ha entrenado';
	if (activity.daysSince === 0) return 'Entrenó hoy';
	if (activity.daysSince === 1) return 'Entrenó ayer';
	return `Hace ${activity.daysSince} días`;
}

/**
 * The summary from the client's local copy, so sessions the coach logged
 * offline count right away.
 */
export function rosterSummary(entry: CoachClient): ClientSummary {
	const dates = entry.snapshot.sessions
		.map((session) => session.date)
		.sort((a, b) => b.localeCompare(a));
	return {
		...entry.client,
		lastSessionDate: dates[0],
		recentSessionDates: dates
	};
}

/** Inactive clients first (longest first), then the rest by name. */
export function sortClients(clients: ClientSummary[], today: string): ClientSummary[] {
	const rank = (client: ClientSummary) => {
		const activity = clientActivity(client, today);
		if (!activity.inactive) return -1;
		return activity.daysSince ?? Number.MAX_SAFE_INTEGER;
	};
	return [...clients].sort((a, b) => rank(b) - rank(a) || a.username.localeCompare(b.username));
}
