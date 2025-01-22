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

function initBuffer(gl, numElements) {
    const buffer = initVertexBuffer(gl, numElements);

    return {
        vertexBuffer: buffer,
        stride: 36, // Bytes between consecutive interleaved attributes
        positionOffset: 0, // Offset for each attribute
        textureOffset: 16,
        normalOffset: 24
    };
}

function initVertexBuffer(gl, numElements) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    var positions = initPositions();
    var textureCoords = initTextureCoords();
    var normals = initNormals();

    var attributes = [];

    // Interleave vertex attributes within the same buffer
    for (var i = 0; i < numElements; i++) {
        attributes.push(positions[i]);
        attributes.push(textureCoords[i]);
        attributes.push(normals[i]);
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(attributes), gl.STATIC_DRAW);

    return vertexBuffer;
}

function initPositions() {
    var positions = [];

    for (var i = 0; i < indices.length; i++) {
        const [a, b, c, d] = indices[i];
        const vertexIndices = [a, b, c, a, c, d];

        for (var j = 0; j < vertexIndices.length; j++) {
            positions.push(vertices[vertexIndices[j]]);
        }
    }

    return positions;
}

function initTextureCoords() {
    var textureCoords = [];

    for (var i = 0; i < indices.length; i++) {
        const textureIndices = [0, 1, 2, 0, 2, 3];

        for (var j = 0; j < textureIndices.length; j++) {
            textureCoords.push(textureCorners[textureIndices[j]]);
        }
    }

    return textureCoords;
}

function initColors() {
    var colors = [];

    for (var i = 0; i < indices.length; i++) {
        const [a, b, c, d] = indices[i];
        const colorIndices = [a, b, c, a, c, d];

        for (var j = 0; j < colorIndices.length; j++) {
            colors.push(vertexColors[colorIndices[j]]);
        }
    }

    return colors;
}

function initNormals() {
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

    return normals;
}
