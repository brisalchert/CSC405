"use strict"

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;

var radius = 3.0;
const near = 0.5;
const far = 60.0;
var theta = 0.0;
var phi = 0.0;

var left = -6.0;
var right = 6.0;
var ytop = 3.0;
var bottom = -3.0;

var modelViewMatrix, projectionMatrix, normalMatrix, lightPosition, orthogonal;
var translation, rotation, scale;
var ambientProduct, diffuseProduct, specularProduct, shininess;
var eye;
const at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var translationCoords = [
    [0.0, 0.0, 0.0],
    [4.0, 0.0, 0.0]
];

var rotationThetas = [
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0]
];

const scalingValues = [
    [1.0, 1.0, 1.0],
    [0.25, 0.25, 0.25]
];

const lightColor = [1.0, 1.0, 1.0];

var time;

var startDragX = null;
var startDragY = null;

var perspectiveView = false;

var textures;

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
            orthogonal: gl.getUniformLocation(shaderProgram, "uOrthogonal"),
            sampler: gl.getUniformLocation(shaderProgram, "uSampler"),
            translation: gl.getUniformLocation(shaderProgram, "uTranslation"),
            rotation: gl.getUniformLocation(shaderProgram, "uRotation"),
            scale: gl.getUniformLocation(shaderProgram, "uScale"),
            ambientProduct: gl.getUniformLocation(shaderProgram, "uAmbientProduct"),
            diffuseProduct: gl.getUniformLocation(shaderProgram, "uDiffuseProduct"),
            specularProduct: gl.getUniformLocation(shaderProgram, "uSpecularProduct"),
            shininess: gl.getUniformLocation(shaderProgram, "uShininess")
        }
    };

    // Initialize interleaved attribute buffer
    const buffers = initBuffers(gl);

    textures = [
        loadTexture(gl, "https://media2.dev.to/dynamic/image/width=800%2Cheight=%2Cfit=scale-down%2Cgravity=auto%2Cformat=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fpkyl2esnlgqtq4gakgdg.png"),
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Solarsystemscope_texture_8k_moon.jpg/2560px-Solarsystemscope_texture_8k_moon.jpg")
    ];

    // Link each object buffer's data to vertex shader attributes
    for (var i = 0; i < buffers.vertexBuffers.length; i++) {
        setPositionAttribute(gl, buffers, i, programInfo);
        setTextureAttribute(gl, buffers, i, programInfo);
        setNormalAttribute(gl, buffers, i, programInfo);
    }

    // Set event listeners for sliders
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
        drawScene(gl, programInfo, buffers);

        requestAnimFrame(render);
    }

    requestAnimFrame(render);
}

function mouseWheelHandler(e) {
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

    radius -= 0.15 * delta;

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

function drawScene(gl, programInfo, buffers) {
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
        orthogonal = 0;
    } else {
        // Ensure correct near/far by negating them (camera faces negative-z)
        projectionMatrix = ortho(left, right, bottom, ytop, -near, -far);
        orthogonal = 1;
    }

    // Calculate normal matrix, which transforms the vertices' normal vectors
    // based on the current orientation of the model view matrix.
    normalMatrix = inverse(modelViewMatrix);
    normalMatrix = transpose(normalMatrix);

    lightPosition = vec4(10.0, 10.0, 0.0, 1.0);

    // Pass new values to universal uniforms in the vertex and fragment shaders
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, flatten(normalMatrix));
    gl.uniform4fv(programInfo.uniformLocations.lightPosition, lightPosition);
    gl.uniform1i(programInfo.uniformLocations.orthogonal, orthogonal);

    // Tell the shader that the texture is bound to texture unit 0
    gl.activeTexture(gl.TEXTURE0);


    for (var objIndex = 0; objIndex < buffers.vertexBuffers.length; objIndex++) {
        // Set uniforms for current object
        translation = translationCoords[objIndex];
        rotation = rotationThetas[objIndex];
        scale = scalingValues[objIndex];

        ambientProduct = mult(buffers.materials.ambient[objIndex], lightColor);
        diffuseProduct = mult(buffers.materials.diffuse[objIndex], lightColor);
        specularProduct = mult(buffers.materials.specular[objIndex], lightColor);
        shininess = buffers.materials.shininess[objIndex];

        gl.uniform3fv(programInfo.uniformLocations.translation, translation);
        gl.uniform3fv(programInfo.uniformLocations.rotation, rotation);
        gl.uniform3fv(programInfo.uniformLocations.scale, scale);

        gl.uniform3fv(programInfo.uniformLocations.ambientProduct, ambientProduct);
        gl.uniform3fv(programInfo.uniformLocations.diffuseProduct, diffuseProduct);
        gl.uniform3fv(programInfo.uniformLocations.specularProduct, specularProduct);
        gl.uniform1f(programInfo.uniformLocations.shininess, shininess);

        // Set texture for current object
        gl.bindTexture(gl.TEXTURE_2D, textures[objIndex]);
        gl.uniform1i(programInfo.uniformLocations.sampler, 0);

        for (var i = 0; i < buffers.vertexCount; i += 3) {
            gl.drawArrays(gl.TRIANGLES, i, 3);
        }
    }
}

// Links position data in buffer to the vertex shader attribute
function setPositionAttribute(gl, buffers, bufferIndex, programInfo) {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffers.stride;
    const offset = buffers.positionOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffers[bufferIndex]);
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
function setColorAttribute(gl, buffers, bufferIndex, programInfo) {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffers.stride;
    const offset = buffers.colorOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffers[bufferIndex]);
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
function setTextureAttribute(gl, buffers, bufferIndex, programInfo) {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffers.stride;
    const offset = buffers.textureOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffers[bufferIndex]);
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
function setNormalAttribute(gl, buffers, bufferIndex, programInfo) {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = buffers.stride;
    const offset = buffers.normalOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffers[bufferIndex]);
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
