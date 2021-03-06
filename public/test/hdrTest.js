import * as THREE from '../build/three.module.js';

import { GUI } from './jsm/libs/dat.gui.module.js';

import { RGBELoader } from './jsm/loaders/RGBELoader.js';

const params = {
    exposure: 2.0
};

let renderer, scene, camera;

init();

function init() {

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = params.exposure;

    renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;

    camera = new THREE.OrthographicCamera(- aspect, aspect, 1, - 1, 0, 1);

    new RGBELoader()
        .setDataType(THREE.UnsignedByteType) // alt: FloatType, HalfFloatType
        .load('resources/immenstadter_horn_4k.hdr', function (texture, textureData) {

            //console.log( textureData );
            //console.log( texture );

            const material = new THREE.MeshBasicMaterial({ map: texture });

            const quad = new THREE.PlaneBufferGeometry(1.5 * textureData.width / textureData.height, 1.5);

            const mesh = new THREE.Mesh(quad, material);

            scene.add(mesh);

            render();

        });

    //

    const gui = new GUI();

    gui.add(params, 'exposure', 0, 4, 0.01).onChange(render);
    gui.open();

    //

    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

    const aspect = window.innerWidth / window.innerHeight;

    const frustumHeight = camera.top - camera.bottom;

    camera.left = - frustumHeight * aspect / 2;
    camera.right = frustumHeight * aspect / 2;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();

}

//

function render() {

    renderer.toneMappingExposure = params.exposure;

    renderer.render(scene, camera);

}