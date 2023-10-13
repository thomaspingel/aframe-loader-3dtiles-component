AFRAME.registerComponent("classify", {
  schema: {
    sphere: { type: "string" },
  },
  dependencies: ["raycaster"],
  init: function () {
    if (this.data.hand == "r") {
      //console.log('should emit');
      this.h = 1;
    } else {
      this.h = 0;
    }

    // console.log(document.querySelector('#pointcloud').object3D);
    // console.log(document.querySelector('#pointcloud').object3D.children[0]);
    //console.log(AFRAME);
    //console.log(document.querySelector("#pointcloud"));
    if (this.paint == null) {
      console.log("setting this.paint to false");
      this.paint = false;
    }
    this.el.addEventListener("triggerdown", this.TriggerDown);
    this.el.addEventListener("triggerup", this.TriggerUp);
    
    

    //this.el.addEventListener("click", this.undo);

    document.querySelector('#lefthand').addEventListener("gripdown", this.transformTrue);
    document.querySelector('#lefthand').addEventListener("gripup", this.transformFalse);
    document.querySelector('#righthand').addEventListener("gripdown", this.transformTrue);
    document.querySelector('#righthand').addEventListener("gripup", this.transformFalse);
    

    document.querySelector('#lefthand').addEventListener("xbuttondown", this.undo);
    document.querySelector('#lefthand').addEventListener("ybuttondown", this.redo);

    this.el.addEventListener("thumbstickmoved", this.logThumbstick);
  },
  TriggerUp: function (evt) {
    evt.srcElement.components.classify.paint = false;
    console.log("trigger up");
  },
  TriggerDown: function (evt) {
    evt.srcElement.components.classify.paint = true;
    console.log("trigger down");
    document.querySelector("#pointcloud").emit("strokeStart");
  },
  transformTrue: function (evt) {
    document
      .querySelector("#pointcloud")
      .setAttribute("lasloader", "transform", true);
  },
  transformFalse: function (evt) {
    document
      .querySelector("#pointcloud")
      .setAttribute("lasloader", "transform", false);
  },
  undo: function (evt) {
    document.querySelector("#pointcloud").emit("undo");
  },
  redo: function (evt) {
    document.querySelector("#pointcloud").emit("redo");
  },
  logThumbstick: function (evt) {
    if (evt.detail.y > 0.55) {
      console.log("DOWN");
      let curlen =
        document.querySelector("#lefthand").components.raycaster.data.far;
      let amt = Math.max(-1 * (0.15 * curlen * evt.detail.y), -10000000);
      document
        .querySelector("#lefthand")
        .setAttribute("raycaster", "far", curlen + amt);
      document
        .querySelector("#righthand")
        .setAttribute("raycaster", "far", curlen + amt);
      document.querySelector("#raylenvalue").innerHTML = curlen + amt;
      document.querySelector("#raylen").value = curlen + amt;
    }
    if (evt.detail.y < -0.55) {
      console.log("UP");
      let curlen =
        document.querySelector("#lefthand").components.raycaster.data.far;
      let amt = Math.min(0.15 * curlen * -1 * evt.detail.y, 10000000);
      document
        .querySelector("#lefthand")
        .setAttribute("raycaster", "far", curlen + amt);
      document
        .querySelector("#righthand")
        .setAttribute("raycaster", "far", curlen + amt);
      document.querySelector("#raylenvalue").innerHTML = curlen + amt;
      document.querySelector("#raylen").value = curlen + amt;
    }
    if (evt.detail.x < -0.95) {
      console.log("LEFT");
      let currad = document.querySelector(
        "#" + evt.srcElement.components.classify.data.sphere
      ).object3D.scale.x;
      let amt = currad / 1.07;
      document
        .querySelector("#" + evt.srcElement.components.classify.data.sphere)
        .setAttribute("scale", { x: amt, y: amt, z: amt });
      //console.log(currad);
    }
    if (evt.detail.x > 0.95) {
      console.log("RIGHT");
      let currad = document.querySelector(
        "#" + evt.srcElement.components.classify.data.sphere
      ).object3D.scale.x;
      let amt = currad * 1.07;
      document
        .querySelector("#" + evt.srcElement.components.classify.data.sphere)
        .setAttribute("scale", { x: amt, y: amt, z: amt });
      //console.log(currad);
    }
  },
  tick: function (time, timeDelta) {
    let intersections = this.el.components.raycaster.intersections;
    console.log(intersections)
    
    let dist = this.el.components.raycaster.data.far; //length of ray
    
    // Snap the sphere to distance of one of the intersecting points
    if(intersections.length >0){
      dist = intersections[intersections.length-1].distance;
      console.log(dist);
    }
    
    
    /**
     *   Place sphere on the tip of the ray
     */

    // get direction vector (world coordinates to which a vector would point)
    let dir = new THREE.Vector3(
      this.el.components.raycaster.data.direction.x,
      this.el.components.raycaster.data.direction.y,
      this.el.components.raycaster.data.direction.z
    );
    // make direction vector a unit vector (length one)
    dir.normalize();
    // console.log(dir);

    // rotate direction vector by controller entity's rotation
    dir.applyEuler(this.el.object3D.rotation);

    // scale vector by length of ray
    dir.multiplyScalar(dist);

    // add vector to current origin of the controller
    let pos = this.el.object3D.position;
    pos.add(dir);

    // set position of sphere to this location
    document
      .querySelector("#" + this.data.sphere)
      .setAttribute("position", pos);

    
    
    
    /**
     *    Collisions
     */
    // radius
    let r2 =
      document.querySelector("#" + this.data.sphere).object3D.scale.x ** 2;

    // x2+y2+z2=r2 -- equation of a sphere
    let pc = document.querySelector("#pointcloud");

    let selected = [];
    //let pns =pc.components.lasloader.positions;
    if (pc.object3D.children && pc.object3D.children.length > 0) {
      let pns = pc.components.lasloader.positions;
      //let pns = pc.object3D.children[0].geometry.attributes.position.array;
      // let worldpos = new THREE.Vector3();
      // console.log(pc.object3D.getWorldPosition(worldpos));
      let rotation = pc.object3D.rotation;
      let center = pc.object3D.position;
      let scale = pc.object3D.scale;

      let x, y, z, v;

      if (pns) {
        for (let i = 0; i < pns.length; i += 3) {
          x = pns[i];
          y = pns[i + 1];
          z = pns[i + 2];
          v = new THREE.Vector3(x, y, z);
          v.multiplyScalar(scale.x);
          v.applyEuler(rotation);
          v.add(center);

          //console.log(scale.x);

          //console.log(v);
          // if point is inside the sphere
          if (
            (v.x - pos.x) ** 2 + (v.y - pos.y) ** 2 + (v.z - pos.z) ** 2 <=
            r2
          ) {
            //console.log(x+", "+y+", "+z);
            selected.push(i / 3);
          }
        }
      }

      // left:0, right:1

      pc.emit("highlight", { selected: selected, hand: this.h });
    }

    // check for intersections every tick
    this.el.components.raycaster.refreshObjects();

    // if triggerdown has set this flag, classify intersected points
    if (this.paint) {
      //console.log("painting");
      let ids = [];
      //let clns = [];
      

      let ptcld = document.querySelector("#pointcloud");
      // console.log(ptcld.object3D.rotation);
      //ptcld.object3D.rotation.z+=0.01;
      
      //this.raycaster_els = this.els;
      // for (let i = 0; i < intersections.length; i++) {
      //   //console.log(intersections[i].index, clns[intersections[i].index]);
      //   ids.push(intersections[i].index);
      //   clns.push(ptcld.components.lasloader.data.classificationValue);
      //   //console.log(ptcld.components.lasloader.data.classificationValue);
      // }
      //console.log(evt.detail.els);

      if (selected.length > 0) {
        //console.log(ptcld.components.lasloader);
        // left:0, right:1

        ptcld.components.lasloader.classify(ids, [], this.h);
        //ptcld.components.lasloader.update(ptcld.components.lasloader.data);
      }
    }
  },
});
