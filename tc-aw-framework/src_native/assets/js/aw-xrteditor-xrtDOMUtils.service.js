// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-xrteditor-xrtDOMUtils.service
 */
import app from 'app';

let exports;
export let data = {};

var propertyNames = [];
var editing;
// Find a way of making this constant
var TAGNAMES = [ 'all', 'attachments', 'break', 'classificationProperties', 'classificationTrace', 'column',
    'command', 'rendering', 'conditions', 'GoverningProperty', 'Rule', 'customPanel', 'firstcolumn', 'header',
    'image', 'label', 'listDisplay', 'objectSet', 'page', 'parameter', 'property', 'secondcolumn', 'section',
    'separator', 'tableDisplay', 'thumbnailDisplay', 'treeDisplay', 'view', 'views', 'inject', 'subRendering',
    'htmlPanel', 'aw-property', 'aw-frame', 'content'
];

/**
 * @param {Object} xmlAttr XML attribute
 * @param {String} name name
 *
 * @return {exports.XRTNodeAttr}
 */
export let XRTNodeAttr = function( xmlAttr, name ) {
    if( xmlAttr ) {
        this.name = xmlAttr.name;
        this.value = xmlAttr.value;
        if( !this.value ) {
            this.value = '';
        }

        // hack type in here for now...
        if( this.name === 'name' || this.name === 'renderingHint' ) {
            this.type = 'list';
        } else {
            this.type = 'text';
        }
    } else if( name ) {
        this.name = name;
        if( this.name === 'name' || this.name === 'renderingHint' ) {
            this.type = 'list';
        } else {
            this.type = 'text';
        }
    }
};

// Returns list of possible values for attributes
export let getValueList = function( $scope ) {
    var list;

    if( $scope.attr.name === 'name' ) {
        list = exports.getPropertyNames();
    } else if( $scope.attr.name === 'renderingHint' ) {
        list = [ 'array', 'checkboxoptionlov', 'datebutton', 'label', 'localizablearray', 'localizablelovuicomp',
            'localizabletextarea', 'localizabletextfield', 'localizablelongtextpanel', 'logical', 'longtext',
            'lovuicomp', 'objectlink', 'panel', 'radiobutton', 'radiobuttonoptionlov', 'slider', 'styledtextarea',
            'styledtextfield', 'textarea', 'textfield', 'togglebutton', 'togglebuttonoptionlov'
        ];
    }
    return list;
};

export let setEditing = function( value ) {
    editing = value;
};

export let getEditing = function() {
    return editing;
};

/**
 * @param {Array} values propertyName values
 */
export let setPropertyNames = function( values ) {
    propertyNames = values.sort();
};

/**
 * @return {Array} array of property names
 */
export let getPropertyNames = function() {
    return propertyNames;
};

/**
 * @param {Object} xmlNode XML node
 *
 * @return {exports.XRTNode}
 */
export let XRTNode = function( xmlNode ) {
    xmlNode.normalize();
    this.type = '';
    this.children = [];
    this.attributes = [];
    this.enableAdd = false;
    this.enableDelete = false;

    this.type = xmlNode.nodeName;

    if( xmlNode.attributes ) {
        for( var ii = 0; ii < xmlNode.attributes.length; ii++ ) {
            this.attributes.push( new exports.XRTNodeAttr( xmlNode.attributes[ ii ] ) );
        }
    }

    if( xmlNode.childElementCount ) {
        for( var ii = 0; ii < xmlNode.childNodes.length; ii++ ) {
            if( xmlNode.childNodes[ ii ].nodeType !== 1 ) {
                continue;
            }
            this.children.push( new exports.XRTNode( xmlNode.childNodes[ ii ] ) );
        }
    }

    this.addAttr = function( attrName ) {
        for( var jj = 0; jj < this.attributes.length; jj++ ) {
            if( this.attributes[ jj ].name.toUpperCase() === attrName.toUpperCase() ) {
                return;
            }
        }
        this.attributes.push( new exports.XRTNodeAttr( null, attrName ) );
    };

    exports.assignAttributes( this );
};

export let assignAttributes = function( xmlNode ) {
    var type = xmlNode.type.toUpperCase();
    if( type !== 'RENDERING' ) {
        xmlNode.enableDelete = true;
    }

    if( type === 'ALL' ) {
        xmlNode.addAttr( 'type' );
        // } else if( type === "ATTACHMENTS" ) {
        // } else if( type === "BREAK" ) {
        // } else if( type === "CLASSIFICATIONPROPERTIES" ) {
        // } else if( type === "CLASSIFICATIONTRACE" ) {
        // } else if( type === "COLUMN" ) {
    } else if( type === 'COMMAND' ) {
        xmlNode.addAttr( 'actionKey' );
        xmlNode.addAttr( 'commandID' );
        xmlNode.addAttr( 'defaultTitle' );
        xmlNode.addAttr( 'icon' );
        xmlNode.addAttr( 'renderingHint' );
        xmlNode.addAttr( 'text' );
        xmlNode.addAttr( 'titleKey' );
        xmlNode.addAttr( 'tooltip' );
        xmlNode.enableAdd = true;
    } else if( type === 'RENDERING' ) {
        xmlNode.enableAdd = true;
        // } else if( type === "CONDITIONS" ) {
    } else if( type === 'GOVERNINGPROPERTY' ) {
        xmlNode.addAttr( 'propertyname' );
        xmlNode.addAttr( 'propertyvalue' );
    } else if( type === 'RULE' ) {
        xmlNode.addAttr( 'propertyname' );
        xmlNode.addAttr( 'state' );
    } else if( type === 'CUSTOMPANEL' ) {
        xmlNode.addAttr( 'java' );
        xmlNode.addAttr( 'js' );
        // } else if( type === "FIRSTCOLUMN" ) {
    } else if( type === 'HEADER' ) {
        xmlNode.enableAdd = true;
    } else if( type === 'IMAGE' ) {
        xmlNode.addAttr( 'maxheight' );
        xmlNode.addAttr( 'maxwidth' );
        xmlNode.addAttr( 'source' );
        xmlNode.addAttr( 'tooltip' );
    } else if( type === 'LABEL' ) {
        xmlNode.addAttr( 'class' );
        xmlNode.addAttr( 'style' );
        xmlNode.addAttr( 'text' );
        xmlNode.addAttr( 'textKey' );
    } else if( type === 'LISTDISPLAY' ) {
        xmlNode.enableAdd = true;
    } else if( type === 'OBJECTSET' ) {
        xmlNode.addAttr( 'defaultdisplay' );
        xmlNode.addAttr( 'maxColumnCharCount' );
        xmlNode.addAttr( 'maxRowCount' );
        xmlNode.addAttr( 'minRowCount' );
        xmlNode.addAttr( 'sortby' );
        xmlNode.addAttr( 'sortdirection' );
        xmlNode.addAttr( 'source' );
        xmlNode.enableAdd = true;
    } else if( type === 'PAGE' ) {
        xmlNode.addAttr( 'format' );
        xmlNode.addAttr( 'text' );
        xmlNode.addAttr( 'title' );
        xmlNode.addAttr( 'titleKey' );
        xmlNode.addAttr( 'visibleWhen' );
        xmlNode.enableAdd = true;
    } else if( type === 'PARAMETER' ) {
        xmlNode.addAttr( 'name' );
        xmlNode.addAttr( 'value' );
    } else if( type === 'PROPERTY' ) {
        xmlNode.addAttr( 'border' );
        xmlNode.addAttr( 'column' );
        xmlNode.addAttr( 'modifiable' );
        xmlNode.addAttr( 'name' );
        xmlNode.addAttr( 'renderingHint' );
        xmlNode.addAttr( 'renderingStyle' );
        xmlNode.addAttr( 'row' );
        xmlNode.addAttr( 'style' );
        // } else if( type === "SECONDCOLUMN" ) {
    } else if( type === 'SECTION' ) {
        xmlNode.addAttr( 'commandLayout' );
        xmlNode.addAttr( 'initialstate' );
        xmlNode.addAttr( 'text' );
        xmlNode.addAttr( 'title' );
        xmlNode.addAttr( 'titleKey' );
        xmlNode.addAttr( 'groupname' );
        xmlNode.enableAdd = true;
        // } else if( type === "SEPARATOR" ) {
    } else if( type === 'TABLEDISPLAY' ) {
        xmlNode.enableAdd = true;
    } else if( type === 'THUMBNAILDISPLAY' ) {
        xmlNode.enableAdd = true;
        // } else if( type === "TREEDISPLAY" ) {
    } else if( type === 'VIEW' ) {
        xmlNode.addAttr( 'name' );
        // } else if( type === "VIEWS" ) {
    } else if( type === 'INJECT' ) {
        xmlNode.addAttr( 'type' );
        xmlNode.addAttr( 'src' );
        // } else if( type === "SUBRENDERING" ) {
    } else if( type === 'HTMLPANEL' ) {
        xmlNode.addAttr( 'src' );
        xmlNode.addAttr( 'id' );
    } else if( type === 'AW-PROPERTY' ) {
        xmlNode.addAttr( 'prop' );
        xmlNode.addAttr( 'hint' );
        xmlNode.addAttr( 'modifiable' );
    } else if( type === 'AW-FRAME' ) {
        xmlNode.addAttr( 'src' );
    } else if( type === 'CONTENT' ) {
        xmlNode.addAttr( 'visibleWhen' );
    }
};

// Returns the tag name of the given line string
export let readTagNameFromLine = function( givenLineString ) {
    var lineString = givenLineString;
    lineString = lineString.substring( lineString.indexOf( '<' ) + 1, lineString.length );
    return lineString.substring( -1, lineString.indexOf( ' ' ) );
};

// Returns an array of each attribute and their values for the given
// line string
export let readAttributesFromLine = function( givenLineString ) {
    var lineString = givenLineString;
    lineString = lineString.substring( lineString.indexOf( '<' ) + 1, lineString.length );
    lineString = lineString.substring( lineString.indexOf( ' ' ), lineString.indexOf( '>' ) );

    var attributeStrings = [];
    lineString = lineString.split( ' ' );
    for( var i = 0; i < lineString.length; i++ ) {
        if( lineString[ i ] === '' ) {
            continue;
        }
        attributeStrings.push( lineString[ i ] );
    }

    var attributes = [];
    for( var i = 0; i < attributeStrings.length; i++ ) {
        var name = attributeStrings[ i ].substring( -1, attributeStrings[ i ].indexOf( '=' ) );
        var value = attributeStrings[ i ].substring( attributeStrings[ i ].indexOf( '"' ) + 1, attributeStrings[ i ]
            .indexOf( '"', attributeStrings[ i ].indexOf( '"' ) + 1 ) );
        attributes.push( {
            name: name,
            value: value
        } );
    }
    return attributes;
};

export let getAttributes = function( attributeArray, tagName ) {
    var values = [];
    if( tagName === 'all' ) {
        values = [ 'type' ];
    } else if( tagName === 'command' ) {
        values = [ 'actionKey', 'commandId', 'defaultTitle', 'icon', 'renderingHint', 'text', 'title', 'titleKey',
            'tooltip'
        ];
    } else if( tagName === 'GoverningProperty' ) {
        values = [ 'propertyname', 'propertyvalue' ];
    } else if( tagName === 'Rule' ) {
        values = [ 'propertyName', 'state' ];
    } else if( tagName === 'customPanel' ) {
        values = [ 'java', 'js' ];
    } else if( tagName === 'image' ) {
        values = [ 'maxheight', 'maxwidth', 'source', 'tooltip' ];
    } else if( tagName === 'label' ) {
        values = [ 'class', 'style', 'text', 'textKey' ];
    } else if( tagName === 'objectSet' ) {
        values = [ 'defaultdisplay', 'maxColumnCharCount', 'maxRowCount', 'minRowcount', 'sortby', 'sortdirection',
            'source'
        ];
    } else if( tagName === 'page' ) {
        values = [ 'format', 'text', 'title', 'titleKey', 'visibleWhen' ];
    } else if( tagName === 'parameter' ) {
        values = [ 'name', 'value' ];
    } else if( tagName === 'property' ) {
        values = [ 'border', 'column', 'modifiable', 'name', 'renderingHint', 'renderingStyle', 'row', 'style' ];
    } else if( tagName === 'section' ) {
        values = [ 'commandLayout', 'initialstate', 'text', 'title', 'titleKey', 'groupname' ];
    } else if( tagName === 'view' ) {
        values = [ 'name' ];
    } else if( tagName === 'inject' ) {
        values = [ 'type', 'src' ];
    } else if( tagName === 'htmlPanel' ) {
        values = [ 'src', 'id' ];
    } else if( tagName === 'aw-property' ) {
        values = [ 'prop', 'hint', 'modifiable' ];
    } else if( tagName === 'aw-frame' ) {
        values = [ 'src' ];
    } else if( tagName === 'content' ) {
        values = [ 'visibleWhen' ];
    }

    attributeArray.forEach( function( currentValue ) {
        if( values.indexOf( currentValue.attributeType ) > -1 ) {
            values.splice( values.indexOf( currentValue.attributeType ), 1 );
        }
    } );
    return values;
};

export let getAttributeValues = function( attributeName, tagName ) {
    var values = [];
    if( tagName === 'property' ) { // Property
        if( attributeName === 'name' ) {
            values = exports.getPropertyNames();
        } else if( attributeName === 'border' ) {
            values = [ 'true', 'false' ];
        } else if( attributeName === 'modifiable' ) {
            values = [ 'true', 'false' ];
        } else if( attributeName === 'renderingHint' ) {
            values = [ 'array', 'checkboxoptionlov', 'datebutton', 'label', 'localizablearray',
                'localizablelovuicomp', 'localizabletextarea', 'localizabletextfield', 'localizablelongtextpanel',
                'logical', 'longtext', 'lovuicomp', 'objectlink', 'panel', 'radiobutton', 'radiobuttonoptionlov',
                'slider', 'styledtextarea', 'styledtextfield', 'textarea', 'textfield', 'togglebutton',
                'togglebuttonoptionlov'
            ];
        } else if( attributeName === 'renderingStyle' ) {
            values = [ 'Headed', 'headless', 'Titled' ];
        }
    } else if( tagName === 'all' ) { // all
        if( attributeName === 'type' ) {
            values = [ 'property', 'form' ];
        }
    } else if( tagName === 'Rule' ) { // Rule
        if( attributeName === 'state' ) {
            values = [ 'required', 'disabled' ];
        }
    } else if( tagName === 'image' ) { // image
        if( attributeName === 'source' ) {
            values = [ 'thumbnail', 'preview', 'type' ];
        }
    } else if( tagName === 'objectSet' ) { // objectSet
        if( attributeName === 'defaultdisplay' ) {
            values = [ 'tableDisplay', 'listDisplay', 'treeDisplay', 'thumbnailDisplay' ];
        } else if( attributeName === 'sortdirection' ) {
            values = [ 'ascending', 'descending' ];
        }
    } else if( tagName === 'page' ) { // page
        if( attributeName === 'format' ) {
            values = [ 'OneColumn', 'TwoColumn' ];
        }
    } else if( tagName === 'section' ) { // section
        if( attributeName === 'commandLayout' ) {
            values = [ 'horizontal', 'vertical' ];
        } else if( attributeName === 'initialstate' ) {
            values = [ 'expanded', 'collapsed' ];
        }
    } else if( tagName === 'inject' ) { // inject
        if( attributeName === 'type' ) {
            values = [ 'dataset', 'preference' ];
        }
    } else if( tagName === 'aw-property' ) { // aw-property
        if( attributeName === 'prop' ) {
            values = [ 'selected.properties[*NAME_OF_PROPERTY*]' ];
        } else if( attributeName === 'hint' ) {
            values = [ 'label', 'textarea', 'textfield', 'radiobutton', 'togglebutton' ];
        } else if( attributeName === 'modifiable' ) {
            values = [ 'true', 'false' ];
        }
    }

    return values;
};

export let getAutocompleteValues = function( completeInfo ) {
    if( completeInfo.tagName === '' && completeInfo.completeType === 'tag' ) {
        var values = [];
        for( var index in TAGNAMES ) {
            values.push( {
                score: '1000',
                meta: 'xrt',
                caption: TAGNAMES[ index ],
                value: TAGNAMES[ index ]
            } );
        }
        return values;
    } else if( completeInfo.completeType === 'attribute' ) {
        var attributes = exports.getAttributes( completeInfo.attributes, completeInfo.tagName );
        var values = [];
        for( var index in attributes ) {
            values.push( {
                score: '1000',
                meta: 'xrt',
                caption: attributes[ index ],
                value: attributes[ index ] + '=""'
            } );
        }
        return values;
    } else if( completeInfo.completeType === 'value' ) {
        var attributeValues = exports.getAttributeValues( completeInfo.attributeName, completeInfo.tagName );
        var values = [];
        for( var index in attributeValues ) {
            values.push( {
                score: '1000',
                meta: 'xrt',
                caption: attributeValues[ index ],
                value: attributeValues[ index ]
            } );
        }
        return values;
    }
};

/**
 * @param {String} xrtString
 *
 * @return {}
 */
export let parseXRT = function( xrtString ) {
    var xrtDoc = new DOMParser().parseFromString( xrtString, 'text/xml' );
    return new exports.XRTNode( xrtDoc.documentElement );
};

export default exports = {
    data,
    XRTNodeAttr,
    getValueList,
    setEditing,
    getEditing,
    setPropertyNames,
    getPropertyNames,
    XRTNode,
    assignAttributes,
    readTagNameFromLine,
    readAttributesFromLine,
    getAttributes,
    getAttributeValues,
    getAutocompleteValues,
    parseXRT
};

/**
 * TODO
 *
 * @memberof NgServices
 * @member xrtDOMService
 */
app.factory( 'xrtDOMService', () => exports );
