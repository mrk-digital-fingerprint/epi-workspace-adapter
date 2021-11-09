# Epi Workspace DSU adapter

Forked from `express-demo` project, remote: https://github.com/PharmaLedger-IMI/express-demo 

This project is meant to show how Express server can interact with OpenDSU. This will bring us the capability to make a REST call to retreive the leaflet.xml from a product using _gtin_, _batch_ and _expiration date_ parameters.

## Prerequisites
This project and its folder has to sit inside of the `epi-workspace` root folder.

## Installation
You have to create a `tmp` dir for that serves for the leaflet manipulation.
```sh
mkdir tmp
chmod ??? ./tmp
```

## Run the app
After all previous steps are done, you have to configure `.env` file according to the `.env.template` file. Then you run:

```sh
# Step 1: Go inside the [express-demo] folder
cd express-demo

# Step 2: Run the express server
npm run start
```

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
