// import * as THREE from './build/three.module.js';
// import { OrbitControls } from './jsm/controls/OrbitControls.js';
// import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import * as MapBox from './mapbox-gl/dist/mapbox-gl.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
// import {ThreeBox} from './threebox-plugin/dist/threebox.js';

const origin = [120.6869562, 31.30118323];

var tb; // three box

// mesh group
var mesh_group = [];
//  raycaster for mouse hovering effect
const raycaster = new THREE.Raycaster();
// raycaster.params.Points.threshold = 1.0;
const mouse = new THREE.Vector2(1, 1);
let depth_mesh;
let depth_vertices;
let depth_attribute;

// hover label
let labelEle;
let labelV = new THREE.Vector3();

// canvas
let canvas;

mapboxgl.accessToken = 'pk.eyJ1IjoiYmFpbWFkYXNodTExNyIsImEiOiJja2xicDR3Mm8wOXRwMndteDc4dzIybGxyIn0.-wDxVmn7xT2IW5wQJID79g';
var map = (window.map = new mapboxgl.Map({
    container: 'container',
    // style: 'mapbox://styles/mapbox/light-v10',
    style: 'mapbox://styles/mapbox/streets-v11',
    zoom: 18,
    center: origin,
    pitch: 60,
    antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
}));

// configuration of the custom layer for a 3D model per the CustomLayerInterface
var customLayer = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, mbxContext) {

        canvas = map.getCanvas();

        tb = new Threebox(
            map,
            mbxContext,
            { defaultLights: true }
        );

        initGUI();

        //create label panel
        const labelContenter = document.querySelector('#labels');
        labelEle = document.createElement('div');
        labelEle.textContent = "label";
        labelContenter.appendChild(labelEle);
        labelEle.style.display = '';

        //instantiate a red sphere and position it at the origin lnglat
        var sphere = tb.sphere({ color: 'red', material: 'MeshStandardMaterial' })
            .setCoords(origin);
        // add sphere to the scene
        // tb.add(sphere);

        // use the three.js GLTF loader to add the 3D model to the three.js scene
        var loader = new THREE.GLTFLoader();
        console.log(loader);
        loader.load(
            'resources/model/depth_TIN.gltf',
            function (gltf) {
                var root = gltf.scene;
                console.log(root);
                console.log(dumpObject(root).join('\n'));
                console.log(mesh_group);
                depth_mesh = root.getObjectByName('depth_TIN');
                for (var i in mesh_group) {
                    var mesh = mesh_group[i];
                    mesh.scale.set(0.8, 0.8, 0.8);
                    getVertices(mesh);
                    console.log(mesh);
                    mesh = tb.Object3D({ obj: mesh, units: 'meters' }).setCoords(origin);
                    console.log(mesh);
                    mesh.rotation.x = -Math.PI / 2;
                    mesh.rotation.z = Math.PI;
                    tb.add(mesh);
                }
            }
        );

        map.on("mousemove", function (e) {
            // console.log(e.point);
            var intersectObject = tb.queryRenderedFeatures(e.point)[0];
            if (intersectObject) {
                console.log(intersectObject);
                var intersectIndex = intersectObject.index;
                if (intersectIndex) {
                    labelV = intersectObject.point;
                    // labelV.project(camera.position);
                    const x = (labelV.x * .5 + .5) * canvas.clientWidth;
                    const y = (labelV.y * -.5 + .5) * canvas.clientHeight;
                    labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;

                    // console.log("Intersect Index: " + intersectObject.index);
                    console.log("Depth: " + depth_attribute.position.array[3 * intersectIndex + 1]);
                    labelEle.textContent = "Depth: " + depth_attribute.position.array[3 * intersectIndex + 1];
                }
                console.log(intersectObject.object.name);
            }
        })

    },
    render: function (gl, matrix) {
        tb.update();
    }
};

map.on('style.load', function () {
    map.addLayer(customLayer, 'waterway-label');
});

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
                depth_vertices.position.copy(depth_mesh.position);
                depth_vertices.scale.set(1, 0.0001, 1);
                console.log(depth_vertices);
                var a = tb.Object3D({ obj: depth_vertices, units: 'meters' }).setCoords(origin);
                a.rotation.x = -Math.PI / 2;
                a.rotation.z = Math.PI;
                tb.add(a);
                break;
        }
    }
}

function initGUI() {
    //gui
    const gui = new GUI();
    var folder1 = gui.addFolder('Change Surface');
    // let depth_con = folder1.add(params, 'depth');
}