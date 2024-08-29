import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import ImageSource from 'ol/source/Image'
import Projection from 'ol/proj/Projection'
import { circular } from 'ol/geom/Polygon'
import { createLoader } from 'ol/source/static'
import { Coordinate } from 'ol/coordinate';
import { SKRadar } from '../../../../skresources/resource-classes';
import { ShipState } from './ship-state.model'
import { firstValueFrom, Observable, map } from 'rxjs'
import { createEmpty } from 'ol/extent'
import { SignalKClient } from 'signalk-client-angular';

@Injectable({
  providedIn: 'root'
})
export class RadarService {

  hasWebgl: boolean = false

  constructor(private signalk: SignalKClient) {
    const gl = new OffscreenCanvas(10, 10).getContext('webgl2');
    if (gl !== null) {
      this.hasWebgl = true
      console.info("Radar using WebGL renderer")
    }
  }

  private radars: Map<string, SKRadar> = new Map<string, SKRadar>();
  private workers: Worker[] = []


  public async Connect() {
    this.radars = await firstValueFrom(this.signalk.get("/plugins/radar-sk/v1/api/radars").pipe(map((re) => new Map<string, SKRadar>(Object.entries(re)))));
  }

  public async Disconnect() {
    this.workers.forEach((w) => {
      w.terminate();
    })
    this.workers = []
  }

  public GetRadars(): Map<string, SKRadar> {
    return this.radars;
  }

  public CreateRadarSource(radar: SKRadar, shipState: Observable<ShipState>): ImageSource {

    let range = 0
    let location: Coordinate = [0, 0]
    let rangeExtent = createEmpty();

    function UpdateExtent(location: Coordinate, range: number) {

      let extent = circular(location, 25465).transform("EPSG:4326", "EPSG:3857").getExtent()
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

    var worker: Worker
    if (this.hasWebgl) {
      worker = new Worker(new URL('./radar-gl.worker', import.meta.url));
    } else {
      worker = new Worker(new URL('./radar.worker', import.meta.url));
    }

    this.workers.push(worker)
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
