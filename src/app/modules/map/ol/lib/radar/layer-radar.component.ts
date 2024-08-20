import {
    ChangeDetectionStrategy,
    Component,
    Input,
    Output,
    OnChanges,
    OnInit,
    SimpleChanges,
    ChangeDetectorRef,
    OnDestroy
} from '@angular/core';
import { Layer } from 'ol/layer';
import { Coordinate } from '../models';
import { BehaviorSubject, AsyncSubject } from 'rxjs';
import ImageLayer from 'ol/layer/Image'
import { RadarService } from './radar.service'
import { ShipState } from './ship-state.model'
import { MapComponent } from '../map.component';


// ** Freeboard Radar component **
@Component({
    selector: 'ol-map > fb-radar',
    template: '<ng-content></ng-content>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RadarComponent implements OnInit, OnChanges, OnDestroy {

    protected layer: Layer;
    private subject = new BehaviorSubject<ShipState>({ location: [0, 0], heading: 0 });

    @Output() layerReady: AsyncSubject<Layer> = new AsyncSubject();
    @Input() position: Coordinate;
    @Input() heading = 0;
    @Input() zIndex: number;
    @Input() visible: boolean;
    @Input() layerProperties: { [index: string]: any };

    state: ShipState = { location: [0, 0], heading: 0 }

    constructor(private radarService: RadarService, protected mapComponent: MapComponent, protected changeDetectorRef: ChangeDetectorRef) {
        this.changeDetectorRef.detach();
    }

    ngOnInit(): void {

        this.layer = new ImageLayer( Object.assign(this, { ...this.layerProperties }))
        const map = this.mapComponent.getMap();
        if (this.layer && map) {
            map.addLayer(this.layer);
            map.render();
            this.layerReady.next(this.layer);
            this.layerReady.complete();
        }

        this.radarService.Connect().then(() => {
            let radars = this.radarService.GetRadars()
            let radar = radars.get(radars.keys().next().value);
            if (radar) {
                this.layer.setSource(this.radarService.CreateRadarSource(radar, this.subject))
            }
        })
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.layer) {
            if (changes["position"] || changes["heading"]) {
                if (changes["position"]) {
                    let position = changes["position"].currentValue
                    this.state.location = position;
                }
                if (changes["heading"]) {
                    this.state.heading = changes["heading"].currentValue * (180/Math.PI)
                }
                this.subject.next(this.state);
            }
        }
    }

    ngOnDestroy() {
        const map = this.mapComponent.getMap();
        if (this.layer && map) {
            map.removeLayer(this.layer);
            map.render();
            this.layer = null;
        }
        this.radarService.Disconnect();
    }
}
