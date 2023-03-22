import { Loader3DTiles, LoaderLAS, PointCloudColoring } from '../three-loader-3dtiles/dist/three-loader-3dtiles.esm.js';
import { Vector3,  BufferGeometry } from 'three';
import './textarea';

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

/** Convert a 2D array into a CSV string
 */
function arrayToCsv(data){
  return data.map(row =>
      row
          .map(String)  // convert every value to String
          .map(v => v.replaceAll('"', '""'))  // escape double colons
          .map(v => `"${v}"`)  // quote it
          .join(',')  // comma-separated
  ).join('\r\n');  // rows starting on new lines
}

/** Download contents as a file
 * Source: https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
 */
function downloadBlob(content, filename, contentType) {
  // Create a blob
  var blob = new Blob([content], { type: contentType });
  var url = URL.createObjectURL(blob);

  // Create a link to download it
  var pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', filename);
  pom.click();
}



const POINT_CLOUD_COLORING = {
  white: PointCloudColoring.White,
  intensity: PointCloudColoring.Intensity,
  classification: PointCloudColoring.Classification,
  elevation: PointCloudColoring.Elevation,
  rgb: PointCloudColoring.RGB
};
AFRAME.registerComponent('lasloader', {
  schema: {
    url: { type: 'string' },
    downid: { type: 'string' },
    cameraEl: { type: 'selector' },
    renderDistance: { type: 'number', default: 50 },
    pointcloudColoring: { type: 'string', default: 'white' },
    pointcloudElevationRange: { type: 'array', default: ['0', '400'] }
  },
  init: async function () {

    /**
     * Standard Classification Colors
     * source: https://www.researchgate.net/figure/Colors-used-to-represent-LAS-classification-codes-in-PDQ_fig2_283413311
     */
     this.classificationColors = [
      [100,100,100], //0: Created, never classified
      [200,200,200], //1: Unclassified
      [128, 71, 10], //2: Ground
      [22, 117, 24], //3: Low vegetation
      [33, 166, 36], //4: Medium vegetation
      [50, 237, 54], //5: High vegetation
      [58, 158,189], //6: Building
      [255,  0,  0], //7: Low point (noise)
      [255,255,  0], //8: Model key-point (mass point)
      [  0,  0,255], //9: Water
      [237, 143, 2], //10: Reserved
      [237, 143, 2], //11: Reserved
      [255,  0,255], //12: Overlap points
      [237, 143, 2], //13+: Reserved
    ]

    // distance in z-coordinate from origin to render the pointcloud
    this.renderDistance = this.data.renderDistance;
    
    let model = await this._initCloud();
    console.log(model);

    // Create geometry.

    // calculate center coordinate of bounding box
    // in order to translate all points to origin
    this.center = [
      (model.header.boundingBox[0][0]+model.header.boundingBox[1][0])/2,
      (model.header.boundingBox[0][1]+model.header.boundingBox[1][1])/2,
      (model.header.boundingBox[0][2]+model.header.boundingBox[1][2])/2,
    ]
    console.log(this.center);

    this.geometry = new BufferGeometry();

    this.positions = model.attributes.POSITION.value;
    // if(model.attributes.keys.includes("COLOR_0") ){
    //   this.colors = model.attributes.COLOR_0.value;
    // } else {
      
    // }
    this.classification = model.attributes.classification.value;
    this.colors = new Uint8Array(this.classification.length * 4).fill(0);

    // translate the entire pointcloud so that the center of it is at 0,0,100 (good for viewing)
    for(let i =0; i< this.positions.length;i++){
      if(i%3==0){
        this.positions[i]-=this.center[0];
      }else if(i%3==1){
        this.positions[i]-=this.center[1];
      }else{
        this.positions[i]-=this.center[2]+this.renderDistance;
      }
    }

    // Set colors to classification based on standard color scheme
    for(let i = 0; i < this.classification.length; i++){
      if(this.classification[i] >13){
        //console.log(i+" "+ this.classification[i]);
        this.colors[i*4] = 237;
        this.colors[(i*4) + 1] = 143;
        this.colors[(i*4) + 2] = 2;
      } else {
        this.colors[i*4] = this.classificationColors[(this.classification)[i]][0];
        this.colors[(i*4) + 1] = this.classificationColors[this.classification[i]][1];
        this.colors[(i*4) + 2] = this.classificationColors[this.classification[i]][2];
      }
    }

    // itemSize = 3 because there are 3 values (components) per vertex
    this.geometry.setAttribute( 'position', new THREE.BufferAttribute(this.positions,3) );
    this.geometry.setAttribute( 'color', new THREE.BufferAttribute(this.colors,4) );
    this.geometry.attributes.color.normalized = true;
    this.geometry.setAttribute( 'classification', new THREE.BufferAttribute(this.classification,1) );
    // Create material.
    this.material = new THREE.PointsMaterial({size:1, vertexColors: true});

    // Create mesh.
    this.mesh = new THREE.Points(this.geometry, this.material);
    let mesh_var = this;
    // Set mesh on entity.
    this.el.setObject3D('mesh', this.mesh);
    this.el.sceneEl.addEventListener('loaded', function(){
      console.log("loaded");
      console.log(this.classification);
    });

    let downloadcsv = function()
    {
      // console.log(mesh_var.mesh)
      // console.log(mesh_var.el)
      let pos_arr = mesh_var.geometry.getAttribute('position').array
      // let col_arr = mesh_var.geometry.getAttribute('color').array
      let classification = mesh_var.geometry.getAttribute('classification').array

      let csv = []
      for (let i = 0; i < pos_arr.length; i = i + 3) {
        csv.push([pos_arr[i], pos_arr[i+1], pos_arr[i+2], classification[i/3]])
      }
      csv = arrayToCsv(csv)
      downloadBlob(csv, 'export.csv', 'text/csv;charset=utf-8;')

    }

    var button = document.querySelector(this.data.downid);
    // console.log("button found 2 -")
    console.log(button)
    button.style.cursor = "pointer";
    button.addEventListener('click', downloadcsv);

    if (THREE.Cache.enabled) {
      console.warn('3D Tiles loader cannot work with THREE.Cache, disabling.');
      THREE.Cache.enabled = false;
    }

    // Sleep 18sec? idk if this is necessary anymore
    await new Promise(r => setTimeout(r, 18000));
   },

  /**
   * Changes classification of specified points
   * @param {*} indices array of point indices to change
   * @param {*} clns equal-length array of classification values to change above points to, in that order
   */ 
  classify: function(indices, clns){
    if(indices.length != clns.length){ //error-checking
      console.log("ERROR: tried to classify point array of length %d with values array of length %d", indices.length, clns.length);
    } else {
      for(let i=0; i<indices.length;i++){
        this.classification[indices[i]]=clns[i];
      }
      this.update(this.data);
    }
  },
  update: async function (oldData) {

    if (oldData.url !== this.data.url) {
      console.log("reloading pointcloud to new url", this.data.url);
      if (this.runtime) {
        this.runtime.dispose();
        this.runtime = null;
      }
      let model = await this._initCloud();
      // Create geometry.

      // calculate center coordinate of bounding box
      // in order to translate all points to origin
      this.center = [
        (model.header.boundingBox[0][0]+model.header.boundingBox[1][0])/2,
        (model.header.boundingBox[0][1]+model.header.boundingBox[1][1])/2,
        (model.header.boundingBox[0][2]+model.header.boundingBox[1][2])/2,
      ]
      console.log(this.center);

      this.geometry = new BufferGeometry();

      this.positions = model.attributes.POSITION.value;

      console.log(model.attributes.keys);
      // if(model.attributes.hasAttribute("COLOR_0") ){
      //   this.colors = model.attributes.COLOR_0.value;
      // }
      this.classification = model.attributes.classification.value;
      this.colors = new Uint8Array(this.classification.length * 4).fill(255);


      // translate the entire pointcloud so that the center of it is at 0,0,100 (good for viewing)
      for(let i =0; i< this.positions.length;i++){
        if(i%3==0){
          this.positions[i]-=this.center[0];
        }else if(i%3==1){
          this.positions[i]-=this.center[1];
        }else{

          this.positions[i]-=this.center[2]+this.renderDistance;

        }
      }
    }

    //console.log("update");
    //console.log(this.classification);

    // Create geometry.
    this.geometry = new BufferGeometry();

    // temp code to make the 30's normal
    for(let i=0;i<this.classification.length;i++){
      this.classification[i] = this.classification[i] % 32;
    }

    // Set colors to classification based on standard color scheme defined in this.classificationColors
    for(let i = 0; i < this.classification.length; i++){
      if(this.classification[i] >13){
        //console.log(i+" "+ this.classification[i]);
        this.colors[i*4] = 237;
        this.colors[(i*4) + 1] = 143;
        this.colors[(i*4) + 2] = 2;
      } else {
        this.colors[i*4] = this.classificationColors[(this.classification)[i]][0];
        this.colors[(i*4) + 1] = this.classificationColors[this.classification[i]][1];
        this.colors[(i*4) + 2] = this.classificationColors[this.classification[i]][2];
      }
    }

    // Create geometry to render the pointcloud
    // itemSize = 3 because there are 3 values (components) per vertex
    this.geometry.setAttribute( 'position', new THREE.BufferAttribute(this.positions,3) );
    this.geometry.setAttribute( 'color', new THREE.BufferAttribute(this.colors,4) );

    // Need this line because colors are UInt8Array and it defaults to expecting Float32Array
    this.geometry.attributes.color.normalized = true;

    this.geometry.setAttribute( 'classification', new THREE.BufferAttribute(this.classification,1) );

    // Create material.
    this.material = new THREE.PointsMaterial({size:1, vertexColors: true});

    // Create mesh.
    this.mesh = new THREE.Points(this.geometry, this.material);

    // Set mesh on entity.
    this.el.setObject3D('mesh', this.mesh);
  },
  _resolvePointcloudColoring () {
    const pointCloudColoring = POINT_CLOUD_COLORING[this.data.pointcloudColoring];
    if (!pointCloudColoring) {
      console.warn('Invalid value for point cloud coloring');
      return PointCloudColoring.White;
    } else {
      return pointCloudColoring;
    }
  },
  _initCloud: async function () {
    const pointCloudColoring = this._resolvePointcloudColoring(this.data.pointcloudColoring);
    console.log("initializing pointcloud");
    console.log(this.data.pointcloudColoring)
    return LoaderLAS.load({
      url: this.data.url,
      renderer: this.el.sceneEl.renderer,
      options:{
        PointCloudColoring: pointCloudColoring
      }
    });
  }
});




// /**
//  * ORIGINAL: We aren't using this!
//  * 3D Tiles component for A-Frame.
//  */

// AFRAME.registerComponent('loader-3dtiles', {
//   schema: {
//     url: { type: 'string' },
//     cameraEl: { type: 'selector' },
//     maximumSSE: { type: 'int', default: 16 },
//     maximumMem: { type: 'int', default: 32 },
//     distanceScale: { type: 'number', default: 1.0 },
//     pointcloudColoring: { type: 'string', default: 'white' },
//     pointcloudElevationRange: { type: 'array', default: ['0', '400'] },
//     wireframe: { type: 'boolean', default: false },
//     showStats: { type: 'boolean', default: false },
//     cesiumIONToken: { type: 'string' }
//   },
//   init: async function () {
//     this.camera = this.data.cameraEl?.object3D.children[0] ?? document.querySelector('a-scene').camera;
//     if (!this.camera) {
//       throw new Error('3D Tiles: Please add an active camera or specify the target camera via the cameraEl property');
//     }
//     const { model, runtime } = await this._initTileset();
//     this.el.setObject3D('tileset', model);

//     this.originalCamera = this.camera;
//     this.el.sceneEl.addEventListener('camera-set-active', (e) => {
//       // TODO: For some reason after closing the inspector this event is fired with an empty camera,
//       // so revert to the original camera used.
//       //
//       // TODO: Does not provide the right Inspector perspective camera
//       this.camera = e.detail.cameraEl.object3D.children[0] ?? this.originalCamera;
//     });
//     this.el.sceneEl.addEventListener('enter-vr', (e) => {
//       this.originalCamera = this.camera;
//       try {
//         this.camera = this.el.sceneEl.renderer.xr.getCamera(this.camera);

//         // FOV Code from https://github.com/mrdoob/three.js/issues/21869
//         this.el.sceneEl.renderer.xr.getSession().requestAnimationFrame((time, frame) => {
//           const ref = this.el.sceneEl.renderer.xr.getReferenceSpace();
//           const pose = frame.getViewerPose(ref);
//           if (pose) {
//             const fovi = pose.views[0].projectionMatrix[5];
//             this.camera.fov = Math.atan2(1, fovi) * 2 * 180 / Math.PI;
//           }
//         });
//       } catch (e) {
//         console.warn('Could not get VR camera');
//       }
//     });
//     this.el.sceneEl.addEventListener('exit-vr', (e) => {
//       this.camera = this.originalCamera;
//     });

//     if (this.data.showStats) {
//       this.stats = this._initStats();
//     }
//     if (THREE.Cache.enabled) {
//       console.warn('3D Tiles loader cannot work with THREE.Cache, disabling.');
//       THREE.Cache.enabled = false;
//     }
//     await this._nextFrame();
//     this.runtime = runtime;
//     this.runtime.setElevationRange(this.data.pointcloudElevationRange.map(n => Number(n)));
//   },
//   update: async function (oldData) {
//     if (oldData.url !== this.data.url) {
//       if (this.runtime) {
//         this.runtime.dispose();
//         this.runtime = null;
//       }
//       const { model, runtime } = await this._initTileset();
//       this.el.setObject3D('tileset', model);
//       await this._nextFrame();
//       this.runtime = runtime;
//     } else if (this.runtime) {
//       this.runtime.setPointCloudColoring(this._resolvePointcloudColoring(this.data.pointCloudColoring));
//       this.runtime.setWireframe(this.data.wireframe);
//       this.runtime.setViewDistanceScale(this.data.distanceScale);
//       this.runtime.setElevationRange(this.data.pointcloudElevationRange.map(n => Number(n)));
//     }

//     if (this.data.showStats && !this.stats) {
//       this.stats = this._initStats();
//     }
//     if (!this.data.showStats && this.stats) {
//       this.el.sceneEl.removeChild(this.stats);
//       this.stats = null;
//     }
//   },
//   tick: function (t, dt) {
//     if (this.runtime) {
//       this.runtime.update(dt, this.el.sceneEl.renderer, this.camera);
//       if (this.stats) {
//         const worldPos = new Vector3();
//         this.camera.getWorldPosition(worldPos);
//         const stats = this.runtime.getStats();
//         this.stats.setAttribute(
//           'textarea',
//           'text',
//           Object.values(stats.stats).map(s => `${s.name}: ${s.count}`).join('\n')
//         );
//         const newPos = new Vector3();
//         newPos.copy(worldPos);
//         newPos.z -= 2;
//         this.stats.setAttribute('position', newPos);
//       }
//     }
//   },
//   remove: function () {
//     if (this.runtime) {
//       this.runtime.dispose();
//     }
//   },
//   _resolvePointcloudColoring () {
//     const pointCloudColoring = POINT_CLOUD_COLORING[this.data.pointcloudColoring];
//     if (!pointCloudColoring) {
//       console.warn('Invalid value for point cloud coloring');
//       return PointCloudColoring.White;
//     } else {
//       return pointCloudColoring;
//     }
//   },
//   _initTileset: async function () {
//     const pointCloudColoring = this._resolvePointcloudColoring(this.data.pointcloudColoring);

//     return Loader3DTiles.load({
//       url: this.data.url,
//       renderer: this.el.sceneEl.renderer,
//       options: {
//         dracoDecoderPath: 'https://unpkg.com/three@0.137.0/examples/js/libs/draco',
//         basisTranscoderPath: 'https://unpkg.com/three@0.137.0/examples/js/libs/basis',
//         cesiumIONToken: this.data.cesiumIONToken,
//         maximumScreenSpaceError: this.data.maximumSSE,
//         maximumMemoryUsage: this.data.maximumMem,
//         viewDistanceScale: this.data.distanceScale,
//         wireframe: this.data.wireframe,
//         pointCloudColoring: pointCloudColoring,
//         updateTransforms: true
//       }
//     });
//   },
//   _initStats: function () {
//     const stats = document.createElement('a-entity');
//     this.el.sceneEl.appendChild(stats);
//     stats.setAttribute('position', '-0.5 0 -1');
//     stats.setAttribute('textarea', {
//       cols: 30,
//       rows: 15,
//       text: '',
//       color: 'white',
//       disabledBackgroundColor: '#0c1e2c',
//       disabled: true
//     });
//     return stats;
//   },
//   _nextFrame: async function () {
//     return new Promise((resolve, reject) => {
//       setTimeout(() => {
//         resolve();
//       }, 0);
//     });
//   }
// });
