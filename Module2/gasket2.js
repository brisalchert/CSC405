"use strict"

var canvas;
var gl;
var points = [];
var numTimesToSubdivide = 0;

function init() {
    canvas = document.getElementById("gl-canvas");

    const numPositions = 5000;
    var positions = [];

    var vertices = [
        vec2(-1, -1),
        vec2(0, 1),
        vec2(1, -1)
    ];

    var u = add(vertices[0], vertices[1]);
    var v = add(vertices[0], vertices[2]);
    var p = mult(0.5, u, v);

    positions.push(p);

    for (var i = 0; i < numPositions - 1; ++i) {
        var j = Math.floor(3 * Math.random());

        p = add(positions[i], vertices[j]);
        p = mult(0.5, p);

        positions.push(p);
    }

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, numPositions);
}
