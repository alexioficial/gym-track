// The client's side of coach logging: sessions their coach wrote are shown with
// a mark and cannot be edited by them (the API enforces it too).
import type { Session } from './types';

export const BY_COACH_LABEL = 'Anotada por tu entrenador';

/** Sessions the user's coach logged for `date`, so a second one is not created by accident. */
export function coachSessionsOn(sessions: Session[], date: string): Session[] {
	return sessions.filter((session) => session.loggedBy && session.date === date);
}

/** The newest session the user wrote themselves (`sessions` is newest first). */
export function latestOwnSession(sessions: Session[]): Session | null {
	return sessions.find((session) => !session.loggedBy) ?? null;
}
