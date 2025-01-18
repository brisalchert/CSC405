const indices = [
    [1, 0, 3, 2],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
    [6, 5, 1, 2],
    [4, 5, 6, 7],
    [5, 4, 0, 1]
];

const vertices = [
    vec4(-0.11, -0.11,  0.11, 1.0),
    vec4(-0.11,  0.11,  0.11, 1.0),
    vec4( 0.11,  0.11,  0.11, 1.0),
    vec4( 0.11, -0.11,  0.11, 1.0),
    vec4(-0.11, -0.11, -0.11, 1.0),
    vec4(-0.11,  0.11, -0.11, 1.0),
    vec4( 0.11,  0.11, -0.11, 1.0),
    vec4( 0.11, -0.11, -0.11, 1.0)
];

const textureCorners = [
    [0.0, 0.0],
    [0.0, 1.0],
    [1.0, 1.0],
    [1.0, 0.0]
];

const vertexColors = [
    [0.0, 0.0, 0.0, 1.0],  // black
    [1.0, 0.0, 0.0, 1.0],  // red
    [1.0, 1.0, 0.0, 1.0],  // yellow
    [0.0, 1.0, 0.0, 1.0],  // green
    [0.0, 0.0, 1.0, 1.0],  // blue
    [1.0, 0.0, 1.0, 1.0],  // magenta
    [1.0, 1.0, 1.0, 1.0],  // white
    [0.0, 1.0, 1.0, 1.0]   // cyan
];

function initBuffers(gl) {
    const positionBuffer = initPositionBuffer(gl);
    const textureBuffer = initTextureBuffer(gl);
    const normalBuffer = initNormalBuffer(gl);

    return {
        position: positionBuffer,
        texture: textureBuffer,
        normal: normalBuffer
    };
}

function initPositionBuffer(gl) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    var positions = [];

    for (var i = 0; i < indices.length; i++) {
        const [a, b, c, d] = indices[i];
        const vertexIndices = [a, b, c, a, c, d];

        for (var j = 0; j < vertexIndices.length; j++) {
            positions.push(vertices[vertexIndices[j]]);
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    return positionBuffer;
}

function initTextureBuffer(gl) {
    const textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);

    var textureCoords = [];

    for (var i = 0; i < indices.length; i++) {
        const textureIndices = [0, 1, 2, 0, 2, 3];

        for (var j = 0; j < textureIndices.length; j++) {
            textureCoords.push(textureCorners[textureIndices[j]]);
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);

    return textureBuffer;
}

function initColorBuffer(gl) {
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    var colors = [];

    for (var i = 0; i < indices.length; i++) {
        const [a, b, c, d] = indices[i];
        const colorIndices = [a, b, c, a, c, d];

        for (var j = 0; j < colorIndices.length; j++) {
            colors.push(vertexColors[colorIndices[j]]);
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    return colorBuffer;
}

function initNormalBuffer(gl) {
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    var normals = [];

    for (var i = 0; i < indices.length; i++) {
        const [a, b, c, d] = indices[i];
        const numNormals = 6;

        const edge1 = subtract(vertices[b], vertices[a]);
        const edge2 = subtract(vertices[c], vertices[a]);
        const normal = normalize(cross(edge1, edge2));

        for (var j = 0; j < numNormals; j++) {
            normals.push(normal);
        }
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    return normalBuffer;
}
