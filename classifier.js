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
        //console.log(AFRAME);
        //console.log(document.querySelector("#pointcloud"));
            console.log('setting this.paint to false');
            this.paint = false;
        
        this.el.addEventListener('triggerdown', this.TriggerDown);
        this.el.addEventListener('triggerup', this.TriggerUp);
    },
    TriggerDown: function (evt) {
        evt.srcElement.components.trigger.paint = true;
        //console.log('trigger down');
    },
    TriggerUp: function (evt) {
        evt.srcElement.components.trigger.paint = false;
        //console.log('trigger up');
    },
    tick: function(time, timeDelta){
        //console.log(timeDelta);
        this.el.components.raycaster.refreshObjects();
        //console.log(this.el.components.raycaster.intersections);
        console.log(this.paint);
        if(this.paint){
            let ids = [];
            let clns = [];
            let intersections = this.el.components.raycaster.intersections;
            //this.raycaster_intersections = this.el.components.raycaster.intersections;
            //this.raycaster_els = this.els;
            for(let i=0; i<intersections.length; i++){
                //console.log(evt.detail.intersections[i].index, cls[evt.detail.intersections[i].index]);
                ids.push(intersections[i].index);
                clns.push(7);
            }
            //console.log(evt.detail.els);
            let ptcld = document.querySelector("#pointcloud");
            if(intersections.length > 0){
                //console.log(ptcld.components.lasloader);
                ptcld.components.lasloader.classify(ids,clns);
                //ptcld.components.lasloader.update(ptcld.components.lasloader.data);
            }    
        }
    }


});