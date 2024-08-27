/// <reference lib="webworker" />

import { SKRadar } from '../../../../skresources/resource-classes';
import { RadarMessage } from './RadarMessage'
import { fromString } from 'ol/color'

let Heading = 0
const colors: Map<number, number[]> = new Map<number, number[]>()

addEventListener('message', (event) => {
  if (event.data.heading) {
    Heading = event.data.heading;
  }
  if (event.data.canvas) {
    const radarOnScreenCanvas = event.data.canvas
    const radarOnScreenContext = radarOnScreenCanvas.getContext("2d")
    const radarCanvas = new OffscreenCanvas(radarOnScreenCanvas.width, radarOnScreenCanvas.height)
    const radar = event.data.radar as SKRadar
    colors.clear();
    Object.keys(radar.legend).forEach((n) => {
      colors.set(parseInt(n), fromString(radar.legend[n].color))
    })
    const radarContext = radarCanvas.getContext("webgl2");
    const vertexBuffer = radarContext.createBuffer();
    const colorBuffer = radarContext.createBuffer();
    radarContext.viewport(0, 0, radarCanvas.width, radarCanvas.height);

    /*=========================Shaders========================*/

    // vertex shader source code
    var vertCode = 'attribute vec3 coordinates;' +
      'attribute vec3 color;' +
      'varying vec3 vColor;' +
      'void main(void) {' +
      ' gl_Position = vec4(coordinates, 1.0);' +
      'vColor = color;' +
      'gl_PointSize = 10.0;' +
      '}';

    // Create a vertex shader object
    var vertShader = radarContext.createShader(radarContext.VERTEX_SHADER);

    // Attach vertex shader source code
    radarContext.shaderSource(vertShader, vertCode);

    // Compile the vertex shader
    radarContext.compileShader(vertShader);
    if (!radarContext.getShaderParameter(vertShader, radarContext.COMPILE_STATUS))
      console.error(radarContext.getShaderInfoLog(vertShader));

    // fragment shader source code
    var fragCode = 'precision mediump float;' +
      'varying vec3 vColor;' +
      'void main(void) {' +
      'gl_FragColor = vec4(vColor, 1.);' +
      '}';

    // Create fragment shader object
    var fragShader = radarContext.createShader(radarContext.FRAGMENT_SHADER);

    // Attach fragment shader source code
    radarContext.shaderSource(fragShader, fragCode);

    // Compile the fragmentt shader
    radarContext.compileShader(fragShader);
    if (!radarContext.getShaderParameter(fragShader, radarContext.COMPILE_STATUS))
      console.error(radarContext.getShaderInfoLog(fragShader));

    // Create a shader program object to store
    // the combined shader program
    var shaderProgram = radarContext.createProgram();

    // Attach a vertex shader
    radarContext.attachShader(shaderProgram, vertShader);

    // Attach a fragment shader
    radarContext.attachShader(shaderProgram, fragShader);

    // Link both programs
    radarContext.linkProgram(shaderProgram);
    if ( !radarContext.getProgramParameter(shaderProgram, radarContext.LINK_STATUS) )
      console.error(radarContext.getProgramInfoLog(shaderProgram));

    // Use the combined shader program object
    radarContext.useProgram(shaderProgram);

    /*======== Associating shaders to buffer objects ========*/

    // Bind vertex buffer object
    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, vertexBuffer);

    // Get the attribute location
    var coordAttr = radarContext.getAttribLocation(shaderProgram, "coordinates");

    // Point an attribute to the currently bound VBO
    radarContext.vertexAttribPointer(coordAttr, 3, radarContext.FLOAT, false, 0, 0);

    // Enable the attribute
    radarContext.enableVertexAttribArray(coordAttr);

    // bind the color buffer
    radarContext.bindBuffer(radarContext.ARRAY_BUFFER, colorBuffer);

    // get the attribute location
    var colorAttr = radarContext.getAttribLocation(shaderProgram, "color");

    // point attribute to the color buffer object
    radarContext.vertexAttribPointer(colorAttr, 3, radarContext.FLOAT, false, 0, 0);

    // enable the color attribute
    radarContext.enableVertexAttribArray(colorAttr);

    radarContext.enable(radarContext.DEPTH_TEST);


    //build positions

    let x: number[] = []
    let y: number[] = []

    const cx = 0
    const cy = 0
    const maxRadius = 1
    const angleShift = 0.0// ((2 * Math.PI) / radar.spokes)/2
    const radiusShift = 0.0// (1 / radar.maxSpokeLen)/2

    for (let a = 0; a < radar.spokes; a++) {
      for (let r = 0; r < radar.maxSpokeLen; r++) {
        const angle = (a * ((2 * Math.PI) / radar.spokes)) + angleShift
        const radius = r * (maxRadius / radar.maxSpokeLen)
        const x1 = cx + ((radius + radiusShift) * Math.cos(angle))
        const y1 = cy + ((radius + radiusShift) * Math.sin(angle))
        x[a * radar.maxSpokeLen + r] = x1
        y[a * radar.maxSpokeLen + r] = -y1
      }
    }

    function ToBearing(angle: number): number {
      let h = Heading - 90
      if (h < 0) {
        h += 360
      }
      angle += Math.round((h) / (360 / radar.spokes)) // add heading
      angle = angle % radar.spokes
      return angle
    }


    function connect() {
      const socket = new WebSocket(radar.streamUrl);
      socket.binaryType = "arraybuffer"

      let lastRange = 0

      socket.onmessage = (event) => {
        let message = RadarMessage.deserialize(event.data)
        if (message.spokes.length > 0) {
          if (message.spokes[0].has_time) {
            let shift = Date.now() - message.spokes[0].time
            if (shift > 800) {
              // drop old packets
              return
            }
          }
        }

        // let clearangle1 = ToBearing(message.spokes[0].angle % radar.spokes)
        // let clearangle2 = ToBearing(message.spokes[message.spokes.length-1].angle % radar.spokes)
        // radarContext.save()
        // radarContext.beginPath()
        // radarContext.strokeStyle = "#00000000"
        // radarContext.moveTo(x[0], y[0])
        // radarContext.lineTo(x[clearangle1 * radar.maxSpokeLen + radar.maxSpokeLen - 1], y[clearangle1 * radar.maxSpokeLen + radar.maxSpokeLen - 1])
        // radarContext.lineTo(x[clearangle2 * radar.maxSpokeLen + radar.maxSpokeLen - 1], y[clearangle2 * radar.maxSpokeLen + radar.maxSpokeLen - 1])
        // radarContext.closePath()
        // radarContext.stroke()
        // radarContext.clip()
        // radarContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        // radarContext.restore()

        const vertices = []
        const verticeColors = []

        for (let si = 0; si < message.spokes.length; si++) {
          let spoke = message.spokes[si]

          if (lastRange != spoke.range) {
            radarContext.clearColor(1.0, 1.0, 1.0, 0.0);
            lastRange = spoke.range
            postMessage({ range: spoke.range })
          }

          let spokeBearing = ToBearing(spoke.angle)
          if (spoke.has_bearing) {
            spokeBearing = spoke.bearing
          }

          // draw current spoke

          for (let i = 0; i < spoke.data.length; i++) {
            vertices.push(x[spokeBearing * radar.maxSpokeLen + i])
            vertices.push(y[spokeBearing * radar.maxSpokeLen + i])
            vertices.push(0.0)
            let color = colors.get(spoke.data[i])
            if (color) {
              verticeColors.push(color[0]/255)
              verticeColors.push(color[1]/255)
              verticeColors.push(color[2]/255)
              //verticeColors.push(color[3])
            } else {
              verticeColors.push(1.0)
              verticeColors.push(1.0)
              verticeColors.push(1.0)
              //verticeColors.push(0)
            }
          }

        }
        // Draw buffer

        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, vertexBuffer);
        radarContext.bufferData(radarContext.ARRAY_BUFFER, new Float32Array(vertices), radarContext.STATIC_DRAW);
        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, colorBuffer);
        radarContext.bufferData(radarContext.ARRAY_BUFFER, new Float32Array(verticeColors), radarContext.STATIC_DRAW);
        radarContext.bindBuffer(radarContext.ARRAY_BUFFER, null);
        radarContext.drawArrays(radarContext.POINTS, 0, vertices.length / 3);

        radarOnScreenContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        radarOnScreenContext.drawImage(radarCanvas, 0, 0)
        postMessage({ redraw: true })
      }

      socket.onopen = (event) => {
        console.log(`Radar ${radar.name} connected`)
      }

      socket.onclose = (event) => {
        console.log(`Radar ${radar.name} disconnected retry in 3 seconds`);
        //radarContext.clearColor(1.0, 1.0, 1.0, 0.0);
        radarOnScreenContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);

        setTimeout(function () {
          connect();
        }, 3000);
      }

      socket.onerror = (event) => {
        //radarContext.clearColor(1.0, 1.0, 1.0, 0.0);
        radarOnScreenContext.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        postMessage({ redraw: true })
        console.error(`Error on radar ${radar.name} stopping`)
      }
    }
    connect();
  }
});
