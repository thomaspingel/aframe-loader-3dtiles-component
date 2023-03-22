<script>
    AFRAME.registerComponent('camera-logger', {

    schema: {
    timestamp: {type: 'int'},
    seconds: {type: 'int'} // default 0
},

    log : function () {
    var cameraEl = this.el.sceneEl.camera.el;
    var rotation = cameraEl.getAttribute('rotation');
    var worldPos = new THREE.Vector3();
    worldPos.setFromMatrixPosition(cameraEl.object3D.matrixWorld);
    console.log("Time: " + this.data.seconds
    + "; Camera Position: (" + worldPos.x.toFixed(2) + ", " + worldPos.y.toFixed(2) + ", " + worldPos.z.toFixed(2)
    + "); Camera Rotation: (" + rotation.x.toFixed(2) + ", " + rotation.y.toFixed(2) + ", " + rotation.z.toFixed(2) + ")");
},

    play: function () {
    this.data.timestamp = Date.now();
    this.log();
},

    tick: function () {
    if (Date.now() - this.data.timestamp > 1000) {
    this.data.timestamp += 1000;
    this.data.seconds += 1;
    this.log();
}
},
});
</script>