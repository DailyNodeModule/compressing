const path = require('path');
const compressing = require('compressing');
const request = require('request-promise-native');
const fs = require('fs-extra');

const outputDir = process.env.OUTPUT_DIR || path.join(process.cwd(), 'output');

// We can pipe a tarball from somewhere else and decompress it
const stream = 
    request('https://registry.npmjs.org/compressing/-/compressing-1.4.0.tgz')
        .pipe(new compressing.tgz.UncompressStream());

// You can handle errors via the 'error' event.
stream.on('error', (error) => {
    console.error(error.toString());
});

// An entry 'event' will be fired for each entry in the archive.
// The header contains information about the entry, and the stream can be piped to handle the data for each entry.
stream.on('entry', async (header, stream, next) => {
    stream.on('end', next);

    if (header.type === 'file') {
        const file = path.join(outputDir, header.name);
        // This ensures the directory structure is created 
        await fs.ensureFile(file);
        stream.pipe(fs.createWriteStream(file));
    } 
    // The entry can also be a directory.
    else {
        await fs.ensureDir(path.join(outputDir, header.name));
        stream.resume();
    }
});

stream.on('finish', () => {
    // Creating archives is easy as well.
    const tarStream = new compressing.tar.Stream();

    // You can add files or whole directories
    tarStream.addEntry(path.join(outputDir, 'package'));
    
    tarStream
      .pipe(fs.createWriteStream(path.join(outputDir, 'package.tar')));
});