"use strict"

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;

var colorTheta = 0.0;

var radius = 3.0;
var near = 1.0;
var far = 6.0;
var theta = 0.0;
var phi = 0.0;

var left = -6.0;
var right = 6.0;
var ytop = 3.0;
var bottom = -3.0;

var modelViewMatrix, projectionMatrix, normalMatrix, lightPosition;
var eye;
const at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var startDragX = null;
var startDragY = null;

var perspectiveView = false;

var texture;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Set viewport and set background color to black
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Load vertex and fragment shaders
    const shaderProgram = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(shaderProgram);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "vPosition"),
            vertexNormal: gl.getAttribLocation(shaderProgram, "vNormal"),
            vertexTexture: gl.getAttribLocation(shaderProgram, "vTextureCoord")
        },
        uniformLocations: {
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            normalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),
            lightPosition: gl.getUniformLocation(shaderProgram, "uLightPosition"),
            sampler: gl.getUniformLocation(shaderProgram, "uSampler"),
            colorTheta: gl.getUniformLocation(shaderProgram, "uColorTheta")
        }
    };

    // Initialize interleaved attribute buffer
    const buffer = initBuffer(gl);

    texture = loadTexture(gl, "https://plus.unsplash.com/premium_photo-1681400232080-d344759e6609?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D");

    // Link buffer data to vertex shader attributes
    setPositionAttribute(gl, buffer, programInfo);
    setTextureAttribute(gl, buffer, programInfo);
    setNormalAttribute(gl, buffer, programInfo);

    // Set event listeners for sliders
    document.getElementById("depthSlider").addEventListener("input", function(event) {
        far = 1.0 + parseFloat(event.target.value);
    });
    document.getElementById("radiusSlider").addEventListener("input", function(event) {
       radius = parseFloat(event.target.value);
    });
    document.getElementById("thetaSlider").addEventListener("input", function(event) {
        theta = parseFloat(event.target.value) * Math.PI/180.0;
    });
    document.getElementById("phiSlider").addEventListener("input", function(event) {
        phi = parseFloat(event.target.value) * Math.PI/180.0;
    });
    document.getElementById("aspectSlider").addEventListener("input", function(event) {
        right = 6.0 * parseFloat(event.target.value);
        left = -6.0 * parseFloat(event.target.value);
    });

    // Set event listener for perspective button
    document.getElementById("perspectiveButton").onclick = function() {
        perspectiveView = !perspectiveView;
    };

    // Set mouse interactivity event handlers
    canvas.onmousedown = mouseDownHandler;
    canvas.onmousemove = mouseMoveHandler;
    document.onmouseup = mouseUpHandler; // Ensure letting go outside canvas stops drag
    canvas.addEventListener("wheel", mouseWheelHandler);

    function render() {
        drawScene(gl, programInfo, buffer);

        requestAnimFrame(render);
    }

    requestAnimFrame(render);
}

function mouseWheelHandler(e) {
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

    radius -= 0.06 * delta;

    // Prevent radius from going out of range
    if (radius < parseFloat(document.getElementById("radiusSlider").min)) {
        radius = parseFloat(document.getElementById("radiusSlider").min);
    } else if (radius > parseFloat(document.getElementById("radiusSlider").max)) {
        radius = parseFloat(document.getElementById("radiusSlider").max);
    }

    // Prevent scrolling from moving the page
    e.preventDefault();
}

function mouseDownHandler(e) {
    startDragX = e.clientX;
    startDragY = e.clientY;
}

function mouseMoveHandler(e) {
    // Ensure a drag is started before making the movement
    if (startDragX === null || startDragY === null)
        return;

    drag(e.clientX - startDragX, e.clientY - startDragY);

    startDragX = e.clientX;
    startDragY = e.clientY;
}

function mouseUpHandler() {
    // Remove starting location to signal end of drag
    startDragX = null;
    startDragY = null;
}

function drag(deltaX, deltaY) {
    var radPerPixel = (Math.PI / 450);
    var deltaTheta = radPerPixel * deltaX;
    var deltaPhi = radPerPixel * deltaY;

    phi += deltaPhi;

    theta -= deltaTheta;
}

function resizeCanvasToDisplaySize(canvas) {
    // Lookup display size using CSS attributes
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if canvas size is different
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;

    if (needResize) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }

    return needResize;
  }

function drawScene(gl, programInfo, buffer) {
    // Resize the canvas and reset the viewport
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Ensure angles are within range for sliders
    while (theta < 0) {
        theta += 2.0 * Math.PI;
    }

    while (theta > 2.0 * Math.PI) {
        theta -= 2.0 * Math.PI;
    }

    phi = Math.min(Math.max(phi, (-Math.PI / 2.0)), (Math.PI / 2.0));

    // Ensure slider values match current camera orientation
    document.getElementById("thetaSlider").value = (theta * 180.0 / Math.PI);
    document.getElementById("phiSlider").value = (phi * 180.0 / Math.PI);
    document.getElementById("radiusSlider").value = radius;

    // Calculate eye location, using phi measured from the positive z-axis
    // in the plane x = 0 and theta measured from the positive x-axis in the
    // plane y = 0.

    eye = vec3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        radius * Math.cos(theta) * Math.cos(phi)
    );

    // Calculate new model-view matrix. The lookAt function positions the camera
    // at "eye" facing towards "at," which defines a plane with normal vector
    // (at - eye). The "up" direction orients the camera properly around its
    // own z-axis, since all rotations still point towards "at."

    modelViewMatrix = lookAt(eye, at, up);

    // Calculate the new projection matrix. Orthographic projection uses parallel
    // projectors perpendicular to the projection plane, preserving object scale
    // regardless of camera distance. Perspective projection shows depth at the
    // expense of accurate measurements, and is accomplished through distorting
    // the object with a normalization matrix prior to performing an orthogonal
    // projection. This accomplishes perspective viewing while maintaining the
    // standard pipeline of orthographic projections.

    if (perspectiveView) {
        var aspect = (right - left) / (ytop - bottom);

        projectionMatrix = perspective(90.0, aspect, near, far);
    } else {
        // Ensure correct near/far by negating them (camera faces negative-z)
        projectionMatrix = ortho(left, right, bottom, ytop, -near, -far);
    }

    // Calculate normal matrix, which transforms the vertices' normal vectors
    // based on the current orientation of the model view matrix.
    normalMatrix = inverse(modelViewMatrix);
    normalMatrix = transpose(normalMatrix);

    lightPosition = normalize(vec3(5.0, 5.0, 5.0))

    colorTheta = (colorTheta + (2 * Math.PI / 1000)) % (2 * Math.PI);

    // Pass new values to uniforms in the vertex and fragment shaders
    gl.uniform1f(programInfo.uniformLocations.colorTheta, colorTheta);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, flatten(normalMatrix));
    gl.uniform3fv(programInfo.uniformLocations.lightPosition, lightPosition);

    // Tell the shader that the texture is bound to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.sampler, 0);

    for (var i = 0; i < buffer.vertexCount; i += 3) {
        gl.drawArrays(gl.TRIANGLES, i, 3);
    }
}

// Links position data in buffer to the vertex shader attribute
function setPositionAttribute(gl, buffer, programInfo) {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffer.stride;
    const offset = buffer.positionOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vertexBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

// Links color data in buffer to the vertex shader attribute
function setColorAttribute(gl, buffer, programInfo) {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffer.stride;
    const offset = buffer.colorOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vertexBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}

// Links texture data in buffer to the vertex shader attribute
function setTextureAttribute(gl, buffer, programInfo) {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffer.stride;
    const offset = buffer.textureOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vertexBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexTexture,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexTexture);
}

// Links normal data in buffer to the vertex shader attribute
function setNormalAttribute(gl, buffer, programInfo) {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffer.stride;
    const offset = buffer.normalOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vertexBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexNormal,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
}
