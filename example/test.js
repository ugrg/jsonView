var jsonview = require("../index.js");

var template = '<nav><div class="draggable"><ul><json:for select=".dateList"><li>{{"display"}}</li></json:for></ul></div></nav>';

var json = {
    "dateList": [
        {"display": "dia"},
        {"display": "dib"}
    ]
};

console.log(jsonview(json, template));
