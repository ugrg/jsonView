/**
 * Created with JetBrains WebStorm.
 * User: 姜兵
 * Date: 14-8-4
 * Time: 上午10:25
 * 通过JSON与json模板生成HTML字符串方法。
 */
(function ()
{
    var REG_PATH = {
        "value" : /value=("|')([\w\.]+)\1/g,
        "select": /select=("|')([\w\.]+)\1/g,
        "test"  : /test=("|')([\w\.]+)\1/g
    };
    var REG_DOC_TYPE = /^<!.*?>/;
    var REG_NODE = /<[^>]*>|[^\s][^<>]*/g;
    var REG_VALUE_OF = /<json:valueOf\s+(?:[^<>]*\s+)*value=("|'|)([\w\.-_]+)\1(\s+[^<>]*)*\/>/;
    var REG_IF_VALUE = /value=("|')([^\1]*)\1/g;
    var REG_VOID_ELEMENTS = /<(input|img|br|hr|area|base|link|meta|basefont|param|col|frame|embed|keygen|source|!DOCTYPE)(\s+[^<>]*)*>/;
    var REG_REPLACE = /^\./g;
    var REG_GET_VALUE = /{{("|'|)([\w\.-_]+)\1}}/g;
    var REG_NODE_NAME = /<(?:\/|)([\w:-]+)[^<>]*>/;
    var EMPTY = "";
    var OBJECT_ARR = "[object Array]";
    var OBJECT_OBJ = "[object Object]";
    var STRING = "string";
    var OBJECT = "object";
    var SELECT = "select";

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
            REG_NODE_NAME.lastIndex = 0;
            return REG_NODE_NAME.exec(node)[1];
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
        if (Object.prototype.toString.call(node) == OBJECT_OBJ)
        {
            for (path in node)
            {
            }
        }
        if (path.indexOf("json:") == -1) throw "This node is not a json node";
        reg = REG_PATH[pathAttr];
        if (reg === undefined)throw "The \"" + pathAttr + "\" attr reg was not found!";
        reg.lastIndex = 0;
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
        if (Object.prototype.toString.call(node) == OBJECT_OBJ)
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
                return !REG_VALUE_OF.test(node) ? "valueOf" : "json:valueOf";
            }
            case "[object Object]":
            {
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
     * @description 解析{{getValue}}
     * @param {String} _path
     * @param {object} db
     */
    function getValue(_path, db)
    {
        var root, name, path = _path.replace(REG_REPLACE, EMPTY).split(".");
        root = path[0] == "JSON" ? (path.shift(), db) : this;
        while (name = path.shift())
        {
            root = root[name];
            if (root === undefined)
            {
                root = EMPTY;
                break;
            }
        }
        return {"string": Object.prototype.toString.call(root) != OBJECT_OBJ ? root : JSON.stringify(root), "object": root}
    }


    /**
     * @description 解析{{valueOf}}
     * @param {String}node
     * @param {JSON}db
     */
    function StringValueOf(node, db)
    {
        var repList = node.match(REG_GET_VALUE);
        if (repList == null)
        {
            return node;
        }
        var i, path = ".", valueOfList = [];
        for (i = 0; i < repList.length; i++)
        {
            REG_GET_VALUE.lastIndex = 0;
            path = REG_GET_VALUE.exec(repList[i])[2];
            valueOfList.push(getValue.call(this, path, db).string);
            node = node.replace(repList[i], getValue.call(this, path, db).string)
        }
        return node;
    }

    /**
     * @description XML类型节点提前数据 <json:valueOf value=".v1"/>
     * @param node
     * @param db
     * @return {String}
     */
    function XMLValueOf(node, db)
    {
        var path = getPath(node, "value");
        return getValue.call(this, path, db).string;
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
        path = getPath(node, SELECT);
        child = getChildNode(node);
        var _this = getValue.call(this, path, db).object;
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
        path = getPath(node, SELECT);
        child = getChildNode(node);
        var _this = getValue.call(this, path, db).object;
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
        var path, html = [], value, n, val;
        path = getPath(node, "test");
        for (n in node)
        {
            REG_IF_VALUE.lastIndex = 0;
            value = REG_IF_VALUE.exec(n)[2];
            val = getValue.call(this, path, db);
            if ((getValue.call(this, path, db).string == value) == (n.indexOf("not") == -1))
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
        var node;
        while (node = argList.shift())
        {
            if (node.indexOf('</') == 0)
            {
                if (getNodeName(node) == nodeName)
                {
                    return arr;
                }
            }
            else if (node.indexOf('<') == 0)
            {
                if (node.indexOf('/>') != -1 || REG_VOID_ELEMENTS.test(node))
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
        }
        return arr;
    }

    /**
     * @description 插入数据
     * @param {Array}format
     * @param {JSON}DB
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
     * @return {String}
     */
    function linkHtmlList(htmlList)
    {
        var str = "", i = 0, t;
        for (; i < htmlList.length; i++)
        {
            t = htmlList[i];
            str += typeof t === STRING ? t : linkHtmlList(t);
        }
        return str;
    }

    /**
     * @description 删除JSON中的null节点。
     * @param {JSON}json
     * @return {JSON}
     */
    function clearNull(json)
    {
        var node;
        var arrTag = Object.prototype.toString.call(json) == OBJECT_ARR;
        for (node in json)
        {
            if (arrTag && node == "indexOf")continue;
            if (typeof json[node] === OBJECT && json[node] != null)
            {
                json[node] = clearNull(json[node]);
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
    function pretreatment(Template)
    {
        REG_DOC_TYPE.lastIndex = 0;
        var docType = REG_DOC_TYPE.exec(Template);
        var n = Template.indexOf("<!--"), e;
        while (n != -1)
        {
            e = Template.indexOf("-->", n);
            Template = Template.substring(0, n) + Template.substring(e + 3);
            n = Template.indexOf("<!--");
        }
        return {
            "docType": docType,
            "html"   : Template
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
        json = clearNull(json);
        //整理模板，清除模板中的注释，分离出docType
        var doc = pretreatment(Template);
        //构造初始队列
        var Templates = doc.html.match(REG_NODE);
        //队列分层
        var HTMLObj = createHtml(Templates || [], '');
        //压入数据
        var html = insertDB.call(json, HTMLObj, json);
        //链接HTML
        return doc.docType || '' + linkHtmlList(html);
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


