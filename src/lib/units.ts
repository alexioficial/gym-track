// Weights are always stored in pounds. The unit only changes what people see
// and type; progress maths keeps working on the stored pounds.
export type WeightUnit = 'lb' | 'kg';

export const WEIGHT_UNITS: readonly WeightUnit[] = ['lb', 'kg'];
export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'lb';
export const LB_PER_KG = 2.20462262185;

// Smallest jump you can load with a pair of the smallest common plates.
const LOAD_STEP: Record<WeightUnit, number> = { lb: 5, kg: 2.5 };
// Values typed in a unit are multiples of this; the API keeps 2 decimals in
// pounds, so a converted-back value lands within the tolerance of it.
const TYPED_STEP = 0.05;
const TYPED_TOLERANCE = 0.003;

export function isWeightUnit(value: unknown): value is WeightUnit {
	return value === 'lb' || value === 'kg';
}

const round = (value: number, decimals: number) => {
	const power = 10 ** decimals;
	return Math.round(value * power) / power;
};

/** Converts a typed weight to the stored pounds (2 decimals, like the API). */
export function toStoredLb(value: number, unit: WeightUnit): number {
	return unit === 'lb' ? round(value, 2) : round(value * LB_PER_KG, 2);
}

/** Exact conversion from stored pounds. */
export function fromStoredLb(lb: number, unit: WeightUnit): number {
	return unit === 'lb' ? lb : lb / LB_PER_KG;
}

export interface LoadDisplay {
	value: number;
	/** True when the value was rounded to a loadable weight. */
	approx: boolean;
}

/**
 * A set's weight as it should be read in the gym. Values typed in this unit
 * come back exactly (100 kg stays 100 kg); values typed in the other unit are
 * rounded to the nearest loadable weight (135 lb → ≈ 60 kg).
 */
export function displayLoad(lb: number, unit: WeightUnit): LoadDisplay {
	const exact = fromStoredLb(lb, unit);
	const typed = Math.round(exact / TYPED_STEP) * TYPED_STEP;
	if (Math.abs(exact - typed) <= TYPED_TOLERANCE) return { value: round(typed, 2), approx: false };
	const step = LOAD_STEP[unit];
	return { value: round(Math.round(exact / step) * step, 2), approx: true };
}

export function formatLoad(lb: number, unit: WeightUnit): string {
	const { value, approx } = displayLoad(lb, unit);
	return `${approx ? '≈' : ''}${value}`;
}

/**
 * A weight input that started from a stored value. `shown` is what the input
 * first displayed; while the input still holds it, the stored pounds are kept,
 * so opening and saving a session never rewrites 135 lb as 60 kg.
 */
export interface WeightField {
	weight: number | null;
	storedLb: number | null;
	shown: number | null;
}

export function weightField(lb: number | null, unit: WeightUnit): WeightField {
	if (lb === null) return { weight: null, storedLb: null, shown: null };
	const { value } = displayLoad(lb, unit);
	return { weight: value, storedLb: lb, shown: value };
}

export function storedWeight(field: WeightField, unit: WeightUnit): number {
	if (field.storedLb !== null && field.weight === field.shown) return field.storedLb;
	return toStoredLb(Number(field.weight ?? 0), unit);
}

/** Body measurements are always stored in centimetres. */
export type LengthUnit = 'cm' | 'in';

export const LENGTH_UNITS: readonly LengthUnit[] = ['cm', 'in'];
export const DEFAULT_LENGTH_UNIT: LengthUnit = 'cm';
export const CM_PER_IN = 2.54;

export function isLengthUnit(value: unknown): value is LengthUnit {
	return value === 'cm' || value === 'in';
}

/** Converts a typed length to the stored centimetres (2 decimals, like the API). */
export function toStoredCm(value: number, unit: LengthUnit): number {
	return unit === 'cm' ? round(value, 2) : round(value * CM_PER_IN, 2);
}

/** Lengths are read to one decimal in either unit. */
export function displayLength(cm: number, unit: LengthUnit): number {
	return round(unit === 'cm' ? cm : cm / CM_PER_IN, 1);
}

/** e1RM, volume and deltas are not loads: exact conversion, 1 decimal. */
export function displayStat(lb: number, unit: WeightUnit): number {
	return round(fromStoredLb(lb, unit), 1);
}
