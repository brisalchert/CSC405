"use strict"

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;
var points;
var numPoints = 50000;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Initialize vertices for gasket
    var vertices = [
        vec2(-1, -1),
        vec2(0, 1),
        vec2(1, -1)
    ];

    // Specify starting point p for iterations
    var u = add(vertices[0], vertices[1]);
    var v = add(vertices[0], vertices[2]);
    var p = scale(0.25, add(u, v));

    // Add the initial point to the array of points
    points = [p];

    // Compute each new point as the midpoint between the last
    // point and a random vertex
    for (var i = 0; points.length < numPoints; ++i) {
        // Select a random vertex index
        var j = Math.floor(Math.random() * 3);

        // Compute the new point
        p = add(points[i], vertices[j]);
        p = scale(0.5, p);

        // Add the new point
        points.push(p);
    }

    // Initialization for WebGL: create the viewport and
    // set clear color to white
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Load shaders using WebGL control functions
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data to the GPU using a buffer
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    // Associate vertex shader variable with data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    render();
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render the buffer data using points as the primitives
    gl.drawArrays(gl.POINTS, 0, points.length);
}
