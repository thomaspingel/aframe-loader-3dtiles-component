import { Loader3DTiles, LoaderLAS, PointCloudColoring } from '../three-loader-3dtiles/dist/three-loader-3dtiles.esm.js';
import { Vector3, RawShaderMaterial } from 'three';
import './textarea';

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

const POINT_CLOUD_COLORING = {
  white: PointCloudColoring.White,
  intensity: PointCloudColoring.Intensity,
  classification: PointCloudColoring.Classification,
  elevation: PointCloudColoring.Elevation,
  rgb: PointCloudColoring.RGB
};
AFRAME.registerComponent('loader-las', {
  schema: {
    url: { type: 'string' },
    cameraEl: { type: 'selector' },
    maximumSSE: { type: 'int', default: 16 },
    maximumMem: { type: 'int', default: 32 },
    distanceScale: { type: 'number', default: 1.0 },
    pointcloudColoring: { type: 'string', default: 'white' },
    pointcloudElevationRange: { type: 'array', default: ['0', '400'] },
    wireframe: { type: 'boolean', default: false },
    showStats: { type: 'boolean', default: false }
  },
  init: async function () {
    // this.renderer = new THREE.WebGLRenderer({canvas: this.el.canvas});
    // const size = new THREE.Vector2();
    // this.el.renderer.getSize(size);
    // this.renderer.setSize(size.x, size.y)
    console.log("aframe init");
    this.camera = this.data.cameraEl?.object3D.children[0] ?? document.querySelector('a-scene').camera;
    if (!this.camera) {
      throw new Error('3D Tiles: Please add an active camera or specify the target camera via the cameraEl property');
    }
    console.log(this);
    const sph = document.getElementById("sph");
    console.log(sph);
    const model = await this._initCloud();
    console.log(model);

    //this.el.setObject3D('tileset', model);
    let positions = model.attributes.POSITION;
    let colors = model.attributes.COLOR_0;
    let classification = model.attributes.classification;
    let alphas = model.attributes.intensity;
    console.log(positions);
    /**
     * geometry code from https://jsfiddle.net/h9fnx3sy/
     */
    var geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 4 ) );
    geometry.setAttribute( 'classification', new THREE.BufferAttribute(classification, 1 ) );
    //geometry.setAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
    geometry.setAttribute( 'alpha', new THREE.BufferAttribute( alphas, 1 ) );
    // const sumDisp = new Float32Array(sumDisplacement);
    // geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(sumDisp, 3 ));
    const material = new THREE.PointsMaterial( { color: 0xFF8888 , size: 10 } );
    var System = new THREE.Points( geometry, material);
    console.log(System);
    this.el.setObject3D('pointcloud', System);

    console.log(this.el.object3D);
    this.originalCamera = this.camera;
    

    this.el.sceneEl.addEventListener('camera-set-active', (e) => {
      // TODO: For some reason after closing the inspector this event is fired with an empty camera,
      // so revert to the original camera used.
      //
      // TODO: Does not provide the right Inspector perspective camera
      this.camera = e.detail.cameraEl.object3D.children[0] ?? this.originalCamera;
    });
    this.el.sceneEl.addEventListener('enter-vr', (e) => {
      this.originalCamera = this.camera;
      try {
        this.camera = this.el.sceneEl.renderer.xr.getCamera(this.camera);

        // FOV Code from https://github.com/mrdoob/three.js/issues/21869
        this.el.sceneEl.renderer.xr.getSession().requestAnimationFrame((time, frame) => {
          const ref = this.el.sceneEl.renderer.xr.getReferenceSpace();
          const pose = frame.getViewerPose(ref);
          if (pose) {
            const fovi = pose.views[0].projectionMatrix[5];
            this.camera.fov = Math.atan2(1, fovi) * 2 * 180 / Math.PI;
          }
        });
      } catch (e) {
        console.warn('Could not get VR camera');
      }
    });
    this.el.sceneEl.addEventListener('exit-vr', (e) => {
      this.camera = this.originalCamera;
    });

    if (this.data.showStats) {
      this.stats = this._initStats();
    }
    if (THREE.Cache.enabled) {
      console.warn('3D Tiles loader cannot work with THREE.Cache, disabling.');
      THREE.Cache.enabled = false;
    }
    await this._nextFrame();
    //this.runtime = runtime;
    //this.runtime.setElevationRange(this.data.pointcloudElevationRange.map(n => Number(n)));
  },
  update: async function (oldData) {
    if (oldData.url !== this.data.url) {
      if (this.runtime) {
        this.runtime.dispose();
        this.runtime = null;
      }
      const model = await this._initCloud();
      let positions = model.attributes.POSITION;
      //let positions = new Float32Array([0,0,0,0,1,0,1,0,1]);
      let colors = model.attributes.COLOR_0;
      let classification = model.attributes.classification;
      let alphas = model.attributes.intensity;
      console.log(positions);
      /**
       * geometry code from https://jsfiddle.net/h9fnx3sy/
       */
      var geometry = new THREE.InstancedBufferGeometry();
      geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
      geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 4 ) );
      geometry.setAttribute( 'classification', new THREE.BufferAttribute(classification, 1 ) );
      //geometry.setAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
      geometry.setAttribute( 'alpha', new THREE.BufferAttribute( alphas, 1 ) );
      // const sumDisp = new Float32Array(sumDisplacement);
      // geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(sumDisp, 3 ));
      const material = new THREE.PointsMaterial( { color: 0xFF8888, size: 10 } );
      var System = new THREE.Points( geometry, material);
      console.log(System);
      this.el.setObject3D('pointcloud', System);
      //this.el.setObject3D('pointcloud', model);
      await this._nextFrame();
      //this.runtime = runtime;
    } else if (this.runtime) {
      this.runtime.setPointCloudColoring(this._resolvePointcloudColoring(this.data.pointCloudColoring));
      // this.runtime.setWireframe(this.data.wireframe);
      // this.runtime.setViewDistanceScale(this.data.distanceScale);
      // this.runtime.setElevationRange(this.data.pointcloudElevationRange.map(n => Number(n)));
    }

    if (this.data.showStats && !this.stats) {
      this.stats = this._initStats();
    }
    if (!this.data.showStats && this.stats) {
      this.el.sceneEl.removeChild(this.stats);
      this.stats = null;
    }
  },
  tick: function (t, dt) {
    //console.log(this.camera.getAttribute('position'));
    if (this.runtime) {
      this.runtime.update(dt, this.el.sceneEl.renderer, this.camera);
      if (this.stats) {
        const worldPos = new Vector3();
        this.camera.getWorldPosition(worldPos);
        const stats = this.runtime.getStats();
        this.stats.setAttribute(
          'textarea',
          'text',
          Object.values(stats.stats).map(s => `${s.name}: ${s.count}`).join('\n')
        );
        const newPos = new Vector3();
        newPos.copy(worldPos);
        newPos.z -= 2;
        this.stats.setAttribute('position', newPos);
      }
    }
  },
  remove: function () {
    if (this.runtime) {
      this.runtime.dispose();
    }
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
    return LoaderLAS.load({
      url: this.data.url,
      renderer: this.el.sceneEl.renderer,
      options:{
        PointCloudColoring: pointCloudColoring
      }
    });
  },
  _initStats: function () {
    const stats = document.createElement('a-entity');
    this.el.sceneEl.appendChild(stats);
    stats.setAttribute('position', '-0.5 0 -1');
    stats.setAttribute('textarea', {
      cols: 30,
      rows: 15,
      text: '',
      color: 'white',
      disabledBackgroundColor: '#0c1e2c',
      disabled: true
    });
    return stats;
  },
  _nextFrame: async function () {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 0);
    });
  }
});

/**
 * 3D Tiles component for A-Frame.
 */

AFRAME.registerComponent('loader-3dtiles', {
  schema: {
    url: { type: 'string' },
    cameraEl: { type: 'selector' },
    maximumSSE: { type: 'int', default: 16 },
    maximumMem: { type: 'int', default: 32 },
    distanceScale: { type: 'number', default: 1.0 },
    pointcloudColoring: { type: 'string', default: 'white' },
    pointcloudElevationRange: { type: 'array', default: ['0', '400'] },
    wireframe: { type: 'boolean', default: false },
    showStats: { type: 'boolean', default: false },
    cesiumIONToken: { type: 'string' }
  },
  init: async function () {
    this.camera = this.data.cameraEl?.object3D.children[0] ?? document.querySelector('a-scene').camera;
    if (!this.camera) {
      throw new Error('3D Tiles: Please add an active camera or specify the target camera via the cameraEl property');
    }
    const { model, runtime } = await this._initTileset();
    this.el.setObject3D('tileset', model);

    this.originalCamera = this.camera;
    this.el.sceneEl.addEventListener('camera-set-active', (e) => {
      // TODO: For some reason after closing the inspector this event is fired with an empty camera,
      // so revert to the original camera used.
      //
      // TODO: Does not provide the right Inspector perspective camera
      this.camera = e.detail.cameraEl.object3D.children[0] ?? this.originalCamera;
    });
    this.el.sceneEl.addEventListener('enter-vr', (e) => {
      this.originalCamera = this.camera;
      try {
        this.camera = this.el.sceneEl.renderer.xr.getCamera(this.camera);

        // FOV Code from https://github.com/mrdoob/three.js/issues/21869
        this.el.sceneEl.renderer.xr.getSession().requestAnimationFrame((time, frame) => {
          const ref = this.el.sceneEl.renderer.xr.getReferenceSpace();
          const pose = frame.getViewerPose(ref);
          if (pose) {
            const fovi = pose.views[0].projectionMatrix[5];
            this.camera.fov = Math.atan2(1, fovi) * 2 * 180 / Math.PI;
          }
        });
      } catch (e) {
        console.warn('Could not get VR camera');
      }
    });
    this.el.sceneEl.addEventListener('exit-vr', (e) => {
      this.camera = this.originalCamera;
    });

    if (this.data.showStats) {
      this.stats = this._initStats();
    }
    if (THREE.Cache.enabled) {
      console.warn('3D Tiles loader cannot work with THREE.Cache, disabling.');
      THREE.Cache.enabled = false;
    }
    await this._nextFrame();
    this.runtime = runtime;
    this.runtime.setElevationRange(this.data.pointcloudElevationRange.map(n => Number(n)));
  },
  update: async function (oldData) {
    if (oldData.url !== this.data.url) {
      if (this.runtime) {
        this.runtime.dispose();
        this.runtime = null;
      }
      const { model, runtime } = await this._initTileset();
      this.el.setObject3D('tileset', model);
      await this._nextFrame();
      this.runtime = runtime;
    } else if (this.runtime) {
      this.runtime.setPointCloudColoring(this._resolvePointcloudColoring(this.data.pointCloudColoring));
      this.runtime.setWireframe(this.data.wireframe);
      this.runtime.setViewDistanceScale(this.data.distanceScale);
      this.runtime.setElevationRange(this.data.pointcloudElevationRange.map(n => Number(n)));
    }

    if (this.data.showStats && !this.stats) {
      this.stats = this._initStats();
    }
    if (!this.data.showStats && this.stats) {
      this.el.sceneEl.removeChild(this.stats);
      this.stats = null;
    }
  },
  tick: function (t, dt) {
    if (this.runtime) {
      this.runtime.update(dt, this.el.sceneEl.renderer, this.camera);
      if (this.stats) {
        const worldPos = new Vector3();
        this.camera.getWorldPosition(worldPos);
        const stats = this.runtime.getStats();
        this.stats.setAttribute(
          'textarea',
          'text',
          Object.values(stats.stats).map(s => `${s.name}: ${s.count}`).join('\n')
        );
        const newPos = new Vector3();
        newPos.copy(worldPos);
        newPos.z -= 2;
        this.stats.setAttribute('position', newPos);
      }
    }
  },
  remove: function () {
    if (this.runtime) {
      this.runtime.dispose();
    }
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
  _initTileset: async function () {
    const pointCloudColoring = this._resolvePointcloudColoring(this.data.pointcloudColoring);

    return Loader3DTiles.load({
      url: this.data.url,
      renderer: this.el.sceneEl.renderer,
      options: {
        dracoDecoderPath: 'https://unpkg.com/three@0.137.0/examples/js/libs/draco',
        basisTranscoderPath: 'https://unpkg.com/three@0.137.0/examples/js/libs/basis',
        cesiumIONToken: this.data.cesiumIONToken,
        maximumScreenSpaceError: this.data.maximumSSE,
        maximumMemoryUsage: this.data.maximumMem,
        viewDistanceScale: this.data.distanceScale,
        wireframe: this.data.wireframe,
        pointCloudColoring: pointCloudColoring,
        updateTransforms: true
      }
    });
  },
  _initStats: function () {
    const stats = document.createElement('a-entity');
    this.el.sceneEl.appendChild(stats);
    stats.setAttribute('position', '-0.5 0 -1');
    stats.setAttribute('textarea', {
      cols: 30,
      rows: 15,
      text: '',
      color: 'white',
      disabledBackgroundColor: '#0c1e2c',
      disabled: true
    });
    return stats;
  },
  _nextFrame: async function () {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 0);
    });
  }
});
