// Region and map ink colours. The engine names regions after the printed board
// colours; draw them from Paul Tol's colour-blind-safe sets so neighbouring regions
// still separate by lightness, and so they read apart from the Okabe-Ito seat colours.
const regionColors: Record<string, string> = {
    red: '#cc3311',
    orange: '#ee7733',
    yellow: '#ddcc55',
    green: '#228833',
    cyan: '#66ccee',
    blue: '#4477aa',
    purple: '#aa3377',
    pink: '#ffaabb',
    brown: '#7a4e22',
};

export function regionColor(region: string): string {
    return regionColors[region] ?? region;
}

/** Map ink: city discs, road casing and the cost-tier fills. */
export const mapInk = {
    outline: '#1f2a36',
    city: '#e9edf2',
    slot: '#c3ccd7',
    road: '#8796a8',
    costLow: '#ffffff',
    costMid: '#b8c4d2',
    costHigh: '#1f2a36',
};
