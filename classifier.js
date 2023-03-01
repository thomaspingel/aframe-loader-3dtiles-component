AFRAME.registerComponent('classifier', {
    init: function () {
        console.log(this.el.getAttribute('loaderlas','classification'));
    }
});

AFRAME.registerComponent('trigger', {
    init: function () {
        this.el.addEventListener('triggerdown', this.TriggerDown);
        this.el.addEventListener('raycaster-intersection', function (evt) {
            //console.log('Player hit something!', evt.detail.els[0].components.lasloader.classification);
            let cls = evt.detail.els[0].components.lasloader.classification;
            //console.log(evt.detail)

            //add point indices and classifications to array for changing
            let ids = [];
            let clns = [];
            for(let i=0; i<evt.detail.intersections.length; i++){
                //console.log(evt.detail.intersections[i].index, cls[evt.detail.intersections[i].index]);
                ids.push(evt.detail.intersections[i].index);
                clns.push(7);
            }
            evt.detail.els[0].components.lasloader.classify(ids,clns);
            evt.detail.els[0].components.lasloader.update();
           });
      },
      TriggerDown: function (evt) {
        console.log(evt);
        console.log(evt.srcElement);
      }

});