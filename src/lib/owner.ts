// Owner panel: coaches, plans and cash payments.

export type CoachPlan = 'basic' | 'pro' | 'unlimited';
export type CoachStatus = 'active' | 'grace' | 'readonly' | 'suspended';

export interface Coach {
	id: string;
	username: string;
	plan: CoachPlan | null;
	maxClients: number | null;
	paidUntil: string | null;
	suspended: boolean;
	status: CoachStatus;
	activeClients: number;
	createdAt: string;
}

export interface Payment {
	id: string;
	coachId: string;
	coachUsername: string;
	amount: number;
	months: number;
	paidOn: string;
	periodStart: string;
	periodEnd: string;
	note?: string;
}

export const PLANS: { id: CoachPlan; label: string; maxClients: number | null }[] = [
	{ id: 'basic', label: 'Básico', maxClients: 10 },
	{ id: 'pro', label: 'Pro', maxClients: 30 },
	{ id: 'unlimited', label: 'Ilimitado', maxClients: null }
];

export const STATUS_LABELS: Record<CoachStatus, string> = {
	active: 'Al día',
	grace: 'En gracia',
	readonly: 'Solo lectura',
	suspended: 'Suspendido'
};

/** Mirrors `GRACE_DAYS` in gym-tracker-api/src/access.rs. */
export const GRACE_DAYS = 7;

export function planLabel(plan: CoachPlan | null): string {
	return PLANS.find((item) => item.id === plan)?.label ?? '—';
}

/** Local calendar date as `YYYY-MM-DD`. */
export function isoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
	const [year, month, day] = iso.split('-').map(Number);
	return isoDate(new Date(year, month - 1, day + days));
}

/** Same day `months` later, clamped to the end of shorter months. */
export function addMonths(iso: string, months: number): string {
	const [year, month, day] = iso.split('-').map(Number);
	const lastDay = new Date(year, month - 1 + months + 1, 0).getDate();
	return isoDate(new Date(year, month - 1 + months, Math.min(day, lastDay)));
}

export function formatDay(iso: string | null): string {
	if (!iso) return '—';
	const [year, month, day] = iso.split('-').map(Number);
	return new Date(year, month - 1, day).toLocaleDateString('es', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

export function formatMoney(amount: number): string {
	return amount.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Coaches to chase: overdue ones, and those whose period ends within a week. */
export function paymentAgenda(coaches: Coach[], today: string) {
	const weekEnd = addDays(today, 7);
	const overdue: Coach[] = [];
	const dueSoon: Coach[] = [];
	for (const coach of coaches) {
		if (coach.suspended || !coach.paidUntil) continue;
		if (coach.paidUntil < today) overdue.push(coach);
		else if (coach.paidUntil <= weekEnd) dueSoon.push(coach);
	}
	const byDate = (a: Coach, b: Coach) => (a.paidUntil ?? '').localeCompare(b.paidUntil ?? '');
	return { overdue: overdue.sort(byDate), dueSoon: dueSoon.sort(byDate) };
}

/** Mirrors `payment_period` in gym-tracker-api/src/access.rs, for the preview. */
export function paymentPeriod(paidUntil: string | null, paidOn: string, months: number) {
	const start =
		paidUntil && paidOn <= addDays(paidUntil, GRACE_DAYS) ? addDays(paidUntil, 1) : paidOn;
	const end = addDays(addMonths(start, months), -1);
	return { start, end, paidUntil: paidUntil && paidUntil > end ? paidUntil : end };
}
