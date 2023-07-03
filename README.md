# aframe-loader-laz-component
This is a LAZ/LAS point cloud loader for AframeVR, built off of the NYTimes R&D department's [aframe-loader-3dtiles-component](https://github.com/nytimes/aframe-loader-3dtiles-component) and developed by the [Near Earth Imaging Lab](https://www.nearearthimaginglab.org/) at Virginia Tech.
## Example Scene
IMPORTANT: Download `aframe-loader-laz-component.min.js` located in the `dist` folder and place it in the root directory

### Without controllers
```
<html>
  <head>
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <script src="./aframe-loader-laz-component.min.js"></script>
  </head>
  <body>
    <a-scene>
      <a-entity
        id="pointcloud"
        position="0 0 -50"
        rotation="270 0 0"
        scale="1 1 1"
        lasloader="
          url: https://rawhitten.github.io/chunk.laz;
          pointcloudColoring: classification; 
        "
      >
      </a-entity>
    </a-scene>
  </body>
</html>
```
### With Controllers
```
<html>
  <head>
    <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
    <script src="./aframe-loader-laz-component.js"></script>
  </head>
  <body>
    <a-scene>
      <a-entity
        id="pointcloud"
        position="0 0 -50"
        rotation="270 0 0"
        scale="1 1 1"
        classifier
        lasloader="
          url: https://rawhitten.github.io/chunk.laz;
          lefthandEl: #lefthand;
          righthandEl: #righthand;
          pointcloudColoring: classification; 
        "
      >
      </a-entity>
      <a-entity
        oculus-touch-controls="hand: right"
        thumbstick-logging
        id="righthand"
        data-right="ray"
        cursor
        raycaster="showLine: true; far: 2; lineColor: red; objects:#pointcloud; direction:0 -0.5 -1"
      >
      </a-entity>
      <a-entity
        oculus-touch-controls="hand: left"
        thumbstick-logging
        id="lefthand"
        data-left="ray"
        raycaster="showLine: true; far: 2; lineColor: blue; objects:#pointcloud; direction:0 -0.8 -1"
        cursor
      >
      </a-entity>
    </a-scene>
  </body>
</html>
```

## Component Schema
|Property|Description|Default Value|
|--------|-----------|-------------|
|url|url of the pointcloud file |[] |
|downid|element id of download button in scene |[] |
|cameraEl|element id of camera in scene |[] |
|lefthandEl|If controllers are in the scene, use this to attach the left hand's id tag |null |
|righhandEl|If controllers are in the scene, use this to attach the right hand's id tag |null |
|pointcloudColoring|Which values the appearance of the point cloud should be based on. Currently supports `classification`, `rgb` |classification |
|pointSize| Starting size, in pixels, of the point cloud's points| 1|

## Controls
### Manipulating the point cloud
If `lefthandEl` and `righthandEl` point to valid controller objects in VR mode, use the grip button on either controller to manipulate the point cloud in the scene. Move the controllers towards or away from each other to control scale/zoom, twist the controllers (like you were rotating a plate on a table) to rotate the point cloud on its y axis, and move the controllers in the same direction (like pulling a tablecloth) to translate the point cloud in space.

## Dev Notes
Most recent test version at [https://broad-ubiquitous-tabletop.glitch.me/?url=https://rawhitten.github.io/chunk.laz](https://broad-ubiquitous-tabletop.glitch.me/?url=https://rawhitten.github.io/chunk.laz).

### How to set up the environment
1. `git clone https://github.com/thomaspingel/aframe-loader-laz-component.git`
2. `cd aframe-loader-laz-component`
3. `npm install`
4. `cd ..`
5. `git clone https://github.com/thomaspingel/three-loader-3dtiles.git`
6. `cd three-loader-3dtiles`
7. `npm install`

### Anatomy of the component
The main working file is `aframe-loader-laz-component\index.js`. This one contains the component that puts the geometry and mesh together and renders it to the scene. To compile this component, run `npm run dist` from the root of this component, and the resulting file will be found in `aframe-loader-laz-component\dist\aframe-loader-laz-component.min.js`. Note: for development purposes, I like using the non-minified version (aframe-loader-laz-component.js) instead to get more helpful error messages. Compile only the non-min version (much faster) with `npm run dist:max`.

Under the hood, the LAZ file itself is loaded by a separate THREE.js LoaderLAS component, [three-loader-3dtiles](https://github.com/thomaspingel/three-loader-3dtiles), which we never changed the name of. You'll want to clone this repository as well, ideally in the same directory as the aframe component is cloned. The main file to work on in here is `three-loader-3dtiles/src/index.ts`. This one handles running the loaders.gl LASLoader and returns an object with the point cloud's data to the aframe component.
To compile this component into the `three-loader-3dtiles/dist/three-loader-3dtiles.esm.js` that the aframe component requires, run `npm run build` from the root of `three-loader-3dtiles`.

TODO:
- Improve navigation, including orientation change and the ability to raise and lower the navigation surface. 
- Ability to treat the cloud as an object instead of an environment.
- Ability to toggle between RGB, intensity, and classification coloring.
- More tools to select/limit from/to classification classes.
- Change length of ray.
- Other methods of changing classification other than raycaster.
