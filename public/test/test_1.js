import * as THREE from '../build/three.module.js';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
let group, camera, scene, canvas, renderer, points;
let intersected;
let geometry, attributes;
let labelEle;
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.5;
let labelV = new THREE.Vector3();
const mouse = new THREE.Vector2(100, 100);

init();
animate();

function init() {

    scene = new THREE.Scene();
    canvas = document.querySelector("#canvas");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // camera

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(50, 50, 50);
    scene.add(camera);

    // controls

    const controls = new OrbitControls(camera, canvas);

    // light

    const light = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(light);
    // helper

    scene.add(new THREE.AxesHelper(100));

    group = new THREE.Group();
    scene.add(group);

    // create label
    const labelContenter = document.querySelector('#labels');
    //create label panel
    labelEle = document.createElement('div');
    labelEle.textContent = "label";
    labelContenter.appendChild(labelEle);
    labelEle.style.display = '';

    let plane;

    function dumpObject(obj, lines = [], isLast = true, prefix = '') {
        const localPrefix = isLast ? '└─' : '├─';
        if (obj.name == 'raw_TIN') {
            plane = obj;
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

    const loader = new GLTFLoader()
    loader.load('resources/river_terrain.gltf',
        function (gltf) {
            const root = gltf.scene;
            gltf.scene.traverse(child => {
                if (child.material) child.material.metalness = 0;
            });
            console.log(dumpObject(root).join('\n'));
            group.add(plane);
            const tempGeom = new THREE.Geometry().fromBufferGeometry(plane.geometry);
            const vertices = tempGeom.vertices;
            if (vertices) {
                console.log(plane.geometry.attributes);
                // console.log(plane.geometry.getIndex());
                // plane.material.wireframe = true;
                // console.log(plane.material);

                geometry = new THREE.BufferGeometry().setFromPoints(vertices);
                attributes = geometry.attributes;
                console.log(attributes);
                const loader = new THREE.TextureLoader();
                const texture = loader.load('resources/disc.png');
                const pointsMaterial = new THREE.PointsMaterial({
                    color: 0x0080ff,
                    map: texture,
                    size: 0.8,
                    alphaTest: 0.5
                });
                points = new THREE.Points(geometry, pointsMaterial);
                group.add(points);
                console.log(points.layers);
            }
        },
        // called while loading is progressing
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // called when loading has errors
        function (error) {
            console.log('An error happened');
        })

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
    requestAnimationFrame(animate);
    raycaster.setFromCamera(mouse, camera);
    const intersect = raycaster.intersectObject(points);
    if (intersect.length > 0) {
        // console.log(intersect.length);
        var depth;
        if (intersected != intersect[0].index) {
            intersected = intersect[0].index;
            depth = attributes.position.array[3 * intersected + 1];
            console.log(attributes.position.array[3 * intersected] + "," + attributes.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
            console.log(intersect[0].index);
            // set label
            labelV = intersect[0].point;
            labelV.project(camera);
            labelEle.textContent = 'Depth: ' + depth;
            const x = (labelV.x * .5 + .5) * canvas.clientWidth;
            const y = (labelV.y * -.5 + .5) * canvas.clientHeight;
            labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
        } else if (intersected !== null) {
            intersected = null;
        }
    }
    render();
}

function render() {
    renderer.render(scene, camera);
}