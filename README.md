jsonView
========

通过xml格式的模板,将JSON转换成HTML标签.

## 取值标签
```
{{"path"}}
```
path:
* JSON.key绝对路径
* .key 相对路径 for 与 switch 会改变当前的相对路径

## for循环:
```html
<json:for select="path">
  code
</json:for>
```
注:
* 1.for循环中的path必需是一个数组
* 2.for循环内的代码,将会把数组中的每个对像设为当前路径,可使用path "." 获取当前值.
   
## switch判断:
```html
<json:switch select="path">
  <case test="value1">
  </case>
  <case test="value2">
  </case>
  <case test="value3">
  </case>
</json:switch>
```
注:
* 1.path必需是一个对像
* 2.test的值是path的一个子节点,当这个节点存在时,执行test,并将这个节点设良当前路径.
