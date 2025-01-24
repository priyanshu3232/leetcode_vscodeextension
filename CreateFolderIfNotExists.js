const fs = require('fs');
const path = require('path');

function createFolderIfNotExists(folderName) {
    const resolvedPath = path.resolve(folderName); // Get the absolute path
    if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true }); // Create folder, including parent folders if needed
    }
}

module.exports = {createFolderIfNotExists}


