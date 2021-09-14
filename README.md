# Epi Workspace DSU adapter

Forked from `express-demo` project, remote: https://github.com/PharmaLedger-IMI/express-demo 

This project is meant to show how Express server can interact with OpenDSU. This will bring us the capability to make a REST call to retreive the leaflet.xml from a product using _gtin_, _batch_ and _expiration date_ parameters.

## Prerequisites
This project and its folder has to sit inside of the `epi-workspace` root folder.

## Installation

In order to run the _express-demo_ you need to install the _epi-workspace_ first.
Please follow the next steps in order to install the workspace succesfully:

```sh
# Step 1: Clone the [epi-workspace] repository:
$ git clone https://github.com/PharmaLedger-IMI/epi-workspace.git

# Step 2: Go inside the [epi-workspace] folder
$ cd epi-workspace

# Step 3: Brings all dependencies needed
$ npm install

# Step 4: Launch the Node js
$ npm run server

# Step 5: Scans all applications and wallet it finds in the configuration and tries to run the build script for each one
$ npm run build-all
```

## Run the app
After all previous steps are done, we can finally start the _express-demo_ app:

```sh
# Step 1: Go inside the [express-demo] folder
cd express-demo

# Step 2: Run the express server
npm run start
```

The server is now up and running at port _8090_.

## REST API

#### GET array ssi
`GET /array/?arr={JSON.strinfigy(uniqueArrayRepresentingDSU)}`
```sh
# Example of request
$ curl -i "http://localhost:8090/array?arr=%27%5B%22abc%22%2C%22123%22%5D%27"
```

#### Response

```sh
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/octet-stream
Content-Length: 267077
ETag: W/"41345-QsXSieJR1rrw+wFHLNbV03lW3nU"
Date: Thu, 29 Oct 2020 10:03:56 GMT
Connection: keep-alive

<?xml version="1.0" encoding="UTF-8"?>
<document>
    ...
    ...
    ...
</document>
```
