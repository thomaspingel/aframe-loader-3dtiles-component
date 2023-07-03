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

/**
 * Enums from original NYTimes code
 * Used for getting coloring inputs
 */
const POINT_CLOUD_COLORING = {
  white: PointCloudColoring.White,
  intensity: PointCloudColoring.Intensity,
  classification: PointCloudColoring.Classification,
  elevation: PointCloudColoring.Elevation,
  rgb: PointCloudColoring.RGB
};

/**
 * This is the entire component for the las loader
 */
AFRAME.registerComponent('lasloader', {
  schema: {
    url: { type: 'string' },
    downid: { type: 'string' },
    cameraEl: { type: 'selector' },
    renderDistance: { type: 'number', default: 50 }, //distance that the pointcloud is rendered initially from the camera
    lefthandEl: {type: 'string', default: null}, //id of left hand controller
    righthandEl: {type: 'string', default: null}, //id of right hand controller
    pointcloudColoring: { type: 'string', default: "white" },
    pointcloudElevationRange: { type: 'array', default: ['0', '400'] },
    classificationValue: {type: 'number', default: 6},
    pointSize: {type: 'number', default: 1}

  },
  init: async function () {
    this.rotation = this.el.components.rotation.attrValue;
    this.el.addEventListener('abuttondown', this.reset);
    this.el.addEventListener('click', this.reset);
    if(this.data.lefthandEl == null || this.data.righthandEl==null){
      console.log("ERROR: must specify lefthandid and righthandid in lasloader properties.");
    }
    this.righthand = document.querySelector(this.data.righthandEl);
    this.lefthand = document.querySelector(this.data.lefthandEl);
    //console.log(this.righthand.object3D.position);
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
    
    // model is the entire pointcloud data loaded from the LAZ file
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
    
    this.classification = model.attributes.classification.value;

    // if there are RGB values, save in this.rgb
    //    one long array of r, g, b, a for each point
    //    length 4n for n points
    //if(model.attributes.keys.includes("COLOR_0") ){
      this.rgb = model.attributes.COLOR_0.value;
    //} else {
      // if there is no rgb data, display as black
      //this.rgb = new Uint8Array(this.classification.length * 4).fill(0);
    //}

    // the colors to display the point cloud as depending on coloring selected
    this.colors = new Uint8Array(this.classification.length * 4).fill(0);

    // temp code to make the 30's normal
    // for(let i=0;i<this.classification.length;i++){
    //   this.classification[i] = this.classification[i] % 32;
    // }

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

    /**
     * Rotate the pointcloud based on rotation parameter in a-entity in degrees.
     * Uses three.js BufferGeometry rotation functions which take radians
     */
    
    console.log(this.rotation);    
    this.geometry.rotateX(this.rotation.x * (Math.PI/180));
    this.geometry.rotateY(this.rotation.y * (Math.PI/180));
    this.geometry.rotateZ(this.rotation.z * (Math.PI/180));

    //Function that takes care of download
    function downloadcsv(){
      let pos_arr = mesh_var.geometry.getAttribute('position').array
      let classification = mesh_var.geometry.getAttribute('classification').array
      let csv = []
      for (let i = 0; i < pos_arr.length; i = i + 3) {
        csv.push([pos_arr[i], pos_arr[i+1], pos_arr[i+2], classification[i/3]])
      }
      csv = arrayToCsv(csv)
      downloadBlob(csv, 'export.csv', 'text/csv;charset=utf-8;')
    }

    if(this.data.downid != null){
      // Set the downloadcsv function with the button
      var button = document.querySelector(this.data.downid);
      button.addEventListener('click', downloadcsv);
    }

    if(this.data.downid != null){
      var button = document.querySelector(this.data.downid);
      // console.log("button found 2 -")
      console.log(button)
      button.style.cursor = "pointer";
      button.addEventListener('click', downloadcsv);
    }


    if (THREE.Cache.enabled) {
      console.warn('3D Tiles loader cannot work with THREE.Cache, disabling.');
      THREE.Cache.enabled = false;
    }

    // Sleep 18sec? idk if this is necessary anymore
    //await new Promise(r => setTimeout(r, 18000));
    
    
   },

  /**
   * Changes classification of specified points
   * @param {*} indices array of point indices to change
   * @param {*} clns equal-length array of classification values to change above points to, in that order
   */ 
  classify: function(indices, clns){
    if(indices.length != clns.length){ //error-checking
      console.log("ERROR: tried to classify point array of length %d with values array of length %d", indices.length, clns.length);
    } else if(this.classification != null) {
      //console.log("classifying %d points",indices.length);
      for(let i=0; i<indices.length;i++){
        this.classification[indices[i]]=clns[i];
      }
      this.update(this.data);
    }
  },
  reset: function(evt){
    console.log('reset');
    evt.srcElement.object3D.position = new Vector3(this.el.components.position.attrValue.x, this.el.components.position.attrValue.y, this.el.components.position.attrValue.z);
    evt.srcElement.object3D.rotation = new Vector3(this.el.components.rotation.attrValue.x, this.el.components.rotation.attrValue.y, this.el.components.rotation.attrValue.z);
    evt.srcElement.object3D.scale = new Vector3(this.el.components.scale.attrValue.x, this.el.components.scale.attrValue.y, this.el.components.scale.attrValue.z);
  },
/**
 * This is where the geometry and mesh of the pointcloud are loaded and 
 * rendered.
 * @param {*} oldData 
 */
  update: async function (oldData) {
    console.log(this.el.components.position.attrValue);
    const center = this.el.components.position.attrValue;
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

      /*
      * The base object for the pointcloud geometry
      */
      this.geometry = new BufferGeometry();

      // loaded position values from the laz file
      // -- one large array of every x, y, z, x, y, z ...
      // -- ergo it has a length of 3n for n points
      this.positions = model.attributes.POSITION.value;

      // loaded classification values from the laz file
      // -- this is one large array of every classification value one by one
      // -- has a length of n for n points
      this.classification = model.attributes.classification.value;

      // an empty array to hold the rgb colors that will be displayed
      // -- if we are displaying classification we need to set the colors ourselves
      // -- one large array of r, g, b, a
      // -- so length of 4n for n points
      this.colors = new Uint8Array(this.classification.length * 4).fill(255);

      // if(model.attributes.keys.includes("COLOR_0") ){
      //   this.colors = model.attributes.COLOR_0.value;
      // } else {
        
      // }

      // translate the entire pointcloud so that the center of it is at 0,0,100 (good for viewing)
      // TODO: can accomplish this better using threejs geometry translate()
      for(let i =0; i< this.positions.length;i++){
        if(i%3==0){
          this.positions[i]-=this.center[0];
        }else if(i%3==1){
          this.positions[i]-=this.center[1];
        }else{
          this.positions[i]-=this.center[2];
        }
      }
    }


    // temp code to make the 30's normal
    // -- Sometimes the classification values load as like 38 instead of 6 and so on
    // -- so this makes sure they are correct.
    // -- TODO: we are still not sure exactly what is causing this, though
    //    it is probably something to do with bit lengths of the data,
    //    like if each value is 5 bits and it is reading 6, but this is
    //    unconfirmed and unsolved atm 
    for(let i=0;i<this.classification.length;i++){
      this.classification[i] = this.classification[i] % 32;
    }

    let pcoloring = this._resolvePointcloudColoring(this.data.pointCloudColoring);
    console.log(pcoloring);
    // switch (pcoloring) {
    //   case (POINT_CLOUD_COLORING.classification):
        
    //     break;
    //   case (POINT_CLOUD_COLORING.rgb):
    //     console.log("rgb");
    //     this.colors = this.rgb;
    //     console.log(this.rgb);
    //     console.log(this.colors);
    //     break;
    //   case (POINT_CLOUD_COLORING.white):
    //     this.colors = new Uint8Array(this.classification.length * 4).fill(255);
    //     break;
    //   case (POINT_CLOUD_COLORING.elevation):
    //     //TODO:
    //     console.log("ERROR: elevation coloring not implemented yet");
    //     break;
    //   case (POINT_CLOUD_COLORING.intensity):
    //     //TODO:
    //     console.log("ERROR: intensity coloring not implemented yet");
    //     break;
    //   default:
    //     console.log("ERROR: bad coloring given");
    // }
    
    if (pcoloring == POINT_CLOUD_COLORING.classification){
      console.log("coloring as CLASSIFICATION");
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
    } else if (pcoloring == POINT_CLOUD_COLORING.rgb) {
      console.log("coloring as RGB");
      console.log(this.rgb);
      if(this.rgb){
        this.colors = (this.rgb).map(function(x){return x});
      }
      
      console.log(this.colors);
    } else if (pcoloring == POINT_CLOUD_COLORING.white) {
      this.colors = new Uint8Array(this.classification.length * 4).fill(255);
    } else if (pcoloring == POINT_CLOUD_COLORING.elevation) {
      //TODO:
      console.log("ERROR: elevation coloring not implemented yet");
    } else if (pcoloring == POINT_CLOUD_COLORING.intensity){
      //TODO:
      console.log("ERROR: intensity coloring not implemented yet");
    }

    console.log(this.colors);

    // Create geometry to render the pointcloud
    // itemSize = 3 because there are 3 values (components) per vertex
    this.geometry.setAttribute( 'position', new THREE.BufferAttribute(this.positions,3) );
    this.geometry.setAttribute( 'color', new THREE.BufferAttribute(this.colors,4) );

    // Need this line because colors are UInt8Array and it defaults to expecting Float32Array
    this.geometry.attributes.color.normalized = true;

    this.geometry.setAttribute( 'classification', new THREE.BufferAttribute(this.classification,1) );

   
    // Create material.
    // vertexColors: true makes the colors be dictated by the color array we provide
    this.material = new THREE.PointsMaterial({size:this.data.pointSize, vertexColors: true});

    // Create mesh.
    this.mesh = new THREE.Points(this.geometry, this.material);

    // Set mesh on entity.
    this.el.setObject3D('mesh', this.mesh);
    //this.geometry.rotateY(Math.PI);
    
  },
  tick: function(time, timeDelta) {
    if(this.righthand != null && this.lefthand != null){
        // This is all handling the controller transformations
      if(this.r != null && this.geometry!=null){
        this.r1=new Vector3(this.righthand.object3D.position.x, this.righthand.object3D.position.y, this.righthand.object3D.position.z);
        this.l1=new Vector3(this.lefthand.object3D.position.x, this.lefthand.object3D.position.y, this.lefthand.object3D.position.z);
        
        // current distance vector between right and left hands
        this.distv1 = this.r1.clone().sub(this.l1);

        // find x, y, z angles between distance vectors (distv, distv1)
          // find 2d projections of each vector first
          this.distv1xy = new Vector3(this.distv1.x, this.distv1.y, 0).normalize();
          this.distv1xz = new Vector3(this.distv1.x, 0, this.distv1.z).normalize();
          this.distv1yz = new Vector3(0, this.distv1.y, this.distv1.z).normalize();
          this.distvxy = new Vector3(this.distv.x, this.distv.y, 0).normalize();
          this.distvxz = new Vector3(this.distv.x, 0, this.distv.z).normalize();
          this.distvyz = new Vector3(0, this.distv.y, this.distv.z).normalize();
          let rotScale = 0.3;
          // find angle components between the two vectors
          this.dx = rotScale*(Math.atan2(this.distv.y, this.distv.z)-Math.atan2(this.distv1.y, this.distv1.z));
          this.dy = rotScale*(Math.atan2(this.distv.x, this.distv.z)-Math.atan2(this.distv1.x, this.distv1.z));
          this.dz = rotScale*(Math.atan2(this.distv.x, this.distv.y)-Math.atan2(this.distv1.x, this.distv1.y));

          console.log(this.dx+" "+this.dy+" "+this.dz);
          //console.log(this.dx+" "+this.dy+" "+this.dz);

        this.dist1 = this.r1.clone().distanceTo(this.l1);
        this.dr = this.r1.clone().sub(this.r);
        this.dl = this.l1.clone().sub(this.l);
        this.ddist = this.dist1 - this.dist;
        this.midpoint1 = this.r1.clone().lerp(this.l1, 0.5);    
        this.dmidpoint = this.midpoint1.clone().sub(this.midpoint);
        this.da = this.a1 - this.a;
        let scale = 0.5;
        let distScale = 15;

        //this.el.object3D.scale.multiplyScalar((this.ddist*scale)+1);
        //console.log(this.ddist+" "+((this.ddist*scale)+1));
        
        //this.el.object3D.position.addScaledVector(this.dmidpoint, distScale); 
        // this.rot = this.dr.clone().cross(this.dl).multiplyScalar(this.da); 
        //this.el.object3D.rotation.x-=this.dx%(Math.PI/4);
        //this.el.object3D.rotation.y-=this.dy%(Math.PI/4);
        this.el.object3D.rotation.z+=this.dz;
        // console.log(this.rot);
      }
      this.r = new Vector3(this.righthand.object3D.position.x, this.righthand.object3D.position.y, this.righthand.object3D.position.z);
      this.l = new Vector3(this.lefthand.object3D.position.x, this.lefthand.object3D.position.y, this.lefthand.object3D.position.z);   
      this.a = this.r.angleTo(this.l);
      this.midpoint = this.r.clone().lerp(this.l, 0.5);
      this.dist = this.r.clone().distanceTo(this.l);

      // previous distance vector between right and left hands
      this.distv = this.r.clone().sub(this.l);

    }
   
  },
  _resolvePointcloudColoring () {
    //console.log(this.data.pointcloudColoring.replace("\'","").replace("\'",""));
    const pointCloudColoring = POINT_CLOUD_COLORING[this.data.pointcloudColoring.replace("\'","").replace("\'","")];
    if (!pointCloudColoring) {
      console.warn('Invalid value for point cloud coloring');
      return PointCloudColoring.White;
    } else {
      console.log(pointCloudColoring);
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
