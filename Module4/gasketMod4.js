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

var colorTheta = 0.0;
var colorThetaLoc;

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

var vertexColors = [
    [0.0, 0.0, 0.0, 1.0],  // black
    [1.0, 0.0, 0.0, 1.0],  // red
    [1.0, 1.0, 0.0, 1.0],  // yellow
    [0.0, 1.0, 0.0, 1.0],  // green
    [0.0, 0.0, 1.0, 1.0],  // blue
    [1.0, 0.0, 1.0, 1.0],  // magenta
    [0.0, 1.0, 1.0, 1.0],  // cyan
    [1.0, 1.0, 1.0, 1.0]   // white
];

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

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Element buffer for triangle fan indices
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // Color buffer and attribute
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Vertex buffer and attribute
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    thetaLoc = gl.getUniformLocation(program, "theta");
    translateLoc = gl.getUniformLocation(program, "translate");
    scaleLoc = gl.getUniformLocation(program, "scale");
    colorThetaLoc = gl.getUniformLocation(program, "colorTheta");

    // Event listeners for buttons
    document.getElementById("xButton").onclick = function () {
        axis = xAxis;
    };
    document.getElementById("yButton").onclick = function () {
        axis = yAxis;
    };
    document.getElementById("zButton").onclick = function () {
        axis = zAxis;
    };

    render();
}

function updateTranslation(translateAxis) {
    var boundary = 0.8;

    if (translate[translateAxis] >= boundary || translate[translateAxis] <= -boundary) {
        translatePositive[translateAxis] = !translatePositive[translateAxis];
        axis = (axis + 1) % 3;
    }

    if (translatePositive[translateAxis]) {
        translate[translateAxis] += translateVelocity[translateAxis];
    } else {
        translate[translateAxis] -= translateVelocity[translateAxis];
    }
}

function updateScaling() {
    if (scale[0] >= 1.75 || scale[0] <= 0.25) {
        scalePositive = !scalePositive;
    }

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
    theta[axis] += 1.5;

    // Handle translation
    updateTranslation(0);
    updateTranslation(1);

    // Handle scaling
    updateScaling();

    // Handle color
    colorTheta = (colorTheta + (2 * Math.PI / 1000)) % (2 * Math.PI);

    gl.uniform3fv(thetaLoc, theta);
    gl.uniform2fv(translateLoc, translate);
    gl.uniform3fv(scaleLoc, scale);
    gl.uniform1f(colorThetaLoc, colorTheta);

    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_BYTE, 0);

    requestAnimFrame(render);
}
