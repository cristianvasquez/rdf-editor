(function ($) {
  var defaults = {
    type: null,
    showLangSelect: true,
    selectize: false,
    create: true
  };

  var intVerify = function(v, includeZero, includeNeg, includePos, maxi, mini) {
    var i = parseInt(v, 10);
    if(isNaN(i))
      return false;
    if(!includeZero && i == 0)
      return false;
    if(!includeNeg && i < 0)
      return false;
    if(!includePos && i > 0)
      return false;
    if(maxi != undefined && i > maxi)
      return false;
    if(mini != undefined && i < mini)
      return false;
    return true;
  };

  var decimalCheck = function(v) {
    return $.isNumeric(v);
  };

  var nodeTypes = {
    'http://www.w3.org/2000/01/rdf-schema#Literal': {
      label: 'Plain Literal'
    },
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource': {
      label: 'Resource'
    },
    "http://www.w3.org/2001/XMLSchema#integer": {
      label: 'Integer',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#decimal": {
      label: 'Decimal',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#double": {
      label: 'Double',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#float": {
      label: 'Float',
      verify: decimalCheck
    },
    "http://www.w3.org/2001/XMLSchema#nonPositiveInteger": {
      label: 'Non-Positive Integer',
      verify: function(v) {
        return intVerify(v, true, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#negativeInteger": {
      label: 'Negative Integer',
      verify: function(v) {
        return intVerify(v, false, true, false);
      }
    },
    "http://www.w3.org/2001/XMLSchema#long": {
      label: 'Long',
      verify: function(v) {
        return intVerify(v, true, true, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#int": {
      label: 'Int',
      verify: function(v) {
        return intVerify(v, true, true, true, 2147483647, -2147483648);
      }
    },
    "http://www.w3.org/2001/XMLSchema#short": {
      label: 'Short',
      verify: function(v) {
        return intVerify(v, true, true, true, 32767, -32768);
      }
    },
    "http://www.w3.org/2001/XMLSchema#byte": {
      label: 'Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 127, -128);
      }
    },
    "http://www.w3.org/2001/XMLSchema#nonNegativeInteger": {
      label: 'Non-Negative Integer',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedLong": {
      label: 'Unsigned Long',
      verify: function(v) {
        return intVerify(v, true, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedInt": {
      label: 'Unsigned Int',
      verify: function(v) {
        return intVerify(v, true, false, true, 4294967295);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedShort": {
      label: 'Unsigned Short',
      verify: function(v) {
        return intVerify(v, true, false, true, 65535);
      }
    },
    "http://www.w3.org/2001/XMLSchema#unsignedByte": {
      label: 'Unsigned Byte',
      verify: function(v) {
        return intVerify(v, true, true, true, 255);
      }
    },
    "http://www.w3.org/2001/XMLSchema#positiveInteger": {
      label: 'Positive Integer',
      verify: function(v) {
        return intVerify(v, false, false, true);
      }
    },
    "http://www.w3.org/2001/XMLSchema#boolean": {
      label: 'Boolean',
      setup: function(elem, remove) {
        if(remove) {
          if(elem.bootstrapToggle)
            elem.bootstrapToggle('destroy');
          elem.attr('type', 'text');
        }
        else {
          if(elem.bootstrapToggle)
            elem.bootstrapToggle({
              on: 'True',
              off: 'False'
            });
          elem.attr('type', 'checkbox');
        }
      },
      getValue: function(elem) {
        return (elem.is(":checked") ? "true" : "false");
      },
      setValue: function(elem, val) {
        if(parseInt(val) == 1 || (typeof val == "string" && val.toLowerCase() == 'true'))
          elem.attr('checked', 'checked');
        else
          elem.removeAttr('checked');
      }
    },
    "http://www.w3.org/2001/XMLSchema#string": {
      label: 'String'
    },
    "http://www.w3.org/2001/XMLSchema#dateTime": {
      label: 'Datetime',
      setup: function(input, remove) {
        if(remove)
          input.datetimepicker('remove');
        else
          input.datetimepicker({
            format: "yyyy-mm-ddThh:ii:ssZ",
            weekStart: 1
          });
      }
    },
    "http://www.w3.org/2001/XMLSchema#date": {
      label: 'Date',
      setup: function(input, remove) {
        if(remove)
          input.datetimepicker('remove');
        else
          input.datetimepicker({
            format: "yyyy-mm-dd",
            weekStart: 1
          });
      }
    }
  };

  var toStoreNodeFct = function(store) {
    if(this.type == 'uri')
      return store.rdf.createNamedNode(this.value);
    else
      return store.rdf.createLiteral(this.value, this.language, this.datatype);
  };

  var toStringFct = function() {
    return this.value;
  };

  var RdfNodeEditor = function(elem, options) {
    var self = this;

    self.mainElem = elem;
    self.options = $.extend({}, defaults, options);
    self.currentType = self.options.type || 'http://www.w3.org/2000/01/rdf-schema#Literal';

    self.mainElem.on('input', function() {
      self.verifyInput();
      self.change();
    });

    // put the input into a div for easier control
    self.container = $(document.createElement('div')).addClass('rdfNodeEditor');
    self.inputContainer = $(document.createElement('div')).addClass('rdfNodeInputContainer');
    var $e = $(elem).addClass('form-control');
    $e.after(self.container);
    self.inputContainer.append($e);
    self.container.append(self.inputContainer);

    // setup choices
    if(self.options.choices) {
      self.resSelect = $(document.createElement('select'));
      self.inputContainer.append(self.resSelect);
      self.mainElem.hide();
      var selectizeSetup = function(items) {
        self.resSelect.selectize({
          valueField: "value",
          searchField: "value",
          sortField: "value",
          options: items,
          create: self.options.create,
          onChange: function(value) {
            self.mainElem.val(value);
            self.change();
          },
          render: {
            item: function(item, escape) {
              return '<div>' + escape(item.value) + '</div>';
            },
            option: function(item, escape) {
              return '<div>' + escape(item.value) + '</div>';
            }
          },
          create: function(input) {
            return {
              type: "uri",
              value: input,
              toStoreNode: toStoreNodeFct,
              toString: toStringFct
            };
          }
        });
      };
      if(typeof(self.options.choices) == 'object') {
        selectizeSetup(self.options.choices);
      }
      else if(typeof(self.options.choices) == 'function') {
        self.options.choices(function (items) {
          selectizeSetup(items);
        });
      }
    }

    // create language input
    self.langElem = $(document.createElement('input')).addClass('form-control');
    self.langContainer = $(document.createElement('div')).addClass('rdfNodeLangContainer');
    self.langContainer.append($(document.createElement('div')).addClass("input-group").append($(document.createElement('span')).addClass("input-group-addon").text('Lang')).append(self.langElem));
    self.container.append(self.langContainer);
    if(self.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal')
      self.langContainer.hide();
    self.langElem.on('input', function() {
      self.lang = self.langElem.val();
      self.verifyInput();
      self.change();
    });
    if (!self.options.showLangSelect) {
      self.langContainer.hide();
    }

    // create type-selection
    self.typeContainer = $(document.createElement('div')).addClass('rdfNodeTypeContainer');
    self.typeElem = $(document.createElement('select')).addClass('form-control');
    for(t in nodeTypes) {
      self.typeElem.append($(document.createElement('option')).attr('value', t).text(nodeTypes[t].label));
    }
    self.typeContainer.append(self.typeElem);
    self.container.append(self.typeContainer);
    var typeChFct = function() {
      self.lastType = self.currentType;
      self.currentType = (self.options.selectize ? self.typeElem[0].selectize.getValue() : self.typeElem.val());
      self.verifyFct = nodeTypes[self.currentType].verify;
      self.updateEditor();
      self.verifyInput();
      self.change();
    };
    if(self.options.selectize) {
      self.typeElem.selectize({
        onChange: typeChFct
      });
      self.typeElem[0].selectize.setValue(this.currentType);
    }
    else {
      self.typeElem.change(typeChFct);
    }
    if(self.options.type) {
      self.typeElem.val(self.options.type);
      self.typeContainer.hide();
    }
  };

  RdfNodeEditor.prototype.change = function() {
    $(this).trigger('change', this);
  };

  RdfNodeEditor.prototype.updateEditor = function() {
    // always show the type selection field if the type differs
    if(this.options.type != this.currentType)
      this.typeContainer.css('display', 'table-cell');
    if(!this.options.showLangSelect || this.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal')
      this.langContainer.hide();
    else
      this.langContainer.css('display', 'table-cell');
    if(this.lastType != this.currentType) {
      if(this.lastType && nodeTypes[this.lastType].setup)
        nodeTypes[this.lastType].setup(this.mainElem, true);
      if(nodeTypes[this.currentType].setup)
        nodeTypes[this.currentType].setup(this.mainElem);
    }
  };

  RdfNodeEditor.prototype.getValue = function() {
    if(this.currentType == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource')
      return {
        type: 'uri',
        value: this.mainElem.val(),
        toStoreNode: toStoreNodeFct,
        toString: toStringFct
      };
    else
      return {
        type: 'literal',
        value: (nodeTypes[this.currentType].getValue ? nodeTypes[this.currentType].getValue(this.mainElem) : this.mainElem.val()),
        datatype: (this.currentType != 'http://www.w3.org/2000/01/rdf-schema#Literal' ? this.currentType : undefined),
        language: (this.lang ? this.lang : undefined),
        toStoreNode: toStoreNodeFct,
        toString: toStringFct
      };
  };

  RdfNodeEditor.prototype.setValue = function(node) {
    //console.log('RdfNodeEditor.prototype.setValue ', node);
    if(node) {
      this.lastType = this.currentType;
      var t = node.type || node.token || node.interfaceName;
      if (t === 'uri' || t === 'NamedNode')
        this.currentType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Resource';
      else
        this.currentType = node.datatype || 'http://www.w3.org/2000/01/rdf-schema#Literal';
      this.lang = node.language || node.lang;

      this.mainElem.val(node.value || node.nominalValue);
      if(this.resSelect) {
        this.resSelect[0].selectize.addOption(node);
        this.resSelect[0].selectize.setValue(node.value);
      }
      if(nodeTypes[this.currentType].setValue)
        nodeTypes[this.currentType].setValue(this.mainElem, this.mainElem.val());

      this.langElem.val(this.lang);
      this.typeElem.val(this.currentType);
      if(this.options.selectize)
        this.typeElem[0].selectize.setValue(this.currentType);

      this.updateEditor();
    }
  };

  RdfNodeEditor.prototype.isValid = function(node) {
    return(this.verifyFct ? this.verifyFct(this.mainElem.val()) : true);
  };

  RdfNodeEditor.prototype.verifyInput = function() {
    var self = this;
    var val = $(this.mainElem).val();
    var v = true;
    if(val.length > 0)
      v = (this.verifyFct ? this.verifyFct(val) : true);
    if (v)
      self.mainElem.removeClass('has-error');
    else
      self.mainElem.addClass('has-error');
  };

  RdfNodeEditor.prototype.setEditFocus = function() {
    this.mainElem.focus();
  };

  RdfNodeEditor.prototype.blur = function() {
    this.mainElem.blur();
  };

  RdfNodeEditor.prototype.getElement = function() {
    return this.container;
  };

  $.fn.rdfNodeEditor = function(methodOrOptions) {
    var le = this.data('rdfNodeEditor');
    if(!le) {
      le = new RdfNodeEditor(this, methodOrOptions);
      this.data('rdfNodeEditor', le);
    }
    return le;
  };
})(jQuery);