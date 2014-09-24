var FS = require("fs");
var view = require("./json.view");

module.exports.file = function (json, file, callback)
{
    FS.readFile(file, function (err, data)
    {
        if (err) throw err;
       // console.log(data.toString());
        callback(view(json, data.toString()));
    });
};


module.exports.string = function (json, format)
{
    return view(json, format);
};