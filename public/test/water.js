import * as THREE from '../build/three.module.js';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { RGBELoader } from './jsm/loaders/RGBELoader.js';
import { RoughnessMipmapper } from './jsm/utils/RoughnessMipmapper.js';
import { GUI } from './jsm/libs/dat.gui.module.js';


let camera, scene, renderer, canvas;
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.5;
const mouse = new THREE.Vector2(1, 1);
const meshes = [];
let intersected;
var labelEle;
let terrain;
let attributes;
let points;
let labelV = new THREE.Vector3();

const params = {
    hide: false
};


init();
render();

function dumpObject(obj, lines = [], isLast = true, prefix = '') {
    const localPrefix = isLast ? '└─' : '├─';
    if (obj.type == 'Mesh') {
        meshes.push(obj);
    }
    if (obj.name == 'raw_TIN') {
        terrain = obj;
    }
    if (obj.name == 'point-cloud') {

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

function init() {
    canvas = document.querySelector("#canvas");

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(-43, 200, 250);

    scene = new THREE.Scene();

    new RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load('resources/immenstadter_horn_4k.hdr', function (texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.background = envMap;
            scene.environment = envMap;
            texture.dispose();
            pmremGenerator.dispose();

            // load model
            // use of RoughnessMipmapper is optional
            const roughnessMipmapper = new RoughnessMipmapper(renderer);

            const loader = new GLTFLoader()
            loader.load('resources/Interim_Project.gltf',
                function (gltf) {
                    const root = gltf.scene;
                    console.log(root);
                    scene.add(root);
                    console.log(dumpObject(root).join('\n'));

                    const newMesh = new THREE.Mesh(terrain.geometry);
                    // scene.add(newMesh);
                    const tempGeom = new THREE.Geometry().fromBufferGeometry(terrain.geometry);
                    const vertices = tempGeom.vertices;
                    roughnessMipmapper.dispose();
                    let data_trace = root.getObjectByName('point-cloud');
                    console.log(data_trace);
                    let water = root.getObjectByName('water');
                    if (water) {
                        console.log(water.material);
                        water.material.opacity = 0.85;
                        water.material.transparent = true;
                    }
                    if (vertices) {
                        console.log(terrain.geometry.attributes);
                        let geometry = new THREE.BufferGeometry().setFromPoints(vertices);
                        attributes = geometry.attributes;
                        console.log(attributes);
                        const loader = new THREE.TextureLoader();
                        const texture = loader.load('resources/disc.png');
                        const pointsMaterial = new THREE.PointsMaterial({
                            color: 0x0080ff,
                            map: texture,
                            size: 1,
                            alphaTest: 0.5
                        });
                        console.log(pointsMaterial);
                        points = new THREE.Points(geometry, pointsMaterial);
                        points.translateX(terrain.position.x);
                        points.translateY(terrain.position.y);
                        points.translateZ(terrain.position.z);
                        // console.log(points.position.y);
                        // console.log(terrain.position.y);
                        scene.add(points);
                        // console.log(points.layers);
                        const trace_geometry = new THREE.BufferGeometry();
                        trace_geometry.setAttribute(
                            'position',
                            new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
                        const trace = new THREE.Points(trace_geometry, pointsMaterial);
                        scene.add(trace);
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

        });



    // const geometry = new THREE.BufferGeometry();
    // geometry.setAttribute(
    //     'position',
    //     new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const labelContenter = document.querySelector('#labels');
    //create label panel
    labelEle = document.createElement('div');
    labelEle.textContent = "label";
    labelContenter.appendChild(labelEle);
    labelEle.style.display = '';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    window.addEventListener('resize', onWindowResize, false);

    function onMouseMove(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove, false);

    const gui = new GUI();
    gui.add(params, 'hide').onChange(hideEnv);
    gui.open();

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
    requestAnimationFrame(animate);
    raycaster.setFromCamera(mouse, camera);
    if (points) {
        const intersect = raycaster.intersectObject(points);
        if (intersect.length > 0) {
            console.log(intersect);
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
    }
    render();
}


function render() {
    renderer.render(scene, camera);
}

function hideEnv() {
    if (params.hide == true) {
        meshes.forEach((mesh) => {
            if (mesh.name != "raw_TIN") {
                mesh.visible = false;
            }
        })
    } else {
        meshes.forEach((mesh) => {
            mesh.visible = true;
        })
    }
}

