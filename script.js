// canvas initialization
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
context.strokeStyle = "black";

// cube parameters
let cubeSize = 3;
let tileSize = 100;
let scrambleLengths = [0, 10, 20, 40, 60, 80, 100];

// cube distance from camera
let cubeOffset = [0, 0, 1100];

// arrays for all stickers and all layers
let stickers = [];
let layers = Array(6 * cubeSize).fill().map(() => []);

// corresponding rotation axis and key for each layer
let layerAxes = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
let layerKeys = ["KeyB", "KeyF", "KeyR", "KeyL", "KeyD", "KeyU"];

let numberKeys = [];
let changeAngle = -Math.PI / 2;

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
let rotationSensitivity = 0.01;

let zoom = 1;
let zoomSensitivity = 0.01;
let minZoom = 0.01;
let maxZoom = 100;

let projectionMatrix = createProjectionMatrix(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

function clamp(x, min, max)
{
    return Math.max(Math.min(x, max), min);
}

document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement)
    {
        const yRotationMatrix = math.rotationMatrix(-event.movementX * rotationSensitivity, [0, 1, 0]);
        const xRotationMatrix = math.rotationMatrix(event.movementY * rotationSensitivity, [1, 0, 0]);
        
        mouseRotation = math.multiply(yRotationMatrix, xRotationMatrix, mouseRotation);
        roundedMouseRotation = roundRotationMatrix(mouseRotation);
        
            stickers.forEach((sticker) => {
            sticker.updateLayers();
        });
    }
});
document.addEventListener("wheel", (event) => {
    zoom = clamp(zoom + event.deltaY * zoomSensitivity, minZoom, maxZoom);
});

document.addEventListener("keydown", (event) => {
    switch (event.code)
    {
        case "ShiftLeft":
        case "ShiftRight":
            changeAngle = Math.PI / 2;

            break;

        case "Digit0":
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9":
            const intKey = parseInt(event.code[5]);
            if (!numberKeys.includes(intKey))
            {
                numberKeys.push(intKey);
            }

            break;

        case "KeyB":
        case "KeyF":
        case "KeyR":
        case "KeyL":
        case "KeyD":
        case "KeyU":
            const layerIndex = layerKeys.indexOf(event.code);
            if (numberKeys.length == 0)
            {
                turnLayer(layerIndex);
            }
            else
            {
                for (let numberKey of numberKeys)
                {
                    turnLayer(layerIndex + 6 * numberKey);   
                }
            }

            break;

        case "Enter":
            scramble();

            break;

        case "Space":
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
});
document.addEventListener("keyup", (event) => {
    switch (event.code)
    {
        case "ShiftLeft":
        case "ShiftRight":
            changeAngle = -Math.PI / 2;

            break;

        case "Digit0":
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9":
            numberKeys.splice(numberKeys.indexOf(parseInt(event.key)), 1);
            
            break;
    }
});

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
        [-sinb,       cosb * sinc,                      cosb * cosc]
    ];
}

function turnLayer(layer)
{
    layers[layer].forEach((sticker) => sticker.rotate(changeAngle, layerAxes[layer % 6]));
}

function createProjectionMatrix(fov, aspect, near, far)
{
    const f = 1 / Math.tan(fov / 2);
    return [
        [f / aspect, 0, 0,                           0],
        [0,          f, 0,                           0],
        [0,          0, (far + near) / (near - far), (2 * far * near) / (near - far)],
        [0,          0, -1,                          0]
    ];
}

function clipSpaceToScreenSpace(coordinates, near, far)
{
    const ndcX = coordinates[0] / coordinates[3];
    const ndcY = coordinates[1] / coordinates[3];
    const ndcZ = coordinates[2] / coordinates[3];

    return [
        (-ndcX + 1) / 2 * canvas.width,
        (-ndcY + 1) / 2 * canvas.height,
        (ndcZ + 1) * (far - near) + near
    ];
}

function project(position, projectionMatrix)
{
    const near = projectionMatrix[2][2] / (projectionMatrix[2][3] - 1);
    const far = projectionMatrix[2][2] / (projectionMatrix[2][3] + 1);

    const clipSpaceCoordinates = math.multiply(projectionMatrix, [...position, 1]);
    const screenSpaceCoordinates = clipSpaceToScreenSpace(clipSpaceCoordinates);

    const drawCoordinates = screenSpaceCoordinates.slice(0, -1);
    const offsetDrawCoordinates = math.subtract(drawCoordinates, [canvas.width / 2, canvas.height / 2]);
    const zoomedOffsetDrawCoordinates = math.multiply(offsetDrawCoordinates, zoom);
    const zoomedDrawCoordinates = math.add(zoomedOffsetDrawCoordinates, [canvas.width / 2, canvas.height / 2]);

    return zoomedDrawCoordinates;
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
        const inverseMouseRotation = math.inv(mouseRotation);
        this.cornerPositions = value.map((position) => math.multiply(inverseMouseRotation, position))
    }

    get approximateGlobalCornerPositions()
    {
        return this.cornerPositions.map((position) => math.multiply(roundedMouseRotation, position))
    }
    
    set approximateGlobalCornerPositions(value)
    {
        const inverseRoundedMouseRotation = math.inv(roundedMouseRotation);
        this.cornerPositions = value.map((position) => math.multiply(inverseRoundedMouseRotation, position));
    }

    get screenCornerPositions()
    {
        return this.globalCornerPositions.map((position) => project(math.add(position, cubeOffset), projectionMatrix));
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
        const addToLayers = matchLayers(this.approximateGlobalCornerPositions);
        for (let i = 0; i < layers.length; i++)
        {
            const index = layers[i].indexOf(this);
            if (addToLayers.includes(i))
            {
                if (index == -1)
                {
                    layers[i].unshift(this);
                }
            }
            else
            {
                if (index != -1)
                {
                    layers[i].splice(index, 1);
                }
            }
        }
    }
}

function createCube()
{
    for (let i = 0; i < cubeSize; i++)
    {
        for (let j = 0; j < cubeSize; j++)
        {
            let r = tileSize * (i + 1 - cubeSize / 2), b = tileSize * (j + 1 - cubeSize / 2), z1 = tileSize * cubeSize / 2, z2 = -tileSize * cubeSize / 2, l = tileSize * (i - cubeSize / 2), t = tileSize * (j - cubeSize / 2);
            stickers.push(new Sticker([[t, l, z1], [t, r, z1], [b, r, z1], [b, l, z1]], [0, 0, 255, 255])); //b
            stickers.push(new Sticker([[t, l, z2], [t, r, z2], [b, r, z2], [b, l, z2]], [0, 255, 0, 255])); //f
            stickers.push(new Sticker([[z1, t, l], [z1, t, r], [z1, b, r], [z1, b, l]], [255, 0, 0, 255])); //r
            stickers.push(new Sticker([[z2, t, l], [z2, t, r], [z2, b, r], [z2, b, l]], [255, 140, 0, 255])); //l
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

function drawPolygon(points, color=null, stroke=true)
{
    context.beginPath();

    if (color)
    {
        context.fillStyle = color;
    }

    context.moveTo(points[0][0], points[0][1]);
    for (const position of points.toSpliced(0, 1))
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
        drawPolygon(sticker.screenCornerPositions, sticker.stringColor);
    });

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);