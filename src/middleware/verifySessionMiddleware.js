function verifySessionMiddleware(req, res, next) {
    if (!req.session || !req.session.nextStep) {
        return res.status(403).send('Access denied: Invalid session.');
    }
    next();
}
module.exports = verifySessionMiddleware;