let scene, camera, renderer, controls, transformControl, raycaster, mouse;
let selectedObject = null;
const objects = [];
let isDragging = false;
let plane = new THREE.Plane();
let pNormal = new THREE.Vector3(0, 0, 1);
let pIntersect = new THREE.Vector3();
let shift = new THREE.Vector3();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(5, 5, 10);

  const container = document.getElementById('canvas-container');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  transformControl = new THREE.TransformControls(camera, renderer.domElement);
  transformControl.setMode('translate'); // Start in translate mode
  transformControl.addEventListener('dragging-changed', event => {
    controls.enabled = !event.value;
  });
  transformControl.addEventListener('objectChange', updateInfo);
  scene.add(transformControl);

  // Lights and Helpers
  scene.add(new THREE.DirectionalLight(0xffffff, 1).position.set(5, 10, 7.5));
  scene.add(new THREE.AmbientLight(0x404040));
  scene.add(new THREE.GridHelper(20, 20));
  scene.add(new THREE.AxesHelper(5));

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown, false);
  renderer.domElement.addEventListener('pointermove', onPointerMove, false);
  renderer.domElement.addEventListener('pointerup', onPointerUp, false);

  document.getElementById('brushType').addEventListener('change', e => addShape(e.target.value));
  document.getElementById('undoButton').addEventListener('click', removeLastShape);
  document.getElementById('saveBtn').addEventListener('click', saveScene);
  document.getElementById('loadBtn').addEventListener('click', loadScene);
  document.getElementById('importBtn').addEventListener('click', importModel);
  document.getElementById('exportBtn').addEventListener('click', exportModel);
  
  // Sliders for rotation
  document.getElementById('rotateX').addEventListener('input', onRotationSliderChange);
  document.getElementById('rotateY').addEventListener('input', onRotationSliderChange);
  document.getElementById('rotateZ').addEventListener('input', onRotationSliderChange);
  // Slider for scale
  document.getElementById('scale').addEventListener('input', onScaleSliderChange);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function addShape(type) {
  let geo;
  switch (type) {
    case 'cube': geo = new THREE.BoxGeometry(1, 1, 1); break;
    case 'cylinder': geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
    case 'torus': geo = new THREE.TorusGeometry(0.5, 0.2, 16, 100); break;
    case 'knot': geo = new THREE.TorusKnotGeometry(0.5, 0.15, 100, 16); break;
    case 'icosahedron': geo = new THREE.IcosahedronGeometry(0.7, 0); break;
    case 'torusknot': geo = new THREE.TorusKnotGeometry(0.5, 0.15, 100, 16); break;
    default: geo = new THREE.SphereGeometry(0.5, 32, 32);
  }

  const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    THREE.MathUtils.randFloatSpread(10),
    THREE.MathUtils.randFloatSpread(10),
    THREE.MathUtils.randFloatSpread(10)
  );
  scene.add(mesh);
  objects.push(mesh);
}

function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(objects);

  if (intersects.length > 0 && transformControl.getMode() === 'translate') {
    selectObject(intersects[0].object);
    isDragging = true;
    controls.enabled = false;
    
    // Set up the drag plane
    plane.setFromNormalAndCoplanarPoint(pNormal.copy(camera.position).normalize(), selectedObject.position);
    if (raycaster.ray.intersectPlane(plane, pIntersect)) {
      shift.subVectors(selectedObject.position, pIntersect);
    }
  } else {
    deselectObject();
  }
}

function onPointerMove(event) {
  if (isDragging && selectedObject) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    if (raycaster.ray.intersectPlane(plane, pIntersect)) {
      selectedObject.position.copy(pIntersect).add(shift);
      updateInfo();
    }
  }
}

function onPointerUp() {
  isDragging = false;
  controls.enabled = true;
}

function selectObject(obj) {
  if (selectedObject) {
    selectedObject.material.color.set(0x00ff00);
  }
  selectedObject = obj;
  selectedObject.material.color.set(0xff0000);
  transformControl.attach(selectedObject);
  updateSliders();
  showInfo();
}

function deselectObject() {
  if (selectedObject) {
    selectedObject.material.color.set(0x00ff00);
    transformControl.detach();
    selectedObject = null;
    hideInfo();
  }
}

function setTransformMode(mode) {
  transformControl.setMode(mode);
  if (selectedObject) showInfo();
}

// Sliders 
function onRotationSliderChange() {
  if (!selectedObject) return;
  selectedObject.rotation.x = THREE.MathUtils.degToRad(document.getElementById('rotateX').value);
  selectedObject.rotation.y = THREE.MathUtils.degToRad(document.getElementById('rotateY').value);
  selectedObject.rotation.z = THREE.MathUtils.degToRad(document.getElementById('rotateZ').value);
  updateInfo();
}

function onScaleSliderChange() {
  if (!selectedObject) return;
  const scaleValue = document.getElementById('scale').value;
  selectedObject.scale.set(scaleValue, scaleValue, scaleValue);
  updateInfo();
}

function updateSliders() {
  if (!selectedObject) return;
  document.getElementById('rotateX').value = THREE.MathUtils.radToDeg(selectedObject.rotation.x);
  document.getElementById('rotateY').value = THREE.MathUtils.radToDeg(selectedObject.rotation.y);
  document.getElementById('rotateZ').value = THREE.MathUtils.radToDeg(selectedObject.rotation.z);
  document.getElementById('scale').value = selectedObject.scale.x;
}

function removeLastShape() {
  const obj = objects.pop();
  if (obj) {
    scene.remove(obj);
    transformControl.detach(obj);
    obj.geometry.dispose();
    obj.material.dispose();
    deselectObject();
  }
}

function saveScene() {
  const data = objects.map(o => ({
    type: getType(o.geometry),
    position: o.position.toArray(),
    rotation: o.rotation.toArray(),
    scale: o.scale.toArray()
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'scene.json';
  link.click();
}

function loadScene() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      const data = JSON.parse(ev.target.result);
      clearScene();
      data.forEach(d => {
        let geo;
        switch(d.type){
            case 'BoxGeometry': geo = new THREE.BoxGeometry(1, 1, 1); break;
            case 'CylinderGeometry': geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
            case 'TorusGeometry': geo = new THREE.TorusGeometry(0.5, 0.2, 16, 100); break;
            case 'TorusKnotGeometry': geo = new THREE.TorusKnotGeometry(0.5, 0.15, 100, 16); break;
            case 'IcosahedronGeometry': geo = new THREE.IcosahedronGeometry(0.7, 0); break;
            default: geo = new THREE.SphereGeometry(0.5, 32, 32);
        }

        const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.fromArray(d.position);
        mesh.rotation.fromArray(d.rotation);
        mesh.scale.fromArray(d.scale);
        scene.add(mesh);
        objects.push(mesh);
      });
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

function clearScene() {
  objects.forEach(o => {
    scene.remove(o);
    o.geometry.dispose();
    o.material.dispose();
  });
  objects.length = 0;
  transformControl.detach();
  hideInfo();
}

function getType(geo) {
  if (geo instanceof THREE.BoxGeometry) return 'BoxGeometry';
  if (geo instanceof THREE.CylinderGeometry) return 'CylinderGeometry';
  if (geo instanceof THREE.TorusGeometry) return 'TorusGeometry';
  if (geo instanceof THREE.TorusKnotGeometry) return 'TorusKnotGeometry';
  if (geo instanceof THREE.IcosahedronGeometry) return 'IcosahedronGeometry';
  return 'SphereGeometry';
}

function importModel() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.obj';
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      const loader = new THREE.OBJLoader();
      const model = loader.parse(ev.target.result);
      scene.add(model);
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

function exportModel() {
  if (!selectedObject) return;
  const exporter = new THREE.OBJExporter();
  const data = exporter.parse(selectedObject);
  const blob = new Blob([data], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'model.obj';
  link.click();
}

function showInfo() {
  if (!selectedObject) return;

  const p = selectedObject.position;
  const r = selectedObject.rotation;
  const s = selectedObject.scale;

  const info = document.getElementById('info');
  info.innerText = `Position: X=${p.x.toFixed(2)} Y=${p.y.toFixed(2)} Z=${p.z.toFixed(2)}\n` +
                   `Rotation: X=${THREE.MathUtils.radToDeg(r.x).toFixed(1)}° Y=${THREE.MathUtils.radToDeg(r.y).toFixed(1)}° Z=${THREE.MathUtils.radToDeg(r.z).toFixed(1)}°\n` +
                   `Scale: X=${s.x.toFixed(2)} Y=${s.y.toFixed(2)} Z=${s.z.toFixed(2)}`;
  info.style.display = 'block';
}

function updateInfo() {
  if (selectedObject) showInfo();
}

function hideInfo() {
  document.getElementById('info').style.display = 'none';
}
