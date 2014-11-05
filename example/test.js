var jsonview = require("../index.js");

var template = '<nav><div class="draggable"><ul><json:for select=".dateList"><li>{{"display"}}</li></json:for></ul></div></nav>';
var template2 = '<li>rrr</li><li>rrr</li><li>rrr</li><json:for select=".dateList"><li>{{"display"}}</li></json:for>';
var template3 = '<json:if test="test" value="true"><span>{{.test}}</span></json:if><json:if test="test" value="true"><span>{{.dateList}}</span></json:if><json:if test="test" value="true"><span>123456</span></json:if>';

var json = {
    "dateList": [
        {"display": "dia"},
        {"display": "dib"}
    ],
    "test"    : true
};

console.log(jsonview.string(json, template3));
