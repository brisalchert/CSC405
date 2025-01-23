// Define starting vertices for tetrahedron
var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(0.816497, -0.471405, 0.333333, 1);
var vd = vec4(-0.816497, -0.471405, 0.333333, 1);

var positions = [];
var normals = [];
var count = 0;

function triangle(a, b, c) {
    positions.push(a);
    positions.push(b);
    positions.push(c);

    // normals are vectors
    normals.push([a[0], a[1], a[2]]);
    normals.push([b[0], b[1], b[2]]);
    normals.push([c[0], c[1], c[2]]);

    count += 3;
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {

        // Get midpoints of sides
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var bc = mix(b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        // Subdivide recursively
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    }
    else {
        triangle(a, b, c);
    }
}

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

function initBuffer(gl) {
    const buffer = initVertexBuffer(gl);

    return {
        vertexBuffer: buffer,
        stride: 36, // Bytes between consecutive interleaved attributes
        positionOffset: 0, // Offset for each attribute
        textureOffset: 16,
        normalOffset: 24,
        vertexCount: count
    };
}

function initVertexBuffer(gl) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    tetrahedron(va, vb, vc, vd, 5);
    var textureCoords = initTextureCoords();

    var attributes = [];

    // Interleave vertex attributes within the same buffer
    for (var i = 0; i < count; i++) {
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

    for (var i = 0; i < count / 3; i++) {
        const textureIndices = [0, 1, 2];

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
