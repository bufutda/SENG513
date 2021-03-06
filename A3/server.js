/**
 * @file server.js
 * @overview HTTP Server logic
 * @author Mitchell Sawatzky
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const conf = require(`${__rootname}/conf.json`);
const log = require(`${__rootname}/log.js`);

let httpServer;

/**
 * Initialize the server and start listening for requests
 * @function init
 * @memberof server
 * @returns {http.Server} the server that was created
 */
function init() {
    log.debug('Creating http server');
    httpServer = http.createServer(handleRequest);

    httpServer.listen(conf.port);
    log.info('HTTP Server is listening on port', conf.port);
    return httpServer;
}

/**
 * Handle a request
 * @function handleRequest
 * @private
 * @param {http.IncomingMessage} request - an object containing all the request information
 * @param {http.ServerResponse} response - the response object that will be used for this request
 */
function handleRequest(request, response) {
    log.info(`[HTTP] ${request.method} Request: ${request.url}`);

    // we only support GET requests and websockets
    if (request.method !== 'GET') {
        log.debug('Killing request with 405');
        response.writeHead(405); // method not allowed
        response.end();
        return;
    }

    // if it's a GET, then treat the URL relative to A3/static and return the file
    let pathname = url.parse(request.url).pathname;

    // quick sanity check that the path doesn't contain '..'
    if (pathname.indexOf('..') !== -1) {
        log.debug('[HTTP] Killing request with 404 (has ..)');
        response.writeHead(404); // not found
        response.end();
        return;
    }

    if (pathname === '/') {
        pathname = '/index.html';
    }

    let filepath = path.resolve(`${__rootname}/static/${pathname}`);
    log.debug('[HTTP] Interpreting path as', filepath);

    fs.stat(filepath, (err, stat) => {
        if (err && err.code === 'ENOENT') {
            // file doesn't exist
            log.debug('[HTTP] Killing request with 404 (file not found)');
            response.writeHead(404);
            response.end();
            return;
        } else if (err) {
            log.error(err.message);
            response.writeHead(500); // internal server error
            response.end();
            return;
        }

        // the file exists, we just need to figure out the content type
        // extensions we should handle: html, js, css
        let contentType;
        switch (path.extname(filepath)) {
            case '.html':
                contentType = 'text/html';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
            default:
                break;
        }
        if (typeof contentType === 'undefined') {
            log.debug('[HTTP] File type unsupported!', path.extname(filepath));
            // we just won't write a content-type header
        } else {
            response.setHeader('Content-Type', contentType);
        }

        fs.readFile(filepath, (err, file) => {
            if (err) {
                log.err(err.message);
                response.writeHead(500); // internal server error
                response.end();
                return;
            }

            // finally, send over the file
            response.writeHead(200);
            response.end(file);
            return;
        });
    });
}

/**
 * @namespace server
 */
module.exports = {
    init: init
};
