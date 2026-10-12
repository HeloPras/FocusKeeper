export interface RingSegment {
	id: string;
	label: string;
	ms: number;
	color: string;
}

const SIZE = 156;
const CENTER = SIZE / 2;
const STROKE = 12;
const RADIUS = CENTER - 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Visual gap between adjacent segments so each category reads as a distinct arc. */
const GAP_PX = 2.5;

const BEZEL_RADIUS = CENTER - 4;
const TICK_OUTER = CENTER - 7;
const TICK_COUNT = 24;
const MAJOR_EVERY = 6; // 24 / 6 = 4 major ticks, at the compass points

const polar = (radius: number, angleDeg: number) => {
	const rad = (angleDeg * Math.PI) / 180;
	return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
};

const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
	const angle = (360 / TICK_COUNT) * i - 90;
	const major = i % MAJOR_EVERY === 0;
	const outer = polar(TICK_OUTER, angle);
	const inner = polar(TICK_OUTER - (major ? 7 : 4), angle);
	return { id: i, major, outer, inner };
});

/**
 * The dashboard's one deliberately bold element: today's tracked time as an
 * engraved gauge, one coloured arc per category, ticked rim, total centred inside —
 * an instrument dial rather than a generic bar chart or donut.
 */
export function FocusRing({ segments, centerValue, centerLabel }: { segments: RingSegment[]; centerValue: string; centerLabel: string }) {
	const total = segments.reduce((sum, s) => sum + s.ms, 0);
	let offset = 0;
	const arcs = segments
		.filter((s) => s.ms > 0)
		.map((s) => {
			const length = total > 0 ? (s.ms / total) * CIRCUMFERENCE : 0;
			const rotation = (offset / CIRCUMFERENCE) * 360 - 90;
			offset += length;
			return { ...s, dash: `${Math.max(length - GAP_PX, 0)} ${CIRCUMFERENCE}`, rotation };
		});

	return (
		<div
			className="ring-wrap"
			style={{ position: 'relative', width: SIZE, height: SIZE, flex: '0 0 auto' }}
			role="img"
			aria-label={`${centerLabel}: ${centerValue}. ${arcs.map((a) => `${a.label} ${Math.round(a.ms / 60000)} minutes`).join(', ')}`}
		>
			<svg
				viewBox={`0 0 ${SIZE} ${SIZE}`}
				width={SIZE}
				height={SIZE}
				className="ring-svg"
				style={{ display: 'block' }}
			>
				{TICKS.map((t) => (
					<line
						key={t.id}
						className={`ring-tick ${t.major ? 'major' : ''}`}
						x1={t.outer.x} y1={t.outer.y} x2={t.inner.x} y2={t.inner.y}
						strokeWidth={t.major ? 1.4 : 1}
						strokeLinecap="round"
					/>
				))}
				<circle cx={CENTER} cy={CENTER} r={RADIUS} className="ring-track" strokeWidth={STROKE} fill="none" />
				{arcs.map((a) => (
					<circle
						key={a.id}
						className="ring-arc"
						cx={CENTER}
						cy={CENTER}
						r={RADIUS}
						fill="none"
						stroke={a.color}
						strokeWidth={STROKE}
						strokeLinecap="round"
						strokeDasharray={a.dash}
						style={{ transform: `rotate(${a.rotation}deg)`, transformOrigin: '50% 50%' }}
					/>
				))}
			</svg>
			<div
				className="ring-center"
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					textAlign: 'center',
					pointerEvents: 'none',
				}}
			>
				<div className="ring-value num">{centerValue}</div>
				<div className="ring-label muted small">{centerLabel}</div>
			</div>
		</div>);
}
