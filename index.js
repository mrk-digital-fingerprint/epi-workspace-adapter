const fs = require('fs');
const util = require('util');
const path = require('path')

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const app = express();

const extract = require('extract-zip')
app.use(cors());

// Loading OpenDSU Environment
const dlDomain = 'default';
require('../privatesky/psknode/bundles/openDSU');
const openDSU = require('opendsu');
// Enabling GTINSSI resolver
require('../gtin-resolver/build/bundles/gtinResolver');

const readdir =  util.promisify(fs.readdir);
const readFile =  util.promisify(fs.readFile);

const tmpFolder = './tmp'


const writeFile = (dsu, fileName, fileData) => {
    console.log(fileName)
    return new Promise((resolve, reject) => {
        dsu.writeFile(fileName, fileData, (error) => {
            if (error) {
                return reject(error)
            }

            resolve(true)
        });
    })
}

const rm = (path) => {
    return fs.rm(path, {recursive: true, force: true}, (err) => {
        if (err) {
            console.error(`Error while removing ${path}`, err)
        }
    })
}

// Defining a GET with /leaflet endpoint that based on query params is able to load a DSU and retrieve the leaflet file from it
app.get('/leaflet', (req, res) => {
    let {gtin, batch, expirationDate} = req.query;

    if (gtin === undefined || batch === undefined || expirationDate === undefined) {
        return res.status(400).send();
    }

    // Obtaining gtin-resolver instance
    const gtinResolver = require('gtin-resolver');

    // Creating GTINSSI based on query params
    const gtinssi = gtinResolver.createGTIN_SSI(dlDomain, undefined, gtin, batch, expirationDate).getIdentifier();

    // Loading DSU resolver
    const resolver = openDSU.loadApi('resolver');

    // Loading DSU using GTINSSI created above
    resolver.loadDSU(gtinssi, (err, dsu) => {
        if (err) {
            return res.status(500).send();
        }

        // Using DSU instance we read leaflet file
        dsu.readFile('/batch/product/leaflet.xml', (err, leaflet) => {
            if (err) {
                return res.status(404).send();
            }

            // Responding with the leaflet file content
            res.status(200).send(leaflet);
        })
    })
})

app.get('/array', async (req, res) => {
    const {arr, token} = req.query;

    if (!arr) {
        return res.status(400).send('Missing arr param.');
    }

    try {
        const dsuArr = JSON.parse(arr)

        if (!dsuArr.length || dsuArr.length === 0) {
            throw new Error('Wrong format of arr')
        }
    }
    catch (e) {
        console.error(e);

        return res.status(400).send('Wrong format of arr');
    }


    try {
        const productJSON = await readArraySSI(arr);

        return res.status(200).send(productJSON);
    }
    catch (e) {
        console.error(e);

        return res.status(500).send('Error reading DSU');
    }
});

app.post('/array', (req, res) => {
    const {arr, token} = req.query;
    const uniqueArr = [...arr.split(','), '3']

    let body = [];
    req.on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body);
        createArrayDSU(uniqueArr,(err, dsu) => {
            if (err) {
                console.error(err)
                return res.status(500).send('Error creating DSU');
            }

            const zipFile = path.resolve(`${tmpFolder}/${uniqueArr.join('')}.zip`)
            const outputDir = path.resolve(`${tmpFolder}/${uniqueArr.join('')}`)

            fs.writeFile(zipFile, body, async (e) => {
                if (e) {
                    console.error(e);

                    res.status(500).send(`Error writing the .zip file: ${zipFile}`);
                    return rm(zipFile)
                }

                const cleanup = () => {
                    rm(zipFile)
                    rm(outputDir)
                }

                try {
                    await extract(zipFile, {dir: outputDir})
                }
                catch (error) {
                    console.error(error)
                    res.status(500).send(`Error extracting the .zip file: ${zipFile}`);

                    return cleanup()
                }

                const outputDirContents = await readdir(outputDir)
                dsu.beginBatch()
                try {
                    for (let j = 0; j < outputDirContents.length; j++) {
                        const file = outputDirContents[j];
                        const buffer = await readFile(`${outputDir}/${file}`);
                        await writeFile(dsu, file, buffer.toString())
                    }
                }

                catch (e) {
                    console.error(e)
                    res.status(500).send(`Error writing files into DSU: ${uniqueArr.join('')}`);

                    return cleanup()
                }

                dsu.commitBatch((e) => {
                    console.log('commit batch')
                    if (e) {
                        console.error(e)
                        res.status(500).send(`Error anchoring DSU: ${uniqueArr.join('')}`);

                        return cleanup()
                    }

                    res.status(200).send('OK');
                    return cleanup()

                })

            })

        })
    });
})

/**
 * Creates an Array SSI
 *
 * @param arr: any[]
 * @param callback?: (error: any, dsu: any) => void
 * @param domain = process.env.DSU_DOMAIN
 * @param bricksDomain?: string
 */
const createArraySSI = (arr, callback, domain = process.env.DSU_DOMAIN, bricksDomain) => {
    const openDSU = require('opendsu');
    const keyssiSpace = openDSU.loadApi('keyssi');
    let hint;
    if (bricksDomain && openDSU.constants?.BRICKS_DOMAIN_KEY) {
        hint = {};
        hint[openDSU.constants.BRICKS_DOMAIN_KEY] = [domain, bricksDomain].join('.');
    }

    return keyssiSpace.createArraySSI(domain, arr, 'v0', hint ? JSON.stringify(hint) : undefined, callback ? callback : undefined)
}

const createArrayDSU = (arr, callback, domain = process.env.DSU_DOMAIN, bricksDomain) => {
    const openDSU = require('opendsu');
    const resolver = openDSU.loadApi('resolver')
    let hint;
    if (bricksDomain && openDSU.constants?.BRICKS_DOMAIN_KEY) {
        hint = {};
        hint[openDSU.constants.BRICKS_DOMAIN_KEY] = [domain, bricksDomain].join('.');
    }

    return resolver.createArrayDSU(domain, arr, {}, callback)
}



/**
 * Read the contents of an Array SSI
 *
 * @param arr: any[]
 */
const readArraySSI = (arr) => {
    const resolver = openDSU.loadApi('resolver');

    return new Promise<object>((resolve, reject) => {
        resolver.loadDSU(this.createArraySSI(arr), (err, dsu) => {
            if (err) {
                return reject(err);
            }

            dsu.readFile(process.env.DSU_DATA_PATH, (error, data) => {
                if (error) {
                    return reject(error);
                }
                let productJSON;

                try {
                    productJSON = JSON.parse(data);
                } catch (e) {
                    return reject(`unable to parse Product: ${data}`);
                }
                resolve(productJSON);
            });
        });
    })
}

// Responding with 404 to all the other requests
app.use('*', (req, res) => {
    res.status(404).send();
})

app.listen(process.env.PORT, () => {
    console.log(`Express server up and running at ${process.env.PORT}`);
});
