const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error-handler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Basic security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
});

app.use('/api', routes);
app.use('/api', notFoundHandler);

// Uploaded files: forced download for non-images so HTML/SVG uploads can never run as a page.
app.use('/uploads', express.static(config.paths.uploads, {
    setHeaders(res, filePath) {
        if (!/\.(jpe?g|png|gif|webp|pdf)$/i.test(filePath)) {
            res.setHeader('Content-Disposition', 'attachment');
        }
    },
}));

app.use(express.static(config.paths.public));

app.use(errorHandler);

module.exports = app;
