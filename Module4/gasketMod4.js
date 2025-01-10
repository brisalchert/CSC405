"use strict"

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;

var numElements = 36;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var theta = [0, 0, 0];

var translate = [0, 0];
var translatePositive = [true, true];
var translateVelocity = [0.00354, 0.00157];

var scale = [1.0, 1.0, 1.0];
var scalePositive = true;
var scaleVelocity = 0.001;

var thetaLoc;
var translateLoc;
var scaleLoc;

var rotateToggle = true;
var translateToggle = true;
var scaleToggle = true;

var colorTheta = 0.0;
var colorThetaLoc;

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
    thetaLoc = gl.getUniformLocation(program, "theta");
    translateLoc = gl.getUniformLocation(program, "translate");
    scaleLoc = gl.getUniformLocation(program, "scale");
    colorThetaLoc = gl.getUniformLocation(program, "colorTheta");

    // Event listeners for buttons
    document.getElementById("rotateButton").onclick = function () {
        rotateToggle = !rotateToggle;
    };
    document.getElementById("translateButton").onclick = function () {
        translateToggle = !translateToggle;
    };
    document.getElementById("scaleButton").onclick = function () {
        scaleToggle = !scaleToggle;
    };

    // Start the render loop
    render();
}

function updateTranslation(translateAxis) {
    // Set a boundary for the "walls" of the scene
    var boundary = 0.8;

    // Invert translation for given axis and cycle rotation axis
    // when colliding with a wall
    if (translate[translateAxis] >= boundary || translate[translateAxis] <= -boundary) {
        translatePositive[translateAxis] = !translatePositive[translateAxis];
        axis = (axis + 1) % 3;
    }

    // Apply next translation for this axis
    if (translatePositive[translateAxis]) {
        translate[translateAxis] += translateVelocity[translateAxis];
    } else {
        translate[translateAxis] -= translateVelocity[translateAxis];
    }
}

function updateScaling() {
    // Invert scaling if max/min size reached
    if (scale[0] >= 1.75 || scale[0] <= 0.25) {
        scalePositive = !scalePositive;
    }

    // Apply scaling for each dimension
    for (var i = 0; i < scale.length; i++) {
        if (scalePositive) {
            scale[i] += scaleVelocity;
        } else {
            scale[i] -= scaleVelocity;
        }
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Handle rotation
    if (rotateToggle) {
        theta[axis] += 1.5;
    }

    // Handle translation
    if (translateToggle) {
        updateTranslation(0);
        updateTranslation(1);
    }

    // Handle scaling
    if (scaleToggle) {
        updateScaling();
    }

    // Increment color cycle
    colorTheta = (colorTheta + (2 * Math.PI / 1000)) % (2 * Math.PI);

    // Pass new values to uniforms in the vertex and fragment shaders
    gl.uniform3fv(thetaLoc, theta);
    gl.uniform2fv(translateLoc, translate);
    gl.uniform3fv(scaleLoc, scale);
    gl.uniform1f(colorThetaLoc, colorTheta);

    // Draw the cube
    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_BYTE, 0);

    // Start next animation frame
    requestAnimFrame(render);
}
