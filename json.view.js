/**
 * Created with JetBrains WebStorm.
 * User: 姜兵
 * Date: 14-8-4
 * Time: 上午10:25
 * 通过JSON与json模板生成HTML字符串方法。
 */

(function ()
{
    var reg = {
        "docType": /^<!.*?>/,
        "notes"  : /<!--.*-->/g,
        'node'   : /<[^>]*>|[^\s][^<>]*/g
    };

    /**
     * @description 获取节点名
     * @param {String} node
     * @returns {String}
     * @example
     *   in <tr>    out tr
     *   in </tr>    out tr
     *   in <tr/>    out tr
     *   in <tr:f-or>    out tr:f-or
     *   in </tr:f-or>    out tr:f-or
     */
    function getNodeName(node)
    {
        if (node.indexOf('<') == 0)
        {
            return /<(?:\/|)([\w:-]+)[^<>]*>/.exec(node)[1];
        }
        throw "Argument is not an XML node";
    }

    /**
     * @description 获取节点中的路径
     * @param node
     * @param {String}pathAttr
     * @returns {String}
     */
    function getPath(node, pathAttr)
    {
        var path = node, reg;
        if (typeof node == "object")
        {
            for (path in node)
            {
            }
        }
        if (path.indexOf("json:") == -1) throw "This node is not a json node";
        reg = RegExp(pathAttr + "=(\"|')([\\w\\.]+)\\1", "g");
        path = reg.exec(path);
        if (path === null || path.length < 3)   throw "The value attribute was not found in this node!";
        return path[2];
    }

    /**
     * @description 获取子节点
     * @param node
     * @returns {Array}
     */
    function getChildNode(node)
    {
        var path = node, child = [];
        if (typeof node == "object")
        {
            for (path in node)
            {
                child = node[path];
            }
        }
        return child;
    }

    /**
     * @description 获取节点类型
     * @param node
     * @returns {*}
     */
    function getNodeMode(node)
    {
        var n;
        switch (Object.prototype.toString.call(node))
        {
            case "[object String]":
            {
                return "valueOf";
            }
            case "[object Object]":
            {
                //n=getNodeName(node);
                for (n in node)
                {
                    if (n.indexOf("json:") != -1)
                    {
                        return getNodeName(n);
                    }
                }
                return "Object";
            }
            case "[object Array]":
            {
                throw "This node is an array, not a object or string!";
            }
            default :
            {
                throw "This is the node of an unknown type!";
            }
        }
    }

    /**
     * @description 解析{{valueOf}}
     * @param {String} _path
     * @param {object} db
     */
    function valueOf(_path, db)
    {
        var root, name, path = _path.replace(/^\./g, '').split(".");
        root = path[0] == "JSON" ? (path.shift(), db) : this;
        while (name = path.shift())
        {
            root = root[name];
            if (typeof root == "undefined")
            {
                root = "";
                break;
            }
        }
        return {"string": typeof root != "object" ? root : JSON.stringify(root), "object": root}
    }

    /**
     * @description 解析{{valueOf}}
     * @param {String}node
     * @param {JSON}db
     */
    function StringValueOf(node, db)
    {
        var reg;
        reg = /{{("|'|)([\w\.-_]+)\1}}/g;
        var repList = node.match(reg);
        if (repList == null)
        {
            return node;
        }
        var i, path = ".", valueOfList = [];
        for (i = 0; i < repList.length; i++)
        {
            reg.lastIndex = 0;
            path = reg.exec(repList[i])[2];
            valueOfList.push(valueOf.call(this, path, db)["string"]);
            node = node.replace(repList[i], valueOf.call(this, path, db)["string"])
        }
        return node;
    }

    /**
     * @description XML类型节点提前数据 <json:valueOf value=".v1"/>
     * @param node
     * @param db
     */
    function XMLValueOf(node, db)
    {
        var path = getPath(node, "value");
        return valueOf.call(this, path, db)["string"];
    }

    /**
     * @description 处理json:for标记
     * @param node
     * @param db
     * @return {Array}
     */
    function For(node, db)
    {
        var path , html = [], child;
        path = getPath(node, "select");
        child = getChildNode(node);
        var _this = valueOf.call(this, path, db)["object"];
        for (var t = 0; t < _this.length; t++)
        {
            html.push(insertDB.call(_this[t], child, db));
        }
        return html;
    }

    /**
     * @description 处理json:switch标记
     * @param node
     * @param db
     * @return {Array}
     */
    function Switch(node, db)
    {
        var path, html = [], child;
        path = getPath(node, "select");
        child = getChildNode(node);
        var _this = valueOf.call(this, path, db)["object"];
        for (var n = 0; n < child.length; n++)
        {
            path = getPath(child[n], 'test');
            if (typeof _this[path] == "undefined")continue;
            html.push(insertDB.call(_this[path], getChildNode(child[n]), db));
        }
        return html;
    }

    /**
     * @description 处理json:if标记
     * @param node
     * @param db
     * @return {Array}
     */
    function If(node, db)
    {
        var path, html = [], value, n;
        path = getPath(node, "test");
        for (n in node)
        {
            reg = /value=("|')([^\1]+)\1/g;
            value = reg.exec(n)[2];
            if (valueOf.call(this, path, db)["string"] == value)
            {
                html.push(insertDB.call(this, getChildNode(node), db))
            }
        }
        return html;
    }

    /**
     * @description 构造ＨＴＭＬ的基础结构
     * @param argList
     * @param nodeName
     * @returns {Array}
     */
    function createHtml(argList, nodeName)
    {
        var arr = [];
        var node = argList.shift();
        do {
            if (node.indexOf('</') == 0)
            {
                if (getNodeName(node) == nodeName)
                {
                    return arr;
                }
            }
            else if (node.indexOf('<') == 0)
            {
                if (node.indexOf('/>') != -1)
                {
                    arr.push(node);
                }
                else
                {
                    var obj = {};
                    obj[node] = createHtml(argList, getNodeName(node));
                    arr.push(obj);
                }
            }
            else
            {
                arr.push(node);
            }
        } while (node = argList.shift());
        return arr;
    }

    /**
     * @description 插入数据
     * @param format
     * @param DB
     * @returns {Array}
     */
    function insertDB(format, DB)
    {
        var DHtmlList = [], node, i, nodeName;
        for (i = 0; i < format.length; i++)
        {
            node = format[i];
            switch (getNodeMode(node))
            {
                case "Object":
                {
                    for (nodeName in node)
                    {

                        DHtmlList.push(StringValueOf.call(this, nodeName, DB));
                        DHtmlList.push(insertDB.call(this, node[nodeName], DB));
                        DHtmlList.push("</" + getNodeName(nodeName) + ">");
                    }
                    break;
                }
                case "valueOf":
                {
                    DHtmlList.push(StringValueOf.call(this, node, DB));
                    break;
                }
                case "json:valueOf":
                {
                    DHtmlList.push(XMLValueOf.call(this, node, DB));
                    break;
                }
                case "json:for":
                {
                    DHtmlList.push(For.call(this, node, DB));
                    break;
                }
                case "json:switch":
                {
                    DHtmlList.push(Switch.call(this, node, DB));
                    break;
                }
                case "json:if":
                {
                    DHtmlList.push(If.call(this, node, DB));
                    break;
                }
            }
        }
        return DHtmlList;
    }

    /**
     * @description 链接数组生成HTML
     * @param {Array} htmlList
     * @param {String} tab
     * @return {String}
     */
    function LinkHtmlList(htmlList, tab)
    {
        for (var i = 0; i < htmlList.length; i++)
        {
            htmlList[i] = Object.prototype.toString.call(htmlList[i]) == "[object Array]" ? LinkHtmlList(htmlList[i], tab + '    ') : tab + htmlList[i];
        }
        return htmlList.join("\n");
    }

    /**
     * @description 删除JSON中的null节点。
     * @param {JSON}json
     * @return {JSON}
     */
    function ClearNull(json)
    {
        var node;
        var arrTag = Object.prototype.toString.call(json) == "[object Object]";
        for (node in json)
        {
            if (arrTag && node == "indexOf")continue;
            if (typeof json[node] == "object")
            {
                json[node] = ClearNull(json[node]);
            }
            if (json[node] == null)
            {
                delete json[node];
            }
        }
        return json;
    }

    /**
     * 处理ＨＴＭＬ类型部分
     * @param Template
     */
    function docType(Template)
    {
        return {
            "docType": reg.docType.exec(Template),
            "html"   : Template.replace(reg, '').replace(reg.notes, '')
        };
    }

    /**
     * @description 由JSON与Template构造HTML；
     * @param {JSON}json
     * @param {string}Template
     */
    function jsonView(json, Template)
    {
        //清理json数据中的null
        json = ClearNull(json);

        //整理模板，清除模板中的注释，分离出docType
        var doc = docType(Template);

        //构造初始队列
        var Templates = doc.html.match(reg.node);

        //队列分层
        var HTMLObj = createHtml(Templates, '');

        //压入数据
        var html = insertDB.call(json, HTMLObj, json);

        //链接HTML
        return doc.docType || '' + LinkHtmlList(html, '');
    }

    return (function ()
    {
        if (typeof exports === 'object')
        {
            module.exports = jsonView;
        }
        else
        {
            if (typeof _cemvc === 'object')
            {
                _cemvc.fn.JSONView = (function ()
                {
                    return function (param)
                    {
                        return jsonView(param.json, param.format);
                    }
                })();
                _cemvc.runOrderList('JSONView');
            }
            else
            {
                window.jsonView = jsonView;
            }
        }
    })()

})();


