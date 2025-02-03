// Define starting vertices for octahedron
var va = vec4(0.0, 1.0, 0.0, 1.0);
var vb = vec4(0.0, 0.0, 1.0, 1.0);
var vc = vec4(1.0, 0.0, 0.0, 1.0);
var vd = vec4(0.0, 0.0, -1.0, 1.0);
var ve = vec4(-1.0, 0.0, 0.0, 1.0);
var vf = vec4(0.0, -1.0, 0.0, 1.0);

const materialAmbient = [
    [0.1, 0.1, 0.1], // Earth
    [0.1, 0.1, 0.1], // Moon
    [0.3, 0.3, 0.3]  // Stars
];

const materialDiffuse = [
    [0.85, 0.85, 0.85],
    [0.9, 0.9, 0.9],
    [0.0, 0.0, 0.0]
];

const materialSpecular = [
    [0.7, 0.7, 0.7],
    [0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0]
];

const materialShininess = [
    3.0,
    1.0,
    1.0
];

var positions = [];
var normals = [];
var countVertices = 0;

const subdivide = 5;

function triangle(a, b, c) {
    positions.push(a);
    positions.push(b);
    positions.push(c);

    // normals are vectors
    normals.push([a[0], a[1], a[2]]);
    normals.push([b[0], b[1], b[2]]);
    normals.push([c[0], c[1], c[2]]);

    countVertices += 3;
}

function tetrahedron(a, b, c, d, e, f, n) {
    // Top triangles
    divideTriangle(a, b, c, n);
    divideTriangle(a, c, d, n);
    divideTriangle(a, d, e, n);
    divideTriangle(a, e, b, n);

    // // Bottom triangles
    divideTriangle(f, c, b, n);
    divideTriangle(f, d, c, n);
    divideTriangle(f, e, d, n);
    divideTriangle(f, b, e, n);
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

function initBuffers(gl) {
    const [earthBuffer, earthVertexCount] = initSphereBuffer(gl);
    const [moonBuffer, moonVertexCount] = initSphereBuffer(gl);
    const [starsBuffer, starsVertexCount] = initSphereBuffer(gl);

    const buffers = [earthBuffer, moonBuffer, starsBuffer];
    const vertexCounts = [earthVertexCount, moonVertexCount, starsVertexCount];

    return {
        vertexBuffers: buffers, // Contains a buffer for each object in the scene
        materials: {
            ambient: materialAmbient,
            diffuse: materialDiffuse,
            specular: materialSpecular,
            shininess: materialShininess
        },
        stride: 36, // Bytes between consecutive interleaved attributes
        positionOffset: 0, // Offset for each attribute
        textureOffset: 16,
        normalOffset: 24,
        vertexCounts: vertexCounts
    };
}

function initSphereBuffer(gl) {
    // Reset attribute arrays and vertex count
    positions = [];
    normals = [];
    countVertices = 0;

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    tetrahedron(va, vb, vc, vd, ve, vf, subdivide);
    var textureCoords = initSphereTextureCoords();

    var attributes = [];

    // Interleave vertex attributes within the same buffer
    for (var i = 0; i < countVertices; i++) {
        attributes.push(positions[i]);
        attributes.push(textureCoords[i]);
        attributes.push(normals[i]);
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(attributes), gl.STATIC_DRAW);

    return [vertexBuffer, countVertices];
}

function initSphereTextureCoords() {
    var textureCoords = [];

    // Map sphere UV coordinates to rectangular coordinates
    // within the texture
    for (var i = 0; i < countVertices; i += 3) {
        var u = [
            0.5 + Math.atan2(positions[i][0], positions[i][2]) / (2.0 * Math.PI),
            0.5 + Math.atan2(positions[i + 1][0], positions[i + 1][2]) / (2.0 * Math.PI),
            0.5 + Math.atan2(positions[i + 2][0], positions[i + 2][2]) / (2.0 * Math.PI)
        ];
        var v = [
            0.5 - Math.asin(positions[i][1]) / Math.PI,
            0.5 - Math.asin(positions[i + 1][1]) / Math.PI,
            0.5 - Math.asin(positions[i + 2][1]) / Math.PI
        ];

        const maxU = Math.max(u[0], Math.max(u[1], u[2]));
        const minU = Math.min(u[0], Math.min(u[1], u[2]));

        // By default, vertices with x = 0 and z < 0 will always use u = 1.0,
        // since this corresponds to an angle of pi radians. However, those
        // that are part of triangles with vertices on the left side of the
        // texture should use u = 0.0.
        if ((maxU - minU > 0.85)) {
            for (var j = 0; j < u.length; j++) {
                if (u[j] === maxU) {
                    u[j] = 0.0;
                }
            }
        }

        for (var j = 0; j < u.length; j++) {
            textureCoords.push([u[j], v[j]]);
        }
    }

    return textureCoords;
}
