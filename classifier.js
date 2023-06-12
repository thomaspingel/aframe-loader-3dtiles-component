
AFRAME.registerComponent('classify', {
    dependencies: ['raycaster'],
    init: function () {
        //console.log(AFRAME);
        //console.log(document.querySelector("#pointcloud"));
        if(this.paint == null){
            console.log('setting this.paint to false');
            this.paint = false;
        } 
        this.el.addEventListener('triggerdown', this.TriggerDown);
        this.el.addEventListener('triggerup', this.TriggerUp);
    },
    TriggerUp: function (evt) {
        evt.srcElement.components.classify.paint = false;
        console.log('trigger up');
    },
    TriggerDown: function (evt) {
        evt.srcElement.components.classify.paint = true;
        console.log('trigger down');
    },
    tick: function(time, timeDelta){
        //console.log(timeDelta);
        //console.log(this.el.object3D.position);
        
        this.el.components.raycaster.refreshObjects();
        //console.log(this.el.components.raycaster.intersections);
        //console.log(this.paint);
        //console.log("paint");
        if(this.paint){
            
          console.log('painting');
            let ids = [];
            let clns = [];
            let intersections = this.el.components.raycaster.intersections;
            
            let ptcld = document.querySelector("#pointcloud");
            // console.log(ptcld.object3D.rotation);
            //ptcld.object3D.rotation.z+=0.01;
            //this.raycaster_intersections = this.el.components.raycaster.intersections;
            //this.raycaster_els = this.els;
            for(let i=0; i<intersections.length; i++){
                console.log(intersections[i].index, clns[intersections[i].index]);
                ids.push(intersections[i].index);
                console.log(ptcld.components.lasloader.data.classificationValue);
                clns.push(ptcld.components.lasloader.data.classificationValue);
            }
            //console.log(evt.detail.els);
            
            if(intersections.length > 0){
                //console.log(ptcld.components.lasloader);
                ptcld.components.lasloader.classify(ids,clns);
                //ptcld.components.lasloader.update(ptcld.components.lasloader.data);
            }    
        }
    }


});