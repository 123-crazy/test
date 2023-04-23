// Copyright (c) 2020 Siemens

/* global */

/**
 * Module for comparing two json structure
 *
 * @module js/Arm0CompareJsonStructureService
 */

import app from 'app';
import _ from 'lodash';
import AwHttpService from 'js/awHttpService';
import browserUtils from 'js/browserUtils';
import reqUtils from 'js/requirementsUtils';
import Arm0CompareUtils from 'js/Arm0CompareUtils';
import localeService from 'js/localeService';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

var TC_MICRO_PREFIX = 'tc/micro';
var RM_COMPARE_HTML = '/req_compare/v1/compare/html';

var _propertiesLable;
var _propertyNameLable;
var _propertyValueLable;

// mapp creates a map using unique id
let mapp = new Map();
// let version1 = [];
// let version2 = [];
let p1 = new Map();
let p2 = new Map();
//Empty Object for Object Comparison
let _blankObj = {};

// Hold json structure data as well as compare data
let structureData = {};

export let compareJsonStructure = function( jsonData1, jsonData2 ) {
    structureData.origionalJsonStructure1 = _.cloneDeep( jsonData1, true );
    structureData.origionalJsonStructure2 = _.cloneDeep( jsonData2, true );

    var resource = 'RequirementsCommandPanelsMessages';
    var localTextBundle = localeService.getLoadedText( resource );
    _propertiesLable = localTextBundle.properties;
    _propertyNameLable = localTextBundle.propertyNameLabel;
    _propertyValueLable = localTextBundle.propertyValueLabel;

    let version1 = [];
    let version2 = [];
    p1 = new Map();
    p2 = new Map();

    structureData.jsonStructure1 = jsonData1;
    structureData.jsonStructure2 = jsonData2;

    // Assign same name/id from json1 to avoid comparing specification header
    structureData.jsonStructure2.name = structureData.jsonStructure1.name;
    structureData.jsonStructure2.uniqueId = structureData.jsonStructure1.uniqueId;

    var htmlString1 = '';
    depthFirstSearch( version1, p1, _blankObj, structureData.jsonStructure1, htmlString1 );
    structureData.jsonStructure1.htmlContents = htmlString1;

    var htmlString2 = '';
    depthFirstSearch( version2, p2, _blankObj, structureData.jsonStructure2, htmlString2 );
    structureData.jsonStructure2.htmlContents = htmlString2;

    compareTree( version1, version2 );

    return structureData;
};

/**
 * Set existing structures JSON data to service for rendering Preview
 * @param {Object} v - the arraylist which is to be populated
 * @param {Object} p - map for obejct and its parent
 * @param {Object} parent - parent object
 * @param {Object} object - Json object
 * @param {String} html - html string
 */
function depthFirstSearch( v, p, parent, object, html ) {
    let temp = _alone( object );
    temp.parent = parent.uniqueId;
    object.numOfChildren = object.children.length;
    if ( temp.name !== '' && p.size !== 0 ) {
        var h = _getHeaderTag( temp );
        html += '<' + h + ' id=\'' + temp.uniqueId + '\'>' + temp.name + '</' + h + '>';
    }
    mapp.set( temp.uniqueId, temp );
    v.push( temp );
    p.set( temp, parent );
    if ( temp.hasOwnProperty( 'contents' ) && temp.contents !== '' && p.size !== 0 ) {
        html += '<div>' + temp.contents;
    }
    for ( let i = 0; i < object.numOfChildren; i++ ) {
        depthFirstSearch( v, p, temp, object.children[i], html );
    }
    if ( temp.hasOwnProperty( 'contents' ) && temp.contents !== '' && p.size !== 0 ) {
        html += '</div>';
    }
}
let uniqueIdMap = new Map();

/**
 * @param {String} version1 - Existing structure's JSON data
 * @param {String} version2 - New structure's JSON data
 */
function compareTree( version1, version2 ) {
    var each;
    uniqueIdMap = new Map();
    let output = [];
    for ( each in version2 ) {
        let l1 = matchList( version1, version2[each] );
        let flag = false;
        for ( let i = 0; i < l1.length; i++ ) {
            let n1 = version2[each];
            let n2 = l1[i];
            var old = n2;
            var nxt = n1;
            while ( p1.get( n2 ) && p2.get( n1 ) && p2.get( n1 ).hasOwnProperty( 'masterUId' ) && p1.get( n2 ).hasOwnProperty( 'itemUId' ) && p2.get( n1 ).masterUId === p1.get( n2 ).itemUId && p2.get( n1 ).internalType.split( ' ' )[0] === p1.get( n2 ).internalType.split( ' ' )[0] ) {
                n1 = p2.get( n1 );
                n2 = p1.get( n2 );
            }
            n1 = p2.get( n1 );
            n2 = p1.get( n2 );
            if ( n1 === _blankObj && n2 === _blankObj ) {
                flag = true;
                // check if contents are modifed, if yes call compare microservice to compare html contents
                var isBlank = false;
                if ( old.contents === '<p>&nbsp;</p>' && version2[each].contents === '' ) {
                    isBlank = true;
                    mapp.set( old.uniqueId, nxt );
                    uniqueIdMap.set( version2[each].uniqueId, old.uniqueId );
                }
                _createPropertiesTable( old );
                _createPropertiesTable( version2[each] );
                if ( old.contents !== version2[each].contents && !isBlank ) {
                    mapp.set( old.uniqueId, nxt );
                    uniqueIdMap.set( version2[each].uniqueId, old.uniqueId );
                    // modified
                    var freeze_version_int = parseInt( version2[each].freeze_version );
                    if( freeze_version_int !== 0 ) { // Do not compare contents/properties incase of freeze requirement
                        noChangeObjects( output, old, version2[each] );
                    } else {
                        var isOnlyPropUpdated = false;
                        if( old.contentsWithoutProp && old.contentsWithoutProp === version2[each].contentsWithoutProp ) { // contents are same, it means only properties are updated
                            isOnlyPropUpdated = true;
                        }
                        updateObjects( output, old, version2[each], isOnlyPropUpdated );
                    }
                    let index = version1.indexOf( l1[i] );
                    if ( index > -1 ) {
                        version1.splice( index, 1 );
                    }
                } else {
                    if ( old.internalType.split( ' ' )[0] === version2[each].internalType.split( ' ' )[0] ) {
                        mapp.set( old.uniqueId, nxt );
                        noChangeObjects( output, old, version2[each] );
                        let index = version1.indexOf( l1[i] );
                        if ( index > -1 ) {
                            version1.splice( index, 1 );
                        }
                    } else {
                        flag = false;
                        //Add and Delete
                    }
                }
                break;
            }
        }
        addV2Objects( output, version2[each], flag );
    }
    deleteV1Objects( version1, output );
    updateChildParentRelation( output );
    var output1 = mapp.get( output[0].reqobject.uniqueId );
    structureData.comparedData = output1;
    p1 = new Map();
    p2 = new Map();

    _updateUniqueUids( structureData.comparedData );
}

var _updateUniqueUids = function( parent ) {
    var childs = parent.children;
    for ( var i = 0; i < childs.length; i++ ) {
        var node = childs[i];
        if ( uniqueIdMap.get( node.uniqueId ) ) {
            node.uniqueId = uniqueIdMap.get( node.uniqueId );
        }
        _updateUniqueUids( node );
    }
};

/**
 * @param {Object} output - compared output JSON data
 */
function updateChildParentRelation( output ) {
    var arrlen = output.length; //Output Array Length
    //Adding children Array in each Object
    for ( var i = 0; i < arrlen; i++ ) {
        mapp.get( output[i].reqobject.uniqueId ).children = [];
    }
    //Adding children in Object if there Parent ID is matched with the Object
    for ( i = arrlen - 1; i > 0; i-- ) {
        var tempObj = output[i].reqobject;
        try {
            if ( mapp.get( tempObj.parent ) && mapp.get( tempObj.parent ).hasOwnProperty( 'children' ) ) {
                if ( mapp.get( tempObj.parent ).children !== undefined ) {
                    mapp.get( tempObj.parent ).children.unshift( mapp.get( tempObj.uniqueId ) );
                }
            }
            throw '';
        } catch ( err ) {
            //
        } finally {
            //
        }
    }
    // Deleting ParentID from Object as this is not required
    //And Required Action - Add/Update/Delete
    for ( i = 0; i < arrlen; i++ ) {
        delete output[i].reqobject.parent;
        output[i].reqobject.action = output[i].action;
        output[i].reqobject.siblingId = '';
    }
}

/**
 * Deleting Object from Version1 Array and Placing them into Output Array
 * For Deleted Object
 *
 * @param {Array} version - array of objects
 * @param {Object} output - compared output JSON data
 */
function deleteV1Objects( version, output ) {
    while ( version.length > 0 ) {
        var ob = version[0];
        if( !ob.propertiesTable ) {
            _createPropertiesTable( ob );
        }
        ob.level = 2;
        ob.isTC = 'No';
        ob.status = 'Delete';
        ob.contentChange = 'No';
        ob.objectFromMaster = true;
        output.push( {
            reqobject: ob,
            action: 'Delete'
        } );
        version.splice( 0, 1 );
    }
}

/**
 * Adding Object from Version2 Array to Output Array
 * For Added Object
 *
 * @param {Object} output - compared output JSON data
 * @param {String} object - object
 * @param {String} flag - to check the Action
 */
function addV2Objects( output, object, flag ) {
    if ( !flag ) {
        if( !object.propertiesTable ) {
            _createPropertiesTable( object );
        }
        object.isTC = 'No';
        object.status = 'Add';
        object.contentChange = 'No';
        output.push( {
            reqobject: object,
            action: 'Add'
        } );
    }
}

/**
 *
 * @param {*} output - compared output JSON data
 * @param {*} old - old JSON object from Version1 Array
 * @param {*} object - object
 */
function noChangeObjects( output, old, object ) {
    uniqueIdMap.set( object.uniqueId, old.uniqueId );
    object.isTC = 'Yes';
    object.status = 'NoChange';
    object.contentChange = 'No';
    object.internalType = old.internalType;
    object.displayType = old.displayType;
    object.contents = old.contents; // show content of master
    object.name = old.name;     // show name of master
    output.push( {
        reqobject: object,
        action: 'NoChange'
    } );
}

/**
 *
 * @param {*} output - compared output JSON data
 * @param {*} old - old JSON object from Version1 Array
 * @param {*} object - object
 * @param {Boolean} doPropertyCompare - true, if need property compare only
 */
function updateObjects( output, old, object, doPropertyCompare ) {
    object.isTC = 'Yes';
    object.status = 'Update';
    object.contentChange = 'Yes';
    object.internalType = old.internalType;
    object.displayType = old.displayType;
    object.name = old.name;     // show name of master


    object.existingContentsWithoutProp = old.contentsWithoutProp;
    object.updatedContentsWithoutProp = object.contentsWithoutProp;
    delete object.contentsWithoutProp;  // not required

    _compareHtml( old, object, doPropertyCompare );
    output.push( {
        reqobject: object,
        action: 'Update'
    } );
}

/**
 * Function to preprocess images/ole for merge
 * @param {Object} htmlContentData - Json object with html string data
 */
var preprocessImageBeforeCompare = function( htmlContentData ) {
    var firstHtmldiv = document.createElement( 'div' );
    firstHtmldiv.innerHTML = htmlContentData.html1;
    var secondHtmldiv = document.createElement( 'div' );
    secondHtmldiv.innerHTML = htmlContentData.html2;
    var contentUpdated = false;
    // Find same image from second html and sync with first html
    var firstImages = firstHtmldiv.getElementsByTagName( 'img' );
    for ( let index = 0; index < firstImages.length; index++ ) {
        const firstImg = firstImages[index];
        if( firstImg.getAttribute( 'oleId' ) ) {
            var datasetFileTicket = firstImg.getAttribute( 'datasetFileTicket' );
            if( datasetFileTicket ) {
                // Get ticket from datasetFileTicket and add in oleId
                var datasetTicket = datasetFileTicket.substring( datasetFileTicket.indexOf( '?ticket=' ) );
                datasetTicket = datasetTicket.substr( '?ticket='.length );
                firstImg.setAttribute( 'oleid', datasetTicket );
                firstImg.removeAttribute( 'oleobjectuid' );
                contentUpdated = true;
            }
        }
    }

    // Find images from second which is are not in first, Remove id/alt from image to process it as new image
    var secondImages = secondHtmldiv.getElementsByTagName( 'img' );
    for ( let index = 0; index < secondImages.length; index++ ) {
        var secondImg1 = secondImages[index];
        if( secondImg1.id && secondImg1.id !== '' && !secondImg1.getAttribute( 'oleId' ) ) {
            // If first does not have same image
            var firstImg1 = firstHtmldiv.querySelector( '[id="' + secondImg1.id + '"]' );
            if( !firstImg1 ) {
                // same image
                secondImg1.removeAttribute( 'id' );
                secondImg1.removeAttribute( 'alt' );
                var urlWithoutFileName = removeFileParam( secondImg1.getAttribute( 'src' ) );
                // Revove base url
                urlWithoutFileName = urlWithoutFileName.substring( urlWithoutFileName.indexOf( 'fms/fmsdownload' ) );
                secondImg1.setAttribute( 'src', urlWithoutFileName );
                contentUpdated = true;
            }
        } else if( secondImg1.getAttribute( 'oleId' ) ) {
            var datasetFileTicket1 = secondImg1.getAttribute( 'datasetFileTicket' );
            if( datasetFileTicket1 ) {
                // Get ticket from datasetFileTicket and add in oleId
                var datasetTicket1 = datasetFileTicket1.substring( datasetFileTicket1.indexOf( '?ticket=' ) );
                datasetTicket1 = datasetTicket1.substr( '?ticket='.length );
                secondImg1.setAttribute( 'oleid', datasetTicket1 );
                secondImg1.removeAttribute( 'oleobjectuid' );
                contentUpdated = true;
            }
        }
    }

    if( contentUpdated ) {
        htmlContentData.html1 = firstHtmldiv.innerHTML;
        htmlContentData.html2 = secondHtmldiv.innerHTML;
    }
};

/**
 * Function to remove file parameter from url/link
 * @param {String} sourceURL - url
 * @returns {String} - Update url
 */
function removeFileParam( sourceURL ) {
    var baseUrl = sourceURL.substring( 0, sourceURL.indexOf( 'file=' ) );
    if( baseUrl && baseUrl !== '' ) {
        var ticketParam = sourceURL.substring( sourceURL.indexOf( '?ticket=' ) );
        sourceURL = baseUrl + ticketParam;
    }
    return sourceURL;
}

/**
 * to Compare TC Object and Preview Object
 * @param {Object} nodeToCompareWith -
 * @param {Object} nodeToAddResult -
 * @param {Boolean} doPropertyCompare - true, if need property compare only
 */
var _compareHtml = function( nodeToCompareWith, nodeToAddResult, doPropertyCompare ) {
    var content1 = nodeToCompareWith.contents;
    var content2 = nodeToAddResult.contents;
    if( doPropertyCompare ) {
        content1 = nodeToCompareWith.propertiesTable;
        content2 = nodeToAddResult.propertiesTable;
    }

    // Preprocess images before compare
    var htmlContentData = {
        html1: content1,
        html2: content2
    };
    // Sync Same Images
    Arm0CompareUtils.syncSameImagesAndOLE( htmlContentData );
    preprocessImageBeforeCompare( htmlContentData );

    var contents = [ htmlContentData.html1, htmlContentData.html2 ];

    var $http = AwHttpService.instance;
    var url = getCompareHtmlServiceURL();
    $http.post( url, contents, {
        headers: { 'Content-Type': 'application/json' }
    } ).then( function( response ) {
        var comparedContentes;
        if( response.data && response.data.output && _isAnyDifferenceInCompare( response.data.output ) ) {
            comparedContentes = reqUtils.removeEmptySpans( response.data.output );    // Remove empty spans to avoid incorrect html rendering
            var index = comparedContentes.indexOf( '<?xml version="1.0" encoding="UTF-8"?>' );
            if ( index > -1 ) {
                comparedContentes = comparedContentes.slice( '<?xml version="1.0" encoding="UTF-8"?>'.length );
            }
            if( doPropertyCompare ) {
                var cDiv = document.createElement( 'DIV' );
                cDiv.innerHTML = nodeToCompareWith.contents;
                cDiv.getElementsByClassName( 'aw-requirement-previewPropertyTable' )[0].outerHTML = comparedContentes;
                comparedContentes = cDiv.innerHTML;
                nodeToAddResult.isPropertyUpdated = true;
            }
        } else {
            comparedContentes = nodeToCompareWith.contents;
            // reset status as there is not difference found
            nodeToAddResult.status = 'NoChange';
            nodeToAddResult.contentChange = 'No';
            nodeToAddResult.action = 'NoChange';
        }

        nodeToAddResult.contents = comparedContentes;
        nodeToAddResult.orignalContents = nodeToAddResult.contents;
        nodeToAddResult.existingDocumentData = nodeToCompareWith.contents;
    } );
};

/**
 * Return the url for compare html microservice
 * @returns {String} url
 */
export let getCompareHtmlServiceURL = function() {
    return browserUtils.getBaseURL() + TC_MICRO_PREFIX + RM_COMPARE_HTML;
};

/**
 * Returns true if any difference mentioned in compared report
 *
 * @param {string} content - compared html contents
 * @returns {boolean} - true if any difference added in compared report
 */
var _isAnyDifferenceInCompare = function( content ) {
    if( content.indexOf( 'diff-html-added' ) > -1 || content.indexOf( 'diff-html-removed' ) > -1 || content.indexOf( 'diff-html-changed' ) > -1 )  {
        return true;
    }
    return false;
};

/**
 * creates an array of matched object for two Json data
 * @param {Object} v - Existing structure's JSON data
 * @param {Object} object - New json data
 * @returns {Object} - Matched array object
 */
function matchList( v, object ) {
    let l1 = [];
    var item;
    for ( item in v ) {
        if ( v[item].hasOwnProperty( 'itemUId' ) && v[item].itemUId === object.masterUId ) {
            l1.push( v[item] );
        }
    }
    return l1;
}

/**
 * returns a Json object after deleting all its children objects
 * @param {Object} object -object Json object
 * @returns {Object} obj2 - Json object after deleting children
 */
function _alone( object ) {
    let obj2 = Object.assign( {}, object );
    delete obj2.children;
    return obj2;
}

/**
 * gets header tag for Json object
 * @param {String} obj - header string
 * @returns {String} - header tag
 */
function _getHeaderTag( obj ) {
    var headerTag = obj.styleName.split( ' ' )[1];
    if ( headerTag === undefined ) {
        return 'h1';
    }
    return 'h' + headerTag;
}

/**
 * Get Properties from object and create table
 * @param {Object} jsonObject - header string
 */
function _createPropertiesTable( jsonObject ) {
    if( jsonObject && jsonObject.properties && jsonObject.properties.length > 1 ) {
        var propDiv = document.createElement( 'DIV' );
        propDiv.classList.add( 'aw-requirement-previewPropertyTable' );
        var propTitle = document.createElement( 'P' );
        propTitle.appendChild( document.createTextNode( _propertiesLable ) );
        propTitle.classList.add( 'aw-requirement-previewPropertyTableHeader' );
        propDiv.appendChild( propTitle );
        var table = document.createElement( 'TABLE' );
        propDiv.appendChild( table );
        var tableBody = document.createElement( 'TBODY' );
        table.appendChild( tableBody );

        var th = _createTableRow( {
            name: _propertyNameLable,
            value: _propertyValueLable
        } );
        th.classList.add( 'aw-splm-tableHeaderCell' );
        tableBody.appendChild( th );

        var modelType = cmm.getType( jsonObject.internalType );

        jsonObject.properties.forEach( propertyObj => {
            if( propertyObj.name !== 'object_string' && modelType.propertyDescriptorsMap[propertyObj.name] ) {
                tableBody.appendChild( _createTableRow( propertyObj, modelType.propertyDescriptorsMap ) );
            }
        } );

        jsonObject.propertiesTable = propDiv.outerHTML;

        var contentWithPropDiv = document.createElement( 'DIV' );
        var contentDiv = document.createElement( 'DIV' );
        contentDiv.classList.add( 'aw-requirement-previewContent' );
        contentDiv.innerHTML = jsonObject.contents;
        contentWithPropDiv.appendChild( contentDiv );
        contentWithPropDiv.appendChild( propDiv );

        jsonObject.contentsWithoutProp = jsonObject.contents;
        jsonObject.contents = contentWithPropDiv.outerHTML;
    }
}

/**
 *
 * @param {Object} propertyObj - object with property name and value
 * @param {Map} propertyDescriptorsMap - Property Descriptors Map
 */
function _createTableRow( propertyObj, propertyDescriptorsMap ) {
    var tr = document.createElement( 'TR' );
    var tdName = document.createElement( 'TD' );
    var tdNameSpan = document.createElement( 'P' );
    tdNameSpan.innerHTML = propertyDescriptorsMap && propertyDescriptorsMap[propertyObj.name] ? propertyDescriptorsMap[propertyObj.name].displayName : propertyObj.name;
    tdNameSpan.setAttribute( 'property_internal_name', propertyObj.name );
    tdNameSpan.classList.add( 'aw-splm-tableHeaderCellLabel' );
    tdName.appendChild( tdNameSpan );
    tr.appendChild( tdName );
    var tdValue = document.createElement( 'TD' );
    var tdValueSpan = document.createElement( 'P' );
    if( !propertyDescriptorsMap ) {   // If no property discriptor provided, header labels
        tdValueSpan.classList.add( 'aw-splm-tableHeaderCellLabel' );
    }
    var tdValueInnerSpan = document.createElement( 'SPAN' );
    tdValueSpan.appendChild( tdValueInnerSpan );
    tdValueInnerSpan.innerHTML = propertyObj.value;
    tdValue.appendChild( tdValueSpan );
    tr.appendChild( tdValue );
    return tr;
}

export default exports = {
    compareJsonStructure
};

/**
 * Compare two json service utility
 *
 * @memberof NgServices
 * @member Arm0CompareJsonStructureService
 */
app.factory( 'Arm0CompareJsonStructureService', () => exports );
