// Just a simple server used for local developement
const express = require('express');
const app = express();

app.set('port', (process.env.PORT || 5001));

app.use(express.static(__dirname + '/public'));

app.listen(app.get('port'), () => {
	console.log('listening on port ' + app.get('port'));

	// Browser refresh (npm pkg) code
	console.log(process.env.BROWSER_REFRESH_URL);
	if (process.send) {
        process.send('online');
    }
});
