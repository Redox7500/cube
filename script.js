const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
context.strokeStyle = "black";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let colors = [];
let mouseRotation = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
];
let roundedMouseRotation = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
];
let cubeSize = 3;
let tileSize = 100;
let offset = tileSize * cubeSize / 2;
let focalLength = 1000;
let distance = 1100;
let stickers = [];
let layers = Array(6 * cubeSize).fill().map(() => []);
let center = [canvas.width / 2, canvas.height / 2];
let changeAngle = -Math.PI / 2;
let numberKey = 0;
let layerAxes = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
let scrambleLengths = [0, 10, 20, 40, 60, 80, 100];
let zoom = 1;
let mousePosition = [0, 0];
let rotationSensitivity = 0.01;

function clamp(x, min, max)
{
    return Math.max(Math.min(x, max), min);
}

document.onmousemove = (event) => {
    if (document.pointerLockElement)
    {
        const yRotationMatrix = math.rotationMatrix(-event.movementX * rotationSensitivity, [0, 1, 0]);
        const xRotationMatrix = math.rotationMatrix(event.movementY * rotationSensitivity, [1, 0, 0]);
        mouseRotation = math.multiply(yRotationMatrix, xRotationMatrix, mouseRotation);
        roundedMouseRotation = roundRotationMatrix(mouseRotation);
        sortLayers();
    }
    else
    {
        mousePosition = [event.clientX, event.clientY];
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
    return math.divide(vector, math.norm(vector));
}

function multiplyRotationMatrix(matrix, vector)
{
    return math.multiply(matrix, vector);
}

// function rotationMatrixToAngles(matrix)
// {
//     const sy = Math.sqrt(matrix[0][0] ** 2 + matrix[1][0] ** 2);

//     let x, y, z;
//     if (sy > 1e-6)
//     {
//         x = Math.atan2(matrix[2][1], matrix[2][2]);
//         y = Math.atan2(-matrix[2][0], sy);
//         z = Math.atan2(matrix[1][0], matrix[0][0]);
//     }
//     else
//     {
//         x = Math.atan2(-matrix[1][2], matrix[1][1]);
//         y = Math.atan2(-matrix[2][0], sy);
//         z = 0;
//     }

//     return [x, y, z];
// }

// function rotationMatrixToAngles(matrix)
// {
//     return [
//         Math.atan2(matrix[2][1], matrix[2][2]),
//         -Math.asin(matrix[2][0]),
//         Math.atan2(matrix[1][0], matrix[0][0])
//     ];
// }

function rotationMatrixToAngles(matrix)
{
    return [
        Math.atan2(matrix[2][1], matrix[2][2]),
        Math.atan2(-matrix[2][0], (matrix[2][1] ** 2 + matrix[2][2] ** 2) ** 0.5),
        Math.atan2(matrix[1][0], matrix[0][0])
    ];
}

function roundRotationMatrix(matrix, precision=Math.PI / 2)
{
    const angles = rotationMatrixToAngles(matrix).map((angle) => math.round(angle / precision) * precision);
    return anglesToRotationMatrix(angles);
}

function anglesToRotationMatrix(angles)
{
    const [sinc, sinb, sina] = angles.map((angle) => Math.sin(angle));
    const [cosc, cosb, cosa] = angles.map((angle) => Math.cos(angle));

    return [
        [cosa * cosb, cosa * sinb * sinc - sina * cosc, cosa * sinb * cosc + sina * sinc],
        [sina * cosb, sina * sinb * sinc + cosa * cosc, sina * sinb * cosc - cosa * sinc],
        [-sinb, cosb * sinc, cosb * cosc]
    ];
}

function sortLayers()
{
    layers = Array(6 * cubeSize).fill().map(() => []);
    stickers.forEach((sticker) => {
        sticker.updateLayers();
    });
}

function turnLayer(layer)
{
    layers[layer].forEach((sticker) => sticker.rotate(changeAngle, layerAxes[layer % 6]));
}

function project(position)
{
    let scale = focalLength / (position[2] + distance) / zoom;
    return [position[0] * scale, position[1] * scale];
}

function matchLayers(cornerPositions)
{
    const ret = [];
    for (let i = 0; i < 3; i++)
    {
        const maxCoordinate = cornerPositions.toSorted((position1, position2) => Math.abs(position2[i]) - Math.abs(position1[i]))[0][i];
        const distanceFromEdge = (cubeSize / 2 * tileSize - Math.abs(maxCoordinate)) / tileSize;

        const currentAxis1 = [0, 0, 0].with(i, (maxCoordinate > 0)? 1:-1);
        const currentAxis2 = math.multiply(-1, currentAxis1);

        const outerLayer1 = layerAxes.findIndex((axis) => math.deepEqual(axis, currentAxis1));
        const outerLayer2 = layerAxes.findIndex((axis) => math.deepEqual(axis, currentAxis2));

        ret.push(Math.round(outerLayer1 + distanceFromEdge * 6));
        ret.push(Math.round(outerLayer2 + (cubeSize - 1 - distanceFromEdge) * 6));
    }
    return ret;
}

class Sticker
{
    constructor(cornerPositions, color)
    {
        this.cornerPositions = cornerPositions;
        this.color = (color[3])? color:[...color, 1];
        this.updateLayers();
    }

    get globalCornerPositions()
    {
        return this.cornerPositions.map((position) => math.multiply(mouseRotation, position));
    }

    set globalCornerPositions(value)
    {
        const inversemouseRotation = math.inv(mouseRotation);
        this.cornerPositions = value.map((position) => math.multiply(inversemouseRotation, position))
    }

    get approximateGlobalCornerPositions()
    {
        return this.cornerPositions.map((position) => math.multiply(roundedMouseRotation, position))
    }
    
    set approximateGlobalCornerPositions(value)
    {
        const inverseroundedMouseRotation = math.inv(roundedMouseRotation);
        this.cornerPositions = value.map((position) => math.multiply(inverseroundedMouseRotation, position));
    }

    get screenCornerPositions()
    {
        return this.globalCornerPositions.map((position) => project(position));
    }

    get averageZ()
    {
        return this.globalCornerPositions.reduce((sum, position) => sum + position[2], 0);
    }

    get stringColor()
    {
        return `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${this.color[3]})`;
    }

    set stringColor(color)
    {
        const pattern = /rgba?\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*(?:,\s*([0-9]+))?\)/;
        this.color = color.match(pattern);
    }

    rotate(angle, axis)
    {
        this.approximateGlobalCornerPositions = this.approximateGlobalCornerPositions.map((position) => math.rotate(position, angle, axis));
        this.updateLayers();
    }

    updateLayers()
    {
        for (const layer of layers)
        {
            const index = layer.indexOf(this);
            if (index != -1)
            {
                layer.splice(index, 1);
            }
        }
        matchLayers(this.approximateGlobalCornerPositions).forEach((matchedLayer) => {
            layers[matchedLayer].unshift(this);
        });
    }
}

function createCube()
{
    for (let i = 0; i < cubeSize * tileSize; i += tileSize)
    {
        for (let j = 0; j < cubeSize * tileSize; j += tileSize)
        {
            let r = i + tileSize - offset, b = j + tileSize - offset, z1 = offset, z2 = -offset, l = i - offset; t = j - offset;
            stickers.push(new Sticker([[t, l, z1], [t, r, z1], [b, r, z1], [b, l, z1]], [0, 0, 255, 255])); //b
            stickers.push(new Sticker([[t, l, z2], [t, r, z2], [b, r, z2], [b, l, z2]], [0, 255, 0, 255])); //f
            stickers.push(new Sticker([[z1, t, l], [z1, t, r], [z1, b, r], [z1, b, l]], [255, 0, 0, 255])); //r
            stickers.push(new Sticker([[z2, t, l], [z2, t, r], [z2, b, r], [z2, b, l]], [255, 130, 0, 255])); //l
            stickers.push(new Sticker([[l, z1, t], [r, z1, t], [r, z1, b], [l, z1, b]], [255, 255, 0, 255])); //d
            stickers.push(new Sticker([[l, z2, t], [r, z2, t], [r, z2, b], [l, z2, b]], [255, 255, 255, 255])); //u
        }
    }
}

function scramble()
{
    const previousChangeAngle = changeAngle;
    for (let i = 0; i < scrambleLengths[cubeSize - 1]; i++)
    {
        const randomNumber = Math.random();
        if (randomNumber < 1/3)
        {
            changeAngle = -Math.PI / 2;
        }
        else if (randomNumber < 2/3)
        {
            changeAngle = Math.PI / 2;
        }
        else
        {
            changeAngle = Math.PI;
        }

        turnLayer(Math.floor(Math.random() * 6));
    }
    changeAngle = previousChangeAngle;
}

function drawShape(positions, color=null, stroke=true)
{
    context.beginPath();

    if (color)
    {
        context.fillStyle = color;
    }

    context.moveTo(positions[0][0], positions[0][1]);
    for (const position of positions.toSpliced(0, 1))
    {
        context.lineTo(position[0], position[1]);
    }
    context.closePath();

    context.fill();
    if (stroke)
    {
        context.stroke();
    }
}

createCube();

function draw()
{
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    stickers.toSorted((a, b) => b.averageZ - a.averageZ).forEach((sticker) => {
        drawShape(sticker.screenCornerPositions.map((position) => math.add(position, center)), sticker.stringColor);
    });

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);