import * as THREE from './build/three.module.js';
// import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import * as MapBox from './mapbox-gl/dist/mapbox-gl.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
// import {ThreeBox} from './threebox-plugin/dist/threebox.js';

const origin = [120.68731, 31.30149921];
const { MercatorCoordinate } = mapboxgl;

// scene object
//let camera, scene, canvas, renderer;
const mouse = new THREE.Vector2();

// 
var intersectIndex;

// mesh
let depth, temp, chlro, salinity, turbidity;
var mesh_group = [];
// legend
let legend;
// hover label
let labelEle;
let labelV = new THREE.Vector3();
// vertices
let depth_vertices, temp_vertices, chlro_vertices, salinity_vertices, turbidity_vertices;
let vertice_group = new THREE.Group();
// attributes
let depth_attribute, temp_attribute, chlro_attribute, salinity_attribute, turbidity_attribute;
let attribute_group = [];

//create legend
const legendsContenter = document.querySelector('#legends');
legend = document.createElement('img')
legend.src = 'resources/legend/depth_legend.png';
legend.alt = 'Depth Legend';
legend.width = 150;
legend.height = 400;
legendsContenter.appendChild(legend);
console.log(legend);

// GUI parameters
const params = {
    depth: true,
    temp: false,
    chlro: false,
    salinity: false,
    turbidity: false
};

mapboxgl.accessToken = 'pk.eyJ1IjoiYmFpbWFkYXNodTExNyIsImEiOiJja2xicDR3Mm8wOXRwMndteDc4dzIybGxyIn0.-wDxVmn7xT2IW5wQJID79g';
var map = (window.map = new mapboxgl.Map({
    container: 'container',
    // style: 'mapbox://styles/mapbox/light-v10',
    style: 'mapbox://styles/mapbox/streets-v11',
    zoom: 16,
    center: origin,
    pitch: 60,
    antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
}));

// parameters to ensure the model is georeferenced correctly on the map
// configuration of the custom layer for a 3D model per the CustomLayerInterface
class CustomLayer {
    type = 'custom';
    renderingMode = '3d';

    constructor(id) {
        this.id = id;
        THREE.Object3D.DefaultUp.set(0, 0, 1);
    }

    onAdd(map, gl) {
        this.camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 1e6);
        // this.camera = new THREE.Camera();

        const centerLngLat = map.getCenter();
        this.center = MercatorCoordinate.fromLngLat(centerLngLat, 0);
        const { x, y, z } = this.center;
        const s = this.center.meterInMercatorCoordinateUnits();

        const scale = new THREE.Matrix4().makeScale(s, s, -s);
        const rotation = new THREE.Matrix4().multiplyMatrices(
            new THREE.Matrix4().makeRotationX(-0.5 * Math.PI),
            new THREE.Matrix4().makeRotationY(Math.PI));

        this.cameraTransform = new THREE.Matrix4().multiplyMatrices(scale, rotation).setPosition(x, y, z);

        this.scene = new THREE.Scene();

        this.map = map;
        this.scene.add(this.makeScene());
        this.canvas = map.getCanvas();

        // use the Mapbox GL JS map canvas for three.js
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
        });

        this.renderer.autoClear = false;

        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 3.0;
        this.raycaster.near = -1;
        this.raycaster.far = 1e6;

        initGUI();

        //create label panel
        const labelContenter = document.querySelector('#labels');
        labelEle = document.createElement('div');
        labelEle.textContent = "label";
        labelContenter.appendChild(labelEle);
        labelEle.style.display = '';
        this.map = map;

        // window.addEventListener('mousemove', onMouseMove, false);
    }

    makeScene() {
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));

        // use the three.js GLTF loader to add the 3D model to the three.js scene
        var loader = new GLTFLoader();
        loader.load(
            'resources/model/Improved.gltf',
            function (gltf) {
                var root = gltf.scene;
                root.scale.set(0.8, 0.8, 0.8);
                scene.add(root);
                console.log(dumpObject(root).join('\n'));
                console.log(mesh_group);
                depth = root.getObjectByName('depth_TIN');
                // depth mesh
                depth = root.getObjectByName('depth_TIN');
                // temperature mesh
                temp = root.getObjectByName('temp_kriging');
                temp.position.copy(depth.position);
                temp.visible = false;
                // chlorophyll mesh
                chlro = root.getObjectByName('chlorophyll_kriging');
                chlro.position.copy(depth.position);
                chlro.visible = false;
                // salinity mesh
                salinity = root.getObjectByName('salinity_kriging');
                salinity.position.copy(depth.position);
                salinity.visible = false;
                for (var i in mesh_group) {
                    var mesh = mesh_group[i];
                    //mesh.scale.set(0.1, 0.1, 0.1);
                    mesh.rotation.x = Math.PI;
                    mesh.rotation.z = Math.PI;
                    //scene.add(mesh);
                    getVertices(mesh);
                    console.log(mesh);
                }
            }
        );
        return scene;
    }

    raycastPoint(point) {
        var mouse = new THREE.Vector2();
        if (depth_vertices) {
            // scale mouse pixel position to a percentage of the screen's width and height
            mouse.x = (point.x / this.map.transform.width) * 2 - 1;
            mouse.y = 1 - (point.y / this.map.transform.height) * 2;

            // console.log(this.camera.projectionMatrix);

            const camInverseProjection = new THREE.Matrix4().getInverse(this.camera.projectionMatrix);

            // console.log(cameraPosition);

            const cameraPosition = new THREE.Vector3().applyMatrix4(camInverseProjection);
            const mousePosition = new THREE.Vector3(mouse.x, mouse.y, 1).applyMatrix4(camInverseProjection);
            const viewDirection = mousePosition.clone().sub(cameraPosition).normalize();

            this.raycaster.set(cameraPosition, viewDirection);
            // console.log(depth_vertices);
            if (params.depth == true) {
                const intersect = this.raycaster.intersectObject(depth_vertices);
                // console.log(intersect);
                if (intersect.length > 0) {
                    labelEle.style.display = '';
                    if (intersectIndex != intersect[0].index) {
                        intersectIndex = intersect[0].index;
                        // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                        // console.log(intersect[0].index);
                        labelV = intersect[0].point;
                        labelV.project(this.camera);
                        labelEle.textContent = 'Depth: ' + depth_attribute.position.array[3 * intersectIndex + 1];
                        // console.log('Depth: '+depth_attribute.position.array[3 * intersectIndex + 1]);
                        const x = (labelV.x * .5 + .5) * this.canvas.clientWidth;
                        const y = (labelV.y * -.5 + .5) * this.canvas.clientHeight;
                        labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                    } else if (intersectIndex !== null) {
                        intersectIndex = null;
                    }
                } else {
                    labelEle.style.display = 'None';
                }
            } else if (params.temp == true) {
                const intersect = this.raycaster.intersectObject(temp_vertices);
                // console.log(intersect);
                if (intersect.length > 0) {
                    labelEle.style.display = '';
                    if (intersectIndex != intersect[0].index) {
                        intersectIndex = intersect[0].index;
                        // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                        // console.log(intersect[0].index);
                        labelV = intersect[0].point;
                        labelV.project(this.camera);
                        labelEle.textContent = 'Temp: ' + temp_attribute.position.array[3 * intersectIndex + 1];
                        const x = (labelV.x * .5 + .5) * this.canvas.clientWidth;
                        const y = (labelV.y * -.5 + .5) * this.canvas.clientHeight;
                        labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                    } else if (intersectIndex !== null) {
                        intersectIndex = null;
                    }
                } else {
                    labelEle.style.display = 'None';
                }
            } else if (params.chlro == true) {
                const intersect = this.raycaster.intersectObject(chlro_vertices);
                // console.log(intersect);
                if (intersect.length > 0) {
                    labelEle.style.display = '';
                    if (intersectIndex != intersect[0].index) {
                        intersectIndex = intersect[0].index;
                        // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                        // console.log(intersect[0].index);
                        labelV = intersect[0].point;
                        labelV.project(this.camera);
                        labelEle.textContent = 'Chlro: ' + chlro_attribute.position.array[3 * intersectIndex + 1];
                        const x = (labelV.x * .5 + .5) * this.canvas.clientWidth;
                        const y = (labelV.y * -.5 + .5) * this.canvas.clientHeight;
                        labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                    } else if (intersectIndex !== null) {
                        intersectIndex = null;
                    }
                } else {
                    labelEle.style.display = 'None';
                }
            } else if (params.salinity == true) {
                const intersect = this.raycaster.intersectObject(salinity_vertices);
                // console.log(intersect);
                if (intersect.length > 0) {
                    labelEle.style.display = '';
                    if (intersectIndex != intersect[0].index) {
                        intersectIndex = intersect[0].index;
                        // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                        // console.log(intersect[0].index);
                        labelV = intersect[0].point;
                        labelV.project(this.camera);
                        labelEle.textContent = 'Salnity: ' + salinity_attribute.position.array[3 * intersectIndex + 1];
                        const x = (labelV.x * .5 + .5) * this.canvas.clientWidth;
                        const y = (labelV.y * -.5 + .5) * this.canvas.clientHeight;
                        labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                    } else if (intersectIndex !== null) {
                        intersectIndex = null;
                    }
                } else {
                    labelEle.style.display = 'None';
                }
            }
        }
    }

    render(gl, matrix) {
        this.camera.projectionMatrix = new THREE.Matrix4()
            .fromArray(matrix)
            .multiply(this.cameraTransform);
        this.renderer.state.reset();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
    }

}

let customLayer = new CustomLayer('customLayer');

map.on('load', function () {
    map.addLayer(customLayer, 'waterway-label');
});

map.on('mousemove', function (e) {
    customLayer.raycastPoint(e.point);
});

// function onMouseMove(event) {
//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
//     //console.log(mouse);
// }

function dumpObject(obj, lines = [], isLast = true, prefix = '') {
    const localPrefix = isLast ? '└─' : '├─';
    if (obj.type == 'Mesh') {
        mesh_group.push(obj);
    }
    lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
    const newPrefix = prefix + (isLast ? '  ' : '│ ');
    const lastNdx = obj.children.length - 1;
    obj.children.forEach((child, ndx) => {
        const isLast = ndx === lastNdx;
        dumpObject(child, lines, isLast, newPrefix);
    });
    return lines;
}

function getVertices(mesh) {
    mesh.scale.set(1, 0.0001, 1);
    // const tempGeom = new THREE.Geometry().fromBufferGeometry(mesh.geometry); !!! Geometry() no longer supported in V126
    // const vertices = tempGeom.vertices;
    const vertices = mesh.geometry.attributes.position.array;
    // console.log(vertices);
    let points = [];
    for (var i = 1; i < vertices.length / 3; i++) {
        points.push(new THREE.Vector3().fromArray(vertices, i * 3));
    }
    console.log(mesh.name);
    console.log(points);
    if (points) {
        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        let attributes = geometry.attributes;
        console.log(attributes);
        const loader = new THREE.TextureLoader();
        const texture = loader.load('resources/disc.png');
        const pointsMaterial = new THREE.PointsMaterial({
            color: 0x0080ff,
            map: texture,
            size: 0.0,
            alphaTest: 0.5,
            // side: THREE.DoubleSide
        });
        switch (mesh.name) {
            case 'depth_TIN':
                depth_attribute = geometry.attributes;
                depth_vertices = new THREE.Points(geometry, pointsMaterial);
                depth_vertices.name = 'depth_vertices';
                depth_vertices.position.copy(depth.position);
                depth_vertices.scale.set(0.8, 0.0001, 0.8);
                depth_vertices.rotation.x = Math.PI;
                depth_vertices.rotation.z = Math.PI;
                customLayer.scene.add(depth_vertices);
                break;
            case 'temp_kriging':
                temp_attribute = geometry.attributes;
                temp_vertices = new THREE.Points(geometry, pointsMaterial);
                temp_vertices.name = 'temp_vertices';
                temp_vertices.position.copy(temp.position);
                temp_vertices.scale.set(0.8, 0.0001, 0.8);
                temp_vertices.rotation.x = Math.PI;
                temp_vertices.rotation.z = Math.PI;
                customLayer.scene.add(temp_vertices);
                break;
            case 'chlorophyll_kriging':
                chlro_attribute = geometry.attributes;
                chlro_vertices = new THREE.Points(geometry, pointsMaterial);
                chlro_vertices.name = 'chlro.vertices';
                chlro_vertices.position.copy(chlro.position);
                chlro_vertices.scale.set(0.8, 0.0001, 0.8);
                chlro_vertices.rotation.x = Math.PI;
                chlro_vertices.rotation.z = Math.PI;
                customLayer.scene.add(chlro_vertices);
                break;
            case 'salinity_kriging':
                salinity_attribute = geometry.attributes;
                salinity_vertices = new THREE.Points(geometry, pointsMaterial);
                salinity_vertices.name = 'chlro.vertices';
                salinity_vertices.position.copy(salinity.position);
                salinity_vertices.scale.set(0.8, 0.0001, 0.8);
                salinity_vertices.rotation.x = Math.PI;
                salinity_vertices.rotation.z = Math.PI;
                customLayer.scene.add(salinity_vertices);
                break;
        }
    }
}

function initGUI() {
    const gui = new GUI();
    var folder1 = gui.addFolder('Change Surface');
    let depth_con = folder1.add(params, 'depth');
    depth_con.listen();
    depth_con.onChange(function () {
        helper("depth_TIN");
        params.temp = false;
        params.chlro = false;
        params.salinity = false;
        legend.src = 'resources/legend/depth_legend.png';
    });
    let temp_con = folder1.add(params, 'temp')
    temp_con.listen();
    temp_con.onChange(function () {
        helper("temp_kriging");
        params.depth = false;
        params.chlro = false;
        params.salinity = false;
        // params.turbidity = false;
        legend.src = 'resources/legend/temp_legend.png';
    });
    let chlro_con = folder1.add(params, 'chlro')
    chlro_con.listen();
    chlro_con.onChange(function () {
        helper("chlorophyll_kriging");
        params.depth = false;
        params.temp = false;
        params.salinity = false;
        // params.turbidity = false;
        legend.src = 'resources/legend/chlro_legend.png';
    });
    let salinity_con = folder1.add(params, 'salinity');
    salinity_con.listen();
    salinity_con.onChange(function () {
        helper("salinity_kriging");
        params.depth = false;
        params.temp = false;
        params.chlro = false;
        // params.turbidity = false;
        legend.src = 'resources/legend/salinity_legend.png';
    })
    // let turbidity_con = folder1.add(params, 'turbidity');
    // turbidity_con.listen();
    // turbidity_con.onChange(function () {
    //     helper("turbidity_kriging");
    //     params.depth = false;
    //     params.temp = false;
    //     params.chlro = false;
    //     params.salinity = false;
    //     legend.src = 'resources/legend/turbidity_legend.png';
    // })

    function helper(name) {
        for (var i in mesh_group) {
            if (mesh_group[i].name == name) {
                mesh_group[i].visible = true;
            } else {
                mesh_group[i].visible = false;
            }
        }
    }

    folder1.open();
    gui.open();
}

