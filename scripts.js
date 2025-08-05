let scene, camera, renderer, controls, raycaster, mouse;
let selectedObject = null;
const objects = [];

init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(5, 5, 10);

  // Renderer
  const container = document.getElementById('canvas-container');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Grid + Axes
  const grid = new THREE.GridHelper(20, 20);
  scene.add(grid);

  const axes = new THREE.AxesHelper(5);
  scene.add(axes);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  // Raycaster & mouse
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  document.getElementById('brushType').addEventListener('change', (e) => {
    addShape(e.target.value);
  });

  document.getElementById('undoButton').addEventListener('click', () => removeLastShape());
  document.getElementById('redoButton').addEventListener('click', () => alert('Redo not implemented.'));
  document.getElementById('smoothButton').addEventListener('click', saveScene);
  document.getElementById('smoothButton').nextElementSibling.addEventListener('click', loadScene);

  document.getElementById('importButton').addEventListener('click', importModel);
  document.getElementById('exportButton').addEventListener('click', exportModel);
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
  let geometry;
  const size = 1;

  switch (type) {
    case 'cube':
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, size, 32);
      break;
    case 'sphere':
    default:
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      break;
  }

  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const mesh = new THREE.Mesh(geometry, material);

  // Random position within 10x10x10
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

  if (intersects.length > 0) {
    selectObject(intersects[0].object);
  } else {
    deselectObject();
  }
}

function selectObject(object) {
  if (selectedObject) {
    selectedObject.material.color.set(0x00ff00);
  }

  selectedObject = object;
  selectedObject.material.color.set(0xff0000); // Highlight
  showProperties(selectedObject);
}

function deselectObject() {
  if (selectedObject) {
    selectedObject.material.color.set(0x00ff00);
    selectedObject = null;
    hideProperties();
  }
}

function showProperties(object) {
  let props = `Position: X=${object.position.x.toFixed(2)} Y=${object.position.y.toFixed(2)} Z=${object.position.z.toFixed(2)}`;
  alert(props); // Or you can create a UI panel instead
}

function hideProperties() {
  // Optional: Clear UI panel if added
}

function removeLastShape() {
  const last = objects.pop();
  if (last) {
    scene.remove(last);
    last.geometry.dispose();
    last.material.dispose();
  }
}

//persist
function saveScene() {
  const data = objects.map(obj => ({
    type: getShapeType(obj.geometry),
    position: obj.position.toArray()
  }));

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'scene.json';
  link.click();
}

function loadScene() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = JSON.parse(event.target.result);
      clearScene();
      data.forEach(obj => {
        addShapeFromData(obj);
      });
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearScene() {
  while (objects.length > 0) {
    const obj = objects.pop();
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
}

function addShapeFromData(data) {
  let geometry;
  switch (data.type) {
    case 'BoxGeometry':
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'SphereGeometry':
      geometry = new THREE.SphereGeometry(0.5, 32, 32);
      break;
    case 'CylinderGeometry':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      break;
    default:
      return;
  }

  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(data.position);
  scene.add(mesh);
  objects.push(mesh);
}

function getShapeType(geometry) {
  if (geometry instanceof THREE.BoxGeometry) return 'BoxGeometry';
  if (geometry instanceof THREE.SphereGeometry) return 'SphereGeometry';
  if (geometry instanceof THREE.CylinderGeometry) return 'CylinderGeometry';
  return 'Unknown';
}

//import and export
function importModel() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.obj';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const loader = new THREE.OBJLoader();
      const obj = loader.parse(event.target.result);
      obj.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
          scene.add(child);
          objects.push(child);
        }
      });
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportModel() {
  if (!objects.length) return;

  const exporter = new THREE.OBJExporter();
  const result = exporter.parse(scene);
  const blob = new Blob([result], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'scene.obj';
  link.click();
}
