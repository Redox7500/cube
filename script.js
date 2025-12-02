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
let cubeSize = 5;
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
let scrambleLengths = [0, 0, 10, 20];
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
        // mouseRotation = math.multiply(math.rotationMatrix(-event.movementX * rotationSensitivity, [0, 1, 0]), math.rotationMatrix(event.movementY * rotationSensitivity, [1, 0, 0]), mouseRotation);
        const yRotationMatrix = math.rotationMatrix(-event.movementX * rotationSensitivity, [0, 1, 0]);
        const xRotationMatrix = math.rotationMatrix(event.movementY * rotationSensitivity, [1, 0, 0]);
        mouseRotation = math.multiply(yRotationMatrix, xRotationMatrix, mouseRotation);
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

// function multiplyRotationMatrix(matrix, vector)
// {
//     const norm = math.norm(vector);
//     let ret = math.multiply(matrix, vector);
//     ret = math.multiply(norm / math.norm(ret), ret);
//     return ret;
// }

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
//     const x1 = Math.acos(matrix[1][1]);
//     const y1 = Math.acos(matrix[0][0]);
//     const x2 = Math.asin(matrix[2][1]);
//     const y2 = Math.asin(matrix[0][2]);
//     // console.log(`x1 : ${x1}\ny1 : ${y1}\nx2 : ${x2}\ny2 : ${y2}`);

//     return [(x2 < 0)? -Math.PI - x2:x1, (y2 < 0)? -Math.PI - y2:y1, 0];
// }

// function rotationMatrixToAngles(matrix)
// {
//     return [
//         Math.atan2(-matrix[2][0], matrix[0][0]),
//         Math.atan2(matrix[1][2], matrix[0][0]),
//         0
//     ];
// }

function rotationMatrixToAngles(matrix)
{
    return [
        Math.atan2(matrix[2][1], matrix[2][2]),
        -Math.asin(matrix[2][0]),
        Math.atan2(matrix[1][0], matrix[0][0])
    ];
}

// function rotationMatrixToAngles(matrix)
// {
//     return [
//         Math.atan2(matrix[2][1], matrix[1][1]),
//         Math.atan2(matrix[0][2], matrix[0][0]),
//         0
//     ];
// }

// function rotationMatrixToAngles(matrix)
// {
//     const pitch = Math.atan2(-matrix[2][0], (matrix[0][0] ** 2 + matrix[1][0] ** 2) ** 0.5);
//     return [
//         pitch,
//         Math.atan2(matrix[1][0] / Math.cos(pitch), matrix[0][0] / Math.cos(pitch)),
//         Math.atan2(matrix[2] / Math.cos(pitch), matrix[2][2] / Math.cos(pitch))
//     ];
// }

// function rotationMatrixToAngles(matrix)
// {
//     const t = matrix[0][0] + matrix[1][1] + matrix[2][2];
//     const r = (1 + t) ** 0.5;
//     const w = r / 2;
//     const x = Math.sign(matrix[1][2] - matrix[2][1]) * Math.abs((1 + matrix[0][0] - matrix[1][1] - matrix[2][2]) ** 2 / 2);
//     const y = Math.sign(matrix[2][0] - matrix[0][2]) * Math.abs((1 - matrix[0][0] + matrix[1][1] - matrix[2][2]) ** 2 / 2);
//     const z = Math.sign(matrix[0][1] - matrix[1][0]) * Math.abs((1 - matrix[0][0] - matrix[1][1] + matrix[2][2]) ** 2 / 2);

//     // console.log(Math.atan2((1 + 2 * (w * y - x * z)) ** 0.5, (1 - 2 * (w * y - x * z)) ** 0.5))
//     // console.log(`w: ${w}\nx: ${x}\ny: ${y}\nz: ${z}`);
//     // console.log(JSON.stringify([
//     //     Math.atan2(2 * (w * x + y * z), 1 - 2 * (x ** 2 + y ** 2)),
//     //     -Math.PI / 2 + 2 * Math.atan2((1 + 2 * (w * y - x * z)) ** 0.5, (1 - 2 * (w * y - x * z)) ** 0.5),
//     //     Math.atan2(2 * (w * z + x * y), 1 - 2 * (y ** 2 + z ** 2))
//     // ]))
//     const ret = [
//         Math.atan2(2 * (w * x + y * z), 1 - 2 * (x ** 2 + y ** 2)),
//         -Math.PI / 2 + 2 * Math.atan2((1 + 2 * (w * y - x * z)) ** 0.5, (1 - 2 * (w * y - x * z)) ** 0.5),
//         Math.atan2(2 * (w * z + x * y), 1 - 2 * (y ** 2 + z ** 2))
//     ];
//     console.log(JSON.stringify(ret.map((angle) => (angle == NaN)? 0:angle)));
//     return ret.map((angle) => (!angle)? 0:angle);
// }

// function rotationMatrixToAngles(matrix)
// {
//     const xVector = math.multiply([0, 0, 1], matrix);
//     const x = Math.atan2(xVector[1], xVector[2]);

//     const yVector = math.multiply([1, 0, 0], matrix);
//     const y = Math.atan2(-yVector[0], yVector[2]);

//     const zVector = math.multiply([0, 1, 0], matrix);
//     const z = Math.atan2(zVector[1], zVector[0]);
    
//     return [x, y, z];
// }

// function rotationMatrixToAngles(matrix)
// {
//     const theta = Math.acos((matrix[0][0] + matrix[1][1] + matrix[2][2] - 1) / 2)
//     return [
//         (matrix[2][1] - matrix[1][2]) / 2 * Math.sin(theta),
//         (matrix[0][2] - matrix[2][0]) / 2 * Math.sin(theta),
//         (matrix[1][0] - matrix[0][1]) / 2 * Math.sin(theta)
//     ]
// }

// (cosa * cosb) - (sina * cosb) = cosa - sina
// (cosa * sinb * sinc - sina * cosc) - (sina * sinb * sinc + cosa * cosc) = (cosa - sina)(sinb * sinc) - (sina + cosa)(cosc)
// (cosa * sinb * sinc - sina * cosc) + (sina * sinb * cosc - cosa * sinc) = cosa * sinb * sinc - sina * cosc + sina * sinb * cosc - cosa * sinc = cosa * sinb * sinc + sina * sinb * cosc - sina * cosc - cosa * sinc
//  = sinb * (cosa * sinc + sina * cosc) - sina * cosc - cosa * sinc
//  = sinb * (cosa * sinc) + sinb * (sina * cosc) - sina * cosc - cosa * sinc
//  = (sinb - 1)(cosa * sinc) + (sinb - 1)(sina * cosc)
//  = (sinb - 1)(cosa * sinc + sina * cosc)
// (cosa * sinb * cosc + sina * sinc) + (sina * sinb * sinc + cosa * cosc) = cosa * sinb * cosc + sina * sinc + sina * sinb * sinc + cosa * cosc
//  = sinb * (cosa * cosc) + sina * sinc + sinb * (sina * sinc) + cosa * cosc
//  = (sinb - 1)(cosa * cosc) + (sinb - 1)(sina * sinc)
//  = (sinb - 1)(cosa * cosc + sina * sinc)
// (sinb - 1)(cosa * sinc + sina * cosc) / (-sinb * -1 - 1) = cosa * sinc + sina * cosc
// (sinb - 1)(cosa * cosc + sina * sinc) / (-sinb * -1 - 1) = cosa * cosc + sina * sinc
// (cosa * sinc + sina * cosc) - (cosa * cosc + sina * sinc) = (cosa * sinc - cosa * cosc) + (sina * cosc - sina * sinc)
//  = cosa * (sinc - cosc) + sina * (cosc - sinc)
// (cosa * cosb) - (sina * cosb) = cosb * (cosa - sina)
// (cosa * (sinc - cosc) + sina * (cosc - sinc)) / (cosb * (cosa - sina))
//  = (cosa / (cosb * (cosa - sina)))(sinc - cosc) + (sina / (cosb * (cosa - sina)))(cosc - sinc)
// (cosa / ((cosb * cosa) - (cosb * sina))) = 
// (cosa * sinc) / (sina * cosc)
// (cosb * cosc) / (sinb) = tan(b) * cosc / -sinb = -1 / cosb * cosc

function round(value, precision=1)
{
    return Math.round(value / precision) * precision;
}

function roundRotationMatrix(matrix, precision=Math.PI / 2)
{
    const angles = rotationMatrixToAngles(matrix).map((angle) => round(angle, precision=precision));
    return anglesToRotationMatrix(angles);
}

// function anglesToRotationMatrix(angles)
// {
//     const [sina, sinb, sinc] = angles.map((angle) => Math.sin(angle));
//     const [cosa, cosb, cosc] = angles.map((angle) => Math.cos(angle));
//     return [
//         [
//             cosb * cosc,
//             sina * sinb * cosc - cosa * sinc,
//             cosa * sinb * cosc + sina * sinc
//         ],
//         [
//             cosb * sinc,
//             sina * sinb * sinc + cosa + cosc,
//             cosa * sinb * sinc - sina * cosc
//         ],
//         [
//             -sinb,
//             sina * cosb,
//             cosa * cosb
//         ]
//     ];
// }

// function anglesToRotationMatrix(angles)
// {
//     if (angles[2])
//     {
//         console.log(`Z angle of '${angles[2]}' was input to function 'anglesToRotationMatrix'`);
//         return;
//     }

//     [sinx, siny] = angles.map((angle) => Math.sin(angle));
//     [cosx, cosy] = angles.map((angle) => Math.cos(angle));
    
//     return [
//         [cosy, 0, siny],
//         [sinx * siny, cosx, sinx * -cosy],
//         [-cosx * siny, sinx, cosx * cosy]
//     ];
// }

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
    roundedMouseRotation = roundRotationMatrix(mouseRotation);
    // console.log(JSON.stringify(rotationMatrixToAngles(roundedMouseRotation)));
    // for (const sticker of stickers)
    // {
    //     const stickerPosition = sticker.cornerPositions.map((position) => multiplyRotationMatrix(roundedMouseRotation, position));
    //     const addToLayers = matchLayers(stickerPosition);
    //     for (const addLayer of addToLayers)
    //     {
    //         layers[addLayer].push(sticker);
    //     }
    // }
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
        // console.log(JSON.stringify(cornerPositions.map((position) => (Math.abs(position[i]) - tileSize * cubeSize / 2) / tileSize)));
        // console.log(maxCoordinate / tileSize);
        const distanceFromEdge = (cubeSize / 2 * tileSize - Math.abs(maxCoordinate)) / tileSize;
        const currentAxis1 = [0, 0, 0].with(i, (maxCoordinate > 0)? 1:-1);
        const currentAxis2 = math.multiply(-1, currentAxis1);
        const outerLayer1 = layerAxes.findIndex((axis) => math.deepEqual(axis, currentAxis1));
        const outerLayer2 = layerAxes.findIndex((axis) => math.deepEqual(axis, currentAxis2));
        ret.push(Math.round(outerLayer1 + distanceFromEdge * 6));
        ret.push(Math.round(outerLayer2 + (cubeSize - 1 - distanceFromEdge) * 6));
    }
    console.log(ret)
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
        // this.cornerPositions = this.cornerPositions.map((cornerPosition) => math.multiply(math.rotationMatrix(angle, axis), cornerPosition))
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
        // console.log(JSON.stringify(this.cornerPositions.map((cornerPosition) => cornerPosition.map((coordinate) => coordinate / tileSize))));
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
    for (let i = 0; i < scrambleLengths[cubeSize]; i++)
    {
        changeAngle = ((Math.random() > 0.5)? Math.PI / 2:-Math.PI / 2) * ((Math.random() > 2/3)? 2:1);
        turnLayer(Math.floor(Math.random() * 6));
    }
    changeAngle = Math.PI / 2;
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
        // context.strokeStyle = (layers[2].includes(sticker))? "white":"black";
        // context.lineWidth = (layers[2].includes(sticker))? 5:1;
        // if (layers[2].includes(sticker))
        // {
        drawShape(sticker.screenCornerPositions.map((position) => math.add(position, center)), sticker.stringColor);   
        // }
    });
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);