"use strict"

/** @type {HTMLCanvasElement} */
var canvas;
/** @type {WebGLRenderingContext} */
var gl;

// Cube transformation variables
var timeScale = 1.0;
var temp = 0;
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
var cameraRadius = 5.0;
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

// Light source properties
var lightColor = [1.0, 1.0, 1.0];

// Mouse interactivity
var startDragX = null;
var startDragY = null;

// Projection toggle variables
var perspectiveView = true;
var orthogonal = 0;
const orthogonalRatio = 20.0;

// Object textures
var universeTextures;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Load vertex and fragment shaders
    const shaderProgram = initShaders(gl, "vertex-shader", "fragment-shader");
    const programInfo = getProgramInfo(shaderProgram);
    gl.useProgram(programInfo.program);

    // Initialize triangles for cubes in scene
    const triangles = initTriangles(gl);
    const numTriPerCube = 12;
    const numCubes = 27;

    universeTextures = [
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/9/92/Solarsystemscope_texture_2k_mercury.jpg"), // Mercury
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Solarsystemscope_texture_8k_venus_surface.jpg/2560px-Solarsystemscope_texture_8k_venus_surface.jpg"), // Venus
        loadTexture(gl, "https://miro.medium.com/v2/resize:fit:1400/1*oA3BRueFhJ-R4WccWu5YBg.jpeg"), // Earth
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/e/ea/Mars_%284997052786%29.jpg"), // Mars
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/5/5e/Solarsystemscope_texture_8k_jupiter.jpg"), // Jupiter
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/1/1e/Solarsystemscope_texture_8k_saturn.jpg"), // Saturn
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/9/95/Solarsystemscope_texture_2k_uranus.jpg"), // Uranus
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/1/1e/Solarsystemscope_texture_2k_neptune.jpg"), // Neptune
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Solarsystemscope_texture_2k_moon.jpg/1200px-Solarsystemscope_texture_2k_moon.jpg"), // Moon
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/8/85/Solarsystemscope_texture_8k_stars_milky_way.jpg"), // Stars
        loadTexture(gl, "https://upload.wikimedia.org/wikipedia/commons/c/cb/Solarsystemscope_texture_2k_sun.jpg") // Sun
    ];

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
        // Resize the canvas and reset viewport
        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Update camera position
        updateCameraTranslation();

        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.CULL_FACE);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // // Draw objects to the canvas
        drawScene(gl, programInfo, triangles);

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

function drawScene(gl, programInfo, triangles) {
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

    // Find average depth for each triangle
    for (var triangleIndex = 0; triangleIndex < triangles.length; triangleIndex++) {
        // Calculate vertex z-values after transformations are applied
        const matrices = getTransformMatrices(triangles, triangleIndex);
        var zValues = [];

        for (var i = 0; i < triangles[triangleIndex].vertices.length; i++) {
            var vertex = triangles[triangleIndex].vertices[i];

            // Apply object transformations to z-coordinate
            vertex = transformVector4(matrices.scaling, vertex);
            vertex = transformVector4(matrices.rotation, vertex);
            vertex = transformVector4(matrices.translation, vertex);
            vertex = transformVector4(matrices.camera, vertex);
            vertex = transformVector4(modelViewMatrix, vertex);

            zValues.push(vertex[2]);
        }

        var sum = 0.0;
        for (var i = 0; i < zValues.length; i++) {
            sum += zValues[i];
        }

        const avgDepth = sum / zValues.length;

        // Set new object attribute for average depth
        triangles[triangleIndex].depth = avgDepth;
    }

    // Sort triangles by maximum depth (descending)
    triangles.sort((a, b) => a.depth - b.depth);

    // Create buffer for triangle data
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    var attributes = [];

    // Interleave vertex attributes within buffer
    for (var triangleIndex = 0; triangleIndex < triangles.length; triangleIndex++) {
        for (var i = 0; i < 3; i++) {
            attributes.push(triangles[triangleIndex].vertices[i]);
            attributes.push(triangles[triangleIndex].textures[i]);
            attributes.push(triangles[triangleIndex].normals[i]);
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(attributes), gl.STATIC_DRAW);

    const triangleBuffer = {
        vertexBuffer: vertexBuffer,
        stride: 36, // Bytes between consecutive interleaved attributes
        positionOffset: 0, // Offset for each attribute
        textureOffset: 16,
        normalOffset: 24,
    };

    // Link buffer data to vertex shader attributes
    setPositionAttribute(gl, triangleBuffer, programInfo);
    setTextureAttribute(gl, triangleBuffer, programInfo);
    setNormalAttribute(gl, triangleBuffer, programInfo);

    // Draw each triangle
    for (var triangleIndex = 0; triangleIndex < triangles.length; triangleIndex++) {
        // Calculate uniforms for current triangle
        translation = triangles[triangleIndex].translation;
        rotation = triangles[triangleIndex].rotation;
        scale = triangles[triangleIndex].scaling;

        ambientProduct = mult(triangles[triangleIndex].materials.ambient, lightColor);
        diffuseProduct = mult(triangles[triangleIndex].materials.diffuse, lightColor);
        specularProduct = mult(triangles[triangleIndex].materials.specular, lightColor);
        shininess = triangles[triangleIndex].materials.shininess;

        // Set uniforms for current triangle
        gl.uniform3fv(programInfo.uniformLocations.translation, translation);
        gl.uniform3fv(programInfo.uniformLocations.rotation, rotation);
        gl.uniform3fv(programInfo.uniformLocations.scale, scale);

        gl.uniform3fv(programInfo.uniformLocations.ambientProduct, ambientProduct);
        gl.uniform3fv(programInfo.uniformLocations.diffuseProduct, diffuseProduct);
        gl.uniform3fv(programInfo.uniformLocations.specularProduct, specularProduct);
        gl.uniform1f(programInfo.uniformLocations.shininess, shininess);

        // Set texture for current triangle
        gl.bindTexture(gl.TEXTURE_2D, universeTextures[triangles[triangleIndex].texIndex]);
        gl.uniform1i(programInfo.uniformLocations.sampler, 0);

        gl.drawArrays(gl.TRIANGLES, 3 * triangleIndex, 3);
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

function getTransformMatrices(triangles, triangleIndex) {
    var objScalingM;
    var objRotationM;
    var objTranslationM;
    var cameraM;

    objScalingM = [
        triangles[triangleIndex].scaling[0], 0.0, 0.0, 0.0,
        0.0, triangles[triangleIndex].scaling[1], 0.0, 0.0,
        0.0, 0.0, triangles[triangleIndex].scaling[2], 0.0,
        0.0, 0.0, 0.0, 1.0
    ];

    var rx = [
        [1.0,  0.0,  0.0, 0.0],
        [0.0,  Math.cos(triangles[triangleIndex].rotation[0] * Math.PI / 180.0),  -Math.sin(triangles[triangleIndex].rotation[0] * Math.PI / 180.0), 0.0],
        [0.0, Math.sin(triangles[triangleIndex].rotation[0] * Math.PI / 180.0),  Math.cos(triangles[triangleIndex].rotation[0] * Math.PI / 180.0), 0.0],
        [0.0,  0.0,  0.0, 1.0]
    ]
    var ry = [
        [Math.cos(triangles[triangleIndex].rotation[1] * Math.PI / 180.0), 0.0, Math.sin(triangles[triangleIndex].rotation[1] * Math.PI / 180.0), 0.0],
        [0.0, 1.0,  0.0, 0.0],
        [-Math.sin(triangles[triangleIndex].rotation[1] * Math.PI / 180.0), 0.0,  Math.cos(triangles[triangleIndex].rotation[1] * Math.PI / 180.0), 0.0],
        [0.0, 0.0,  0.0, 1.0]
    ]
    var rz = [
        [Math.cos(triangles[triangleIndex].rotation[2] * Math.PI / 180.0), -Math.sin(triangles[triangleIndex].rotation[2] * Math.PI / 180.0), 0.0, 0.0],
        [Math.sin(triangles[triangleIndex].rotation[2] * Math.PI / 180.0), Math.cos(triangles[triangleIndex].rotation[2] * Math.PI / 180.0), 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0, 1.0]
    ]

    // Ensure the mult method uses the correct calculation
    rx.matrix = true;
    ry.matrix = true;
    rz.matrix = true;

    objRotationM = mult(rx, mult(rz, ry));

    objTranslationM = [
        1.0, 0.0, 0.0, triangles[triangleIndex].translation[0],
        0.0, 1.0, 0.0, triangles[triangleIndex].translation[1],
        0.0, 0.0, 1.0, triangles[triangleIndex].translation[2],
        0.0, 0.0, 0.0, 1.0
    ];

    cameraM = [
        1.0, 0.0, 0.0, -cameraTranslation[0],
        0.0, 1.0, 0.0, -cameraTranslation[1],
        0.0, 0.0, 1.0, -cameraTranslation[2],
        0.0, 0.0, 0.0, 1.0
    ];

    return {
        scaling: objScalingM,
        rotation: objRotationM,
        translation: objTranslationM,
        camera: cameraM
    };
}

// Multiplies a 4D matrix (array of 16 values) by a 4D vector (array of 4 values)
function transformVector4(matrix, vector) {
    // Ensure row-major order matrix
    if (matrix.matrix) {
        matrix = transpose(matrix);
        matrix = flatten(matrix);
    }

    var result = [0.0, 0.0, 0.0, 0.0];

    for (var i = 0; i < matrix.length; i++) {
        result[Math.floor(i / 4)] += matrix[i] * vector[i % 4];
    }

    return result;
}
