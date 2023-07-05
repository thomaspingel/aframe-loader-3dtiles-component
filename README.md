## Component Schema
|Property|Description|Default Value|
|--------|-----------|-------------|
|url|url of the pointcloud file |[] |
|downid|element id of download button in scene |[] |
|cameraEl|element id of camera in scene |[] |
|renderDistance|how many units away from origin (z-axis) to place the center of the pointcloud |50 |
|pointcloudColoring|Which values the appearance of the point cloud should be based on. Currently supports `classification`, `rgb` |classification |



Most recent test version at [https://broad-ubiquitous-tabletop.glitch.me/?link=https://rawhitten.github.io/chunk.laz](https://broad-ubiquitous-tabletop.glitch.me/?link=https://rawhitten.github.io/chunk.laz).

TODO:
- Improve navigation, including orientation change and the ability to raise and lower the navigation surface. 
- Ability to treat the cloud as an object instead of an environment.
- Ability to toggle between RGB, intensity, and classification coloring.
- More tools to select/limit from/to classification classes.
- Change length of ray.
- Other methods of changing classification other than raycaster.
