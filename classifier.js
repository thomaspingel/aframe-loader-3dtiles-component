AFRAME.registerComponent('classifier', {
    init: function () {
        console.log(this.el.getAttribute('loaderlas','classification'));
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
                evt.detail.els[0].components.lasloader.update(evt.detail.els[0].components.lasloader.data);
            }

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