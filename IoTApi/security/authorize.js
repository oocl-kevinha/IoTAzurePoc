module.exports = function(req, res, next) {
	if (req.headers.authorization) {
		next();
	} else {
		var error = new Error('Unauthorized');
		error.status = 401;
		next(error);
	}
};
