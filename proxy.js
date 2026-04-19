const http = require('http');

const PORT = 6500;
const WEB_API_PORT = 6050;
const MOBILE_API_PORT = 6111;

const mobileRoutes = ['/api/tours', '/api/places', '/api/Favorite', '/api/users', '/api/Users'];

const proxy = http.createServer((req, res) => {
    let targetPort = WEB_API_PORT;
    
    // Check if it's a mobile route
    for (let route of mobileRoutes) {
        if (req.url.toLowerCase().startsWith(route.toLowerCase())) {
            targetPort = MOBILE_API_PORT;
            break;
        }
    }

    console.log(`[PROXY] ${req.method} ${req.url} -> port ${targetPort}`);

    // Set Localhost headers for ASP.NET
    const proxyHeaders = { ...req.headers };
    proxyHeaders.host = 'localhost:' + targetPort;

    const options = {
        hostname: '127.0.0.1',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: proxyHeaders
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });
    
    proxyReq.on('error', (e) => {
        console.error(`[PROXY ERROR] ${e.message}`);
        res.writeHead(502);
        res.end("Bad Gateway");
    });
});

proxy.listen(PORT, '0.0.0.0', () => {
    console.log(`Unified Proxy Server listening on port ${PORT}`);
});
