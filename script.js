let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
ctx.strokeStyle = "black";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let colors = [];
let mouseAngles = math.identity(3)._data;
let cubeSize = 5;
let tileSize = 100;
let offset = tileSize * cubeSize / 2;
let focalLength = 1000;
let distance = 1100;
let stickers = [];
let layers = Array(6 * cubeSize).fill().map(() => []);
let toDraw = [];
let center = [canvas.width / 2, canvas.height / 2];
let changeAngle = -Math.PI / 2;
let numberKey = 0;
let layerAxes = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
let scrambleLengths = [0, 0, 10, 20];
let zoom = 1;
let layerPos = [[0, 0, offset], [0, 0, -offset], [offset, 0, 0], [-offset, 0, 0], [0, offset, 0], [0, -offset, 0]];
let newLayerPos = layerPos.map((x) => x.reduce((sum, y, i) => (y != 0)? " +-".at(Math.sign(y)) + "xyz"[i]:sum, ""));
let mouseDistance = 0;
let mouseAxis = [0, 0, 0];
let mousePos = [0, 0];
let rotationSensitivity = 100;

function clamp(x, min, max)
{
    return Math.max(Math.min(x, max), min);
}

document.onmousemove = (event) => {
    if (document.pointerLockElement)
    {
        mouseAngles = math.multiply(math.rotationMatrix(-event.movementX * rotationSensitivity / 10000, [0, 1, 0]), math.rotationMatrix(event.movementY * rotationSensitivity / 10000, [1, 0, 0]), mouseAngles);
        sortLayers();
    }
    else
    {
        mousePos = [event.clientX, event.clientY];
    }
};
document.onwheel = (event) => {
    zoom += event.deltaY / 1800;
    zoom = Math.min(Math.max(0, zoom), 200);
};

document.onkeydown = (event) => {
    switch (event.key.toLowerCase())
    {
        case "shift":
            changeAngle = Math.PI / 2;
            break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
            numberKey = event.key;
            break;
        case "b":
            turnLayer(0 + 6 * numberKey);
            break;
        case "f":
            turnLayer(1 + 6 * numberKey);
            break;
        case "r":
            turnLayer(2 + 6 * numberKey);
            break;
        case "l":
            turnLayer(3 + 6 * numberKey);
            break;
        case "d":
            turnLayer(4 + 6 * numberKey);
            break;
        case "u":
            turnLayer(5 + 6 * numberKey);
            break;
        case "enter":
            scramble();
            break;
        case " ":
            if (!document.pointerLockElement)
            {
                mouseDistance = ((mousePos[0] + canvas.width / 2) ** 2 + (mousePos[1] + canvas.height / 2) ** 2) ** 0.5;
                mouseAxis = normalizeVector([mousePos[0], mousePos[1], 0]);
                canvas.requestPointerLock();
            }
            else
            {
                document.exitPointerLock();
            }
            break;
    }
};
document.onkeyup = (event) => {
    switch (event.key.toLowerCase())
    {
        case "shift":
            changeAngle = -Math.PI / 2;
            break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
            numberKey = 0;
            break;
    }
};

function normalizeVector(vector)
{
    return math.divide(vector, math.distance([0, 0, 0], vector));
}

function anglesFromMatrix(matrix)
{
    let x, y, z;
    y = Math.asin(matrix[0][2]);
    if (Math.abs(matrix[0][2]) < 0.9999999)
    {
        x = Math.atan2(-matrix[1][2], matrix[2][2]);
        z = Math.atan2(-matrix[0][1], matrix[0][0]);
    }
    else
    {
        x = Math.atan2(matrix[2][1], matrix[1][1]);
        z = 0;
    }
    return [x, y, z];
}

function round(value, precision=1)
{
    return Math.round(value / precision) * precision;
}

function roundRotationMatrix(matrix, precision=Math.PI / 2)
{
    const angles = anglesFromMatrix(matrix).map((angle) => round(angle, precision=precision));
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]].reduce((sum, x, i) => math.multiply(sum, math.rotationMatrix(angles[i], x)), math.identity(3)._data).map((row) => row.map((value) => Math.round(value)));
}

function matrixFromAngles(angles)
{
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]].reduce((sum, x, i) => math.multiply(sum, math.rotationMatrix(angles[i] * Math.PI / 180, x)), math.identity(3)._data);
}

function sortLayers()
{
    layers = Array(6 * cubeSize).fill().map(() => []);
    let roundedMouseAngles = roundRotationMatrix(mouseAngles);
    for (let sticker of stickers)
    {
        let stickerPos = sticker.position.map((position) => math.multiply(position, roundedMouseAngles));
        let addToLayers = matchLayers(stickerPos);
        for (let addLayer of addToLayers)
        {
            layers[addLayer].push(sticker);
        }
    }
}

function turnLayer(layer)
{
    layers[layer].forEach((x) => x.updateLayers(layerAxes[layer % 6]));
}

function project(position)
{
    let scale = focalLength / (position[2] + distance) / zoom;
    return [position[0] * scale, position[1] * scale];
}

// function matchLayers(cornerPos)
// {
//     let ret = [];
//     let edgePos = cornerPos.reduce((sum, x) => sum.map((y, j) => (Math.max(Math.abs(x[j]), Math.abs(y)) == Math.abs(x[j]))? x[j]:y), [0, 0, 0]);
//     for (let i = 0; i < 3; i++)
//     {
//         let outerLayer = newLayerPos.indexOf(((Math.sign(edgePos[i]) > 0)? "+":"-") + "xyz"[i]);
//         let innerLayers = Math.abs(layerPos[outerLayer][i] - edgePos[i]) / tileSize;
//         let layerIndex1 = Math.round(outerLayer + 6 * innerLayers);
//         let layerIndex2 = Math.round((outerLayer + ((outerLayer % 2 == 0)? 1:-1)) + 6 * ((cubeSize - 1) - innerLayers));
//         ret.push(layerIndex1, layerIndex2);
//     }
//     return ret;
// }

function matchLayers(cornerPositions)
{
    let ret = [];
    for (let i = 0; i < 3; i++)
    {
        //                                                               if position is more than previous maximum, return that, or just keep the current maximum
        // const maxCoordinate = cornerPositions.reduce((currentMax, position) => ((Math.abs(position[i]) > Math.abs(currentMax))? position[i]:currentMax), 0);
        const maxCoordinate = cornerPositions.sort((position1, position2) => position2[i] - position1[i])[0][i];
        const distanceFromEdge = (tileSize * Math.floor(cubeSize / 2) + tileSize * 0.5 - Math.abs(maxCoordinate)) / tileSize;
        // const distanceFromEdge = Math.floor(cubeSize / 2) + 0.5 - Math.abs(maxCoordinate) / tileSize;
        let baseLayer1, baseLayer2;
        if (Math.sign(maxCoordinate) != -1)
        {
            baseLayer1 = i * 2;
            baseLayer2 = i * 2 + 1;
        }
        else
        {
            baseLayer1 = i * 2 + 1;
            baseLayer2 = i * 2;
        }
        // if (baseLayer1 + distanceFromEdge * 6 >= layers.length)
        // {
        //     console.log(layers.length)
        //     console.log(cornerPositions);
        // }
        // console.log(ret)
        ret.push(Math.round(baseLayer1 + distanceFromEdge * 6));
        // ret.push(baseLayer2 + (cubeSize - 1 - distanceFromEdge) * 6);
    }
    return ret;
}

console.log(matchLayers([
    [tileSize * -0.5, tileSize * -0.5, tileSize * 1.5],
    [tileSize * -0.5, tileSize * 0.5, tileSize * 1.5],
    [tileSize * 0.5, tileSize * -0.5, tileSize * 1.5],
    [tileSize * 0.5, tileSize * 0.5, tileSize * 1.5]
]));

class Sticker
{
    constructor(position, color)
    {
        this.position = position;
        this.rotatedPos = this.position.slice();
        this.drawPos;
        this.color = color;
        this.avgZ;
        let addToLayers = matchLayers(this.position);
        for (let i = 0; i < addToLayers.length; i++)
        {
            layers[addToLayers[i]].unshift(this);
        }
    }

    updatePos()
    {
        this.rotatedPos = this.position.map((x) => math.multiply(mouseAngles, x));
        this.drawPos = this.rotatedPos.map((x) => project(x));
        this.avgZ = 0;
        this.rotatedPos.forEach((x) => {this.avgZ += parseFloat(x[2])});
        toDraw.push(this);
        toDraw.sort((a, b) => a.avgZ - b.avgZ);
    }

    updateLayers(axis)
    {
        this.position = this.position.map((x) => math.rotate(x, changeAngle, axis));
        const addToLayers = matchLayers(this.position);
        for (let i = 0; i < layers.length; i++)
        {
            if (layers[i].includes(this))
            {
                if (!(i in addToLayers))
                {
                    layers[i].splice(layers[i].indexOf(this), 1);
                }
            }
        }
    }
}

function createCube()
{
    for (let i = 0; i < cubeSize * tileSize; i += tileSize)
    {
        for (let j = 0; j < cubeSize * tileSize; j += tileSize)
        {
            let r = i + tileSize - offset, b = j + tileSize - offset, z1 = offset, z2 = -offset, l = i - offset; t = j - offset;
            stickers.push(new Sticker([[t, l, z1], [t, r, z1], [b, r, z1], [b, l, z1]], "blue")); //b
            stickers.push(new Sticker([[t, l, z2], [t, r, z2], [b, r, z2], [b, l, z2]], "green")); //f
            stickers.push(new Sticker([[z1, t, l], [z1, t, r], [z1, b, r], [z1, b, l]], "red")); //r
            stickers.push(new Sticker([[z2, t, l], [z2, t, r], [z2, b, r], [z2, b, l]], "orange")); //l
            stickers.push(new Sticker([[l, z1, t], [r, z1, t], [r, z1, b], [l, z1, b]], "yellow")); //d
            stickers.push(new Sticker([[l, z2, t], [r, z2, t], [r, z2, b], [l, z2, b]], "white")); //u
        }
    }
}

function scramble()
{
    for (let i = 0; i < scrambleLengths[cubeSize]; i++)
    {
        changeAngle = ((Math.random() > 0.5)? Math.PI / 2:-Math.PI / 2) * ((Math.random() > 2/3)? 2:1);
        turnLayer(Math.floor(Math.random() * 6));
    }
    changeAngle = Math.PI / 2;
}

createCube();

function draw()
{
    ctx.lineWidth = 1;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    toDraw = [];
    stickers.forEach((x) => {x.updatePos()});
    toDraw.reverse();
    toDraw.forEach((x) => {
        let cur = x.drawPos.map((x) => x.map((y, i) => y + center[i]));
        ctx.beginPath();
        ctx.fillStyle = x.color;
        ctx.moveTo(cur[0][0], cur[0][1]);
        ctx.lineTo(cur[1][0], cur[1][1]);
        ctx.lineTo(cur[2][0], cur[2][1]);
        ctx.lineTo(cur[3][0], cur[3][1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);