const fs = require('node:fs/promises');
const path = require('node:path');

async function updatePackageVersion(packagePath, newVersion) {
    const packageJsonPath = path.join(packagePath, 'package.json');
    try {
        const data = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(data);
        packageJson.version = newVersion;
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
        console.log(`Updated version in ${packageJsonPath} to ${newVersion}`);
    } catch (error) {
        console.error(`Error updating ${packageJsonPath}: ${error.message}`);
        process.exit(1);
    }
}

async function main() {
    const rootPackageJsonPath = path.resolve('./package.json');
    const rootPackageJson = require(rootPackageJsonPath);
    const newVersion = rootPackageJson.version;

    // Assuming your packages are in a 'packages' directory
    const packagesDir = path.resolve('./packages');
    try {
        const packageDirs = (await fs.readdir(packagesDir, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => path.join(packagesDir, dirent.name));

        for (const packageDir of packageDirs) {
            await updatePackageVersion(packageDir, newVersion);
        }
    } catch (error) {
        console.error('Error while updating package version:', error.message);
        process.exit(1);
    }
}

main();