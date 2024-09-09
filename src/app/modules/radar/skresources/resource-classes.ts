// ** Signal K Radar
export class SKRadarLegendEntry {
    type: string;
    color: string;
}
export class SKRadar {
    id: string;
    name: string;
    spokes: number;
    maxSpokeLen: number;
    streamUrl: string;
    legend: Map<string, SKRadarLegendEntry>
}