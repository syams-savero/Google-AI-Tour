const { Jimp } = require('jimp');

async function removeBackground(inputFile, outputFile) {
    console.log(`Processing ${inputFile}...`);
    const image = await Jimp.read(inputFile);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Flood fill dari pojok-pojok untuk area putih
    const stack = [[0, 0], [width-1, 0], [0, height-1], [width-1, height-1]];
    const visited = new Set();
    const transparentColor = 0x00000000;

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;
        if (x < 0 || x >= width || y < 0 || y >= height || visited.has(key)) continue;
        
        const currentColor = image.getPixelColor(x, y);
        const r = (currentColor >> 24) & 0xFF;
        const g = (currentColor >> 16) & 0xFF;
        const b = (currentColor >> 8) & 0xFF;

        if (r > 245 && g > 245 && b > 245) {
            image.setPixelColor(transparentColor, x, y);
            visited.add(key);
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    }

    await image.write(outputFile);
    console.log(`Saved as ${outputFile}`);
}

async function run() {
    await removeBackground('public/assets/9.png', 'public/assets/9_transparent.png');
}

run().catch(console.error);
