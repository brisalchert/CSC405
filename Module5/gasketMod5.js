"use strict"

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;

var numElements = 36;

var colorTheta = 0.0;
var colorThetaLoc;

var near = -1.0;
var far = 1.0;
var radius = 0.5;
var theta  = 0.0;
var phi    = 0.0;

var left = -0.5;
var right = 0.5;
var ytop = 0.5;
var bottom = -0.5;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye;
const at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var invertedCamera = false;

var startDragX = null;
var startDragY = null;

var perspectiveView = false;

// Define the shape of the cube with vertex coordinates
// in the model frame
var vertices = [
    vec4(-0.11, -0.11,  0.11, 1.0),
    vec4(-0.11,  0.11,  0.11, 1.0),
    vec4( 0.11,  0.11,  0.11, 1.0),
    vec4( 0.11, -0.11,  0.11, 1.0),
    vec4(-0.11, -0.11, -0.11, 1.0),
    vec4(-0.11,  0.11, -0.11, 1.0),
    vec4( 0.11,  0.11, -0.11, 1.0),
    vec4( 0.11, -0.11, -0.11, 1.0)
];

// Define the initial color values for each vertex
var vertexColors = [
    [0.0, 0.0, 0.0, 1.0],  // black
    [1.0, 0.0, 0.0, 1.0],  // red
    [1.0, 1.0, 0.0, 1.0],  // yellow
    [0.0, 1.0, 0.0, 1.0],  // green
    [0.0, 0.0, 1.0, 1.0],  // blue
    [1.0, 0.0, 1.0, 1.0],  // magenta
    [1.0, 1.0, 1.0, 1.0],  // white
    [0.0, 1.0, 1.0, 1.0]   // cyan
];

// Define the indices for each of the 12 triangles
// composing the faces of the cube
var indices = [
    1, 0, 3,
    3, 2, 1,
    2, 3, 7,
    7, 6, 2,
    3, 0, 4,
    4, 7, 3,
    6, 5, 1,
    1, 2, 6,
    4, 5, 6,
    6, 7, 4,
    5, 4, 0,
    0, 1, 5
];

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Set viewport and set background color to black
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // Load vertex and fragment shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Pass index data to the element array buffer, which handles
    // element indices rather than vertex attributes
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // Pass vertex color data to a new array buffer
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

    // Link color data to the attribute in the vertex shader
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Pass vertex position data to a new array buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Link position data to the attribute in the vertex shader
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Get locations of uniforms in the vertex and fragment shaders
    colorThetaLoc = gl.getUniformLocation(program, "colorTheta");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    // Set event listeners for sliders
    document.getElementById("depthSlider").addEventListener("input", function(event) {
        // Set near and far planes based on type of projection
        if (perspectiveView) {
            far = event.target.value / 2.0 + 1.05;
            near = 1.05 - event.target.value / 2.0;
        } else {
            far = event.target.value / 2.0;
            near = -event.target.value / 2.0;
        }
    });
    document.getElementById("radiusSlider").addEventListener("input", function(event) {
       radius = event.target.value;
    });
    document.getElementById("thetaSlider").addEventListener("input", function(event) {
        theta = event.target.value* Math.PI/180.0;
    });
    document.getElementById("phiSlider").addEventListener("input", function(event) {
        phi = event.target.value* Math.PI/180.0;
    });
    document.getElementById("aspectSlider").addEventListener("input", function(event) {
        right = event.target.value/2;
        left = -event.target.value/2;
    });

    // Set event listener for perspective button
    document.getElementById("perspectiveButton").onclick = function() {
        if (perspectiveView) {
            far -= 1.05;
            near -= 1.05;
            perspectiveView = false;
        } else {
            far += 1.05;
            near += 1.05;
            perspectiveView = true;
        }
    };

    // Set mouse interactivity event handlers
    canvas.onmousedown = mouseDownHandler;
    canvas.onmousemove = mouseMoveHandler;
    document.onmouseup = mouseUpHandler; // Ensure letting go outside canvas stops drag
    canvas.addEventListener("wheel", mouseWheelHandler);

    // Start the render loop
    render();
}

// Function for zooming in and out
function mouseWheelHandler(e) {
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

    radius -= 0.03 * delta;

    // Prevent radius from going out of range
    if (radius < 0.05) {
        radius = 0.05;
    } else if (radius > 2.0) {
        radius = 2.0;
    }

    // Prevent scrolling from moving the page
    e.preventDefault();
}

// Function for initiating a drag by clicking and holding
function mouseDownHandler(e) {
    // Set starting location for mouse drag
    startDragX = e.clientX;
    startDragY = e.clientY;
}

// Function for moving the camera during a drag
function mouseMoveHandler(e) {
    // Ensure a drag is started before making the movement
    if (startDragX === null || startDragY === null)
        return;

    drag(e.clientX - startDragX, e.clientY - startDragY);

    startDragX = e.clientX;
    startDragY = e.clientY;
}

// Function for ending a drag by releasing the button
function mouseUpHandler() {
    // Remove starting location to signal end of drag
    startDragX = null;
    startDragY = null;
}

// Function for dragging the camera with the mouse
function drag(deltaX, deltaY) {
    var radPerPixel = (Math.PI / 450);
    var deltaTheta = radPerPixel * deltaX;
    var deltaPhi = radPerPixel * deltaY;

    // Add deltaPhi for vertical rotation
    phi += deltaPhi;

    // Subtract deltaTheta for horizontal rotation
    theta -= deltaTheta;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Ensure angles are within range for sliders
    while (theta < 0) {
        theta += 2.0 * Math.PI;
    }

    while (theta > 2.0 * Math.PI) {
        theta -= 2.0 * Math.PI;
    }

    phi = Math.min(Math.max(phi, (-Math.PI / 2.0)), (Math.PI / 2.0));

    // Ensure slider values match current rotation
    document.getElementById("thetaSlider").value = (theta * 180.0 / Math.PI);
    document.getElementById("phiSlider").value = (phi * 180.0 / Math.PI);

    // Ensure slider values match current radius
    document.getElementById("radiusSlider").value = radius;

    // Calculate eye location
    eye = vec3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        radius * Math.cos(theta) * Math.cos(phi)
    );

    // Calculate new model-view and projection matrices
    modelViewMatrix = lookAt(eye, at, up);

    if (perspectiveView) {
        var aspect = (right - left) / (ytop - bottom);

        projectionMatrix = perspective(90.0, aspect, near, far);
    } else {
        projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    }

    // Increment color cycle
    colorTheta = (colorTheta + (2 * Math.PI / 1000)) % (2 * Math.PI);

    // Pass new values to uniforms in the vertex and fragment shaders
    gl.uniform1f(colorThetaLoc, colorTheta);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Draw the cube
    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_BYTE, 0);

    // Start next animation frame
    requestAnimFrame(render);
}
