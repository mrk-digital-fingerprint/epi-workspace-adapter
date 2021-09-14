const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
const PORT = 8090;
const dlDomain = 'default';

// Loading OpenDSU Environment
require('../privatesky/psknode/bundles/pskWebServer');
require('../privatesky/psknode/bundles/openDSU');
const openDSU = require('opendsu');

// Enabling GTINSSI resolver
require('../gtin-resolver/build/bundles/gtinResolver');

// Defining a GET with /leaflet endpoint that based on query params is able to load a DSU and retrieve the leaflet file from it
app.get('/leaflet', (req, res) => {
    let {gtin, batch, expirationDate} = req.query;

    if (gtin === undefined || batch === undefined || expirationDate === undefined) {
        return res.status(400).send();
    }

    // Obtaining gtin-resolver instance
    const gtinResolver = require('gtin-resolver');

    // Creating GTINSSI based on query params
    const gtinssi = gtinResolver.createGTIN_SSI(dlDomain, gtin, batch, expirationDate).getIdentifier();

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

app.get('array', async (req, res) => {
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

app.post('array', (req, res) => {
    // tbd
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

app.listen(PORT, () => {
    console.log(`Express server up and running at ${PORT}`);
});
