/* sakkarr site runtime: renders each page's template with its data. */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(scope, path) {
    path = String(path).trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interpolate(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function processChildren(parent, scope) {
    var kids = Array.prototype.slice.call(parent.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var out = processNode(kids[i], scope);
      if (out !== kids[i]) parent.replaceChild(out, kids[i]);
    }
  }

  function processNode(node, scope) {
    if (node.nodeType === 3) {
      if (node.nodeValue.indexOf('{{') !== -1) node.nodeValue = interpolate(node.nodeValue, scope);
      return node;
    }
    if (node.nodeType !== 1) return node;
    var tag = node.tagName.toLowerCase();

    if (tag === 'sc-for') {
      var list = lookup(scope, (node.getAttribute('list') || '').replace(/[{}]/g, '')) || [];
      var as = node.getAttribute('as') || 'item';
      var frag = document.createDocumentFragment();
      for (var i = 0; i < list.length; i++) {
        var s = Object.assign({}, scope);
        s[as] = list[i];
        s.$index = i;
        var holder = document.createElement('div');
        for (var c = 0; c < node.childNodes.length; c++) holder.appendChild(node.childNodes[c].cloneNode(true));
        processChildren(holder, s);
        while (holder.firstChild) frag.appendChild(holder.firstChild);
      }
      return frag;
    }

    if (tag === 'sc-if') {
      var on = lookup(scope, (node.getAttribute('value') || '').replace(/[{}]/g, ''));
      var f2 = document.createDocumentFragment();
      if (on) {
        processChildren(node, scope);
        while (node.firstChild) f2.appendChild(node.firstChild);
      }
      return f2;
    }

    var attrs = Array.prototype.slice.call(node.attributes);
    for (var a = 0; a < attrs.length; a++) {
      var name = attrs[a].name, val = attrs[a].value;
      if (name.indexOf('hint-') === 0) { node.removeAttribute(name); continue; }
      if (val.indexOf('{{') === -1) continue;
      var m = val.match(WHOLE);
      if (m && /^on/i.test(name)) {
        var fn = lookup(scope, m[1]);
        node.removeAttribute(name);
        if (typeof fn === 'function') node.addEventListener(name.slice(2).toLowerCase(), fn);
      } else {
        node.setAttribute(name, interpolate(val, scope));
      }
    }
    processChildren(node, scope);
    return node;
  }

  window.DCLogic = function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  };
  window.DCLogic.prototype.setState = function (patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (this.__render) this.__render();
  };
  window.DCLogic.prototype.forceUpdate = function () { if (this.__render) this.__render(); };
  window.DCLogic.prototype.renderVals = function () { return {}; };

  window.DC = {
    mount: function (Component) {
      var tpl = document.getElementById('tpl');
      var app = document.getElementById('app');
      var inst = new Component({});
      inst.__render = function () {
        var frag = tpl.content.cloneNode(true);
        processChildren(frag, inst.renderVals() || {});
        app.replaceChildren(frag);
      };
      inst.__render();
      if (location.hash) {
        var t = document.getElementById(location.hash.slice(1));
        if (t) t.scrollIntoView();
      }
    }
  };
})();
