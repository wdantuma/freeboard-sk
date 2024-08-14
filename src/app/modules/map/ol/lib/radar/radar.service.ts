import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import ImageSource from 'ol/source/Image'
import { fromLonLat } from 'ol/proj'
import Projection from 'ol/proj/Projection'
import Circle from 'ol/geom/Circle'
import { createLoader } from 'ol/source/static'
import { Coordinate } from 'ol/coordinate';
import { SKRadar } from '../../../../skresources/resource-classes';
import { ShipState } from './ship-state.model'
import { firstValueFrom, Observable,map } from 'rxjs'
import {createEmpty} from 'ol/extent'
import { SignalKClient } from 'signalk-client-angular';

@Injectable({
  providedIn: 'root'
})
export class RadarService {

  constructor(private signalk: SignalKClient) {  }

  private radars: Map<string,SKRadar> = new Map<string,SKRadar>();


  public async Connect() {
    this.radars = await firstValueFrom(this.signalk.get("/plugins/radar-sk/v1/api/radars").pipe(map((re) => new Map<string,SKRadar>(Object.entries(re)))));
  }

  public GetRadars(): Map<string,SKRadar> {
    return this.radars;
  }

  public CreateRadarSource(radar: SKRadar, shipState: Observable<ShipState>): ImageSource {

    let range = 0
    let location: Coordinate = [0, 0]
    let rangeExtent = createEmpty();

    function UpdateExtent(location: Coordinate, range: number) {
      let center = fromLonLat(location)
      let extent = new Circle(center, range).getExtent()
      rangeExtent[0] = extent[0]
      rangeExtent[1] = extent[1]
      rangeExtent[2] = extent[2]
      rangeExtent[3] = extent[3]
    }

    UpdateExtent(location, range)

    const projection = new Projection({
      code: 'radar',
      units: 'm',
    });

    //

    const radarCanvas = document.createElement("canvas")
    radarCanvas.width = 2 * radar.maxSpokeLen
    radarCanvas.height = 2 * radar.maxSpokeLen

    const offscreenRdarcanvas = radarCanvas.transferControlToOffscreen()

    let radarSource = new ImageSource({
      projection: projection,
      loader: createLoader({
        imageExtent: rangeExtent, url: "", load: () => {
          return Promise.resolve(radarCanvas)
        }
      })
    })

    const worker = new Worker(new URL('./radar.worker', import.meta.url));
    worker.postMessage({ canvas: offscreenRdarcanvas, radar: radar }, [offscreenRdarcanvas]);
    worker.onmessage = (event) => {
      if (event.data.redraw) {
        radarSource.refresh()
      } else if (event.data.range) {
        range = event.data.range;
        UpdateExtent(location, range);
        radarSource.refresh()
      }
    }
    shipState.subscribe((state) => {
      location = state.location;
      UpdateExtent(location, range);
      worker.postMessage({ heading: state.heading });
      radarSource.refresh()
    })
    return radarSource
  }
}