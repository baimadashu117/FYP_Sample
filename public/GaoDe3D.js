import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';

var map = new AMap.Map("container", {
    viewMode: '3D',
    pitch: 30,
    rotation: 25,
    zoom: 16,
    center: [120.691249949729, 31.3021176300529],
    mapStyle: 'amap://styles/macaron',
    showIndoorMap: false
});

// 创建Object3DLayer图层
var object3Dlayer = new AMap.Object3DLayer();
map.add(object3Dlayer);

// 加载AMap.GltfLoader插件
AMap.plugin(["AMap.GltfLoader"], function () {
    // 创建AMap.GltfLoader插件实例

    var gltf = new AMap.GltfLoader();

    var paramCube = {
        position: new AMap.LngLat(120.691249949729, 31.3021176300529), // 必须
        scale: 500, // 非必须，默认1
        height: 0,  // 非必须，默认0
        scene: 0, // 非必须，默认0
    };

    // 调用load方法，加载 glTF 模型资源
    var urlCube = 'resources/model/Cube/cube.gltf';  // 模型资源文件路径，远程/本地文件均可
    gltf.load(urlCube, function (gltfCube) {
        console.log(gltfCube);
        // gltfCity 为解析后的gltf对象
        gltfCube.setOption(paramCube);
        object3Dlayer.add(gltfCube);
    });

})