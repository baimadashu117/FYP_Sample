import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
import { RGBELoader } from './jsm/loaders/RGBELoader.js';
import { RoughnessMipmapper } from './jsm/utils/RoughnessMipmapper.js';


// scene objects
let group, camera, scene, canvas, renderer;
let intersected;
// mesh object
let depth, temp, chlro;
let legend;
let labelEle;
let labelV = new THREE.Vector3();
// vertices
let depth_vertices, temp_vertices, chlro_vertices;
var meshes = [];
// attributes
let depth_attribute, temp_attribute, chlro_attribute;

const raycaster = new THREE.Raycaster();
// raycaster.params.Points.threshold = 1.0;
const mouse = new THREE.Vector2(1, 1);

const params = {
    depth: true,
    temp: false,
    chlro: false
};

init();
animate();

function init() {

    scene = new THREE.Scene();
    canvas = document.querySelector("#canvas");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputEncoding = THREE.sRGBEncoding;

    //gui
    const gui = new GUI();
    var folder1 = gui.addFolder('Change Surface');
    let depth_con = folder1.add(params, 'depth');
    depth_con.listen();
    depth_con.onChange(function () {
        depth.visible = true;
        temp.visible = false;
        chlro.visible = false;
        depth_vertices.visible = true;
        temp_vertices.visible = false;
        chlro_vertices.visible = false;
        params.temp = false;
        params.chlro = false;
        legend.src = 'resources/legend/depth_legend.png';
    });
    let temp_con = folder1.add(params, 'temp')
    temp_con.listen();
    temp_con.onChange(function () {
        temp.visible = true;
        depth.visible = false;
        chlro.visible = false;
        temp_vertices.visible = true;
        depth_vertices.visible = false;
        chlro_vertices.visible = false;
        params.depth = false;
        params.chlro = false;
        legend.src = 'resources/legend/temp_legend.png';
    });
    let chlro_con = folder1.add(params, 'chlro')
    chlro_con.listen();
    chlro_con.onChange(function () {
        chlro.visible = true;
        depth.visible = false;
        temp.visible = false;
        depth_vertices.visible = false;
        temp_vertices.visible = false;
        chlro_vertices.visible = true;
        params.depth = false;
        params.temp = false;
        legend.src = 'resources/legend/chlro_legend.png';
    });
    folder1.open();
    gui.open();

    //create legend
    const legendsContenter = document.querySelector('#legends');
    legend = document.createElement('img')
    legend.src = 'resources/legend/depth_legend.png';
    legend.alt = 'Depth Legend';
    legend.width = 150;
    legend.height = 400;
    legendsContenter.appendChild(legend);
    // console.log(legend);

    //create label panel
    const labelContenter = document.querySelector('#labels');
    labelEle = document.createElement('div');
    labelEle.textContent = "label";
    labelContenter.appendChild(labelEle);
    labelEle.style.display = '';

    // camera
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(100, 100, 100);
    scene.add(camera);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);

    // helper
    scene.add(new THREE.AxesHelper(20));

    group = new THREE.Group();
    scene.add(group);

    function dumpObject(obj, lines = [], isLast = true, prefix = '') {
        const localPrefix = isLast ? '└─' : '├─';
        if (obj.type == 'Mesh') {
            meshes.push(obj);
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


    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load('resources/immenstadter_horn_4k.hdr', function (texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.background = envMap;
            scene.environment = envMap;
            texture.dispose();
            pmremGenerator.dispose();

            // use of RoughnessMipmapper is optional
            const roughnessMipmapper = new RoughnessMipmapper(renderer);

            //load model
            const loader = new GLTFLoader()
            loader.load('resources/new_terrain.gltf',
                function (gltf) {
                    const root = gltf.scene;
                    console.log(root);
                    console.log(dumpObject(root).join('\n'));
                    group.add(root);
                    temp = root.getObjectByName('temp_kriging');
                    depth = root.getObjectByName('depth_TIN');
                    chlro = root.getObjectByName('chlro_kriging');
                    temp.visible = false;
                    chlro.visible = false;
                    depth.scale.set(1, 1, 1);
                    getVertices(temp);
                    getVertices(depth);
                    getVertices(chlro);
                    // depth_vertices.visible = false;
                    temp_vertices.visible = false;
                    chlro_vertices.visible = false;
                },
                // called while loading is progressing
                function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                // called when loading has errors
                function (error) {
                    console.log('An error happened');
                    console.log(error);
                })
        });

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);

    // plotly();
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
    if (depth_vertices) {
        if (params.depth == true) {
            // console.log("depth");
            const intersect = raycaster.intersectObject(depth_vertices);
            // console.log(intersect);
            if (intersect.length > 0) {
                if (intersected != intersect[0].index) {
                    intersected = intersect[0].index;
                    // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                    // console.log(intersect[0].index);
                    labelV = intersect[0].point;
                    labelV.project(camera);
                    labelEle.textContent = 'Depth: ' + depth_attribute.position.array[3 * intersected + 1];
                    const x = (labelV.x * .5 + .5) * canvas.clientWidth;
                    const y = (labelV.y * -.5 + .5) * canvas.clientHeight;
                    labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                } else if (intersected !== null) {
                    intersected = null;
                }
            }
        } else if (params.temp == true) {
            // console.log("temp");
            const intersect = raycaster.intersectObject(temp_vertices);
            // console.log(intersect);
            if (intersect.length > 0) {
                if (intersected != intersect[0].index) {
                    intersected = intersect[0].index;
                    // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                    // console.log(intersect[0].index);
                    labelV = intersect[0].point;
                    labelV.project(camera);
                    labelEle.textContent = 'Temp: ' + temp_attribute.position.array[3 * intersected + 1];
                    const x = (labelV.x * .5 + .5) * canvas.clientWidth;
                    const y = (labelV.y * -.5 + .5) * canvas.clientHeight;
                    labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                } else if (intersected !== null) {
                    intersected = null;
                }
            }
        } else if (params.chlro == true) {
            // console.log("chlro");
            const intersect = raycaster.intersectObject(chlro_vertices);
            // console.log(intersect);
            if (intersect.length > 0) {
                if (intersected != intersect[0].index) {
                    intersected = intersect[0].index;
                    // console.log(depth_attribute.position.array[3 * intersected] + "," + depth_attribute.position.array[3 * intersected + 1] + ',' + attributes.position.array[3 * intersected + 2]);
                    // console.log(intersect[0].index);
                    labelV = intersect[0].point;
                    labelV.project(camera);
                    labelEle.textContent = 'Chlro: ' + chlro_attribute.position.array[3 * intersected + 1];
                    const x = (labelV.x * .5 + .5) * canvas.clientWidth;
                    const y = (labelV.y * -.5 + .5) * canvas.clientHeight;
                    labelEle.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
                } else if (intersected !== null) {
                    intersected = null;
                }
            }
        }
    }
    render();
}

function render() {
    renderer.render(scene, camera);
}

function getVertices(mesh) {
    const tempGeom = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
    const vertices = tempGeom.vertices;
    if (vertices) {
        let geometry = new THREE.BufferGeometry().setFromPoints(vertices);
        // let attributes = geometry.attributes;
        // console.log(attributes);
        const loader = new THREE.TextureLoader();
        const texture = loader.load('resources/disc.png');
        const pointsMaterial = new THREE.PointsMaterial({
            color: 0x0080ff,
            map: texture,
            size: 0.0,
            alphaTest: 0.5,
            // side: THREE.DoubleSide
        });
        console.log(pointsMaterial);
        switch (mesh.name) {
            case 'depth_TIN':
                depth_attribute = geometry.attributes;
                depth_vertices = new THREE.Points(geometry, pointsMaterial);
                depth_vertices.name = 'depth_vertices';
                depth_vertices.position.copy(depth.position);
                depth_vertices.scale.set(1, 0.0001, 1);
                group.add(depth_vertices);
                break;
            case 'temp_kriging':
                temp_attribute = geometry.attributes;
                temp_vertices = new THREE.Points(geometry, pointsMaterial);
                temp_vertices.name = 'temp_vertices';
                temp_vertices.position.copy(temp.position);
                temp_vertices.scale.set(1, 0.0001, 1);
                group.add(temp_vertices);
                break;
            case 'chlro_kriging':
                chlro_attribute = geometry.attributes;
                chlro_vertices = new THREE.Points(geometry, pointsMaterial);
                chlro_vertices.name = 'chlro.vertices';
                chlro_vertices.position.copy(chlro.position);
                chlro_vertices.scale.set(1, 0.0001, 1);
                group.add(chlro_vertices);
                break;
        }
    }
}

function plotly(){
    // var trace1 = {
    //     x:['2020-10-04', '2021-11-04', '2023-12-04'],
    //     y: [90, 40, 60],
    //     type: 'scatter'
    // };
    
    // var data = [trace1];
    
    // var layout = {
    //     title: 'Scroll and Zoom',
    //     showlegend: false
    // };
    
    // Plotly.newPlot('plotlyPanel', data, layout, {scrollZoom: true});
}
