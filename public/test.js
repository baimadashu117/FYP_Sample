import * as THREE from './build/three.module.js';
// import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import * as MapBox from './mapbox-gl/dist/mapbox-gl.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
// import {ThreeBox} from './threebox-plugin/dist/threebox.js';

const origin = [120.7037913, 31.27273318];
const { MercatorCoordinate } = mapboxgl;

// scene object
//let camera, scene, canvas, renderer;
const mouse = new THREE.Vector2();

// 
var intersectIndex;

// mesh
let depth
var mesh_group = [];
// legend
let legend;
// hover label
let labelEle;
let labelV = new THREE.Vector3();
//
let loaded = false;
//controllers
const controllers = [];

const aparams = {};

//create legend
const legendsContenter = document.querySelector('#legends');
legend = document.createElement('img')
legend.src = 'resources/legend/DushuHu/depth_legend.png';
legend.alt = 'Depth Legend';
legend.width = 150;
legend.height = 400;
legendsContenter.appendChild(legend);

const measureContainer = document.querySelector('#calculation-box');
measureContainer.style.display = "None";

mapboxgl.accessToken = 'pk.eyJ1IjoiYmFpbWFkYXNodTExNyIsImEiOiJja2xicDR3Mm8wOXRwMndteDc4dzIybGxyIn0.-wDxVmn7xT2IW5wQJID79g';
if (!mapboxgl.supported()) {
    alert("Your browser does not support Mapbox GL");
} else {
    var map = (window.map = new mapboxgl.Map({
        container: 'container',
        // style: 'mapbox://styles/mapbox/light-v10',
        style: 'mapbox://styles/mapbox/streets-v11',
        zoom: 16,
        center: origin,
        pitch: 60,
        antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
    }));
    // add draw control
    var draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            line_string: true,
            polygon: true,
            trash: true
        }
    });
    map.addControl(draw, "bottom-right");
}

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
            'resources/model/dushuhu.gltf',
            function (gltf) {
                var root = gltf.scene;
                root.scale.set(1.0, 0.001, 1.0);
                scene.add(root);
                console.log(dumpObject(root).join('\n'));
                // console.log(mesh_group);
                // depth mesh
                depth = root.getObjectByName('depth_kriging');
                // console.log(depth);
                for (var i in mesh_group) {
                    var mesh = mesh_group[i];
                    //mesh.scale.set(0.1, 0.1, 0.1);
                    mesh.rotation.x = Math.PI;
                    mesh.rotation.z = Math.PI;
                    getVertices(mesh);
                    //console.log(mesh);
                }
                onLoad();
            }
        );
        return scene;
    }

    raycastPoint(point) {
        var mouse = new THREE.Vector2();
        if (loaded) {
            // scale mouse pixel position to a percentage of the screen's width and height
            mouse.x = (point.x / this.map.transform.width) * 2 - 1;
            mouse.y = 1 - (point.y / this.map.transform.height) * 2;

            // console.log(this.camera.projectionMatrix);

            const camInverseProjection = new THREE.Matrix4().copy(this.camera.projectionMatrix).invert();

            // console.log(cameraPosition);

            const cameraPosition = new THREE.Vector3().applyMatrix4(camInverseProjection);
            const mousePosition = new THREE.Vector3(mouse.x, mouse.y, 1).applyMatrix4(camInverseProjection);
            const viewDirection = mousePosition.clone().sub(cameraPosition).normalize();

            this.raycaster.set(cameraPosition, viewDirection);
            for (var i in aparams) {
                if (aparams[i][i] == true) {
                    // console.log("raycasting " + aparams[i].mesh.name);
                    const intersect = this.raycaster.intersectObject(aparams[i].mesh_vertices);
                    // console.log(intersect);
                    if (intersect.length > 0) {
                        labelEle.style.display = '';
                        if (intersectIndex != intersect[0].index) {
                            intersectIndex = intersect[0].index;
                            // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                            // console.log(intersect[0].index);
                            labelV = intersect[0].point;
                            labelV.project(this.camera);
                            var labelInfo = aparams[i].mesh_attribute.position.array[3 * intersectIndex + 1].toString();
                            labelEle.textContent = aparams[i].mesh.name + ': ' + labelInfo.substring(0, labelInfo.indexOf('.') + 4);
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
                }
            }
        }
    }

    render(gl, matrix) {
        this.camera.projectionMatrix = new THREE.Matrix4()
            .fromArray(matrix)
            .multiply(this.cameraTransform);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
    }
}

let customLayer = new CustomLayer('customLayer');

map.on('load', function () {
    // add full screen control
    // map.addControl(new mapboxgl.FullscreenControl(),"bottom-right");

    // add custom 3D layer benethe the draw layer
    // map.addLayer(customLayer, 'gl-draw-polygon-fill-inactive.cold')
    map.addLayer(customLayer)

});

function onLoad() {
    loaded = true;
    console.log("!!! loaded !!!");
    console.log(aparams);
    aparams.depth.depth = true;
    initGUI();
}

map.on('mousemove', function (e) {
    customLayer.raycastPoint(e.point);
});

map.on("draw.selectionchange", function (e) {
    var selectFeatures = e.features;
    if (selectFeatures.length == 0) {
        measureContainer.style.display = 'None';
    }
    for (var i = 0; i < selectFeatures.length; i++) {
        if (selectFeatures.length == 1) {
            console.log(feature);
            measureContainer.style.display = '';
            var measureTest = measureContainer.querySelector("#calculated-area");
            var feature = selectFeatures[0];
            if (feature.geometry.type == 'LineString') {
                var length = turf.length(feature);
                draw.setFeatureProperty(feature.id, "length", length);
                measureTest.innerHTML = "Length = " + length + " kilometers";
            } else if (feature.geometry.type == 'Polygon') {
                var area = turf.area(feature);
                draw.setFeatureProperty(feature.id, "area", length);
                measureTest.innerHTML = "Area = " + area + " square meters";
            }
        }
    }
})


function dumpObject(obj, lines = [], isLast = true, prefix = '') {
    const localPrefix = isLast ? '└─' : '├─';
    if (obj.type == 'Mesh') {
        mesh_group.push(obj);
        var mesh_name = obj.name.substring(0, obj.name.indexOf('_'));
        var attribute = {};
        attribute[mesh_name] = false;
        attribute['mesh_attribute'] = null;
        attribute['mesh_vertices'] = null
        aparams[mesh_name] = attribute;
        // aparams[mesh_name] = {
        //     "`translate(-50%, -50%) translate(${x}px,${y}px)`": false,
        //     mesh_attribute: null,
        //     mesh_vertices: null
        // }
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
    if (mesh.name != "depth_kriging") {
        mesh.visible = false;
        mesh.position.copy(depth.position);
    }
    const vertices = mesh.geometry.attributes.position.array;
    // console.log(vertices);
    let points = [];
    for (var i = 1; i < vertices.length / 3; i++) {
        points.push(new THREE.Vector3().fromArray(vertices, i * 3));
    }
    // console.log(mesh.name);
    // console.log(points);
    if (points) {
        var mesh_name = mesh.name.substring(0, mesh.name.indexOf('_'))
        // console.log(mesh_name);
        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        let attributes = geometry.attributes;
        //console.log(attributes);
        const loader = new THREE.TextureLoader();
        const texture = loader.load('resources/disc.png');
        const pointsMaterial = new THREE.PointsMaterial({
            color: 0x0080ff,
            map: texture,
            size: 0.0,
            alphaTest: 0.5,
            // side: THREE.DoubleSide
        });
        let vertices = new THREE.Points(geometry, pointsMaterial);
        vertices.name = mesh_name + '_vertices';
        // vertices.position.copy(depth.position);
        vertices.scale.set(1.0, 0.001, 1.0);
        vertices.rotation.x = Math.PI;
        vertices.rotation.z = Math.PI;
        customLayer.scene.add(vertices);
        aparams[mesh_name].mesh = mesh;
        aparams[mesh_name].mesh_attribute = attributes;
        aparams[mesh_name].mesh_vertices = vertices;
    }
}

function initGUI() {
    const gui = new GUI();
    var folder1 = gui.addFolder('Change Surface');
    for (const key in aparams) {
        var m = aparams[key];
        let controller = folder1.add(m, key).listen().onChange(function () {
            console.log(aparams[key].mesh.name, key);
            helper(aparams[key].mesh.name, key)
        })
    }

    function helper(mesh_name, attribute) {
        console.log(mesh_name);
        for (var i in mesh_group) {
            if (mesh_group[i].name == mesh_name) {
                mesh_group[i].visible = true;
            } else {
                mesh_group[i].visible = false;
            }
        }
        for (var i in aparams) {
            if (i != attribute) {
                aparams[i][i] = false;
            }
        }
        console.log(aparams);
    }

    folder1.open();
    gui.open();
}

