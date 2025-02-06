"use strict"

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;

// Projection parameters
var left = -60.0;
var right = 60.0;
var ytop = 30.0;
var bottom = -30.0;
var near = 0.5;
const far = 20.0;

// Uniform variables
var modelViewMatrix, projectionMatrix, normalMatrix, lightDirection;
var translation, rotation, scale;
var ambientProduct, diffuseProduct, specularProduct, shininess;

// Camera variables
var eye;
const at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var cameraRadius = 2.0;
var cameraTheta = 0.0;
var cameraPhi = 0.0;
var cameraTranslation = [0.0, 0.0, 0.0];
var cameraMovements = [false, false, false, false, false, false];
const cameraDelta = 0.025;

// Key mappings
const keys = new Map();
keys.set("w", 0);
keys.set("a", 1);
keys.set("s", 2);
keys.set("d", 3);
keys.set(" ", 4);
keys.set("shift", 5);

// Object transformation vectors
var objTranslationCoords = [
    [0.0, 0.0, -1.0],
    [0.0, 0.0, 1.0]
];

const revolutionAngle = 3.0 * Math.PI / 4.0;
var objRotationThetas = [
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0]
];

const objScalingValues = [
    [1.5, 1.5, 1.5],
    [1.5, 1.5, 1.5]
];

// Object face culling
const objCullBackFace = [
    true,
    true
];

// Light source properties
var lightColor = [1.0, 1.0, 1.0];

// Mouse interactivity
var startDragX = null;
var startDragY = null;

// Projection toggle variables
var perspectiveView = true;
var orthogonal = 0;
const orthogonalRatio = 20.0;

var textures;

// Object picking variables
var mouseX = -1;
var mouseY = -1;
var oldPickIndex = -1;
var objectPicked = [
    false,
    false
];
var pickScaling = [
    1,
    1
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
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Load vertex and fragment shaders
    const shaderProgram = initShaders(gl, "vertex-shader", "fragment-shader");
    const pickShaderProgram = initShaders(gl, "pick-vertex-shader", "pick-fragment-shader");

    const programInfo = getProgramInfo(shaderProgram);
    const pickProgramInfo = getProgramInfo(pickShaderProgram);

    // Initialize interleaved attribute buffers for all scene objects
    const buffers = initBuffers(gl);

    // Create a texture to render to for object picking
    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create a depth renderbuffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

    function setFramebufferAttachmentSizes(width, height) {
        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
        // define size and format of level 0
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        const data = null;
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        width, height, border,
                        format, type, data);

        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    }

    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // Attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    const level = 0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);

    // Make a depth buffer the same size as the targetTexture
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    textures = [
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/9/92/Solarsystemscope_texture_2k_mercury.jpg"),
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Solarsystemscope_texture_8k_venus_surface.jpg/2560px-Solarsystemscope_texture_8k_venus_surface.jpg")
    ];

    // Link each object buffer's data to vertex shader attributes
    for (var i = 0; i < buffers.vertexBuffers.length; i++) {
        setPositionAttribute(gl, buffers, i, programInfo);
        setTextureAttribute(gl, buffers, i, programInfo);
        setNormalAttribute(gl, buffers, i, programInfo);
    }

    // Set event listeners for sliders
    document.getElementById("radiusSlider").addEventListener("input", function(event) {
       cameraRadius = parseFloat(event.target.value);
    });
    document.getElementById("thetaSlider").addEventListener("input", function(event) {
        cameraTheta = parseFloat(event.target.value) * Math.PI/180.0; // Convert to radians
    });
    document.getElementById("phiSlider").addEventListener("input", function(event) {
        cameraPhi = parseFloat(event.target.value) * Math.PI/180.0; // Convert to radians
    });
    document.getElementById("aspectSlider").addEventListener("input", function(event) {
        right = 60.0 * parseFloat(event.target.value);
        left = -60.0 * parseFloat(event.target.value);
    });
    document.getElementById("lightBrightnessSlider").addEventListener("input", function(event) {
        const intensity = parseFloat(event.target.value);
        const red = parseFloat(document.getElementById("sunRedSlider").value);
        const green = parseFloat(document.getElementById("sunGreenSlider").value);
        const blue = parseFloat(document.getElementById("sunBlueSlider").value);

        lightColor = [intensity * red, intensity * green, intensity * blue];
    });
    document.getElementById("sunRedSlider").addEventListener("input", function(event) {
        lightColor[0] = parseFloat(event.target.value);
    });
    document.getElementById("sunGreenSlider").addEventListener("input", function(event) {
        lightColor[1] = parseFloat(event.target.value);
    });
    document.getElementById("sunBlueSlider").addEventListener("input", function(event) {
        lightColor[2] = parseFloat(event.target.value);
    });

    // Set event listener for perspective button
    document.getElementById("perspectiveButton").onclick = function() {
        perspectiveView = !perspectiveView;
        orthogonal = (orthogonal + 1) % 2;
        near = 0.5 - (orthogonal * far);
    };

    // Set event listener for object picking
    gl.canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
     });

    // Set mouse interactivity event handlers
    canvas.onmousedown = mouseDownHandler;
    canvas.onmousemove = mouseMoveHandler;
    document.onmouseup = mouseUpHandler; // Ensure letting go outside canvas stops drag
    canvas.addEventListener("wheel", mouseWheelHandler);

    // Set keyboard interactivity event handlers
    document.onkeyup = keyUpHandler;
    document.onkeydown = keyDownHandler;

    // Prevent keydown getting stuck when context menu is open
    document.addEventListener('contextmenu', () => {
        for (var i = 0; i < cameraMovements.length; i++) {
            cameraMovements[i] = false;
        }
    });

    function render() {
        // Resize the canvas, reset viewport, and match framebuffer attachments
        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        setFramebufferAttachmentSizes(gl.canvas.width, gl.canvas.height);

        // Update camera position
        updateCameraTranslation();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.CULL_FACE);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Draw objects to the texture for object picking
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        drawScene(gl, pickProgramInfo, buffers);

        // Check if a pixel is selected
        const pixelX = mouseX * gl.canvas.width / gl.canvas.clientWidth;
        const pixelY = gl.canvas.height - mouseY * gl.canvas.height / gl.canvas.clientHeight - 1;
        const data = new Uint8Array(4);
        gl.readPixels(
            pixelX,            // x
            pixelY,            // y
            1,                 // width
            1,                 // height
            gl.RGBA,           // format
            gl.UNSIGNED_BYTE,  // type
            data);             // typed array to hold result
        const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);

        // Restore unselected object to normal
        if (oldPickIndex >= 0) {
            objectPicked[oldPickIndex] = false;
            oldPickIndex = -1;
        }

        // Scale selected object
        if (id > 0 && id != 10) { // Don't scale stars
            const pickIndex = id - 1;
            oldPickIndex = pickIndex;
            objectPicked[pickIndex] = true;
        }

        // // Draw objects to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        drawScene(gl, programInfo, buffers);

        requestAnimFrame(render);
    }

    requestAnimFrame(render);
}

function getProgramInfo(shaderProgram) {
    return {
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
            lightDirection: gl.getUniformLocation(shaderProgram, "uLightDirection"),
            orthogonal: gl.getUniformLocation(shaderProgram, "uOrthogonal"),
            sampler: gl.getUniformLocation(shaderProgram, "uSampler"),
            translation: gl.getUniformLocation(shaderProgram, "uTranslation"),
            rotation: gl.getUniformLocation(shaderProgram, "uRotation"),
            scale: gl.getUniformLocation(shaderProgram, "uScale"),
            ambientProduct: gl.getUniformLocation(shaderProgram, "uAmbientProduct"),
            diffuseProduct: gl.getUniformLocation(shaderProgram, "uDiffuseProduct"),
            specularProduct: gl.getUniformLocation(shaderProgram, "uSpecularProduct"),
            shininess: gl.getUniformLocation(shaderProgram, "uShininess"),
            cameraTranslation: gl.getUniformLocation(shaderProgram, "uCameraTranslation"),
            pickID: gl.getUniformLocation(shaderProgram, "uPickID"),
            scaleMult: gl.getUniformLocation(shaderProgram, "uScaleMult")
        }
    };
}

function mouseWheelHandler(e) {
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

    cameraRadius -= 0.45 * delta;

    // Prevent radius from going out of range
    if (cameraRadius < parseFloat(document.getElementById("radiusSlider").min)) {
        cameraRadius = parseFloat(document.getElementById("radiusSlider").min);
    } else if (cameraRadius > parseFloat(document.getElementById("radiusSlider").max)) {
        cameraRadius = parseFloat(document.getElementById("radiusSlider").max);
    }

    // Prevent scrolling from moving the page
    e.preventDefault();
}

function mouseDownHandler(e) {
    // Only allow left click dragging
    if (e.button === 0) {
        startDragX = e.clientX;
        startDragY = e.clientY;
    }
}

function mouseMoveHandler(e) {
    // Ensure a drag is started before making the movement
    if (startDragX === null || startDragY === null)
        return;

    drag(e.clientX - startDragX, e.clientY - startDragY);

    startDragX = e.clientX;
    startDragY = e.clientY;
}

function mouseUpHandler(e) {
    if (e.button === 0) {
        // Remove starting location to signal end of drag
        startDragX = null;
        startDragY = null;
    }
}

function drag(deltaX, deltaY) {
    var radPerPixel = (Math.PI / 450);
    var deltaTheta = radPerPixel * deltaX;
    var deltaPhi = radPerPixel * deltaY;

    cameraPhi += deltaPhi;

    cameraTheta -= deltaTheta;
}

function keyDownHandler(e) {
    // Prevent repetitive keydown triggers for each key
    if (!keys.has(e.key.toLowerCase()) || cameraMovements[keys.get(e.key.toLowerCase())]) return;
    cameraMovements[keys.get(e.key.toLowerCase())] = true;
}

function keyUpHandler(e) {
    cameraMovements[keys.get(e.key.toLowerCase())] = false;
}

function resizeCanvasToDisplaySize(canvas) {
    // Lookup display size using CSS attributes
    const displayWidth = canvas.clientWidth;
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

function updateCameraTranslation() {
    // Don't allow translation in orthogonal mode
    if (!perspectiveView) {
        return;
    }

    // Update the translation matrix based on the camera's current angle
    // and the keys that are being held
    if (cameraMovements[0]) {
        cameraTranslation[0] -= cameraDelta * Math.sin(cameraTheta) * Math.cos(cameraPhi);
        cameraTranslation[1] -= cameraDelta * Math.sin(cameraPhi);
        cameraTranslation[2] -= cameraDelta * Math.cos(cameraTheta) * Math.cos(cameraPhi);
    }
    if (cameraMovements[1]) {
        cameraTranslation[0] -= cameraDelta * Math.cos(cameraTheta);
        cameraTranslation[2] += cameraDelta * Math.sin(cameraTheta);
    }
    if (cameraMovements[2]) {
        cameraTranslation[0] += cameraDelta * Math.sin(cameraTheta) * Math.cos(cameraPhi);
        cameraTranslation[1] += cameraDelta * Math.sin(cameraPhi);
        cameraTranslation[2] += cameraDelta * Math.cos(cameraTheta) * Math.cos(cameraPhi);
    }
    if (cameraMovements[3]) {
        cameraTranslation[0] += cameraDelta * Math.cos(cameraTheta);
        cameraTranslation[2] -= cameraDelta * Math.sin(cameraTheta);
    }
    if (cameraMovements[4]) {
        cameraTranslation[0] -= cameraDelta * Math.sin(cameraTheta) * Math.sin(cameraPhi);
        cameraTranslation[1] += cameraDelta * Math.cos(cameraPhi);
        cameraTranslation[2] -= cameraDelta * Math.cos(cameraTheta) * Math.sin(cameraPhi);
    }
    if (cameraMovements[5]) {
        cameraTranslation[0] += cameraDelta * Math.sin(cameraTheta) * Math.sin(cameraPhi);
        cameraTranslation[1] -= cameraDelta * Math.cos(cameraPhi);
        cameraTranslation[2] += cameraDelta * Math.cos(cameraTheta) * Math.sin(cameraPhi);
    }
}

function updatePickScaling(objIndex) {
    if (objectPicked[objIndex] && pickScaling[objIndex] < 2.0) {
        pickScaling[objIndex] += 0.025;
    } else if (!objectPicked[objIndex] && pickScaling[objIndex] > 1.0) {
        pickScaling[objIndex] -= 0.025;
    }
}

function drawScene(gl, programInfo, buffers) {
    gl.useProgram(programInfo.program);

    // Ensure angles are within range for sliders
    while (cameraTheta < 0) {
        cameraTheta += 2.0 * Math.PI;
    }

    while (cameraTheta > 2.0 * Math.PI) {
        cameraTheta -= 2.0 * Math.PI;
    }

    cameraPhi = Math.min(Math.max(cameraPhi, (-Math.PI / 2.0)), (Math.PI / 2.0));

    // Ensure slider values match current camera orientation
    document.getElementById("thetaSlider").value = (cameraTheta * 180.0 / Math.PI);
    document.getElementById("phiSlider").value = (cameraPhi * 180.0 / Math.PI);
    document.getElementById("radiusSlider").value = cameraRadius;

    // Calculate eye location, using phi measured from the positive z-axis
    // in the plane x = 0 and theta measured from the positive x-axis in the
    // plane y = 0.

    eye = vec3(
        cameraRadius * Math.sin(cameraTheta) * Math.cos(cameraPhi),
        cameraRadius * Math.sin(cameraPhi),
        cameraRadius * Math.cos(cameraTheta) * Math.cos(cameraPhi)
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
        projectionMatrix = ortho(
            left / orthogonalRatio,
            right / orthogonalRatio,
            bottom / orthogonalRatio,
            ytop / orthogonalRatio,
            -near,
            -far
        );
        orthogonal = 1;
    }

    // Calculate normal matrix, which transforms the vertices' normal vectors
    // based on the current orientation of the model view matrix.
    normalMatrix = inverse(modelViewMatrix);
    normalMatrix = transpose(normalMatrix);

    lightDirection = vec3(0.0, 0.0, 10.0);

    // Pass new values to universal uniforms in the vertex and fragment shaders
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, flatten(normalMatrix));
    gl.uniform3fv(programInfo.uniformLocations.lightDirection, lightDirection);
    gl.uniform1i(programInfo.uniformLocations.orthogonal, orthogonal);
    // Don't apply camera translation to orthogonal view
    if (perspectiveView) {
        gl.uniform3fv(programInfo.uniformLocations.cameraTranslation, cameraTranslation);
    } else {
        gl.uniform3fv(programInfo.uniformLocations.cameraTranslation, vec3());
    }

    // Tell the shader that the texture is bound to texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Draw each object in the scene
    for (var objIndex = 0; objIndex < buffers.vertexBuffers.length; objIndex++) {
        // Set face culling for current object
        if (objCullBackFace[objIndex]) {
            gl.cullFace(gl.BACK);
        } else {
            gl.cullFace(gl.FRONT);
        }

        // Calculate uniforms for current object
        translation = objTranslationCoords[objIndex];
        rotation = objRotationThetas[objIndex];
        scale = objScalingValues[objIndex];
        updatePickScaling(objIndex);

        ambientProduct = mult(buffers.materials.ambient[objIndex], lightColor);
        diffuseProduct = mult(buffers.materials.diffuse[objIndex], lightColor);
        specularProduct = mult(buffers.materials.specular[objIndex], lightColor);
        shininess = buffers.materials.shininess[objIndex];

        // Set uniforms for current object
        gl.uniform3fv(programInfo.uniformLocations.translation, translation);
        gl.uniform3fv(programInfo.uniformLocations.rotation, rotation);
        gl.uniform3fv(programInfo.uniformLocations.scale, scale);

        gl.uniform3fv(programInfo.uniformLocations.ambientProduct, ambientProduct);
        gl.uniform3fv(programInfo.uniformLocations.diffuseProduct, diffuseProduct);
        gl.uniform3fv(programInfo.uniformLocations.specularProduct, specularProduct);
        gl.uniform1f(programInfo.uniformLocations.shininess, shininess);

        gl.uniform4fv(programInfo.uniformLocations.pickID, buffers.pickIDs[objIndex]);
        gl.uniform1f(programInfo.uniformLocations.scaleMult, pickScaling[objIndex]);

        // Set texture for current object
        gl.bindTexture(gl.TEXTURE_2D, textures[objIndex]);
        gl.uniform1i(programInfo.uniformLocations.sampler, 0);

        for (var i = 0; i < buffers.vertexCounts[objIndex]; i += 3) {
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
