/**
 * Attempt to create custom THREEjs raycaster component to use with points
 */
AFRAME.registerComponent('pointraycaster', {
    init: function () {
        this.raycaster = this.el.components.raycaster;
        this.pointer = new THREE.Vector2();
        console.log("pointraycaster init");
        console.log(this.raycaster);
        window.addEventListener( 'pointermove', onPointerMove );
    
        window.requestAnimationFrame(render);
    },
    onPointerMove: function( event ) {
        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components
    
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    },
    render: function() {
        // update the picking ray with the camera and pointer position
        this.raycaster.setFromCamera( pointer, camera );
    
        // calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects( scene.children );
        console.log(intersects);
        for ( let i = 0; i < intersects.length; i ++ ) {
            intersects[ i ].object.material.color.set( 0xff0000 );
        }
    
        renderer.render( scene, camera );
    }
});

AFRAME.registerComponent('trigger', {
    dependencies: ['raycaster'],
    init: function () {
        this.el.addEventListener('triggerdown', this.TriggerDown);
        this.el.addEventListener('raycaster-intersection', function (evt) {
            //console.log('Player hit something!', evt.detail.els[0].components.lasloader.classification);
            //let cls = evt.detail.els[0].components.lasloader.classification;
            //console.log(evt.detail)

            //add point indices and classifications to array for changing
            let ids = [];
            let clns = [];
            let intersections = evt.detail.intersections;
            this.raycaster_intersections = evt.detail.intersections;
            this.raycaster_els = evt.detail.els;
            for(let i=0; i<intersections.length; i++){
                //console.log(evt.detail.intersections[i].index, cls[evt.detail.intersections[i].index]);
                ids.push(intersections[i].index);
                clns.push(7);
            }
            //console.log(evt.detail.els);
            if( evt!=null && evt.detail.els.length > 0 && evt.detail.els[0].components.lasloader != null){
                evt.detail.els[0].components.lasloader.classify(ids,clns);
               // evt.detail.els[0].components.lasloader.update(evt.detail.els[0].components.lasloader.data);
            }
            console.log(evt.detail);
           });
      },
      TriggerDown: function (evt) {
        //console.log(evt);
        //console.log(evt.srcElement);
        let intersections = this.raycaster_intersections;
        for(let i=0; i<intersections.length; i++){
            //console.log(evt.detail.intersections[i].index, cls[evt.detail.intersections[i].index]);
            ids.push(intersections[i].index);
            clns.push(7);
        }
        (this.raycaster_els)[0].components.lasloader.classify(ids,clns);
      }

});