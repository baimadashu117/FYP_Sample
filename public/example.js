import * as THREE from 'https://unpkg.com/three@0.109.0/build/three.module.js';

const {MercatorCoordinate} = mapboxgl;

mapboxgl.accessToken = 'pk.eyJ1IjoiZGFudmsiLCJhIjoiY2lrZzJvNDR0MDBhNXR4a2xqNnlsbWx3ciJ9.myJhweYd_hrXClbKk8XLgQ';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [-74.0445, 40.6892],
  zoom: 16,
  pitch: 60,
  bearing: 120,
});

class BoxCustomLayer {
  type = 'custom';
  renderingMode = '3d';

  constructor(id) {
    this.id = id;
    THREE.Object3D.DefaultUp.set(0, 0, 1);
  }

  async onAdd(map, gl) {
    this.camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 1e6);
    // this.camera = new THREE.Camera();

    const centerLngLat = map.getCenter();
    this.center = MercatorCoordinate.fromLngLat(centerLngLat, 0);
    const {x, y, z} = this.center;
    this.cameraTransform = new THREE.Matrix4()
      .makeTranslation(x, y, z)
      .scale(new THREE.Vector3(1, -1, 1));

    this.map = map;
    this.scene = this.makeScene();

    // use the Mapbox GL JS map canvas for three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });

    this.renderer.autoClear = false;

    this.raycaster = new THREE.Raycaster();
  }

  makeScene() {
    const scene = new THREE.Scene();
    const skyColor = 0xb1e1ff; // light blue
    const groundColor = 0xb97a20; // brownish orange

    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    scene.add(new THREE.HemisphereLight(skyColor, groundColor, 0.25));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(-70, -70, 100).normalize();
    // Directional lights implicitly point at (0, 0, 0).
    scene.add(directionalLight);

    const group = new THREE.Group();
    group.name = '$group';
    // The models are all in meter coordinates. This shifts them to Mapbox world coordinates.
    group.scale.setScalar(this.center.meterInMercatorCoordinateUnits());

    const geometry = new THREE.BoxGeometry( 100, 100, 100 );
    geometry.translate(0, 0, 50);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff0000,
    });
    const cube = new THREE.Mesh( geometry, material );

    group.add(cube);
    scene.add(group);

    console.log(scene);

    return scene;
  }

  render(gl, matrix) {
    this.camera.projectionMatrix = new THREE.Matrix4()
      .fromArray(matrix)
      .multiply(this.cameraTransform);
    this.renderer.state.reset();
    this.renderer.render(this.scene, this.camera);
  }

  raycast(point) {
    var mouse = new THREE.Vector2();
     // // scale mouse pixel position to a percentage of the screen's width and height
    mouse.x = ( point.x / this.map.transform.width ) * 2 - 1;
    mouse.y = 1 - ( point.y / this.map.transform.height ) * 2;
    // console.log(mouse);
    this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix);
    // const scale = 1 / this.center.meterInMercatorCoordinateUnits();
    // this.camera.matrixWorld.makeScale(scale, scale, scale);
    this.raycaster.setFromCamera(mouse, this.camera);
    // calculate objects intersecting the picking ray
    var intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length) {
      console.log(intersects);
    }
  }
}

let boxLayer = new BoxCustomLayer('box')

map.on('load', () => {
  map.addLayer(boxLayer);
});

map.on('click', e => {
  boxLayer.raycast(e.point);
});
