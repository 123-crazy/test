/* eslint-disable max-lines */
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
 * Module for the Import Specification panel
 *
 * @module js/Arm0ImportFromOffice
 */

import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwHttpService from 'js/awHttpService';
import uwPropertyService from 'js/uwPropertyService';
import requirementsUtils from 'js/requirementsUtils';
import cdm from 'soa/kernel/clientDataModel';
import AwTimeoutService from 'js/awTimeoutService';
import appCtxSvc from 'js/appCtxService';
import rmTreeDataService from 'js/Arm0ImportPreviewJsonHandlerService';
import importPreviewService from 'js/ImportPreview';
import notyService from 'js/NotyModule';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

import 'js/listBoxService';

var exports = {};
var parentData = {};

var ADD_NEW_INTERNAL = 'add_new';

var REQ_NOT_IN_SPEC = 'Requirements (Not in a specification)';

var microServiceURLStringForWord = 'tc/micro/REQIMPORT/v1/api/import/importdocument';
var microServiceURLStringForPDF = 'tc/micro/REQIMPORTPDF/v1/api/import/importdocument';
var _importPreviewData = null;
var _existingStructureJSONData = null;
var _selectedRequidForAddChildPreview = null;
var _selectedTCObject = null;
var TC_MICRO_PREFIX = 'tc/micro';
var RM_COMPARE_HTML = '/req_compare/v1/compare/html';
var _previewElement = null;
var _htmlDataForExistingSpec = null;
var specName;
var specId;
var clickEventAdded = false;
/**
 * The FMS proxy servlet context. This must be the same as the FmsProxyServlet mapping in the web.xml
 */
var WEB_XML_FMS_PROXY_CONTEXT = 'fms';
const EXISTING_LENGTH = 1;
/**
 * Relative path to the FMS proxy download service.
 */
var CLIENT_FMS_DOWNLOAD_PATH = WEB_XML_FMS_PROXY_CONTEXT + '/fmsdownload/?ticket=';
// mapp creates a map using unique id
let mapp = new Map();
let version1 = [];
let version2 = [];
let p1 = new Map();
let p2 = new Map();
//Empty Object for Object Comparison
let _blankObj = {};
let html2 = '';
let html1 = '';

/**
 * Unregister the import related data
 */
export let unregisterImportRelatedCtx = function() {
    if ( appCtxSvc.ctx.isArm0ImportFromWordSubPanelActive ) {
        appCtxSvc.unRegisterCtx( 'isArm0ImportFromWordSubPanelActive' );
    }
    if ( appCtxSvc.ctx.isArm0ImportFromPDFSubPanelActive ) {
        appCtxSvc.unRegisterCtx( 'isArm0ImportFromPDFSubPanelActive' );
    }
    if ( appCtxSvc.ctx.isArm0ImportFromExcelSubPanelActive ) {
        appCtxSvc.unRegisterCtx( 'isArm0ImportFromExcelSubPanelActive' );
    }
    if ( appCtxSvc.ctx.isArm0ImportFromReqIFSubPanelActive ) {
        appCtxSvc.unRegisterCtx( 'isArm0ImportFromReqIFSubPanelActive' );
    }
};

/**
 * Updates view model according to file selected
 * @param {Object} fileData - Data of selected file
 * @param {Object} data - The view model data
 *
 */
export let updateFormData = function( fileData ) {
    if ( fileData && fileData.value !== '' ) {
        unregisterImportRelatedCtx();

        var file = fileData.value;
        var filext = file.substring( file.lastIndexOf( '.' ) + 1 );
        if ( filext ) {
            if ( filext === 'docx' || filext === 'doc' || filext === 'docm' ) {
                appCtxSvc.registerCtx( 'isArm0ImportFromWordSubPanelActive', true );
            } else if ( filext === 'pdf' ) {
                appCtxSvc.registerCtx( 'isArm0ImportFromPDFSubPanelActive', true );
            } else if ( filext === 'xlsx' || filext === 'xlsm' ) {
                appCtxSvc.registerCtx( 'isArm0ImportFromExcelSubPanelActive', true );
                eventBus.publish( 'Arm0ImportFromOffice.recreateExcelPanel' );
            } else if ( filext === 'reqifz' || filext === 'reqif' ) {
                appCtxSvc.registerCtx( 'isArm0ImportFromReqIFSubPanelActive', true );
            }
        }
    }
};

/**
 * returns a Json object after deleting all its children objects
 * @param {Object} object -object Json object
 * @returns {Object} obj2 - Json object after deleting children
 */
function alone( object ) {
    let obj2 = Object.assign( {}, object );
    // obj2.id=obj2.uniqueId;
    delete obj2.children;
    return obj2;
}

/**
 * gets header tag for Json object
 * @param {String} obj - header string
 * @returns {String} - header tag
 */
function getHeaderTag( obj ) {
    var headerTag = obj.styleName.split( ' ' )[1];
    if ( headerTag === undefined ) {
        return 'h1';
    }
    return 'h' + headerTag;
}

/**
 * Set existing structures JSON data to service for rendering Preview
 * @param {Object} v - the arraylist which is to be populated
 * @param {Object} p - map for obejct and its parent
 * @param {Object} parent - parent object
 * @param {Object} object - Json object
 * @param {Object} flg -
 * @param {Object} index -
 */
function depthFirstSearch( v, p, parent, object, flg, index ) {
    let temp = alone( object );
    temp.parent = parent.uniqueId;
    object.numOfChildren = object.children.length;
    if ( temp.name !== '' && p.size !== 0 ) {
        var h = getHeaderTag( temp );
        if ( flg === 1 ) { html1 += '<' + h + ' id=\'' + temp.uniqueId + '\'>' + temp.name + '</' + h + '>'; } else {
            html2 += '<' + h + ' id=\'' + temp.uniqueId + '\'>' + temp.name + '</' + h + '>';
        }
    }
    mapp.set( temp.uniqueId, temp );
    v.push( temp );
    p.set( temp, parent );
    if ( temp.hasOwnProperty( 'contents' ) && temp.contents !== '' && p.size !== 0 ) {
        if ( flg === 1 ) { html1 += '<div>' + temp.contents; } else {
            html2 += '<div>' + temp.contents;
        }
    }
    for ( let i = 0; i < object.numOfChildren; i++ ) {
        depthFirstSearch( v, p, temp, object.children[i], flg, i );
    }
    if ( temp.hasOwnProperty( 'contents' ) && temp.contents !== '' && p.size !== 0 ) {
        if ( flg === 1 ) { html1 += '</div>'; } else {
            html2 += '</div>';
        }
    }
    return;
}
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
        if ( v[item].hasOwnProperty( 'name' ) && v[item].name === object.name ) {
            l1.push( v[item] );
        }
    }
    return l1;
}

/**
 * @param {String} data - data
 * @param {String} version1 - Existing structure's JSON data
 * @param {String} version2 - New structure's JSON data
 */
function compareTree( data, version1, version2 ) {
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
            while ( p1.get( n2 ) && p2.get( n1 ) && p2.get( n1 ).hasOwnProperty( 'name' ) && p1.get( n2 ).hasOwnProperty( 'name' ) && p2.get( n1 ).name === p1.get( n2 ).name && p2.get( n1 ).internalType.split( ' ' )[0] === p1.get( n2 ).internalType.split( ' ' )[0] ) {
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
                if ( old.contents !== version2[each].contents && !isBlank ) {
                    mapp.set( old.uniqueId, nxt );
                    uniqueIdMap.set( version2[each].uniqueId, old.uniqueId );
                    // modified
                    updateObjects( output, old, each );
                    let index = version1.indexOf( l1[i] );
                    if ( index > -1 ) {
                        version1.splice( index, 1 );
                    }
                } else {
                    if ( _getItemType( old.internalType ) === version2[each].internalType ) {
                        mapp.set( old.uniqueId, nxt );
                        noChangeObjects( output, old, each );
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
        addV2Objects( output, each, flag );
    }
    deleteV1Objects( output );
    updateChildParentRelation( output );
    var output1 = mapp.get( output[0].reqobject.uniqueId );
    data.searchResults1.htmlContents = html2;
    data.comparedData = data.searchResults;
    data.comparedData.children = output1.children;
    version1 = [];
    version2 = [];
    p1 = new Map();
    p2 = new Map();
    return;
}

/**
 *
 * @param {*} output - compared output JSON data
 * @param {*} old - old JSON object from Version1 Array
 * @param {*} each - loop Variable
 */
function noChangeObjects( output, old, each ) {
    uniqueIdMap.set( version2[each].uniqueId, old.uniqueId );
    version2[each].isTC = 'Yes';
    version2[each].status = 'NoChange';
    version2[each].contentChange = 'No';
    version2[each].internalType = old.internalType;
    version2[each].displayType = old.displayType;
    output.push( {
        reqobject: version2[each],
        action: 'NoChange'
    } );
}

/**
 *
 * @param {*} output - compared output JSON data
 * @param {*} old - old JSON object from Version1 Array
 * @param {*} each - loop Variable
 */
function updateObjects( output, old, each ) {
    version2[each].isTC = 'Yes';
    version2[each].status = 'Update';
    version2[each].contentChange = 'Yes';
    var content1 = old.contents;
    var content2 = version2[each].contents;
    version2[each].internalType = old.internalType;
    version2[each].displayType = old.displayType;
    _compareHtml( content1, content2, version2[each] );
    output.push( {
        reqobject: version2[each],
        action: 'Update'
    } );
}

/**
 * Adding Object from Version2 Array to Output Array
 * For Added Object
 *
 * @param {Object} output - compared output JSON data
 * @param {String} each - loop Variable
 * @param {String} flag - to check the Action
 */
function addV2Objects( output, each, flag ) {
    if ( !flag ) {
        version2[each].isTC = 'No';
        version2[each].status = 'Add';
        version2[each].contentChange = 'No';
        output.push( {
            reqobject: version2[each],
            action: 'Add'
        } );
    }
}
/**
 * Deleting Object from Version1 Array and Placing them into Output Array
 * For Deleted Object
 *
 * @param {Object} output - compared output JSON data
 */
function deleteV1Objects( output ) {
    while ( version1.length > 0 ) {
        var ob = version1[0];
        ob.level = 2;
        ob.isTC = 'No';
        ob.status = 'Delete';
        ob.contentChange = 'No';
        output.push( {
            reqobject: ob,
            action: 'Delete'
        } );
        version1.splice( 0, 1 );
    }
}

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
 * forms a arraylist of existing Json data
 * @param {String} data - The ViewModel Object
 */
export let showTreeWithContents = function( data ) {
    let obj1 = data.searchResults;
    html1 = '';
    version1 = [];
    version2 = [];
    p1 = new Map();
    p2 = new Map();
    depthFirstSearch( version1, p1, _blankObj, obj1, 1, 0 );
    data.searchResults.htmlContents = html1;
    if ( data.searchResults1 ) {
        data.searchResults1.htmlContents = html2;
    }
};

//map for uniqueId of every object
var uniqueIdMap = new Map();
/**
 * Set existing structures JSON data to service for rendering Preview
 * @param {Object} data - The ViewModel Object
 * @param {Object} ctx - the Context Object
 */
export let compareJSONTree = function( data, ctx ) {
    var updatePreview = appCtxSvc.getCtx( 'updatePreviewClick' );
    if ( updatePreview === true ) {
        let obj1 = data.searchResults;
        html1 = '';
        html2 = '';
        version1 = [];
        version2 = [];
        p1 = new Map();
        p2 = new Map();
        data.searchResults.action = 'Revise';
        data.searchResults.siblingId = '';
        data.searchResults1.action = 'Revise';
        data.searchResults1.siblingId = '';
        data.searchResults1.name = specName;
        data.searchResults1.uniqueId = specId;
        depthFirstSearch( version1, p1, _blankObj, obj1, 1, 0 );
        let obj2 = data.searchResults1;
        data.searchResults.htmlContents = html1;
        if ( data.searchResults1 ) {
            data.searchResults1.htmlContents = html2;
        }
        depthFirstSearch( version2, p2, _blankObj, obj2, 2, 0 );
        compareTree( data, version1, version2 );
    } else {
        let obj2 = data.searchResults1;
        data.importClicked = false;
        depthFirstSearch( version2, p2, _blankObj, obj2, 2, 0 );
        compareTree( data, version1, version2 );
    }
};

/**
 * to Compare TC Object and Preview Object
 * @param {String} html1 -
 * @param {String} html2 -
 * @param {HTMLElement} nodeToAddResult -
 */
var _compareHtml = function( html1, html2, nodeToAddResult ) {
    var contents = [ html1, html2 ];
    var $http = AwHttpService.instance;
    var url = exports.getCompareHtmlServiceURL();
    $http.post( url, contents, {
        headers: { 'Content-Type': 'application/json' }
    } ).then( function( response ) {
        var comparedContentes;
        if( response.data && response.data.output && _isAnyDifferenceInCompare( response.data.output ) ) {
            comparedContentes = response.data.output;
        } else {
            comparedContentes = html1;
            // reset status as there is not difference found
            nodeToAddResult.status = 'NoChange';
            nodeToAddResult.contentChange = 'No';
            nodeToAddResult.action = 'NoChange';
        }
        var index = comparedContentes.indexOf( '<?xml version="1.0" encoding="UTF-8"?>' );
        if ( index > -1 ) {
            comparedContentes = comparedContentes.slice( '<?xml version="1.0" encoding="UTF-8"?>'.length );
        }
        nodeToAddResult.contents = comparedContentes;
        nodeToAddResult.orignalContents = html2;
        nodeToAddResult.existingDocumentData = html1;
    } );
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
 * Set existing structures JSON data to service for rendering Preview
 * @param {String} data - The ViewModel Object
 * @returns {Object} - Json object
 */
export let setExisitingJSONData = function( data ) {
    data.selectedImportType.dbValue === 'importAsChildReq' && appCtxSvc.registerCtx( 'importAsChild', true );
    data.selectedImportType.dbValue === 'importAsChildSpec' && appCtxSvc.registerCtx( 'importAsChildSpec', true );
    appCtxSvc.registerCtx( 'visibleMoveCommandsForPreview', false );
    var deferred = AwPromiseService.instance.defer();
    var promise = AwHttpService.instance.get( CLIENT_FMS_DOWNLOAD_PATH + data.jsonDataOfExistingStructure.fileTickets[0] );
    promise.then( function( response ) {
        if ( response ) {
            _existingStructureJSONData = response.data;
            deferred.resolve( response );
        }
    } ).catch( function( error ) {
        deferred.reject( error );
    } );
    return deferred.promise;
};

/**
 * adding one variable in data for Import Preview Event capture
 */
export let getTransientFileTicketsForPreview = function() {
    eventBus.publish( 'progress.start' );
};

/**
 * Get the application format
 * @param {Object} selectedObj - selected Obj
 * @return {String} The application format
 */
export let getApplicationFormat = function( selectedObj ) {
    var appFormat = 'MSWordXML';

    if ( selectedObj.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
        appFormat = 'MSWordXMLExisting';
    }
    return appFormat;
};

/**
 * Set the response of JSON file ticket to service for rendering Preview
 * @param {String} fmsTicket - JSON data from Micoservice
 *
 */
export let setTreeData = function( fmsTicket ) {
    var promise = AwHttpService.instance.get( CLIENT_FMS_DOWNLOAD_PATH + fmsTicket );
    var deferred = AwPromiseService.instance.defer();
    promise.then( function( response ) {
        if ( response ) {
            var finalJsonData = response.data;
            if ( appCtxSvc.ctx.importAsChild || appCtxSvc.ctx.importAsChildSpec ) {
                var clonedExistingStructureData;
                _selectedTCObject = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
                if ( _existingStructureJSONData ) {
                    clonedExistingStructureData = _.cloneDeep( _existingStructureJSONData, true );
                    finalJsonData = mergeExistingAndNewStructureData( clonedExistingStructureData, response.data );
                }
            }
            //merge two jsons here before setting final json
            rmTreeDataService.setJSONData( finalJsonData );
            importPreviewService.setSecondaryArea();
            eventBus.publish( 'importPreview.openImportPreview' );
        }
    } ).catch( function( error ) {
        deferred.reject( error );
    } );
};

/**
 * Set the response of JSON file ticket to service for rendering Preview
 * @param {Object} data - The ViewModel Object
 * @returns {Promise} -
 *
 */
export let setExistingJSONDataCompare = function( data ) {
    if ( !clickEventAdded ) {
        document.addEventListener( 'click', function() {
            eventBus.publish( 'importPreview.closeExistingBalloonPopup' );
        } );
    }
    var promise = AwHttpService.instance.get( CLIENT_FMS_DOWNLOAD_PATH + data.jsonDataOfExistingStructure.fileTickets[0] );
    var deferred = AwPromiseService.instance.defer();
    promise.then( function( response ) {
        if ( response ) {
            _existingStructureJSONData = _.cloneDeep( response.data, true );
            data.existingSpecJSON = response.data;
            var previewData = data.existingSpecJSON.specification[0];
            data.existingSpecJSON.specification[0].action = ' ';
            data.existingSpecJSON.specification[0].siblingId = '';
            specName = data.existingSpecJSON.specification[0].name;
            specId = data.existingSpecJSON.specification[0].uniqueId;
            data.searchResults = _.cloneDeep( data.existingSpecJSON.specification[0], true );
            mapp.clear();
            exports.showTreeWithContents( data );
            if ( previewData ) {
                if ( !_previewElement ) {
                    _previewElement = document.createElement( 'div' );
                    _previewElement.className = 'previewElement aw-requirements-compareHistory';
                }
                _htmlDataForExistingSpec = _previewElement;
                _previewElement = null;
                deferred.resolve();
            }
        }
    } ).catch( function( error ) {
        deferred.reject( error );
    } );
    return deferred.promise;
};

/**
 * Set the response of JSON file ticket to service for rendering Preview
 * @param {String} fmsTicket - JSON data from Micoservice
 * @param {Object} data - The ViewModel Object
 * @param {Object} ctx - Context Object
 *
 */
export let compareAndSetTreeData = function( fmsTicket, data, ctx ) {
    var promise = AwHttpService.instance.get( CLIENT_FMS_DOWNLOAD_PATH + fmsTicket );
    var deferred = AwPromiseService.instance.defer();
    data.htmlContents = [];
    promise.then( function( response ) {
        if ( response ) {
            var previewData = response.data;
            //
            previewData.action = 'Revise';
            previewData.siblingId = '';
            previewData.name = specName;
            previewData.uniqueId = specId;
            data.searchResults1 = previewData;
            exports.compareJSONTree( data, ctx );
            //data.comparedData;
            if ( previewData ) {
                if ( !_previewElement ) {
                    _previewElement = document.createElement( 'div' );
                    _previewElement.className = 'previewElement aw-requirements-compareHistory';
                }
                var _htmlDtaForImportedSpec = _previewElement;
                _previewElement = null;
            }
            data.htmlContents.push( _htmlDataForExistingSpec.outerHTML );
            if( _htmlDtaForImportedSpec && _htmlDtaForImportedSpec.outerHTML ) {
                data.htmlContents.push( _htmlDtaForImportedSpec.outerHTML );
            }
            _htmlDtaForImportedSpec = null;
            _htmlDtaForImportedSpec = null;
            //eventBus.publish( 'importPreview.compareUpdatedSpecContents' );
            eventBus.publish( 'importPreview.convertComparedSpecContentsToHTML' );
            eventBus.publish( 'progress.end' );
        }
    } ).catch( function( error ) {
        deferred.reject( error );
    } );
};

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
 *  Conver compared specification elements to HTML
 * @param {Object} ctx - context object
 * @param {IModelObject} htmlData - compare html data
 * @param {Object} data - The ViewModel Object
 */
export let convertComparedSpecContentsToHTML = function( ctx, htmlData, data ) {
    var div = document.createElement( 'div' );
    div.innerHTML = htmlData;
    ctx.comparedHtmlData = div;
    _updateUniqueUids( data.comparedData );
    rmTreeDataService.setJSONData( data.comparedData );
    importPreviewService.setSecondaryArea();
    eventBus.publish( 'importPreview.openImportPreview' );
};

/**
 * Return the url for compare html microservice
 * @returns {String} url
 */
export let getCompareHtmlServiceURL = function() {
    return browserUtils.getBaseURL() + TC_MICRO_PREFIX + RM_COMPARE_HTML;
};

/**
 * Merge existing structure and new structures json data
 *  @param {String} mergedStructureData - existing json data
 *  @param {String} newJsonData - new structure json data
 *  @return {String} existingdata - merger json data
 */
var mergeExistingAndNewStructureData = function( mergedStructureData, newJsonData ) {
    if ( !_selectedRequidForAddChildPreview ) {
        _selectedRequidForAddChildPreview = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
    }
    var existingdata = mergedStructureData.specification[0];
    updateStructure( existingdata, newJsonData, _selectedRequidForAddChildPreview );
    return existingdata;
};

/**
 * for crating Map from the JSON data
 * @param {String} existingdata - existing structure json data
 * @param {String} newJsonData - new structure json data
 * @param {String} selectedRequid - selected requirement id
 */
function updateStructure( existingdata, newJsonData, selectedRequid ) {
    var selectedElement = findObjectByUid( existingdata, selectedRequid );
    if( appCtxSvc.ctx.importAsChild && selectedElement ) {
        updateNewStructure( selectedElement, newJsonData );
        _.forEach( newJsonData.children, function( childNode ) {
            selectedElement.children.push( childNode );
        } );
    }else if( appCtxSvc.ctx.importAsChildSpec && selectedElement ) {
        updateStructureForSpec( selectedElement, newJsonData );
        selectedElement.children.push( newJsonData );
    }
}

/**
 *Update new structure as per new hierarchy for Import as Child Specification
 * @param {*} selectedElement - JSON data from Server
 *@param {*} newJsonData - JSON data from Server
 *
 */
function updateStructureForSpec( selectedElement, newJsonData ) {
    var hierarchyNumber = selectedElement.hierarchyNumber;
    var childrenLength;
    if ( selectedElement.children.length ) {
        childrenLength = selectedElement.children.length;
    }
    var queue = [];
    let tmpReq = newJsonData;
    if ( childrenLength ) {
        if ( hierarchyNumber === '0' ) {
            tmpReq.hierarchyNumber = ( childrenLength + 1 ).toString();
        } else {
            tmpReq.hierarchyNumber = hierarchyNumber + '.' + ( childrenLength + 1 );
        }
    } else {
        tmpReq.hierarchyNumber = '1.1';
    }
    if ( tmpReq.children.length ) {
        for ( let item of tmpReq.children ) {
            item.parentHierarchyNo = tmpReq.hierarchyNumber;
            queue.push( item );
        }
    }
    while ( queue.length ) {
        const len = queue.length;
        var childrenLength;
        for ( let i = 0; i < len; i++ ) {
            let tmpreq = queue.shift();
            tmpreq.hierarchyNumber = tmpreq.parentHierarchyNo + '.' + tmpreq.hierarchyNumber;
            if ( tmpreq.children.length ) {
                for ( let item of tmpreq.children ) {
                    item.parentHierarchyNo = tmpreq.parentHierarchyNo;
                    queue.push( item );
                }
            }
        }
    }
}

/**
 *Update new structure as per new hierarchy for Import as Child Requirement
 * @param {*} selectedElement - JSON data from Server
 *@param {*} newJsonData - JSON data from Server
 *
 */
function updateNewStructure( selectedElement, newJsonData ) {
    var children = newJsonData.children;
    var hierarchyNo = selectedElement.hierarchyNumber;
    var childrenLength;
    if ( selectedElement.children.length ) {
        childrenLength = selectedElement.children.length;
    }
    var queue = [];
    for ( let i = 0; i < children.length; i++ ) {
        let tmp = children[i];
        if ( childrenLength ) {
            if ( hierarchyNo === '0' ) {
                tmp.hierarchyNumber = ( childrenLength + 1 ).toString();
            } else {
                tmp.hierarchyNumber = hierarchyNo + '.' + ( childrenLength + 1 );
            }
            childrenLength++;
        } else {
            tmp.hierarchyNumber = hierarchyNo + '.' + tmp.hierarchyNumber;
        }
        if ( tmp.children.length ) {
            for ( let item of tmp.children ) {
                item.parentHierarchyNo = tmp.hierarchyNumber;
                queue.push( item );
            }
        }
    }
    while ( queue.length ) {
        const len = queue.length;
        for ( let i = 0; i < len; i++ ) {
            let tmpreq = queue.shift();
            var newNo = tmpreq.hierarchyNumber.substr( tmpreq.hierarchyNumber.indexOf( '.' ) );
                tmpreq.hierarchyNumber = tmpreq.parentHierarchyNo + newNo;
                if ( tmpreq.children.length ) {
                    for ( let item of tmpreq.children ) {
                        item.parentHierarchyNo = tmpreq.parentHierarchyNo;
                        queue.push( item );
                    }
                }
        }
    }
}

/**
 * Find the selected object uid in existing structure
 * @param {*} root - JSON data from Server
 *@param {*} selectedUid - JSON data from Server
 *@return {*} selectedUid - JSON data from Server
 */
function findObjectByUid( root, selectedUid ) {
    if ( root.uniqueId === selectedUid ) { return root; }
    if ( root.children && root.children.length ) {
        for ( let child of root.children ) {
            let temp = findObjectByUid( child, selectedUid );
            if ( temp ) { return temp; }
        }
    }
    return null;
}

/**
 * Update the response of JSON file ticket to service for Updating Preview
 * @param {String} fmsTicket - JSON data  from Micoservice
 * @param {String} data - JSON data  from Micoservice
 * @param {Object} ctx - context object
 *
 */
export let setUpdateTreeData = function( fmsTicket, data, ctx ) {
    rmTreeDataService.setUpdatePreview( true );
    importPreviewService.setSecondaryArea();
    rmTreeDataService.setVmNodes();
    eventBus.publish( 'importPreview.closeExistingBalloonPopup' );
    var promise = AwHttpService.instance.get( CLIENT_FMS_DOWNLOAD_PATH + fmsTicket );
    var deferred = AwPromiseService.instance.defer();
    promise.then( function( response ) {
        if ( response ) {
            var mergedStructureData;
            var finalJsonData = response.data;
            if ( _existingStructureJSONData && ( appCtxSvc.ctx.importAsChild  || appCtxSvc.ctx.importAsChildSpec ) ) {
                mergedStructureData = _.cloneDeep( _existingStructureJSONData, true );
                finalJsonData = mergeExistingAndNewStructureData( mergedStructureData, response.data );
            }
            if ( _existingStructureJSONData && appCtxSvc.ctx.compareAndPreviewBtnClicked ) {
                appCtxSvc.registerCtx( 'updatePreviewClick', true );
                data.searchResults = _.cloneDeep( _existingStructureJSONData.specification[0], true );
                data.searchResults1 = response.data;
                exports.compareJSONTree( data, ctx );
                _updateUniqueUids( data.comparedData );
                finalJsonData = data.comparedData;
            }
            rmTreeDataService.setJSONData( finalJsonData );
            data.arm0ImportFromOfficeEventProgressing = false;
            eventBus.publish( 'importPreview.refreshTreeDataProvider' );
        }
    } ).catch( function( error ) {
        deferred.reject( error );
    } );
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

/**
 * Remove all importRules from importRulesList list.
 *
 * @param {Object} data - The view model data
 */
export let removeAllRules = function( data ) {
    if ( data.importRules ) {
        for ( var i = data.importRules.dbValue.length - 1; i >= 0; i-- ) {
            data.importRules.dbValue.splice( i, 1 );
        }
    }
};

/**
 * prepare Keyword Import Options
 * @param {Object} data - The view model data
 * @returns {Array} keywordImportRules
 *
 */
export let getkeywordImportAdvanceOptions = function( data ) {
    var keywordImportOptions = {
        keywordImportRules: []
    };
    if ( data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
        if ( data.importRules.dbValue.length ) {
            var cloneData = _.cloneDeep( data.importRules.dbValue );
            for ( var k = 0; k < cloneData.length; k++ ) {
                for ( var i = 0; i < cloneData[k].advancedRules.length; i++ ) {
                    delete cloneData[k].advancedRules[i].propertyNameValue.dispKey;
                }
                keywordImportOptions.keywordImportRules = cloneData;
            }
        } else {
            keywordImportOptions.keywordImportRules = data.importRules.dbValue.length ? data.importRules.dbValue : null;
        }
        return keywordImportOptions.keywordImportRules;
    }
    return exports.getkeywordImportOptions( data );
};

/**
 * prepare Keyword Import Options
 *
 * @param {Object} data - The view model data
 * @returns {Array} keywordImportOptions
 *
 */
export let getkeywordImportOptions = function( data ) {
    var keywordImportRules = [];
    for ( var i = 0; i < data.importRules.dbValue.length; i++ ) {
        var curImportRule = {};
        var curImportCondn = {};

        if ( data.preferences && data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
            curImportRule.targetChildDisplayType = data.importRules.dbValue[i].cellHeader1;
        }
        curImportRule.targetChildType = data.importRules.dbValue[i].cellHeader1InVal;
        curImportRule.conditionProcessingType = 'ANY';
        curImportRule.keywordImportConditions = [];

        if ( data.importRules.dbValue[i].cellHeader2InVal === 'Word_Contains' ) {
            if ( data.importRules.dbValue[i].cellHeader3InVal === 'Exact_Match' ) {
                curImportCondn.opType = 'WORD_EXACT_MATCH';
                curImportCondn.keyword = data.importRules.dbValue[i].cellHeader4InVal;
            } else if ( data.importRules.dbValue[i].cellHeader3InVal === 'Partial_Match' ) {
                curImportCondn.opType = 'WORD_PARTIAL_MATCH';
                curImportCondn.keyword = data.importRules.dbValue[i].cellHeader4InVal;
            } else if ( data.importRules.dbValue[i].cellHeader3InVal === 'Does_not_contain_word' ) {
                curImportCondn.opType = 'DOES_NOT_CONTAIN_WORD';
                curImportCondn.keyword = data.importRules.dbValue[i].cellHeader4InVal;
            }
        } else if ( data.importRules.dbValue[i].cellHeader2InVal === 'Has_Style' ) {
            curImportCondn.opType = 'HAS_STYLE';
            curImportCondn.keyword = data.importRules.dbValue[i].cellHeader3InVal;
        }
        curImportRule.keywordImportConditions.push( curImportCondn );
        keywordImportRules.push( curImportRule );
    }

    return keywordImportRules.length ? keywordImportRules : null;
};

/**
 * Update Specification and SpecElement Types
 *
 * @param {Object} data - The view model data
 *
 */
export let updateImportSpecList = function( data, selected ) {
    // Specification type
    eventBus.publish( 'progress.end' );
    var arrSpecTypeName = [];
    var index = 0;
    if ( data.outputSpecList ) {
        for ( var i = 0; i < data.outputSpecList.length; i++ ) {
            var output = data.outputSpecList[i];
            var listModel = _getEmptyListModel();
            listModel.propDisplayValue = output.displayTypeName;
            listModel.propInternalValue = output.realTypeName;
            //Show preference value as default specification type on panel
            if( data.preferences && data.preferences.REQ_DefaultReqSpecType ) {
                if ( output.realTypeName === data.preferences.REQ_DefaultReqSpecType[0] ) {
                    index = i;
                }
            }
            arrSpecTypeName.push( listModel );
        }
        data.reqTypeList = arrSpecTypeName;
        if ( data.reqTypeList[index] ) {
            data.reqType.dbValue = data.reqTypeList[index].propInternalValue;
        }
    }

    // SpecElement types
    var arrSpecEleTypeName = [];
    var indexSpecEle = 0;
    if ( data.outputSpecElementList ) {
        for ( var j = 0; j < data.outputSpecElementList.length; j++ ) {
            var output1 = data.outputSpecElementList[j];
            var listModel1 = _getEmptyListModel();

            listModel1.propDisplayValue = output1.displayTypeName;
            listModel1.propInternalValue = output1.realTypeName;

            //Show preference value as default sub type on panel
            if( data.preferences && data.preferences.REQ_DefaultReqType ) {
                if ( output1.realTypeName === data.preferences.REQ_DefaultReqType[0] ) {
                    indexSpecEle = j;
                }
            }
            arrSpecEleTypeName.push( listModel1 );
        }
        data.reqSpecEleTypeList = arrSpecEleTypeName;

        data.reqSpecEleType.dbValue = data.reqSpecEleTypeList[indexSpecEle].propInternalValue;
    }

    /**
     * for reading the data from saved CTX
     * Import Preview redirection and retention of same info seleted in Import Spec Panel
     */
    if ( appCtxSvc.ctx.locationContext['ActiveWorkspace:Location'] === 'ImportPreviewLocation' ) {
        getImportPreviewData( data );
    } else {
        /** Contains the Import-Type of Created Rules */
        data.typeOfRuleMap = {};
        data.typeOfPropRuleMap = {};
        data.conditionOfRuleMap = {};
    }

    if ( selected && selected.modelType && selected.modelType.name === 'Arm0RequirementSpecElement' && data.importTypeValues ) {
        data.importTypeValues.dbValue.push( { propDisplayValue :data.i18n.asChildSpecLabel, dispValue :data.i18n.asChildSpecLabel, propInternalValue : 'importAsChildSpec' } );
    }

     /** For Adding Import As Spec option in Import type List in case of Micoservice Installed environment */
     if ( data.importTypeValues && data.importTypeValues.dbValue.length >= EXISTING_LENGTH &&  data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
        data.importTypeValues.dbValue.push( { propDisplayValue :data.i18n.changestoSpecLabel, dispValue :data.i18n.changestoSpecLabel, propInternalValue : 'changestoSpec' } );
    }

    exports.initImportRulesData( data );
};

export let updateImportTypesList = function( data, selected ) {
    data.importTypeValues.dbValue = [];

    data.importTypeValues.dbValue.push( { propDisplayValue :data.i18n.asChildReqLabel, dispValue :data.i18n.asChildReqLabel, propInternalValue : 'importAsChildReq' } );

    if ( selected && selected.modelType && selected.modelType.name === 'Arm0RequirementSpecElement' ) {
        if( data.importTypeValues ) {
            data.importTypeValues.dbValue.push( { propDisplayValue :data.i18n.asChildSpecLabel, dispValue :data.i18n.asChildSpecLabel, propInternalValue : 'importAsChildSpec' } );
        }
    }
       /** For Adding Import As Spec option in Import type List in case of Micoservice Installed environment */
    if ( data.importTypeValues && data.importTypeValues.dbValue.length >= EXISTING_LENGTH &&  data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
        data.importTypeValues.dbValue.push( { propDisplayValue :data.i18n.changestoSpecLabel, dispValue :data.i18n.changestoSpecLabel, propInternalValue : 'changestoSpec' } );
    }
};

/**
 * Update import rules data
 *
 * @param {Object} data - The view model data
 *
 */
export let initImportRulesData = function( data ) {
    if ( appCtxSvc.ctx.isArm0ImportFromWordSubPanelActive || appCtxSvc.ctx.isArm0ImportFromPDFSubPanelActive || data.mode === 'preview' ) {
        if ( data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
            data.mappingType = 'SaveAdvanceRule';
        } else {
            data.mappingType = 'SaveLegacyRule';
        }
        eventBus.publish( 'importSpecification.populateAllImportRules' );
    }
};

/**
 * for reading the data from saved CTX
 * Import Preview redirection and retention of same info seleted in Import Spec Panel
 *  @param {Object} data - The view model data
 */
var getImportPreviewData = function( data ) {
    data.importRules = _importPreviewData.listOfImportRules;
    data.reqType.dbValue = _importPreviewData.reqTypeInternalValue;
    data.reqSpecEleTypeList = _importPreviewData.reqSpecEleTypeList;
    data.reqSpecEleType.dbValue = _importPreviewData.reqSpecEleTypeInternalValue;
    data.description.dbValue = _importPreviewData.SpecDescription;
    data.fileName = _importPreviewData.inputWordFileName;
    data.preserveNumbering.dbValue = _importPreviewData.saveNumbering;
    data.createEmptyPlaceholder.dbValue = _importPreviewData.isCreatePlaceholder;
    data.fmsTicket = _importPreviewData.inputWordFileTicket;
    data.fileNameNoExt = _importPreviewData.inputWordFileNameNoExt;
    data.selectedObject = _importPreviewData.slectedObjectDetails;
    data.typeOfRuleMap = _importPreviewData.typeOfRuleMap;
    data.typeOfPropRuleMap = _importPreviewData.typeOfPropRuleMap;
    data.mapOfTypeDescriptions = _importPreviewData.mapOfTypeDescriptions;
    data.conditionOfRuleMap = _importPreviewData.conditionOfRuleMap;
    data.savedRules.dbValue = _importPreviewData.selectedRule;
    data.savedRules.uiValue = _importPreviewData.displayRule;
    data.mode = 'preview';
    var ctx = appCtxSvc.getCtx( 'location.titles' );
    ctx.headerTitle += data.fileNameNoExt;
    appCtxSvc.updateCtx( 'location.titles', ctx );
    eventBus.publish( 'ImportFromOffice.refreshImportRuleList' );
    _importPreviewData = null;
};

/**
 * Update SpecElement Types
 *
 * @param {Object} data - The view model data
 *
 */
export let updateImportSpecElementList = function( data ) {
    // SpecElement types
    var arrSpecElementTypeName = [];
    var index = 0;
    if ( data.outputSpecElementList ) {
        for ( var j = 0; j < data.outputSpecElementList.length; j++ ) {
            var output1 = data.outputSpecElementList[j];
            var listModel1 = _getEmptyListModel();

            listModel1.propDisplayValue = output1.displayTypeName;
            listModel1.propInternalValue = output1.realTypeName;
            if ( output1.realTypeName === 'Requirement' ) {
                index = j;
            }
            arrSpecElementTypeName.push( listModel1 );
        }
    }
    data.reqSpecEleTypeList = arrSpecElementTypeName;

    data.reqSpecEleType.dbValue = data.reqSpecEleTypeList[index].propInternalValue;
};

/**
 * Get the Run in Background option value
 *
 * @param {Object} data - The view model data
 * @return {Boolean} true if run in background
 */
export let getRunInBackground = function( data ) {
    if( appCtxSvc.ctx.isArm0ImportFromPDFSubPanelActive ) {
        // false, for pdf import
        return false;
    }
    if ( data && data.preferences && data.preferences.REQ_Microservice_Installed && data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
        data.isRunningInBackground = data.runInBackgroundWord.dbValue;
        return data.runInBackgroundWord.dbValue;
    }
    return true;
};

/**
 * Get import as html option value
 *
 * @param {Object} data - The view model data
 * @return {Boolean} true if import as html
 */
export let getImportAsHtml = function( data ) {
    var importAsHtml = false;
    if ( appCtxSvc.ctx.preferences.AWC_ReqImportAsHtml ) {
        importAsHtml = appCtxSvc.ctx.preferences.AWC_ReqImportAsHtml[0];
    }
    if ( importAsHtml === true || data.convertToHTML.dbValue === true ) {
        return true;
    }
    return false;
};

/**
 * Get the import as spec value
 *
 * @param {Object} data - The view model data
 * @return {Boolean} true if import as spec
 */
export let getImportAsSpec = function( data ) {
    var importAsSpec = true;

    if ( data.selectedImportType.dbValue === 'importAsChildReq' || data.importSubtypeOnlyCheckbox.dbValue === true || appCtxSvc.ctx.importAsChild === true ) {
        importAsSpec = false;
    }

    return importAsSpec;
};

/**
 * Get the root spec type
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedObj object
 * @return {String} root type name
 */
export let getRootTypeName = function( data, selectedObj ) {
    if ( data.selectedImportType.dbValue === 'importAsChildReq' || data.importSubtypeOnlyCheckbox.dbValue === true ) {
        if ( selectedObj && selectedObj.modelType && selectedObj.modelType.typeHierarchyArray &&
            selectedObj.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) { // In ACE
            // Get underlying revision
            var underlyingRevision = cdm.getObject( selectedObj.props.awb0UnderlyingObject.dbValues[0] );

            return _getItemType( underlyingRevision.type );
        } // Outside ACE

        return REQ_NOT_IN_SPEC;
    }

    return data.reqType.dbValue;
};

/**
 * Return item type name from given revision type name
 *
 * @param {String} revisionType type name
 * @return {String} item type name
 */
var _getItemType = function( revisionType ) {
    // Replace item revision with item. Note, there is no good way to find item type from item revision
    // type without looping through all item subtypes and check the Revision type constant of each item type,
    // so follow RAC to do string comparison.
    var itemType = revisionType;
    if ( _.endsWith( revisionType, ' Revision' ) ) {
        var idx = revisionType.indexOf( ' Revision' );
        itemType = revisionType.substring( 0, idx );
    } else if ( _.endsWith( revisionType, 'Revision' ) ) {
        var idx = revisionType.indexOf( 'Revision' );
        itemType = revisionType.substring( 0, idx );
    }
    return itemType;
};

/**
 * Get the import as spec value
 *
 * @param {Object} data - The view model data
 * @return {String} specification type
 */
export let getSpecificationTypeForImport = function( data ) {
    var specType = data.reqType.dbValue;
    if ( data.selectedImportType.dbValue === 'importAsChildReq' || data.importSubtypeOnlyCheckbox.dbValue === true ) {
        specType = '';
    }

    return specType;
};

/**
 * Get the import as spec value
 *
 * @param {Object} data - The view model data
 * @return {String} specification type
 */
export let getSpecificationDisplayTypeForImport = function( data ) {
    var specDisplayType = data.reqType.uiValue;
    if ( data.selectedImportType.dbValue === 'importAsChildReq' || data.importSubtypeOnlyCheckbox.dbValue === true ) {
        specDisplayType = '';
    }

    return specDisplayType;
};

/**
 * Returns the url for the microservice call
 *
 * @param {Object} ctx - The context object
 * @return {String} dbValue of the selected type
 */
export let getMicroServiceURL = function( ctx ) {
    if ( ctx.isArm0ImportFromPDFSubPanelActive ) {
        // Fof PDF Import
        return browserUtils.getBaseURL() + microServiceURLStringForPDF;
    }
    // For Word Import
    return browserUtils.getBaseURL() + microServiceURLStringForWord;
};

/**
 * Checks whether keyword import or non-keyword.
 *
 * @param {Object} data - The view model object
 * @param {Object} ctx - the Context Object
 */
export let checkImportType = function( data, ctx ) {
    /**
     * Case Import Preview redirection and retention of same info seleted in Import Spec Panel
     */
    if ( data.importPreviewBtnClicked || ctx.compareAndPreviewBtnClicked ) {
        setImportPreviewData( data, ctx );
        eventBus.publish( 'importSpecification.importPreview' );
    } else if ( ctx.isArm0ImportFromPDFSubPanelActive ) {
        // For Direct Import use case for PDF
        eventBus.publish( 'progress.start' );
        eventBus.publish( 'importSpecification.keywordImportForImportPDF' );
    } else if ( data.preferences && data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
        // For Direct Import use case
        eventBus.publish( 'progress.start' );
        eventBus.publish( 'importSpecification.keywordImport' );
    } else if ( data.importRules.dbValue && data.importRules.dbValue.length > 0 ) {
        eventBus.publish( 'importSpecification.keywordTc115OrLater' );
    } else {
        eventBus.publish( 'importSpecification.nonKeyword' );
    }
};

/**
 * Sets the  Import Preview Data.
 *
 * @param {Object} data - The view model object
 * @param {Object} ctx - the context object
 */
var setImportPreviewData = function( data, ctx ) {
    _importPreviewData = {
        listOfImportRules: data.importRules,
        reqSpecEleTypeInternalValue: data.reqSpecEleType.dbValue,
        reqSpecEleTypeList: data.reqSpecEleTypeList,
        reqTypeInternalValue: data.reqType.dbValue,
        SpecDescription: data.description.dbValue,
        inputWordFileTicket: data.fmsTicket,
        inputWordFileName: data.fileName,
        inputWordFileNameNoExt: data.fileNameNoExt,
        slectedObjectDetails: ctx.selected,
        saveNumbering: data.preserveNumbering.dbValue,
        isCreatePlaceholder: data.createEmptyPlaceholder.dbValue,
        selectedRule:data.savedRules.dbValue,
        displayRule:data.savedRules.uiValue,
        typeOfRuleMap: data.typeOfRuleMap || {},
        typeOfPropRuleMap: data.typeOfPropRuleMap || {},
        mapOfTypeDescriptions: data.mapOfTypeDescriptions,
        conditionOfRuleMap: data.conditionOfRuleMap || {}
    };
};

/**
 * Sets the ticket to data and import the document
 *
 * @param {Object} data - The view model object
 * @param {Object} jsonFmsTicket - JSON file ticket from microservice
 */
export let setJSONDataForImport = function( data, jsonFmsTicket ) {
    data.jsonFmsTicket = jsonFmsTicket.trim();
    eventBus.publish( 'importSpecification.importUsingJSONData' );
};

/**
 * Sets the ticket to data and import the document
 *
 * @param {Object} data - The view model object
 */
export let getJSONDataForCompareImport = function( data ) {
    data.UpdateImportWithoutRevise = true;
    exports.getJSONDataForImport( data );
};

/**
 * Get the application format
 * @param {Object} selectedObj - selected Obj
 * @return {String} The application format
 */
export let getNewApplicationFormat = function( data ) {
    return data.UpdateImportWithoutRevise ? 'UpdateImportWithoutRevise' : 'UpdateImport';
};

/**
 * Get the updated JSON data and generate JSON file ticket for Import
 *
 * @param {Object} data - The view model object
 * @param {Object} jsonFmsTicket - JSON file ticket from microservice
 */
export let getJSONDataForImport = function( data ) {
    if ( appCtxSvc.ctx.importAsChild ) {
        // Get updated child from the current data
        var newChilds = [];
        var updateChild = rmTreeDataService.getObjectFromId( _selectedTCObject );
        //need to get only new childs in case of multiple childs
        _.forEach( updateChild.children, function( child ) {
            var uniqueidSplit = child.uniqueId.split( '-' );
            if ( uniqueidSplit.length > 1 ) {
                newChilds.push( child );
            }
        } );
        updateChild.children = newChilds;
        data.treeData = updateChild;
    }else if ( appCtxSvc.ctx.importAsChildSpec ) {
        // Get updated child from the current data for Import As Spec
        newChilds = [];
        updateChild = rmTreeDataService.getObjectFromId( _selectedTCObject );
        //need to get only new childs in case of multiple childs and to Ignore the Parent Spec
        _.forEach( updateChild.children[ updateChild.children.length - 1 ].children, function( child ) {
            var uniqueidSplit = child.uniqueId.split( '-' );
            if ( uniqueidSplit.length > 1 ) {
                newChilds.push( child );
            }
        } );
        updateChild.children = newChilds;
        data.treeData = updateChild;
    } else {
        data.treeData = rmTreeDataService.getJSONData();
    }

    // If case of PDF Import, write json to fms file (calling soa/microservice is not required)
    if ( appCtxSvc.ctx.isArm0ImportFromPDFSubPanelActive ) {
        eventBus.publish( 'importPreview.getFMSFileTicketForImportPDF' );
    } else {
        eventBus.publish( 'importPreview.getJsonFileTicketsForImport' );
    }
};

/**
 * Update File Content In FormData For Import PDF
 *
 * @param {Object} data - View model object data
 */
export let updateFileContentInFormDataForImportPDF = function( data ) {
    data.formDataForImportPDF = new FormData();
    data.formDataForImportPDF.append( 'fmsFile', new Blob( [ JSON.stringify( data.treeData ) ], { type: 'text/plain' } ) );
    data.formDataForImportPDF.append( 'fmsTicket', data.jsonFmsTicket.trim() );
    eventBus.publish( 'importSpecification.uploadImportFileForImportPDF' );
};

/**
 * Reset Data from import from excel panel.
 *
 * @param {Object} data - The view model data
 *
 */
export let resetExcelImportData = function( data ) {
    data.isValidMapping = false;
    data.showPropertiesMap = false;
    data.columnHeaders = [];
    data.typePropInfos = [];
    data.objectSubTypes = [];
    data.propertiesForMapping = [];
    data.viewModelPropertiesForHeader = [];
    data.propertiesToSelect = {};
    data.mappingGroup.dbValue = '';
    data.mappingGroup.uiValue = '';
    data.newGroupName.dbValue = '';
    data.newGroupName.isVisible = false;
};
/**
 * Reset NewGroupName Visibilty for import from excel panel.
 *
 * @param {Object} data - The view model data
 *
 */
export let resetNewGroupNameVisibilty = function( data ) {
    data.newGroupName.dbValue = '';
    data.newGroupName.isVisible = false;
    _validateMapping();
    AwTimeoutService.instance( function() {
        var mappingElement = $( 'aw-include[name=Arm0RequirementImportMappingSection]' );
        var lovElement = mappingElement.find( 'aw-property-lov-val' );
        var lovScope = ngModule.element( lovElement ).scope();
        lovScope.$$childTail.toggleDropdown();
    }, 50 );
};

/**
 * Create view model property for the header
 *
 * @param {Object} header - Header string
 * @returns {Object} viewModelObject - view model object for the given header
 */
var _createViewModelPropertyForHeader = function( header ) {
    // Create the Viewmodel property for the given attribute type.
    var viewProp = uwPropertyService.createViewModelProperty( header, header, 'STRING', [], [] );

    uwPropertyService.setHasLov( viewProp, true );
    uwPropertyService.setIsArray( viewProp, false );
    uwPropertyService.setIsEnabled( viewProp, true );
    uwPropertyService.setIsEditable( viewProp, true );
    uwPropertyService.setIsNull( viewProp, false );

    return viewProp;
};

/**
 * Create view model property for the property info
 *
 * @param {Object} propInfo - Property info
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForProperty = function( propInfo ) {
    // Append "(Required)" to the display name, if property is required
    var dispPropName = propInfo.dispPropName;
    if ( propInfo.isRequired ) {
        dispPropName = propInfo.dispPropName + ' (' + parentData.i18n.requiredLabel + ')';
    }

    var viewProp = uwPropertyService.createViewModelProperty( propInfo.realPropName, dispPropName, 'BOOLEAN', [], [] );

    uwPropertyService.setIsRequired( viewProp, propInfo.isRequired );
    uwPropertyService.setIsArray( viewProp, false );
    uwPropertyService.setIsEditable( viewProp, true );
    uwPropertyService.setIsNull( viewProp, false );
    uwPropertyService.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );
    if ( viewProp.isRequired ) {
        uwPropertyService.setValue( viewProp, true );
        uwPropertyService.setIsEnabled( viewProp, false );
    } else {
        uwPropertyService.setValue( viewProp, false );
        uwPropertyService.setIsEnabled( viewProp, true );
    }

    // attributes required to show property in lov
    viewProp.propDisplayValue = viewProp.propertyDisplayName;
    viewProp.propInternalValue = viewProp.propertyName;

    return viewProp;
};
/**
 * Sort the boolean list. True values first
 *
 * @param {Object} list - List to sort
 */
var _sortBooleanList = function( list ) {
    list.sort( function( a, b ) {
        // true values first
        return a.isRequired === b.isRequired ? 0 : a.isRequired ? -1 : 1;
    } );
};
/**
 * Find the given property in properties list
 *
 * @param {List} properties - list of selected properties
 * @param {String} propertyRealName - property real name
 * @returns {Boolean} - true, if property exist in the list
 */
var _getPropertyFromList = function( properties, propertyRealName ) {
    for ( var index = 0; index < properties.length; index++ ) {
        var property = properties[index];
        if ( property.propertyName === propertyRealName || property.propInternalValue === propertyRealName ) {
            return property;
        }
    }
    return null;
};
/**
 * Update Properties with selected properties
 *
 * @param {Object} data - The view model data
 *
 */
var _updatePropertiesForMapping = function( data ) {
    data.propertiesForMapping = [];

    // Get selected properties
    for ( var index = 0; index < data.typePropInfos.length; index++ ) {
        var typePropInfo = data.typePropInfos[index];

        var propInfos = typePropInfo.propInfos;

        for ( var i = 0; i < propInfos.length; i++ ) {
            var propInfo = propInfos[i];
            // Add required/selected properties to the list
            if ( propInfo.dbValue ) {
                data.propertiesForMapping.push( propInfo );
            }
        }
    }

    // Update lov with selected properties
    for ( var index = 0; index < data.viewModelPropertiesForHeader.length; index++ ) {
        var viewProp = data.viewModelPropertiesForHeader[index];
        viewProp.lovApi.propertiesForMapping = data.propertiesForMapping;

        // Reset the mapped property, if that property not selected for mapping
        var hasProperty = _getPropertyFromList( data.propertiesForMapping, viewProp.dbValue );
        if ( !hasProperty ) {
            uwPropertyService.resetValues( viewProp );
        }
    }
};
/**
 * Populate View Model Properties For Header
 *
 * @param {Object} data - The view model data
 *
 */
var _populateViewModelPropertiesForHeader = function( data ) {
    for ( var i = 0; i < data.viewModelPropertiesForHeader.length; i++ ) {
        data.viewModelPropertiesForHeader[i].matchFound = 0;
        for ( var j = 0; j < data.response.mappingOutputs[0].propInfos.length; j++ ) {
            if ( data.viewModelPropertiesForHeader[i].propertyName === data.response.mappingOutputs[0].propInfos[j].propHeader ) {
                data.viewModelPropertiesForHeader[i].dbValue = data.response.mappingOutputs[0].propInfos[j].realPropName;
                data.viewModelPropertiesForHeader[i].uiValue = data.response.mappingOutputs[0].propInfos[j].dispPropName;
                data.viewModelPropertiesForHeader[i].matchFound = 1;
                break;
            }
        }
        if ( data.viewModelPropertiesForHeader[i].matchFound === 0 ) {
            data.viewModelPropertiesForHeader[i].dbValue = '';
            data.viewModelPropertiesForHeader[i].uiValue = '';
        }
    }
};
/**
 * Populate Mappings In LOV
 *
 * @param {Object} data - The view model data
 *
 */
var _populateMappingsInLOV = function( data ) {
    for ( var index = 0; index < data.typePropInfos.length; index++ ) {
        var typePropInfo = data.typePropInfos[index];

        var propInfos = typePropInfo.propInfos;
        for ( var j = 0; j < data.response.mappingOutputs[0].propInfos.length; j++ ) {
            for ( var i = 0; i < propInfos.length; i++ ) {
                var propInfo = propInfos[i];
                // Add required/selected properties to the list
                if ( data.response.mappingOutputs[0].propInfos[j].realPropName === propInfo.propInternalValue ) {
                    propInfo.dbValue = true;
                    data.propertiesForMapping.push( propInfo );

                    if ( propInfo.isRequired ) {
                        for ( var k = 0; k < data.viewModelPropertiesForHeader.length; k++ ) {
                            if ( data.viewModelPropertiesForHeader[k].uiValue === data.response.mappingOutputs[0].propInfos[j].dispPropName ) {
                                data.viewModelPropertiesForHeader[k].uiValue += ' (' + data.i18n.requiredLabel + ')';
                            }
                        }
                    }
                    break;
                }
            }
        }
    }
    for ( var k = 0; k < data.viewModelPropertiesForHeader.length; k++ ) {
        data.viewModelPropertiesForHeader[k].isEnabled = data.response.mappingOutputs[0].mappingGroups[0].isModifiable;
    }
};
/**
 * Get Mappings for the group selected
 *
 * @param {Object} data - The view model data
 *
 */
export let populateMappingInfoForGroup = function( data ) {
    if ( data.response.mappingOutputs.length > 0 && data.response.mappingOutputs[0].mappingGroups.length > 0 ) {
        if ( data.mappingGroup.dbValue === data.response.mappingOutputs[0].mappingGroups[0].dispName ) {
            _populateViewModelPropertiesForHeader( data );
            _populateMappingsInLOV( data );

            for ( var index = 0; index < data.viewModelPropertiesForHeader.length; index++ ) {
                var viewProp = data.viewModelPropertiesForHeader[index];
                viewProp.lovApi.propertiesForMapping = data.propertiesForMapping;
            }

            _validateMapping();
        }
    }
};

/**
 * Add the 'lovApi' function set object to the given ViewModelProperty
 *
 * @param {Object} data - The view model data
 *
 */
export let initMappingCellLovApi = function( data ) {
    data.mappingGroup.lovApi = {};
    data.mappingGroup.lovApi.propertiesForMapping = data.response.mappingOutputs[0].mappingGroups;
    data.mappingGroup.lovApi.requiredPropertiesList = [];

    data.mappingGroup.lovApi.getInitialValues = function( filterStr, deferred, name ) {
        var lovEntries = _.clone( this.requiredPropertiesList, true );
        if ( this.propertiesForMapping ) {
            // First add the all required properties from all subTypes
            for ( var index = 0; index < this.propertiesForMapping.length; index++ ) {
                var entry = this.propertiesForMapping[index];

                var hasProperty = _getPropertyFromList( lovEntries, entry );
                // Avoid duplicate property in list
                if ( !hasProperty ) {
                    lovEntries.push( {
                        propDisplayValue: entry.realName,
                        propInternalValue: entry.dispName,
                        propDisplayDescription: '',
                        hasChildren: false,
                        children: {},
                        sel: false
                    } );
                }
            }
            // Add entry for "Add New"
            lovEntries.push( {
                propDisplayValue: data.i18n.addNewLabel,
                propInternalValue: ADD_NEW_INTERNAL,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false
            } );
        }
        return deferred.resolve( lovEntries );
    };
    data.mappingGroup.lovApi.validateLOVValueSelections = function( values ) {
        if ( values[0].propDisplayValue !== '' && values[0].propDisplayValue !== data.i18n.addNewLabel ) {
            eventBus.publish( 'importSpecification.populateMappingGroups' );
        }
        if ( values[0].propDisplayValue === data.i18n.addNewLabel ) {
            _resetViewModelPropertyValue( data.mappingGroup );
            for ( var k = 0; k < data.viewModelPropertiesForHeader.length; k++ ) {
                data.viewModelPropertiesForHeader[k].isEnabled = true;
            }
            data.newGroupName.isVisible = true;
            _validateMapping();
        }
        return false;
    };
    data.mappingGroup.lovApi.getNextValues = function( deferred ) {
        // LOVs do not support paging.
        deferred.resolve( null );
    };
};
/**
 * Get headers and properties from response data.
 *
 * @param {Object} data - The view model data
 *
 */
export let createPropertiesMap = function( data ) {
    parentData = data;
    data.showPropertiesMap = true;

    if ( data.response.mappingOutputs[0].propInfos.length === 0 ) {
        data.columnHeaders = _.clone( data.response.columnHeaders, true );
    }
    for ( var i = 0; i < data.response.mappingOutputs[0].propInfos.length; i++ ) {
        data.columnHeaders.push( data.response.mappingOutputs[0].propInfos[i].propHeader );
    }
    data.typePropInfos = _.clone( data.response.mappingOutputs[0].typePropInfos, true );

    data.objectSubTypes = [];
    data.propertiesForMapping = [];

    // Create view model properties for properties
    for ( var index = 0; index < data.typePropInfos.length; index++ ) {
        var typePropInfo = data.typePropInfos[index];
        var objectType = {};
        objectType.propDisplayValue = typePropInfo.dispTypeName;
        objectType.propInternalValue = typePropInfo.objectType;
        data.objectSubTypes.push( objectType );

        var propInfos = typePropInfo.propInfos;

        for ( var i = 0; i < propInfos.length; i++ ) {
            propInfos[i] = _createViewModelObjectForProperty( propInfos[i] );
        }

        _sortBooleanList( propInfos );
    }

    exports.initMappingCellLovApi( data );

    data.viewModelPropertiesForHeader = [];

    // Create view model properties for headers
    for ( var index = 0; index < data.columnHeaders.length; index++ ) {
        var header = data.columnHeaders[index];
        var viewProp = _createViewModelPropertyForHeader( header );
        exports.initNativeCellLovApi( data.propertiesForMapping, viewProp );
        data.viewModelPropertiesForHeader.push( viewProp );
    }

    _updatePropertiesForMapping( data );
};

/**
 * Validate if all required properties are mapped.
 *
 * @returns {Boolean} - true, if all required properties are mapped
 *
 */
var _isValidMapping = function() {
    for ( var index = 0; index < parentData.propertiesForMapping.length; index++ ) {
        var property = parentData.propertiesForMapping[index];
        if ( property.isRequired ) {
            var requiredProperyName = property.propertyName;
            var isMapped = false;
            for ( var i = 0; i < parentData.viewModelPropertiesForHeader.length; i++ ) {
                var viewProp = parentData.viewModelPropertiesForHeader[i];
                if ( viewProp.dbValue === requiredProperyName ) {
                    isMapped = true;
                }
            }
            if ( !isMapped ) {
                return false;
            }
        }
    }
    return true;
};

/**
 * Validate the mapping
 */
var _validateMapping = function() {
    if ( _isValidMapping() ) {
        parentData.isValidMapping = true;
    } else {
        parentData.isValidMapping = false;
    }
};

/**
 * Fire an event to navigate to the Add Properties panel
 */
var _navigateToAddNewPropertiesPanel = function() {
    // Clone the properties data
    parentData.typePropInfosToAddProperties = _.clone( parentData.typePropInfos, true );

    var destPanelId = 'Arm0AddPropertiesSub';
    var activePanel = parentData.getSubPanel( parentData.activeView );
    if ( activePanel ) {
        activePanel.contextChanged = true;
    }

    var context = {
        destPanelId: destPanelId,
        title: parentData.i18n.addProperties,
        supportGoBack: true,
        recreatePanel: true
    };

    eventBus.publish( 'awPanel.navigate', context );
};
/**
 * Create LOV entries.
 *
 * @param {Object} - lovApi
 * @param {Array} - lovEntries
 * @param {Boolean} - true, getRequiredProps
 *
 */
var _createLovEntries = function( lovApi, lovEntries, getRequiredProps ) {
    for ( var index = 0; index < lovApi.propertiesForMapping.length; index++ ) {
        var entry = lovApi.propertiesForMapping[index];

        if ( getRequiredProps ) {
            if ( entry.isRequired ) {
                var hasProperty = _getPropertyFromList( lovEntries, entry.propertyName );
                // Avoid duplicate property in list
                if ( !hasProperty ) {
                    lovEntries.push( {
                        propDisplayValue: entry.propertyDisplayName,
                        propInternalValue: entry.propertyName,
                        propDisplayDescription: '',
                        hasChildren: false,
                        children: {},
                        sel: false,
                        isRequired: entry.isRequired
                    } );
                }
            }
        } else {
            if ( !entry.isRequired ) {
                var hasProperty1 = _getPropertyFromList( lovEntries, entry.propertyName );
                // Avoid duplicate property in list
                if ( !hasProperty1 ) {
                    lovEntries.push( {
                        propDisplayValue: entry.propertyDisplayName,
                        propInternalValue: entry.propertyName,
                        propDisplayDescription: '',
                        hasChildren: false,
                        children: {},
                        sel: false,
                        isRequired: entry.isRequired
                    } );
                }
            }
        }
    }
};
/**
 * Reset ViewModelProperty Value
 *
 * @param {ViewModelProperty} viewProp - view model property
 */
var _resetViewModelPropertyValue = function( viewProp ) {
    viewProp.displayValues = [ '' ];
    viewProp.uiValue = '';
    viewProp.dbValue = '';
};
/**
 * Add the 'lovApi' function set object to the given ViewModelProperty
 *
 * @param {Object} propertiesForMapping - List of properties to show in lov
 * @param {ViewModelProperty} viewProp - view model property
 *
 */
export let initNativeCellLovApi = function( propertiesForMapping, viewProp ) {
    viewProp.lovApi = {};
    viewProp.lovApi.propertiesForMapping = propertiesForMapping;
    viewProp.lovApi.requiredPropertiesList = [];

    viewProp.lovApi.getInitialValues = function( filterStr, deferred ) {
        var lovEntries = _.clone( this.requiredPropertiesList, true );
        if ( this.propertiesForMapping ) {
            // First add the all required properties from all subTypes
            if ( this.requiredPropertiesList.length === 0 ) {
                _createLovEntries( this, lovEntries, true );
                this.requiredPropertiesList = _.clone( lovEntries, true );
            }

            // Add non-required properties,those are selected for mapping
            _createLovEntries( this, lovEntries, false );

            // Add entry for "Add New"
            lovEntries.push( {
                propDisplayValue: parentData.i18n.addNewLabel,
                propInternalValue: ADD_NEW_INTERNAL,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false
            } );
        }
        return deferred.resolve( lovEntries );
    };

    viewProp.lovApi.getNextValues = function( deferred ) {
        // LOVs do not support paging.
        deferred.resolve( null );
    };

    viewProp.lovApi.validateLOVValueSelections = function( values ) {
        if ( values[0].propInternalValue === ADD_NEW_INTERNAL ) {
            _navigateToAddNewPropertiesPanel();
            _resetViewModelPropertyValue( viewProp );
        }

        // Validate the mapping to ensure all required properties are mapped
        _validateMapping();

        return false;
    };
};

/**
 * To retrieve the rule object for the selected rule name
 *
 * @param {Object} data - The view model data
 *
 */
export let getRuleObjectForSelection = function( data ) {
    var object = {};
    for ( var i = 0; i < data.ruleList.length; i++ ) {
        if ( data.savedRules.dbValue === data.ruleList[i].ruleName ) {
            object = data.ruleList[i];
            break;
        }
    }
    if ( !_.isEmpty( object ) ) {
        object.ruleObject = {
            uid: object.ruleObject.uid,
            type: object.ruleObject.type
        };

        data.selectedRule = object;
    }
    return object;
};

/**
 * Handles import word rule selection from listbox
 *
 * @param {Object} data - The view model data
 *
 */
export let wordRuleSelectionChangeInListBox = function( data ) {
    if ( data.savedRules.dbValue !== '' ) {
        var selectedRule = exports.getRuleObjectForSelection( data );
        if ( !_.isEmpty( selectedRule ) ) {
            exports.removeAllRules( data );
            eventBus.publish( 'importSpecification.populateInfoForRule' );
            data.typeOfRuleMap = {};
            data.typeOfPropRuleMap = {};
        }
    } else {
        exports.removeAllRules( data );
        data.typeOfRuleMap = {};
        data.typeOfPropRuleMap = {};
    }
};

/**
 * Add the 'lovApi' function set import ruules to the given ViewModelProperty
 *
 * @param {Object} data - The view model data
 *
 */
export let initRuleLovApi = function( data ) {
    data.ruleList = data.response.rulesData;
    var listModels = [];
    var listModel1 = {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        sel: false
    };
    listModels.push( listModel1 );
    var propertiesForMapping = data.response.rulesData;
    for ( var index = 0; index < propertiesForMapping.length; index++ ) {
        var entry = propertiesForMapping[index];

        var listModel = {
            propDisplayValue: '',
            propInternalValue: '',
            propDisplayDescription: '',
            sel: false
        };
        listModel.propDisplayValue = entry.ruleDispName;
        listModel.propInternalValue = entry.ruleName;

        listModels.push( listModel );
    }
    data.savedRulesListBoxValues = listModels;
};
/**
 * Add the selected properties in list for mapping
 *
 * @param {Object} data - The view model data
 *
 */
export let addNewPropertiesForMapping = function( data ) {
    // Update the properties
    data.typePropInfos = data.typePropInfosToAddProperties;
    _updatePropertiesForMapping( data );

    // Switch the active back to Excel import panel
    parentData.activeView = 'Arm0ImportFromOfficeSub';
};

/**
 * Get all properties for the selected subtype
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - selected subType
 *
 */
var _getPropertiesFromSubType = function( data, subType ) {
    for ( var index = 0; index < data.typePropInfosToAddProperties.length; index++ ) {
        var typePropInfo = data.typePropInfosToAddProperties[index];
        if ( typePropInfo.objectType === subType ) {
            return typePropInfo.propInfos;
        }
    }

    return [];
};
/**
 * Get the filtered properties
 *
 * @param {Object} filter - Filter value
 * @param {Object} data - The view model data
 * @param {Object} subType - selected subType
 *
 */
var _getFilteredProperties = function( filter, data, subType ) {
    var propertiesToSelect = [];

    // Get propInfos for the selected subType
    var propInfos = _getPropertiesFromSubType( data, subType );

    var filterValue = filter.toLocaleLowerCase().replace( /\\|\s/g, '' );

    // We have a filter, don't add properties unless the filter matches
    if ( filterValue !== '' ) {
        for ( var i = 0; i < propInfos.length; i++ ) {
            var propInfo = propInfos[i];
            var propertyName = propInfo.propertyName.toLocaleLowerCase().replace( /\\|\s/g, '' );
            var propertyDisplayName = propInfo.propertyDisplayName.toLocaleLowerCase().replace( /\\|\s/g, '' );
            if ( propertyName.indexOf( filterValue ) !== -1 || propertyDisplayName.indexOf( filterValue ) !== -1 ) {
                propertiesToSelect.push( propInfo );
            }
        }
    } else {
        propertiesToSelect = propInfos;
    }

    return propertiesToSelect;
};
/**
 * Action on the filter
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - Selected subType
 *
 */
export let actionFilterList = function( data, subType ) {
    var filter = '';
    if ( 'filterBox' in data && 'dbValue' in data.filterBox ) {
        filter = data.filterBox.dbValue;
    }

    data.propertiesToSelect = _getFilteredProperties( filter, data, subType );
};
/**
 * Show leave warning message
 *
 * @param {Object} data - The view model data
 */
var _showUpdateNotificationWarning = function( data ) {
    var mappingGroupData = {
        groupName: {
            realName: '',
            dispName: '',
            isModifiable: true
        },
        mappingInfo: [],
        actionName: ''
    };

    var msg = data.i18n.notificationForUpdateMsg.replace( '{0}', data.mappedGroupData.groupName.dispName );
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
            data.mappedGroupData = mappingGroupData;
            eventBus.publish( 'importSpecification.importFromExcel' );
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.update,
        onClick: function( $noty ) {
            $noty.close();
            eventBus.publish( 'importSpecification.importFromExcel' );
        }
    } ];

    notyService.showWarning( msg, buttons );
};
/**
 * Get ActionName For Mapping
 *
 * @param {Object} data - The view model data
 *
 */
var _getActionNameForMapping = function( data, mappingGroupData ) {
    var headerCount = 0;
    var mappingInfo = {};
    var mappingOutputs = {};
    mappingGroupData.actionName = 'ADD';
    if ( data.mappingGroup.lovApi.propertiesForMapping.length > 0 ) {
        for ( var j = 0; j < data.mappingGroup.lovApi.propertiesForMapping.length; j++ ) {
            if ( data.mappingGroup.dbValue === data.mappingGroup.lovApi.propertiesForMapping[j].dispName ) {
                mappingGroupData.actionName = '';
                break;
            }
        }
    }
    if ( mappingGroupData.actionName === '' && data.response.mappingOutputs[0].mappingGroups.length === 1 &&
        data.mappingGroup.dbValue === data.response.mappingOutputs[0].mappingGroups[0].dispName ) {
        if ( data.response.mappingOutputs[0].mappingGroups[0].isModifiable ) {
            mappingGroupData.actionName = 'UPDATE';
            for ( var j = 0; j < data.response.mappingOutputs[0].propInfos.length; j++ ) {
                for ( var k = 0; k < mappingGroupData.mappingInfo.length; k++ ) {
                    mappingInfo = mappingGroupData.mappingInfo[k];
                    mappingOutputs = data.response.mappingOutputs[0].propInfos[j];
                    if ( mappingInfo.propHeader === mappingOutputs.propHeader ) {
                        headerCount++;
                        mappingGroupData.actionName = '';
                        if ( mappingInfo.realPropName !== mappingOutputs.realPropName ||
                            mappingInfo.dispPropName !== mappingOutputs.dispPropName ) {
                            mappingGroupData.actionName = 'UPDATE';
                            break;
                        }
                    }
                }
            }
        } else if ( data.response.mappingOutputs[0].mappingGroups[0].isModifiable === false ) {
            mappingGroupData.actionName = '';
        }
    }
    if ( headerCount !== 0 &&
        ( headerCount < data.response.mappingOutputs[0].propInfos.length || headerCount < mappingGroupData.mappingInfo.length ) ) {
        mappingGroupData.actionName = 'UPDATE';
    }
    return mappingGroupData.actionName;
};

/**
 * Get input data for Import from Excel
 *
 * @param {Object} data - The view model data
 * @return {Any} input data for import
 */
export let getExcelImportInput = function( data, ctx ) {
    data.headerPropertyMappling = [];
    exports.registerExcelData( ctx );
    data.runInBackgroundOptionForExcel = [];
    var propInfos = [];
    var mappingGroupData = {
        groupName: {
            realName: '',
            dispName: '',
            isModifiable: true
        },
        mappingInfo: [],
        actionName: ''
    };
    var mappingGroupData1 = mappingGroupData;


    if ( data.mappingGroup.dbValue ) {
        mappingGroupData.groupName.realName = data.mappingGroup.dbValue;
        mappingGroupData.groupName.dispName = data.mappingGroup.dbValue;
    } else if ( data.newGroupName.dbValue ) {
        mappingGroupData.groupName.realName = data.newGroupName.dbValue;
        mappingGroupData.groupName.dispName = data.newGroupName.dbValue;
        mappingGroupData.actionName = 'ADD';
    }

    for ( var index = 0; index < data.viewModelPropertiesForHeader.length; index++ ) {
        var viewProp = data.viewModelPropertiesForHeader[index];
        if ( viewProp.dbValue && !_.isArray( viewProp.dbValue ) ) {
            var dispProp = viewProp.uiValue.replace( ' (' + parentData.i18n.requiredLabel + ')', '' );
            var prop = {
                propHeader: viewProp.propertyName,
                dispPropName: dispProp,
                realPropName: viewProp.dbValue,
                isRequired: false
            };
            if ( dispProp !== viewProp.uiValue ) {
                prop.isRequired = true;
            }

            propInfos.push( prop );
        }
    }
    var propInfo = {
        propInfos: propInfos,
        dispTypeName: '',
        objectType: ''

    };

    data.headerPropertyMappling.push( propInfo );
    data.mappedGroupData = mappingGroupData;

    var runInBackgroundOption = 'RunInBackground';

    if ( !data.runInBackgroundExcel.dbValue ) {
        runInBackgroundOption = '';
        exports.registerExcelData( ctx );
    }

    data.runInBackgroundOptionForExcel.push( runInBackgroundOption );

    if ( mappingGroupData.groupName.dispName ) {
        mappingGroupData.mappingInfo = propInfos;
        if ( mappingGroupData.actionName === '' ) {
            mappingGroupData.actionName = _getActionNameForMapping( data, mappingGroupData );
        }
        data.mappedGroupData = mappingGroupData;
        if ( data.mappedGroupData.actionName === 'UPDATE' && data.newGroupName.isVisible === false ) {
            _showUpdateNotificationWarning( data );
            return;
        } else if ( mappingGroupData.actionName === '' ) {
            data.mappedGroupData = mappingGroupData1;
        }
    }

    eventBus.publish( 'importSpecification.importFromExcel' );
};

/**
 * adding one variable in data for Import Preview Event capture
 *
 * @param {Object} data - The view model data
 */
export let getTransientFileTicketsForImportPreview = function( data ) {
    data.importPreviewBtnClicked = true;

    eventBus.publish( 'progress.start' );
};

/**
 * adding one variable in data for Import Preview Event capture
 *
 * @param {Object} ctx - The context object
 */
export let getTransientFileTicketsForCompareAndPreview = function( ctx ) {
    ctx.compareAndPreviewBtnClicked = true;
    appCtxSvc.registerCtx( 'compareClick', true );
    eventBus.publish( 'progress.start' );
};
/**
 * Reset the filter, when subType gets changed.
 *
 * @param {Object} data - The view model data
 */
export let resetPropertiesFilter = function( data ) {
    data.filterBox.displayName = '';
    data.filterBox.dbValue = '';
};

/**
 * Register the flags in view model data
 *
 * @param {Object} data - The view model object
 */
export let registerData = function( data ) {
    data.arm0ImportFromOfficeEventProgressing = true;
};

/**
 * Unregister the flags from view model data
 *
 * @param {Object} data - The view model object
 */
export let unRegisterData = function( data ) {
    data.arm0ImportFromOfficeEventProgressing = false;
};

/**
 * Returns localized key value
 *
 * @param {Object} labels - i18n labels
 * @return {Array} array of localized key value string
 */
export let getLocalizedLabels = function( labels ) {
    var localizedLabels = [];
    var localizedkeyValue = {};
    localizedkeyValue.label = 'titleLabel';
    localizedkeyValue.localizedLabel = labels.titleLabel;
    localizedLabels.push( localizedkeyValue );
    return localizedLabels;
};
/**
 * Unregister the preview mode data
 */
export let unRegisterPreviewData = function() {
    _selectedRequidForAddChildPreview = null;
    _selectedTCObject = null;
    _existingStructureJSONData = null;
    appCtxSvc.unRegisterCtx( 'importAsChild' );
    appCtxSvc.unRegisterCtx( 'importAsChildSpec' );
    appCtxSvc.unRegisterCtx( 'compareClick' );
    appCtxSvc.unRegisterCtx( 'updatePreviewClick' );
    appCtxSvc.unRegisterCtx( 'visibleMoveCommandsForPreview' );
    rmTreeDataService.setJSONData();    // Unset data on import
};

/**
 * Register the flags in view model data for excel import
 *
 * @param {Object} data - The view model object
 */
export let registerExcelData = function( ctx ) {
    ctx.arm0ImportFromOfficeExcelProgressing = true;
};

/**
 * Unregister the flags from view model data for excel import
 *
 * @param {Object} data - The view model object
 */
export let unRegisterExcelData = function( ctx ) {
    ctx.arm0ImportFromOfficeExcelProgressing = false;
};

export let importOptions = function( data ) {
    var importOptions = [];
    importOptions.push( 'RoundTripImport' );
    if ( data.conflict.dbValue ) {
        importOptions.push( 'overWrite' );
    }
    return importOptions;
};

export let getCtxSelectedObject = function( data, ctx ) {
    var object = {};
    if ( data.mode && data.mode === 'preview' ) {
        object.uid = data.selectedObject.uid;
        object.type = data.selectedObject.type;
    } else {
        object.uid = ctx.selected.uid;
        object.type = ctx.selected.type;
    }
    return object;
};

export let getAddRulePanelType = function( data ) {
    if ( data.preferences.REQ_Microservice_Installed[0] === 'true' ) {
        return 'Arm0AddAdvanceRulesSub';
    }
    return 'Arm0AddRulesSub';
};

/**
 * Return json string for input rules, object types ect.
 *
 * @param {Object} data - The view model object
 * @returns {String} - json string
 */
export let getRulesInputJsonTextForPDFPreview = function( data ) {
    var inputJson = {
        keywordImportRules: getkeywordImportAdvanceOptions( data ),
        specificationType: getSpecificationTypeForImport( data ),
        specificationDisplayType: getSpecificationDisplayTypeForImport( data ),
        mode: 'Preview',
        defaultDisplayType: data.reqSpecEleType.dbValue,
        preserveParagraphNumber: data.preserveNumbering.dbValue,
        defaultInternalType: data.reqSpecEleType.dbValue,
        documentName: data.fileName
    };

    inputJson = JSON.stringify( inputJson );

    return inputJson;
};

export default exports = {
    showTreeWithContents,
    compareJSONTree,
    setExisitingJSONData,
    getTransientFileTicketsForPreview,
    getApplicationFormat,
    setTreeData,
    setExistingJSONDataCompare,
    compareAndSetTreeData,
    convertComparedSpecContentsToHTML,
    getCompareHtmlServiceURL,
    setUpdateTreeData,
    removeAllRules,
    getkeywordImportAdvanceOptions,
    getkeywordImportOptions,
    updateImportSpecList,
    initImportRulesData,
    updateImportSpecElementList,
    getRunInBackground,
    getImportAsHtml,
    getImportAsSpec,
    getRootTypeName,
    getSpecificationTypeForImport,
    getSpecificationDisplayTypeForImport,
    getMicroServiceURL,
    checkImportType,
    setJSONDataForImport,
    getJSONDataForImport,
    resetExcelImportData,
    resetNewGroupNameVisibilty,
    populateMappingInfoForGroup,
    initMappingCellLovApi,
    createPropertiesMap,
    initNativeCellLovApi,
    getRuleObjectForSelection,
    initRuleLovApi,
    addNewPropertiesForMapping,
    actionFilterList,
    getExcelImportInput,
    getTransientFileTicketsForImportPreview,
    getTransientFileTicketsForCompareAndPreview,
    resetPropertiesFilter,
    registerData,
    unRegisterData,
    unRegisterPreviewData,
    registerExcelData,
    unRegisterExcelData,
    importOptions,
    getCtxSelectedObject,
    getAddRulePanelType,
    updateFormData,
    unregisterImportRelatedCtx,
    updateFileContentInFormDataForImportPDF,
    getRulesInputJsonTextForPDFPreview,
    wordRuleSelectionChangeInListBox,
    getNewApplicationFormat,
    getJSONDataForCompareImport,
    updateImportTypesList,
    getLocalizedLabels
};
/**
 * Arm0ImportFromOffice panel service utility
 *
 * @memberof NgServices
 * @member Arm0ImportFromOffice
 */
app.factory( 'Arm0ImportFromOffice', () => exports );
