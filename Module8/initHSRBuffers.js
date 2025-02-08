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

const numTriangles = 12;
const numCubes = 27;

function initTriangles() {
    var i = 0;
    var cubeVertices = [];
    var cubeTextures = [];
    var cubeNormals = [];
    var materialAmbient = [];
    var materialDiffuse = [];
    var materialSpecular = [];
    var materialShininess = [];
    var objTranslationCoords = [];
    var objRotationThetas = [];
    var objScalingValues = [];
    var texIndices = [];
    var triangles = [];

    // Initialize triangle attributes
    for (var i = 0; i < numCubes; i++) {
        const cube = initCubeTriangles();
        cubeVertices.push(cube.positions);
        cubeTextures.push(cube.textures);
        cubeNormals.push(cube.normals);

        const ambient = [0.3, 0.3, 0.3];
        const diffuse = [
            Math.random() * 0.3 + 0.6,
            Math.random() * 0.3 + 0.6,
            Math.random() * 0.3 + 0.6
        ];
        const specular = [Math.random(), Math.random(), Math.random()];
        const shininess = Math.random() * 20.0 + 2.0;

        materialAmbient.push(ambient);
        materialDiffuse.push(diffuse);
        materialSpecular.push(specular);
        materialShininess.push(shininess);

        objRotationThetas.push([0.0, 0.0, 0.0]);
        objScalingValues.push([2.0, 2.0, 2.0]);

        const objTranslation = [
            (i % 3) - 1.0,
            (Math.floor((i / 3) % 3)) - 1.0,
            (Math.floor(i / 9)) - 1.0
        ];

        objTranslationCoords.push(objTranslation);

        texIndices.push(Math.floor(Math.random() * 11.0));
    }

    // Construct array of triangles
    for (var cubeIndex = 0; cubeIndex < numCubes; cubeIndex++) {
        for (var triangleIndex = 0; triangleIndex < numTriangles; triangleIndex++) {
            triangles.push({
                vertices: cubeVertices[cubeIndex][triangleIndex],
                textures: cubeTextures[cubeIndex][triangleIndex],
                normals: cubeNormals[cubeIndex][triangleIndex],
                scaling: objScalingValues[cubeIndex],
                rotation: objRotationThetas[cubeIndex],
                translation: objTranslationCoords[cubeIndex],
                materials: {
                    ambient: materialAmbient[cubeIndex],
                    diffuse: materialDiffuse[cubeIndex],
                    specular: materialSpecular[cubeIndex],
                    shininess: materialShininess[cubeIndex]
                },
                texIndex: texIndices[cubeIndex]
            });
        }
    }

    return triangles;
}

function initCubeTriangles() {
    var positions = initPositions();
    var textureCoords = initTextureCoords();
    var normals = initNormals();

    const cube = {
        positions: positions,
        textures: textureCoords,
        normals: normals
    };

    return cube;
}

function initPositions() {
    var positions = [];

    for (var i = 0; i < indices.length; i++) {
        const [a, b, c, d] = indices[i];
        const vertexIndices = [a, b, c, a, c, d];
        var triangle1 = [];
        var triangle2 = [];

        for (var j = 0; j < vertexIndices.length; j++) {
            if (j < 3) {
                triangle1.push(vertices[vertexIndices[j]]);
            } else {
                triangle2.push(vertices[vertexIndices[j]]);
            }
        }

        positions.push(triangle1);
        positions.push(triangle2);
    }

    return positions;
}

function initTextureCoords() {
    var textureCoords = [];

    for (var i = 0; i < indices.length; i++) {
        const textureIndices = [0, 1, 2, 0, 2, 3];

        var triangle1 = [];
        var triangle2 = [];

        for (var j = 0; j < textureIndices.length; j++) {
            if (j < 3) {
                triangle1.push(textureCorners[textureIndices[j]]);
            } else {
                triangle2.push(textureCorners[textureIndices[j]]);
            }
        }

        textureCoords.push(triangle1);
        textureCoords.push(triangle2);
    }

    return textureCoords;
}

function initNormals() {
    var normals = [];

    for (var i = 0; i < indices.length; i++) {
        const [a, b, c, d] = indices[i];
        const numNormals = 6;

        const edge1 = subtract(vertices[b], vertices[a]);
        const edge2 = subtract(vertices[c], vertices[a]);
        const normal = normalize(cross(edge1, edge2));

        // Push normals for all vertices of both triangles
        normals.push([normal, normal, normal]);
        normals.push([normal, normal, normal]);
    }

    return normals;
}
