var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

/**
 * Optimizing function:
 *
 *  Test Range: x:[-4.0-6.0] y:[-10,10]
 *
 *  f(x,y) = 0.4+-1*(0.3*(1-x)*x+y*(2-y)*0.3+x*y/100)
 *
 *  Global minimum at (0.51681, 1.00861) with 0.0198944
 *
 *  Additional random variance can be enabled
 *
 *  TODO: integrate more functions and allow selection?
 *  see: https://en.wikipedia.org/wiki/Test_functions_for_optimization
 */

/** the main config variable(s) */
global.x = undefined;
global.y = undefined;

var enableRandom = true;

function initial_fcn(rnd, x, y) {
    return rnd * ( 0.4 + -1 * (0.3 * (1 - x) * x + y * (2 - y) * 0.3 + x * y / 100));
}

function three_hump_camel(rnd, x, y) {
    return rnd * (2 * Math.pow(x, 2) - 1.05 * Math.pow(x, 4) + Math.pow(x, 6) / 6 + x * y + Math.pow(y, 2));
}

app.get('/', function (req, res) {
    var rnd = 1;
    if (enableRandom) {
        rnd = Math.random()
    }
    console.log("x:" + global.x + " - y:" + global.y);

    if (global.x !== undefined && global.y !== undefined) {
        res.send(JSON.stringify({
            x: global.x,
            y: global.y,
            result: three_hump_camel(rnd, x, y)
        }));
    } else {
        console.log('x and/or y is not set');
        res.status(404).send('x and/or y is not set');
    }

});

app.post('/', function (req, res) {
    if (req.body) {
        // update retrieved x and/or y
        if (typeof(req.body.x) !== "undefined") {
            global.x = parseFloat(req.body.x);
        }
        if (typeof(req.body.y) !== "undefined") {
            global.y = parseFloat(req.body.y);
        }
    }
    res.send("ok");
});

app.listen(3003, function () {
    console.log('OEDA HTTP test app listening on port 3003!');
});
