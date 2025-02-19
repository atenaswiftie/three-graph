// This is a companion pen to go along with https://beta.observablehq.com/@grantcuster/using-three-js-for-2d-data-visualization. It shows a three.js pan and zoom example using d3-zoom working on 100,000 points. The code isn't very organized here so I recommend you check out the notebook to read about what is going on.

let point_num = 2_000_000;

let width = window.innerWidth;
let viz_width = width;
let height = window.innerHeight;

let fov = 40;
let near = 10;
let far = 7000;
// import * as THREE from 'three';
// Set up camera and scene
let camera = new THREE.PerspectiveCamera(
  fov,
  width / height,
  near,
  far 
);

window.addEventListener('resize', () => {
  width = window.innerWidth;
  viz_width = width;
  height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
})

let color_array = [
  "#1f78b4",
  "#b2df8a",
  "#33a02c",
  "#fb9a99",
  "#e31a1c",
  "#fdbf6f",
  "#ff7f00",
  "#6a3d9a",
  "#cab2d6",
  "#ffff99"
]

// Add canvas
let renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

let zoom = d3.zoom()
  .scaleExtent([getScaleFromZ(far), getScaleFromZ(near)])
  .on('zoom', () =>  {
    let d3_transform = d3.event.transform;
    zoomHandler(d3_transform);
  });

view = d3.select(renderer.domElement);
function setUpZoom() {
  view.call(zoom);    
  let initial_scale = getScaleFromZ(far);
  var initial_transform = d3.zoomIdentity.translate(viz_width/2, height/2).scale(initial_scale);    
  zoom.transform(view, initial_transform);
  camera.position.set(0, 0, far);
}
setUpZoom();

circle_sprite= new THREE.TextureLoader().load(
  "https://fastforwardlabs.github.io/visualization_assets/circle-sprite.png"
)

let radius = 2000;

// Random point in circle code from https://stackoverflow.com/questions/32642399/simplest-way-to-plot-points-randomly-inside-a-circle
function randomPosition(radius) {
  var pt_angle = Math.random() * 2 * Math.PI;
  var pt_radius_sq = Math.random() * radius * radius;
  var pt_x = Math.sqrt(pt_radius_sq) * Math.cos(pt_angle);
  var pt_y = Math.sqrt(pt_radius_sq) * Math.sin(pt_angle);
  return [pt_x, pt_y];
}

let data_points = [];
for (let i = 0; i < point_num; i++) {
  let position = randomPosition(radius);
  let name = 'Point ' + i;
  let group = Math.floor(Math.random() * 6);
  let point = { position, name, group };
  data_points.push(point);
}

let generated_points = data_points;

let pointsGeometry = new THREE.Geometry();

let colors = [];
for (let datum of generated_points) {
  // Set vector coordinates from data
  let vertex = new THREE.Vector3(datum.position[0], datum.position[1], 0);
  pointsGeometry.vertices.push(vertex);
  let color = new THREE.Color(color_array[datum.group]);
  colors.push(color);
}
pointsGeometry.colors = colors;

let pointsMaterial = new THREE.PointsMaterial({
  size: 8,
  sizeAttenuation: false,
  vertexColors: THREE.VertexColors,
  map: circle_sprite,
  transparent: true
});

let points = new THREE.Points(pointsGeometry, pointsMaterial);

let scene = new THREE.Scene();
scene.add(points);
scene.background = new THREE.Color(0xefefef);

// Three.js render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

function zoomHandler(d3_transform) {
  let scale = d3_transform.k;
  let x = -(d3_transform.x - viz_width/2) / scale;
  let y = (d3_transform.y - height/2) / scale;
  let z = getZFromScale(scale);
  camera.position.set(x, y, z);
}

function getScaleFromZ (camera_z_position) {
  let half_fov = fov/2;
  let half_fov_radians = toRadians(half_fov);
  let half_fov_height = Math.tan(half_fov_radians) * camera_z_position;
  let fov_height = half_fov_height * 2;
  let scale = height / fov_height; // Divide visualization height by height derived from field of view
  return scale;
}

function getZFromScale(scale) {
  let half_fov = fov/2;
  let half_fov_radians = toRadians(half_fov);
  let scale_height = height / scale;
  let camera_z_position = scale_height / (2 * Math.tan(half_fov_radians));
  return camera_z_position;
}

function toRadians (angle) {
  return angle * (Math.PI / 180);
}

// Hover and tooltip interaction

raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 10;

view.on("mousemove", () => {
  let [mouseX, mouseY] = d3.mouse(view.node());
  let mouse_position = [mouseX, mouseY];
checkIntersects(mouse_position);
});

function mouseToThree(mouseX, mouseY) {
  return new THREE.Vector3(
    mouseX / viz_width * 2 - 1,
    -(mouseY / height) * 2 + 1,
    1
  );
}

function checkIntersects(mouse_position) {
  let mouse_vector = mouseToThree(...mouse_position);
  raycaster.setFromCamera(mouse_vector, camera);
  let intersects = raycaster.intersectObject(points);
  if (intersects[0]) {
    let sorted_intersects = sortIntersectsByDistanceToRay(intersects);
    let intersect = sorted_intersects[0];
    let index = intersect.index;
    let datum = generated_points[index];
    // highlightPoint(datum);
    // showTooltip(mouse_position, datum);
  } else {
    removeHighlights();
    // hideTooltip();
  }
}

function sortIntersectsByDistanceToRay(intersects) {
  return _.sortBy(intersects, "distanceToRay");
}

hoverContainer = new THREE.Object3D()
scene.add(hoverContainer);

function highlightPoint(datum) {
  removeHighlights();
  
  let geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3(
      datum.position[0],
      datum.position[1],
      0
    )
  );
  geometry.colors = [ new THREE.Color(color_array[datum.group]) ];

  let material = new THREE.PointsMaterial({
    size: 26,
    sizeAttenuation: false,
    vertexColors: THREE.VertexColors,
    map: circle_sprite,
    transparent: true
  });
  
  let point = new THREE.Points(geometry, material);
  hoverContainer.add(point);
}

function removeHighlights() {
  hoverContainer.remove(...hoverContainer.children);
}

view.on("mouseleave", () => {
  removeHighlights()
});

// Initial tooltip state
let tooltip_state = { display: "none" }

let tooltip_template = document.createRange().createContextualFragment(`<div id="tooltip" style="display: none; position: absolute; pointer-events: none; font-size: 13px; width: 120px; text-align: center; line-height: 1; padding: 6px; background: white; font-family: sans-serif;">
  <div id="point_tip" style="padding: 4px; margin-bottom: 4px;"></div>
  <div id="group_tip" style="padding: 4px;"></div>
</div>`);
document.body.append(tooltip_template);

let $tooltip = document.querySelector('#tooltip');
let $point_tip = document.querySelector('#point_tip');
let $group_tip = document.querySelector('#group_tip');

function updateTooltip() {
  $tooltip.style.display = tooltip_state.display;
  $tooltip.style.left = tooltip_state.left + 'px';
  $tooltip.style.top = tooltip_state.top + 'px';
  $point_tip.innerText = tooltip_state.name;
  $point_tip.style.background = color_array[tooltip_state.group];
  $group_tip.innerText = `Group ${tooltip_state.group}`;
}

function showTooltip(mouse_position, datum) {
  let tooltip_width = 120;
  let x_offset = -tooltip_width/2;
  let y_offset = 30;
  tooltip_state.display = "block";
  tooltip_state.left = mouse_position[0] + x_offset;
  tooltip_state.top = mouse_position[1] + y_offset;
  tooltip_state.name = datum.name;
  tooltip_state.group = datum.group;
  updateTooltip();
}

function hideTooltip() {
  tooltip_state.display = "none";
  updateTooltip();
}

