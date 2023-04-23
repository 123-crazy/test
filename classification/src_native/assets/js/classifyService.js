/* eslint-disable max-lines */
/* eslint-disable no-bitwise */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.
/*
global
 */

/**
 * This is a service to functions common to both full view and panel
 *
 * @module js/classifyService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import classifyLOVService from 'js/classifyLOVService';
import classifyTblSvc from 'js/classifyFullviewTableService';
import viewModelObjectService from 'js/viewModelObjectService';
import classifyUtils from 'js/classifyUtils';
import soaService from 'soa/kernel/soaService';
import dateTimeService from 'js/dateTimeService';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import appCtxSvc from 'js/appCtxService';
import iconSvc from 'js/iconService';
import AwSceService from 'js/awSceService';
import ngModule from 'angular';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';

import 'js/modelPropertyService';
import 'js/messagingService';

import localeSvc from 'js/localeService';
import { CSTPREFIX } from './aw-cls-list.directive';
// import { clearInstance } from './classifyFullviewTableService';

var exports = {};

export let DOC_TYPE_ICON = 'icon';
export let TO_KEYWORD = 'TO';
export let STRING_FILTER_KEYWORD = 'StringFilter';
export let NUMERIC_FILTER_KEYWORD = 'NumericFilter';
export let DATE_FILTER_KEYWORD = 'DateFilter';
export let WILDCARD_KEYWORD = '*';
export let BRACKET_KEYWORDS = [ '[', ']' ];
export let SPACE_KEYWORD = ' ';


export let UNCT_CLASS_ID = 'CLASS_ID';
export let UNCT_CLASS_TYPE = 'CLASS_TYPE';
export let UNCT_CLASS_OBJECT_TYPE = 'CLASS_OBJECT_TYPE';
export let UNCT_CLASS_NAME = 'CLASS_NAME';
export let UNCT_CLASS_UNIT_SYSTEM = 'UNIT_SYSTEM';
export let UNCT_DEPENDENCY_ATTRIBUTE = 'ATTRIBUTE_DEPENDENCY_ATTRIBUTE';
export let UNCT_DEPENDENCY_CONFIGURATION = 'ATTRIBUTE_DEPENDENCY_CONFIG';
export let UNCT_CLASS_ATTRIBUTE_NAME = 'ATTRIBUTE_NAME';
export let UNCT_CLASS_ATTRIBUTE_ID = 'ATTRIBUTE_ID';
export let UNCT_CLASS_USER_DATA_1 = 'USER_DATA_1';
export let UNCT_CLASS_USER_DATA_2 = 'USER_DATA_2';
export let UNCT_CLASS_SHORTNAME = 'CLASS_SHORT_NAME';
export let UNCT_MODIFY_DATE = 'MODIFICATION_DATE';
export let UNCT_MODIFY_USER = 'MODIFICATION_USER';
export let UNCT_OWNING_USER = 'OWNING_USER';
export let UNCT_ICO_UID = 'ICO_ID';
export let ICS_CONNECT_STANDALONE = 'CONNECT_STANDALONE';
export let UNCT_ATTRIBUTE_ANNOTATION = 'ATTRIBUTE_ANNOTATION';
export let UNCT_ATTRIBUTE_TYPE = 'ATTRIBUTE_TYPE';
export let UNCT_SORT_OPTION_CLASS_ID = -600;
export let UNCT_METRIC_KEYLOV_IRDI = 'KEYLOV_IRDI_METRIC';
export let UNCT_NONMETRIC_KEYLOV_IRDI = 'KEYLOV_IRDI_NONMETRIC';
export let UNCT_REFERENCED_CLASS_IRDI = 'REFERENCED_CLASS_IRDI';
export let UNCT_ATTRIBUTE_IS_REQUIRED = 'ATTRIBUTE_IS_REQUIRED';
export let UNCT_CLASS_DESCRIPTION = 'CLASS_DESCRIPTION';
export let UNCT_CLASS_PROBABILITY = 'CLASS_PROBABILITY';
export let POLYMORPHIC_OPTIONS_REFERENCE = 'POLYMORPHISM_CONTROLLER';
export let UNCT_IS_ARRAY_SIZE_CONTROLLER = 'IS_ARRAY_SIZE_CONTROLLER';
export let UNCT_IS_POLYMORPHISM_CONTROLLER = 'IS_POLYMORPHISM_CONTROLLER';
export let UNCT_ARRAY_SIZE_ATTRIBUTE_REFERENCE = 'ARRAY_SIZE_CONTROLLER';

//Display Names for attribue properties
export let UNCT_ATTRIBUTE_TYPE_DISP = 'Attribute Type';
export let UNCT_CLASS_ATTRIBUTE_NAME_DISP = 'Attribute Name';
export let UNCT_ATTRIBUTE_ANNOTATION_DISP = 'Attribute Annotation';
export let UNCT_REFERENCED_CLASS_IRDI_DISP = 'Referenced Class IRDI';
export let UNCT_IS_ARRAY_SIZE_CONTROLLER_DISP = 'Is Array Size Controller';
export let UNCT_METRIC_KEYLOV_IRDI_DISP = 'KeyLOV IRDI (Metric)';
export let UNCT_NONMETRIC_KEYLOV_IRDI_DISP = 'KeyLOV IRDI (NonMetric)';

//Display Name for class properties
export let UNCT_CLASS_ID_DISP = 'Class ID';
export let UNCT_CLASS_TYPE_DISP = 'Class Type';
export let UNCT_CLASS_OBJECT_TYPE_DISP = 'Class Object Type';
export let UNCT_CLASS_NAME_DISP = 'Class Name';
export let UNCT_CLASS_UNIT_SYSTEM_DISP = 'Class Unit System';

export let UNCT_ATTR_PROP_DISP = [
    UNCT_ATTRIBUTE_TYPE_DISP,
    UNCT_CLASS_ATTRIBUTE_NAME_DISP,
    UNCT_ATTRIBUTE_ANNOTATION_DISP,
    UNCT_REFERENCED_CLASS_IRDI_DISP,
    UNCT_IS_ARRAY_SIZE_CONTROLLER_DISP,
    UNCT_METRIC_KEYLOV_IRDI_DISP,
    UNCT_NONMETRIC_KEYLOV_IRDI_DISP
];

export let UNCT_ATTR_PROP = [
    UNCT_ATTRIBUTE_TYPE,
    UNCT_CLASS_ATTRIBUTE_NAME,
    UNCT_ATTRIBUTE_ANNOTATION,
    UNCT_REFERENCED_CLASS_IRDI,
    UNCT_IS_ARRAY_SIZE_CONTROLLER,
    UNCT_METRIC_KEYLOV_IRDI
];

export let UNCT_CLASS_ATTRIBUTES_DISP = [
    UNCT_CLASS_ID_DISP,
    UNCT_CLASS_TYPE_DISP,
    UNCT_CLASS_OBJECT_TYPE_DISP,
    UNCT_CLASS_NAME_DISP,
    UNCT_CLASS_UNIT_SYSTEM_DISP
];

export let UNCT_CLASS_ATTRIBUTES = [
    UNCT_CLASS_ID,
    UNCT_CLASS_TYPE,
    UNCT_CLASS_OBJECT_TYPE,
    UNCT_CLASS_NAME,
    UNCT_CLASS_UNIT_SYSTEM
];


export let PLACEHOLDER_STRING_FOR_POLY = '0000-0#02-000000#001';
export let KEYLOV_ID = 'KeyLOV_ID';
export let KEYLOV_NAME = 'KeyLOV_Name';

export let loadMetadata = 1;
export let loadStorageAttributes = 4;
export let loadSearchSimilarConfig = 4100;
export let loadStorageMetadata = 1024;
export let loadClassChildren = 16; //(1 << 4)
export let loadClassSuggestions = 512; //(1 << 9)
export let loadClassSuggestionProperties = 32768; //(1 << 15)
export let LOAD_CLASS_CHILDREN_DEFAULT = 256;
export let LOAD_CLASS_CHILDREN_ASC = 64;
export let LOAD_CLASS_UNITS = 2048; //( 1 << 11)

// define 'constants'
export let ATTRIBUTE_MANDATORY = 1 << 2;
export let ATTRIBUTE_HIDDEN = 1 << 20;
export let ATTRIBUTE_PROTECTED = 1 << 3;
export let ATTRIBUTE_REFERENCE = 1 << 7;
export let ATTRIBUTE_FIXED = 1 << 11;
export let ATTRIBUTE_FIXED2 = 1 << 13;
export let ATTRIBUTE_LOCALIZATION = 1 << 22;
export let COMPLEXPROPERTY = 4;
export const CLS_FILTER_KEY = 'CLS';

export let RANGE_MSG = 'Min, Max: All Fields Required';
export let TOLERANCE_MSG = 'Nominal, Min, Max: All Fields Required';
export let LEVEL_MSG = 'Nominal, Typical, Min, Max: All Fields Required';
export let POSITION_MSG = 'X, Y, Z: All Fields Required';
export let AXIS_MSG = 'X, Y, Z, X°, Y°, Z°: All Fields Required';
export let NON_COMPLEX_VMO_COUNT = 3;
export let SOURCESTANDARD = 'SOURCE_STANDARD';

//Type of classification attribute
export const BLOCK = 'Block';
export const CARDINAL = 'Cardinal';
export const COMPLEX = 'Complex';
export const PRIMITIVE = 'Primitive';

export const CLS_ATTRIBUTE_TYPE = {
    BLOCK,
    CARDINAL,
    COMPLEX,
    PRIMITIVE
};


var _showMinMsg;
var _showMaxMsg;
var _showRangeMsg;

// localized tooltip variables
var _exceedsInstances;
var _owningUser;
var _modifiedUser;
var _dateModified;
var _path;

/**
 * Following method changes display mode to Summary View layout
 */
export let changeViewMode = function() {
    var currentCtx = appCtxSvc.getCtx( 'ViewModeContext' );
    currentCtx.ViewModeContext = 'SummaryView';
    appCtxSvc.registerCtx( 'ViewModeContext', currentCtx );
};

/**
 * Check if child keylov is valid
 *
 * @param {*} attr attribute to check for
 * @param {*} lovEntry lov entry
 * @returns {*} true if valid, false otherwise
 */
function isChildKeyLOVvalid( attr, lovEntry ) {
    var isKeyValid = true;
    var keyLovs = [];
    for( var ix = 0; ix < lovEntry.children.length; ix++ ) {
        keyLovs.push( lovEntry.children[ ix ].propDisplayValue );
    }
    if( !keyLovs.includes( attr.vmos[ '0' ].displayValues[ '0' ] ) ) {
        isKeyValid = false;
        //cascade
        for( var kx = 0; kx < lovEntry.children.length; kx++ ) {
            var lovChild = lovEntry.children[ kx ];
            if( lovChild.children.length > 0 ) {
                isKeyValid = isChildKeyLOVvalid( attr, lovChild );
                if( isKeyValid ) {
                    break;
                }
            }
        }
    }
    return isKeyValid;
}

/**
 * Checks for a given attribute whether it contains valid keyLOV value or not
 * @param {*} attr attribute to check for
 * @param {*} data Declarative view model
 * @param {*} invalidAttrsArray array to store for invalid attributes
 * @returns {*} invalid key details
 */
export let isSingleKeyLOVvalid = function( attr, data, invalidAttrsArray ) {
    if( typeof invalidAttrsArray === 'undefined' ) {
        invalidAttrsArray = [];
    }
    var isKeyValid = true;
    if( attr.type !== 'Block' && attr.vmos[ '0' ].dbValue !== null && attr.vmos[ '0' ].dbValue[ '0' ] !== null ) {
        if( attr.vmos[ '0' ].hasLov ) {
            //get LOV entires for attribute
            var KeyLovArray = attr.vmos[ '0' ].lovApi.klEntries;
            //var KetLOVChildren = attr.

            var keyLovs = [];
            if( KeyLovArray.length > 0 ) {
                for( var ix = 0; ix < KeyLovArray.length; ix++ ) {
                    if( !isNaN( KeyLovArray[ ix ].propInternalValue ) ) // check internal value is number, if so use temp variable to convert to string
                    {
                        var temp = KeyLovArray[ ix ].propInternalValue.toString();
                        if( !temp.startsWith( classifyUtils.KL_HASH_STR ) ) {
                            keyLovs.push( KeyLovArray[ ix ].propDisplayValue );
                        }
                    } else if( isNaN( KeyLovArray[ ix ].propInternalValue ) && !KeyLovArray[ ix ].propInternalValue.startsWith( classifyUtils.KL_HASH_STR ) ) {
                        keyLovs.push( KeyLovArray[ ix ].propDisplayValue );
                    }
                }
                if( attr.vmos[ '0' ].displayValues.length > 0 && attr.vmos[ '0' ].displayValues[ '0' ] !== '' ) {
                    //check entered value is valid as per LOv entires
                    if( !keyLovs.includes( attr.vmos[ '0' ].displayValues[ '0' ] ) ) {
                        isKeyValid = false;
                        //Need to add check for cascadede KeylOVs recursively
                        for( var jx = 0; jx < KeyLovArray.length; jx++ ) {
                            isKeyValid = isChildKeyLOVvalid( attr, KeyLovArray[ jx ] );
                            if( isKeyValid ) {
                                break;
                            }
                        }

                        if( isKeyValid === false ) {
                            invalidAttrsArray.push( attr.vmos[ '0' ].propertyDisplayName );
                        }
                    }
                }
            }
        }
    }

    return {
        iskeyValid: isKeyValid,
        invalidAttr: invalidAttrsArray.length > 0 ? invalidAttrsArray[ 0 ] : ''
    };
};

/**
 * Checks for a given attribute whether its value meets the min-max requirements
 * @param {*} attr attribute to check for
 * @param {*} attrData the object storing whether the attr is valid or not, and it's name
 */
export let isAttributeValueInRange = function( attr, attrData ) {
    if( typeof attrData === 'undefined' ) {
        attrData = {};
    }
    if( !classifyUtils.isNullOrEmpty( attr.vmos ) ) {
        var valueToCheck = attr.vmos[ 0 ].dbValue;
        //If valueToCheck is an array, grab zeroth position and check that
        if( _.isArray( valueToCheck ) ) {
            valueToCheck = valueToCheck[ 0 ];
        }
        var unitSystemInfo = attr.unitSystem;
        if( ( unitSystemInfo.maximumValue || unitSystemInfo.minimumValue ) && valueToCheck ) {
            var minValue = classifyUtils.convertValue( unitSystemInfo.minimumValue, unitSystemInfo, false );
            var maxValue = classifyUtils.convertValue( unitSystemInfo.maximumValue, unitSystemInfo, false );
            if( minValue && !maxValue ) {
                attrData.isInRange = valueToCheck >= minValue || valueToCheck === '';
            } else if( !minValue && maxValue ) {
                attrData.isInRange = valueToCheck <= maxValue || valueToCheck === '';
            } else if( minValue && maxValue ) {
                attrData.isInRange = valueToCheck <= maxValue && valueToCheck >= minValue || valueToCheck === '';
            }
            attrData.invalidRangeAttr = attrData.isInRange ? null : attr.name;
        } else {
            attrData.isInRange = true;
        }
    } else {
        attrData.isInRange = true;
    }
};

/**
 * Method gets the documents information for given class descriptor
 * @param {Object} descriptor Object containing metadata information for documents
 * @returns imageIconUrl String representation of icon
 */
export let getIcon = function( descriptor ) {
    var iconAvailable = false;
    var ticket;
    if( descriptor && descriptor.documents && descriptor.documents.length > 0 ) {
        //check icon first
        _.forEach( descriptor.documents, function( doc ) {
            if( doc.documentType === DOC_TYPE_ICON ) {
                ticket = doc.ticket;
            }
        } );

        if( classifyUtils.isSupportedImageType( ticket ) ) {
            iconAvailable = true;
        }
    }
    var imageIconUrl;
    if( iconAvailable === true ) {
        imageIconUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' + fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
    } else {
        // If the class doesn't have an image, then display the 'default' icon.
        // Since we are not a real VMO, we can't use the type icon mechanism directly.
        var classifyIconName = 'typeClassificationElement48.svg';
        imageIconUrl = iconSvc.getTypeIconFileUrl( classifyIconName );
    }
    return imageIconUrl;
};

/*
 * Checks values entered or choosed for LOVs are valid or not.
 * If invalid inpurt is provided , user will get Error message.
 * @param {data} attribute - view model data
 */
export let keyLovValidation = function( data ) {
    var iskeyValid = true;
    var invalidAttrsArray = [];
    var tmpOutData;

    if( data.attr_anno && data.attr_anno !== null && data.attr_anno.length > 0 ) {
        _.every( data.attr_anno, function( attr ) {
            //check attribute has LOV
            tmpOutData = exports.isSingleKeyLOVvalid( attr, data, invalidAttrsArray );
            return tmpOutData.iskeyValid;
        } );
    } else {
        tmpOutData = {
            iskeyValid: iskeyValid
        };
    }
    return tmpOutData;
};

/**
 * @param {Object} selectedCell - selected cell.
 * @param {Object} data - Declarative view model
 * @return {ObjectArray} - Array of CLS objects to be deleted
 */
export let getDeleteInput = function( selectedCell, data ) {
    if( data && data.dataProviders && data.dataProviders.performSearch &&
        data.dataProviders.performSearch.viewModelCollection &&
        data.dataProviders.performSearch.viewModelCollection.loadedVMObjects &&
        data.dataProviders.performSearch.viewModelCollection.loadedVMObjects.length === 1 ) {
        appCtxSvc.ctx.deleteSingle = true;
    }
    return [ {
        uid: selectedCell.icoUid ? selectedCell.icoUid : selectedCell.uid
    } ];
};

/**
 * Sets the Class Bread Crumb to empty, effectively clearing its value
 *
 * @param {Object} data - the viewmodel data object
 */
export let clearClassBreadCrumb = function( data ) {
    if( data.provider ) {
        data.provider.crumbs = [];
    }
};

export let getAnnotations = function( attributesDefinition ) {
    var attrDef = attributesDefinition;
    return exports.getPropertyValue( attrDef.attributeProperties, exports.UNCT_ATTRIBUTE_ANNOTATION );
};

/**
 * Fires the event to navigate to the 'View' classification sub-panel
 * @param {Object}  data the declarative viewmodel data
 * @param {boolean} isPanel true if panel, false if fullview
 */
export let setViewMode = function( data, isPanel ) {
    exports.cleanupStandaloneData( data );

    if( isPanel ) {
        var context = {
            destPanelId: 'Awp0ViewClassificationSub',
            recreatePanel: false,
            supportGoBack: false
        };
        eventBus.publish( 'awPanel.navigate', context );
    } else { //fullview
        data.editClassInProgress = false;
        data.panelMode = -1;
        data.isFiltered = false;
        data.pasteSaved = false;

        exports.clearClassBreadCrumb( data );
        exports.clearCreateTreeData( data, appCtxSvc.ctx );
        if( data && data.eventMap && data.eventMap[ 'classifyPanel.propValidation' ] && data.eventMap[ 'classifyPanel.propValidation' ].goToView === false ) {
            data.pasteSaved = true;
            data.panelMode = 1;
            if( data.selectedClass && data.selectedClass.childCount !== 0 ) {
                data.hierarchyExpanded = true;
                data.hierarchyVisible = true;
            }
        } else {
            appCtxSvc.unRegisterCtx( 'classifyEdit' );
        }
    }
};
export let clearCreateTreeData = function( data, ctx ) {
    ctx.clsTab.selectedTreeNode = null;
    ctx.clsTab.selectedNode = null;
    ctx.clsTab.sortOption = null;
    // ctx.currentLevel = {};
};

export let accessCls0IsHidden = function( data ) {
    if( data.clsObjectDefs &&
        data.clsObjectDefs[ 1 ] &&
        data.clsObjectDefs[ 1 ][ 0 ] &&
        data.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ] &&
        data.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].properties ) {
        var props = data.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].properties;
        for( var i = 0; i < props.length; i++ ) {
            if( props[ i ].propertyId === 'cls0IsHidden' ) {
                if( props[ i ].values[ 0 ].internalValue === 'true' ) {
                    return true;
                } else if( props[ i ].values[ 0 ].internalValue === 'false' ) {
                    return false;
                }
            }
        }
    }
    return false;
};

/**
 * set localized(i18n) property key on icoCell
 *
 * @param {Object} data - The viewmodel's data object.
 * @param {Boolean} isPanel - true if panel, false otherwise.
 */
export let setCellProperty = function( data, isPanel ) {
    data.panelMode = -1;
    data.isHidden = accessCls0IsHidden( data );
    var clsLocation = appCtxSvc.getCtx( 'clsLocation' );

    if( data.isHidden ) {
        data.icoCells[ 0 ].indicators = [];
        data.icoCells[ 0 ].indicators.push( {} );
        data.icoCells[ 0 ].indicators[ 0 ].image = AwSceService.instance.trustAsHtml( iconSvc.getIndicatorIcon( 'Error' ) );
        var tooltipProp = {};
        tooltipProp.key = data.i18n.inReview;
        tooltipProp.value = data.i18n.AIReviewMsg;
        data.icoCells[ 0 ].cellExtendedTooltipProps.push( tooltipProp );
    }
    if( data.icoCells !== null && data.icoCells !== undefined ) {
        //If we only have one cell, make it selected. If Multiple cells  exists, make first cell as selected in fullview and none is panel
        if( data.icoCells.length === 1 || data.icoCells.length > 1 && !isPanel ) {
            var index = 0;
            if( data.icoCells.length > 1 ) {
                //en    sure correct icon is selected in case of paste or editclass
                var editCtx = appCtxSvc.getCtx( 'classifyEdit' );
                var tmpIco = editCtx ? editCtx.vmo : null;
                if( !tmpIco && data.pasteSaved ) {
                    tmpIco = appCtxSvc.getCtx( 'IcoReplica.vmo' );
                }
                if( !tmpIco && data.editPropInProgress ) {
                    tmpIco = data.selectedCell;
                }
                if( tmpIco ) {
                    index = _.findIndex( data.icoCells, function( ico ) {
                        return ico.cellInternalHeader1 === tmpIco.cellInternalHeader1;
                    } );
                    if( index === -1 ) {
                        //reclassified. use original index
                        index = editCtx.index;
                    }
                }
            }
            data.dataProviders.performSearch.selectionModel.setSelection( data.icoCells[ index ] );
            data.icoCells[ index ].selected = true;
        }

        _.forEach( data.icoCells, function( icoCell ) {
            var icoCellVerify = icoCell && icoCell.cellProperties && icoCell.cellProperties[ '0' ] &&
                icoCell.cellProperties[ '1' ];
            if( icoCellVerify && icoCell.cellProperties[ '0' ].key === 'DateModified' &&
                icoCell.cellProperties[ '1' ].key === 'Path' ) {
                icoCell.cellProperties[ '0' ].key = data.i18n.DateModified;
                icoCell.cellProperties[ '1' ].key = data.i18n.Path;
            }
        } );
    }

    if( ( data.icoCells === null || data.icoCells === undefined || data.icoCells.length === 0 || appCtxSvc.getCtx( 'pasteInProgress' ) === true ) && !isPanel ) {
        //incase showstandalone is set do not fire this event
        if( !clsLocation || clsLocation && !clsLocation.showStandalone ) {
            eventBus.publish( 'classifyPanel.processCell' );
        }
    }
};

/*
 * Generates the cells to be displayed in 'View' mode
 *
 * @param {Object} response - the SOA response
 *
 * @returns cells
 */
export let generateCells = function( response ) {
    var cells = [];

    if( response && response.clsObjectDefs ) {
        var classDefResponse = response.clsClassDescriptors;

        _.forEach( response.clsObjectDefs[ 1 ][ 0 ].clsObjects, function( clsObj ) {
            var classId = exports.getPropertyValue( clsObj.properties, exports.UNCT_CLASS_ID );

            var parents = exports.getParentsPath( response.classParents[ classId ].parents );
            var currentClassName = exports.getPropertyValue( classDefResponse[ classId ].properties, exports.UNCT_CLASS_NAME );

            var iconAvailable = false;
            var iconPosition = -1;
            var ticket = {};
            if( classDefResponse && classDefResponse[ classId ] &&
                classDefResponse[ classId ].documents ) {
                var documents = classDefResponse[ classId ].documents;
                var iconindex = 0;
                _.forEach( documents, function( document ) {
                    if( document.documentType === 'icon' ) {
                        iconPosition = iconindex;
                    }
                    iconindex++;
                } );
            }
            if( iconPosition !== -1 ) {
                ticket = classDefResponse[ classId ].documents[ iconPosition ].ticket;
            } else {
                // Get the class icon for the ICO's class.
                if( classDefResponse && classDefResponse[ classId ] &&
                    classDefResponse[ classId ].documents &&
                    classDefResponse[ classId ].documents[ 0 ] ) {
                    ticket = classDefResponse[ classId ].documents[ 0 ].ticket;
                }
            }

            if( ticket && classifyUtils.isSupportedImageType( ticket ) ) {
                iconAvailable = true;
            }

            if( iconAvailable === true ) {
                var imageIconUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' +
                    fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
            } else {
                // If the class doesn't have an image, then display the 'default' icon.
                // Since we are not a real VMO, we can't use the type icon mechanism directly.
                var classifyIconName = 'typeClassificationElement48.svg';
                imageIconUrl = iconSvc.getTypeIconFileUrl( classifyIconName );
            }

            var lastModifiedDate = exports.getPropertyValue( clsObj.properties, exports.UNCT_MODIFY_DATE );
            if( lastModifiedDate ) {
                lastModifiedDate = classifyUtils.convertClsDateToAWTileDateFormat( lastModifiedDate );
            }
            var cell = {};
            cell.cellHeader1 = currentClassName;
            cell.cellInternalHeader1 = classId;
            parents.push( currentClassName );
            cell.typeIconFileUrl = [];
            if( imageIconUrl ) {
                cell.thumbnailURL = imageIconUrl;
                cell.hasThumbnail = true;
            }
            if( lastModifiedDate && parents ) {
                cell.cellProperties = [ {
                    key: 'DateModified',
                    value: lastModifiedDate.displayValue
                }, {
                    key: 'Path',
                    value: parents.join( ' > ' )
                } ];
            }
            cell.cellExtendedProperties = exports.parseClsProperties( clsObj.properties );
            cell.icoUid = clsObj.clsObject.uid;
            cell.documents = classDefResponse[ classId ].documents;
            cells.push( cell );
        } );
    }

    return cells;
};

/**
 * Parses the search string before sending to the server.
 *
 * @param {String} searchStr The search string to be parsed.
 *
 * @return {ObjectArray} An object to be used in the SOA request.
 */
export let parseSearchString = function( searchStr ) {
    //No search string entered. Don't process it.
    if( !searchStr || searchStr.length === 0 ) {
        return;
    }

    var searchRequest = {};

    var parsedStr = searchStr.split( ':' );
    var key = parsedStr[ 0 ];

    if( key.match( /class Id/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_ID;
        parsedStr.shift();
        searchRequest.searchString = '*' + parsedStr.join( ':' ) + '*';
    } else if( key.match( /attribute name/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_ATTRIBUTE_NAME;
        parsedStr.shift();
        searchRequest.searchString = '*' + parsedStr.join( ':' ) + '*';
    } else if( key.match( /attribute id/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_ATTRIBUTE_ID;
        parsedStr.shift();
        searchRequest.searchString = parsedStr.join( ':' );
    } else if( key.match( /user data 1/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_USER_DATA_1;
        parsedStr.shift();
        searchRequest.searchString = parsedStr.join( ':' );
    } else if( key.match( /user data 2/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_USER_DATA_2;
        parsedStr.shift();
        searchRequest.searchString = parsedStr.join( ':' );
    } else if( key.match( /class type/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_TYPE;
        parsedStr.shift();
        searchRequest.searchString = parsedStr.join( ':' );
    } else if( key.match( /alias names/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_SHORTNAME;
        parsedStr.shift();
        searchRequest.searchString = parsedStr.join( ':' );
    } else if( key.match( /class name/i ) ) {
        searchRequest.searchAttribute = exports.UNCT_CLASS_NAME;
        parsedStr.shift();
        searchRequest.searchString = '*' + parsedStr.join( ':' ) + '*';
    } else {
        searchRequest.searchAttribute = exports.UNCT_CLASS_NAME;
        searchRequest.searchString = '*' + searchStr + '*';
    }
    searchRequest.sortOption = exports.UNCT_SORT_OPTION_CLASS_ID;
    return [ searchRequest ];
};

/**
 * Call SOA to find classification info
 *
 * @param {Object} request soa request
 */
export let findClassificationInfo = function( request ) {
    soaService.post( 'Internal-IcsAw-2019-12-Classification', 'findClassificationInfo3', request ).then(
        function( response ) {
            return response;
        } );
};

/**
 * Clears the search results from the search box
 *
 * @param {Object} data the declarative viewmodel data
 */
export let clearSearchBox = function( data ) {
    //Clear the searchBox
    if( data.searchBox && data.searchBox.dbValue !== '' ) {
        data.searchBox.dbValue = '';
    }
};

/**
 * Check if the search string is valid
 * @param {Object} data - view model
 * @param {string} eventName - Name of the event.
 */
export let checkForInvalidSearch = function( data, eventName ) {
    if( data.searchBox && data.searchBox !== undefined && data.searchBox.dbValue === '*' ) {
        throw new Error( 'failed' );
    } else {
        eventBus.publish( eventName, {} );
    }
};
/*
 * Gets the attribute IDs of all class attributes that are dependent KeyLOVs
 *
 * @param {Object} attributesDefinitions - The attributes of a class, abstracted from the findClassificationInfo2
 *            SOA response
 * @returns dependent key LOV attributes
 */
export let getDependentKeyLOVAttributes = function( attributesDefinitions ) {
    var configKeyLOVAttributeIds = [];
    if( attributesDefinitions ) {
        _.forEach( attributesDefinitions, function( attributesDefinition ) {
            if( attributesDefinition.attributeKeyLOVDef ) {
                if( attributesDefinition.attributeKeyLOVDef.keyLOVEntries.length > 0 ) {
                    //Currently, we need to transform ID into an integer. In future implementation, when the dependentKeyLov
                    //SOA is replaced, we will need to use this as a string
                    configKeyLOVAttributeIds.push( classifyLOVService
                        .getAttributeIntegerFromString( attributesDefinition.attributeId ) );
                }
            }
        } );
    }
    return configKeyLOVAttributeIds;
};

/*
 * Gets the unitSystem string for the classify operation
 *
 * @param {Object} data - the viewmodel data for this panel
 * @returns unit system
 */
export let getUnitSystem = function( data ) {
    return data.unitSystem.dbValue ? 'METRIC' : 'ENGLISH';
};

/*
 * Gets the unitSystem string for the classify operation
 *
 * @param {Object} data - the viewmodel data for this panel
 */
export let getPropertyValue = function( properties, propertyId ) {
    var propValue = '';
    _.forEach( properties, function( prop ) {
        if( prop.propertyId === propertyId ) {
            propValue = prop.values[ 0 ].displayValue;
        }
    } );
    return propValue;
};

/**
 * @param {Object} response response from the getClassDescriptions SOA
 * @param {String} selectedClassId the id of the currently selected class
 *
 * @returns {ObjectArray} The array of parent objects in correct hierarchical order
 */
export let parseClassDescriptions = function( response, selectedClassId ) {
    var parentNodes = [];

    var parents = response.classParents && response.classParents[ selectedClassId ] ? response.classParents[ selectedClassId ].parents : [];
    var idToClass = {};

    if( response.clsClassDescriptors ) {
        var currentClass = response.clsClassDescriptors[ selectedClassId ];
        var currClsObj = {};
        currClsObj.className = exports.getPropertyValue( currentClass.properties, exports.UNCT_CLASS_NAME );
        currClsObj.id = exports.getPropertyValue( currentClass.properties, exports.UNCT_CLASS_ID );

        parentNodes.push( currClsObj );
    }

    _.forEach( parents, function( parent ) {
        var parentObj = {};
        parentObj.className = exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_NAME );
        parentObj.id = exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_ID );
        parentObj.type = exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_TYPE );
        parentObj.ObjectType = exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_OBJECT_TYPE );
        if( parent.childCount ) {
            parentObj.childCount = parent.childCount;
        }

        if( parentObj.id !== 'ICM' && parentObj.id !== 'SAM' ) {
            parentNodes.push( parentObj );
        }
        idToClass[ parentObj.id ] = parentObj;
    } );
    return parentNodes.reverse();
};
/**
 * @param {Object} response response from the getChildren SOA
 * @param {boolean} includeIconData Flag whether to include icon data or not.
 * @param {String-Array} searchKeyArray an array of strings to be used for searching for the right child map. If multiple, they are OR'd. If not provided, zeroth position is assumed.
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let getChildren = function( response, includeIconData, searchKeyArray ) {
    var childNodes = [];
    if( response && response.classChildren ) {
        var keys = Object.keys( response.classChildren );
        var parentIdToBeUsed = null;
        if( searchKeyArray && !classifyUtils.isNullOrEmpty( searchKeyArray ) ) {
            for( var i = 0; i < searchKeyArray.length; i++ ) {
                // If the searchKey exists in the children keys, then use it
                parentIdToBeUsed = _.includes( keys, searchKeyArray[ i ] ) ? searchKeyArray[ i ] : parentIdToBeUsed;
                i = parentIdToBeUsed !== null ? searchKeyArray.length : i;
            }
        }
        // If parentIdToBeUsed is still null, assume zeroth position key to be used
        parentIdToBeUsed = parentIdToBeUsed === null ? keys[ 0 ] : parentIdToBeUsed;
        var children = response.classChildren[ parentIdToBeUsed ].children;
        _.forEach( children, function( child ) {
            var childObj = exports.parseIndividualClassDescriptor( child, includeIconData );
            childNodes.push( childObj );
        } );
    }
    // This may need to be removed in future once appropriate changes have been made to the hierarchy position implementation
    // childNodes.reverse();
    return childNodes;
};
/**
 * Extracts individual class information from the class descriptor and puts it inside the classObject.
 * Information extracted includes:
 * 1. Image icon - Default/custom
 * 2. Class Id
 * 3. Class Name
 * 4. Child count
 * 5. Class type
 * 6. Number of instances
 * 7. Class Description
 * 8. Class Probability
 * @param {Object} clsClassDescriptor Cls Class Descriptor sent in findClassificationInfo SOA response
 * @param {boolean} includeIconData Flag to indicate whether to include icon data in classObject
 * @param {Object} classObject The View model property object to be updated with class information
 * @returns {Object} extracted information stored in the classObj
 */
export let parseIndividualClassDescriptor = function( clsClassDescriptor, includeIconData, classObject ) {
    if( !clsClassDescriptor ) {
        return;
    }
    if( typeof classObject !== 'object' ) {
        classObject = {};
    }
    if( includeIconData ) {
        var iconAvailable = false;
        var ticket;
        if( clsClassDescriptor && clsClassDescriptor.documents && clsClassDescriptor.documents.length > 0 ) {
            ticket = clsClassDescriptor.documents[ 0 ].ticket;
            if( classifyUtils.isSupportedImageType( ticket ) ) {
                iconAvailable = true;
            }
        }
        var imageIconUrl;
        if( iconAvailable === true ) {
            imageIconUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' + fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
        } else {
            // If the class doesn't have an image, then display the 'default' icon.
            // Since we are not a real VMO, we can't use the type icon mechanism directly.
            var classifyIconName = 'typeClassificationElement48.svg';
            imageIconUrl = iconSvc.getTypeIconFileUrl( classifyIconName );
            iconAvailable = true;
        }
        classObject.typeIconFileUrl = [];
        if( imageIconUrl ) {
            classObject.typeIconFileUrl.push( imageIconUrl );
            classObject.thumbnailUrl = imageIconUrl;
            classObject.iconAvailable = iconAvailable;
        }
    }

    classObject.count = clsClassDescriptor.instanceCount;
    classObject.childCount = clsClassDescriptor.childCount;
    classObject.className = exports.getPropertyValue( clsClassDescriptor.properties, exports.UNCT_CLASS_NAME );
    classObject.id = exports.getPropertyValue( clsClassDescriptor.properties, exports.UNCT_CLASS_ID );
    classObject.type = exports.getPropertyValue( clsClassDescriptor.properties, exports.UNCT_CLASS_TYPE );
    classObject.objectType = exports.getPropertyValue( clsClassDescriptor.properties, exports.UNCT_CLASS_OBJECT_TYPE );
    classObject.classDescription = exports.getPropertyValue( clsClassDescriptor.properties, exports.UNCT_CLASS_DESCRIPTION );

    // Get the probability value
    classObject.classProbability = Number( exports.getPropertyValue( clsClassDescriptor.properties, exports.UNCT_CLASS_PROBABILITY ) );

    var ctx = appCtxSvc.getCtx( 'clsTab' );
    if( ctx && ctx.releases && ctx.releases.selected ) {
        var selected = 0;
        _.forEach( ctx.releases.selected, function( release ) {
            if( release.selected === 'true' ) {
                selected++;
            }
        } );
        if( selected !== 1 ) {
            var standard = exports.getPropertyValue( clsClassDescriptor.properties, SOURCESTANDARD );
            if( standard && standard !== '' ) {
                var displayName = getReleaseDisplayName( ctx, standard );
                classObject.className += ' ( ' + displayName + ' )';
            }
        }
    }
    return classObject;
};

/**
 * Returns release displayname
 *
 * @param {Object} releases list of releases
 * @param {String} name internal name,
 * @returns {String} release display name
 */
export let getReleaseDisplayName = function( releases, name ) {
    var displayName = name;
    if( releases && releases.eReleases ) {
        var idx = _.findIndex( releases.eReleases, function( release ) {
            return name === release.internalName;
        } );
        if( idx !== -1 ) {
            displayName = releases.eReleases[ idx ].displayName;
        }
    }
    return displayName;
};

/**
 * @param {Object} response response from the getClassDescriptions SOA
 *
 * @returns {Object} The unit system view model property
 */
export let parseUnitSystem = function( response ) {
    return response.descriptions[ Object.keys( response.descriptions )[ 0 ] ].unitBase;
};

/**
 * @param {Object} response response from the getParents SOA
 *
 * @returns {StringArray} The array of required parentIds
 */
export let getParentIds = function( response ) {
    var parentIds = [];
    var parents = response.parents[ Object.keys( response.parents )[ 0 ] ];
    for( var parent in parents ) {
        if( typeof parent !== 'undefined' ) {
            var parentId = parents[ parent ];
            if( parentId === 'ICM' || parentId === 'SAM' ) {
                continue;
            }
            parentIds.unshift( parentId );
        }
    }
    parentIds.push( Object.keys( response.parents )[ 0 ] );
    return parentIds;
};

/**
 * Checks if a block attribute is currently "dirty"
 *
 * @param {Object} data the data global variable
 * @param {String} blockVmos the blocks class attributes
 * @param {Boolean} continueChecking boolean argument to determine if isDirty should continue to check
 *            attributes
 */
export let isBlockDirty = function( data, blockVmos, continueChecking ) {
    _.forEach( blockVmos, function( attr ) {
        if( attr.type === 'Block' ) {
            exports.isBlockDirty( data, attr.children );
        } else {
            if( attr.vmos[ 0 ].valueUpdated === true && continueChecking === true ) {
                data.isInputDirty = true;
                continueChecking = false;
            }
        }
    } );
};

/**
 * Checks if the panel is currently "dirty"
 *
 * @param {Object} data the data global variable
 * @param {String} eventType the type of event (Optional)
 */
export let isDirty = function( data, eventType ) {
    data.isInputDirty = false;
    var continueCheck = true;
    _.forEach( data.attr_anno, function( attr ) {
        if( attr.type === 'Block' ) {
            exports.isBlockDirty( data, attr.children, continueCheck );
        } else {
            if( attr.vmos[ 0 ].valueUpdated === true && continueCheck === true ) {
                data.isInputDirty = true;
                continueCheck = false;
            }
        }
    } );
    if( eventType && eventType === 'nav' ) {
        data.isNavigating = true;
        data.activeView = 'Awp0ViewClassificationFull';
    }
};

/**
 * Sets if the user has already been prompted to save edits
 *
 * @param {Object} data the global data variable
 * @param {String} eventType The type of event, used to prevent closing (Optional)
 */
export let setIsAlreadyPrompted = function( data, eventType ) {
    data.isAlreadyPrompted = true;
    if( eventType && eventType === 'nav' ) {
        data.isNavigating = true;
    }
    data.setProcessCellSelectionToBeCalled = true;
    exports.cleanupStandaloneData( data );
};

/**
 *
 * @param {Object} vmo - vmo
 * @param {Object} format - nonmetric or metic
 * @param {boolean} isCstAttr true/false
 *
 */
var getDateConvertValuesRequest = function( vmo, format, isCstAttr ) {
    var formatTypeIndex = format.formatDefinition.formatLength;
    var dateValue = format.defaultValue;
    dateValue = classifyUtils.convertClsDateToAWDateWidgetFormat( dateValue,
        formatTypeIndex, isCstAttr );
    if( dateValue ) {
        if( vmo.type === classifyUtils.DATE ) {
            var dbValue = new Date( dateValue.dbValue ).getTime();
            vmo.convertedValues = dateTimeService.formatSessionDateTime( dbValue );
            vmo.dbValue = dbValue;
        } else if( vmo.type === classifyUtils.DATE_ARRAY ) {
            var dbValue1 = new Date( dateValue.dbValue ).getTime();
            vmo.convertedValues = dateTimeService.formatSessionDateTime( dbValue1 );
            if( !_.isEmpty( vmo.dbValue ) ) {
                vmo.dbValue[ '0' ] = dbValue1;
            } else {
                vmo.dbValue = [];
                vmo.dbValue[ '0' ] = dbValue1;
            }
        }
    }
};

var convertVMO = function( data, attribute, vmo ) {
    try {
        var tempAttrId = attribute.id;
        var tempAttrPrefix = attribute.prefix;
        var isCstAttr = Boolean( tempAttrId.substring( 0, 4 ) === CSTPREFIX || tempAttrPrefix.substring( 0, 4 ) === CSTPREFIX );
        var input;
        if( attribute.type !== BLOCK && !attribute.isCardinalControl ) {
            if( vmo.dbValue === null || vmo.type === classifyUtils.DATE && vmo.dbValue < 0 ) {
                vmo.dbValue = '';
            }

            input = {
                inputValues: [],
                options: 0
            };
            if( _.isArray( vmo.dbValue ) ) {
                _.forEach( vmo.dbValue, function( value ) {
                    input.inputValues.push( value.toString() );
                } );
            } else {
                input.inputValues.push( vmo.dbValue.toString() );
            }
            var unitSystem;
            //By this point, unitSystem represents the new/desired unit system.
            if( !data.unitSystem.dbValue ) {
                unitSystem = vmo.nonMetricFormat;
                if( unitSystem ) {
                    input.inputUnit = vmo.metricFormat.unitName;
                } else {
                    input.inputUnit = '';
                }
            } else {
                unitSystem = vmo.metricFormat;
                if( unitSystem ) {
                    input.inputUnit = vmo.nonMetricFormat.unitName;
                } else {
                    input.inputUnit = '';
                }
            }
            //Replace unitsystem and values with new values
            attribute.attrDefn.updateViewPropForUnitSystem( data, attribute, unitSystem, isCstAttr );
            if( unitSystem.formatDefinition.formatType > COMPLEXPROPERTY ) {
                input.outputFormat = { formatType: 2, formatModifier1: 0, formatModifier2: 0, formatLength: 7 };
            } else {
                input.outputFormat = unitSystem.formatDefinition;
            }
            input.outputUnit = unitSystem.unitName;
            return input;
        } else if( attribute.type === 'Block' ) {
            // Defect NoBlockHandling
            // We need to handle cardinal instances here as well, which will add more code
            input = {
                inputValues: [],
                options: 0
            };
            input.inputUnit = '';
            input.inputValues.push( '' );
            input.outputFormat = { formatType: 4, formatModifier1: -1, formatModifier2: -1, formatLength: -1 };
            input.outputUnit = '';
            return input;
        }
    } catch ( err ) {
        console.error( err );
    }
};

/**
 * Helper method to identify the type of the attribute
 *
 * @param {Object} attribute - the classification attribute
 *
 * @return {String} the type of the attribute
 */
let getAttributeType = function( attribute ) {
    let attributeType = PRIMITIVE;

    if ( attribute.type === BLOCK ) {
        attributeType = BLOCK;
    } else if( attribute.isCardinalControl ) {
        attributeType = CARDINAL;
    } else if ( attribute.unitSystem && attribute.unitSystem.formatDefinition && attribute.unitSystem.formatDefinition.formatType > COMPLEXPROPERTY ) {
        attributeType = COMPLEX;
    } else {
        attributeType = PRIMITIVE;
    }

    return attributeType;
};

/**
 * Helper method to create request for convertValues SOA call
 *
 * @param {Object} attribute - the classification attribute
 * @param {Object} data - the viewmodel data object
 * @param {Object} conversionRequest - the convert value request object
 *
 * @return {Object} the convert value request object
 */
 let getConvertValReqHelper = function( attributes, data, conversionRequest ) {
    var attributeType = CLS_ATTRIBUTE_TYPE.PRIMITIVE;
    _.forEach( attributes, function( attribute ) {
        attributeType = getAttributeType( attribute );

        switch ( attributeType ) {
            case CLS_ATTRIBUTE_TYPE.BLOCK:
                // Only handled for traditional block/view as part of this defect
                // Not handled for CST cardinal/polymeric block
                // TODO : Need to handle all use case for CST block
                if ( !isCstAttribute( attribute ) ) {
                    getConvertValReqForBlockType( data, attribute, conversionRequest );
                }
                break;
            case CLS_ATTRIBUTE_TYPE.COMPLEX:
                getConvertValReqForComplexType( data, attribute, conversionRequest );
                break;
            case CLS_ATTRIBUTE_TYPE.PRIMITIVE:
                var result = exports.convertSingleAttr( data, attribute );
                if ( result ) { conversionRequest.push( result ); }
                break;
            case CLS_ATTRIBUTE_TYPE.CARDINAL:
                //  Not handling for CST cardinal/polymeric block
                // TODO : Need to handle all use case for CST block
                break;
        }
        //Convert unit displayname to unitId
        if ( attributeType !== CLS_ATTRIBUTE_TYPE.BLOCK ) {
            _.forEach( conversionRequest, function( convReq )  {
                _.forEach( attribute.vmos[ 2 ].unitDefs, function( unit ) {
                    if ( unit.displayName === convReq.inputUnit ) {
                        convReq.inputUnit = unit.unitID;
                    }
                    if ( unit.displayName === convReq.outputUnit ) {
                        convReq.outputUnit = unit.unitID;
                    }
                } );
            } );
        }
    } );
};

/**
 * Helper method to create convert value request for complex attribute type
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} attribute - the classification attribute
 * @param {Object} conversionRequest - the convert value request object
 *
 * @return {Object} the convert value request for complex type
 */
let getConvertValReqForComplexType = function( data, attribute, conversionRequest ) {
    var idx = 0;
    _.forEach( attribute.vmos, function( vmo ) {
        if ( idx !== 1 && idx !== 2 ) {
            conversionRequest.push( convertVMO( data, attribute, vmo ) );
        }
        idx++;
    } );
};

/**
 * Helper method to create convert value request for Block attribute type
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} attribute - the classification attribute
 * @param {Object} conversionRequest - the convert value request object
 *
 * @return {Object} the convert value request for block type
 */
let getConvertValReqForBlockType = function( data, attribute, conversionRequest ) {
    var attributes = attribute.children ? attribute.children : [];
    getConvertValReqHelper( attributes, data, conversionRequest );
};

/**
 * Constructs the SOA input for the convertValues SOA
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object-Array} attributeArray - optional, if provided this array is processed instead of data.attr_anno
 *
 * @return {Object} the input for the convertValues SOA
 */
let getConvertValuesRequest = function( data, attributeArray ) {
    var conversionRequest = [];
    var valuesToProcess = attributeArray ? attributeArray : data.attr_anno;
    getConvertValReqHelper( valuesToProcess, data, conversionRequest );

    return conversionRequest;
};


/**
 * Helper method to validate whether attribute is cst attribute.
 * True - if cst attribute else false
 *
 * @param {Object} attribute - the classification attribute
 *
 * @return {Boolean} isCstAttribute
 */
let isCstAttribute = function( attribute ) {
    var isCstAttr = false;
    try {
        var tempAttrId = attribute.id;
        var tempAttrPrefix = attribute.prefix;
        isCstAttr = Boolean( tempAttrId.substring( 0, 4 ) === 'cst0' || tempAttrPrefix.substring( 0, 4 ) === 'cst0' );
    } catch ( err ) {
        console.error( err );
    }
    return isCstAttr;
};

/**
 * Constructs the SOA input for the convertValues SOA
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} attribute - optional, if provided this array is processed instead of data.attr_anno
 * @param {Object} single - optional
 *
 * @return {Object} the input for the convertValues SOA
 */
export let convertSingleAttr = function( data, attribute, single, newUnitName ) {
    try {
        var isCstAttr = isCstAttribute( attribute );
        if( attribute.type !== 'Block' && !attribute.isCardinalControl ) {
            var vmo = attribute.vmos[ 0 ];
            if( vmo.dbValue === null || vmo.type === classifyUtils.DATE && vmo.dbValue < 0 ) {
                vmo.dbValue = '';
            }

            var input = {
                inputValues: [],
                options: 0
            };
            vmo.value = vmo.value ? vmo.value : vmo.dbValue;

            if( vmo.value ) {
                if( _.isArray( vmo.value ) ) {
                _.forEach( vmo.value, function( value ) {
                    input.inputValues.push( value.toString() );
                } );
                } else {
                    input.inputValues.push( vmo.value.toString() );
                }
            }else{
                input.inputValues.push( '' );
            }

            var unitSystem;
            //By this point, unitSystem represents the new/desired unit system.
            if( !data.unitSystem.dbValue ) {
                unitSystem = vmo.nonMetricFormat;
                if( unitSystem ) {
                    input.inputUnit = vmo.originalSystem ? vmo.originalSystem.unitName : vmo.metricFormat.unitName;
                    if( !vmo.originalSystem ) {
                        vmo.originalSystem = vmo.metricFormat;
                    }
                } else {
                    input.inputUnit = '';
                }
            } else {
                unitSystem = vmo.metricFormat;
                if( unitSystem ) {
                    input.inputUnit = vmo.originalSystem ? vmo.originalSystem.unitName : vmo.nonMetricFormat.unitName;
                    if( !vmo.originalSystem ) {
                        vmo.originalSystem = vmo.nonMetricFormat;
                    }
                } else {
                    input.inputUnit = '';
                }
            }
            //Replace unitsystem and values with new values
            attribute.attrDefn.updateViewPropForUnitSystem( data, attribute, unitSystem, isCstAttr );
            if( unitSystem.formatDefinition.formatType > COMPLEXPROPERTY ) {
                input.outputFormat = { formatType: 2, formatModifier1: 0, formatModifier2: 0, formatLength: 7 };
            } else {
                input.outputFormat = unitSystem.formatDefinition;
            }

            if( single ) {
                input.outputUnit = newUnitName;
                return [ input ];
            }
            input.outputUnit = unitSystem.unitName;
            return input;
        } else if( attribute.type === 'Block' ) {
            // Defect NoBlockHandling
            // We need to handle cardinal instances here as well, which will add more code
            // var attributeChildElements = exports.getConvertValuesRequest( data, attribute.children );
            // conversionRequest.push.apply( conversionRequest, attributeChildElements );
            var input = {
                inputValues: [],
                options: 0
            };
            input.inputUnit = '';
            input.inputValues.push( '' );
            input.outputFormat = { formatType: 4, formatModifier1: -1, formatModifier2: -1, formatLength: -1 };
            input.outputUnit = '';
            return input;
        }
    } catch ( err ) {
        console.error( err );
    }
};

/**
 * Loops through all attributes in given array, and sets the default value for the corresponding unit system
 * Note: This function could be streamlined with other processes once block handling has been fixed for convertValues
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object-Array} attributeArray - an array of formatted attributes to loop through
 * @param {Boolean} isMetricUnitSystem - true if metric unitsystem, false if non-metric
 */
export let setDefaultValuesAndUnitSystem = function( data, attributeArray, isMetricUnitSystem ) {
    _.forEach( attributeArray, function( attribute ) {
        try {
            attribute.unitSystem = isMetricUnitSystem ?
                attribute.origAttributeInfo.metricFormat : attribute.origAttributeInfo.nonMetricFormat;
            if( attribute.type === 'Block' ) {
                exports.setDefaultValuesAndUnitSystem( data, attribute.children, isMetricUnitSystem );
                if( !classifyUtils.isNullOrEmpty( attribute.instances ) ) {
                    exports.setDefaultValuesAndUnitSystem( data, attribute.instances, isMetricUnitSystem );
                }
            } else {
                //Replace attrDefn unitsystem to update displayname correctly
                attribute.attrDefn.unitSystem = attribute.unitSystem;
                // Only do this in create mode, or editClass
                if( !classifyUtils.isNullOrEmpty( attribute.vmos ) && ( data.panelMode === 0 || data.editClassInProgress ||  data.panelMode !== -1 && attribute.unitSystem.defaultValue !== '' && attribute.attrDefn.unitSystem.unitName === ''  ) ) {
                    var dbValue = attribute.unitSystem.defaultValue ?
                        classifyUtils.convertValue( attribute.unitSystem.defaultValue, attribute.unitSystem, false ) : attribute.vmos[ 0 ].dbValue;
                    attribute.vmos = exports.formatViewProps( data, attribute.origAttributeInfo, attribute.attrDefn, dbValue, null, attribute.vmos );
                    attribute.vmos[ 0 ].valueUpdated = true;
                }
            }
        } catch ( err ) {
            console.error( err );
        }
    } );
};

/**
 * Determines whether values can be converted on current version of AW
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} singleAttr - if a single attribute is desired (such as user selecting unit)
 * @param {Object} unitData - if a single attribute is desired.
 */
export let convertValues = function( data ) {
    var request = {
        valueConversionInputs: exports.getConvertValuesRequest( data )
    };
    soaService.postUnchecked( 'Classification-2016-03-Classification', 'convertValues', request )
        .then( function( response ) {
            if( !response.partialErrors ) {
                data.convertedValues = response.convertedValues;
                exports.setConvertedValues( data, parent );
            }
            if( typeof data.localPropertyValues !== 'object' ) {
                exports.setDefaultValuesAndUnitSystem( data, data.attr_anno, data.unitSystem.dbValue );
                return response;
            }
        } );
};

/**
 * Determines whether values can be converted on current version of AW, returns response, rather than setting.
 *
 * @param {Object} request - request
 */
export let convertValuesReturn = function( request ) {
    soaService.postUnchecked( 'Classification-2016-03-Classification', 'convertValues', request )
        .then( function( response ) {
            if( !response.partialErrors ) {
                return response;
            }
        } );
};

/**
 * Applies the converted Value for complex dataTypes from the CovnertValues SOA
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} viewObject - vmo of Complex Data Value
 * @param {Object} unitObject - vmo of Complex Property Unit.
 * @param {Object} value - converted Value to apply
 */
export let applyConvertedValue = function( data, viewObject, unitObject, value ) {
    try {
        var convertedValues = null;
        if( value.convertedValues ) {
            convertedValues = value.convertedValues;
        }

        // Set the attribute unit name
        var unitSystem = data.unitSystem.dbValue ? viewObject.metricFormat : viewObject.nonMetricFormat;

        if( unitSystem.unitName ) {
            unitObject.propertyDisplayName = unitSystem.unitName;
            if( unitObject.display && unitObject.display[ 0 ] && unitObject.display[ 0 ].propertyDisplayName ) {
                unitObject.display[ 0 ].propertyDisplayName = unitSystem.unitName;
            }
            unitObject.propertyName = unitSystem.unitName;
            unitObject.uiOriginalValue = unitSystem.unitName;
            unitObject.uiValue = unitSystem.unitName;
            uwPropertyService.setValue( unitObject, convertedValues );
            if ( !Array.isArray( unitObject.dbValue ) ) {
                unitObject.dbValues = [ unitObject.dbValue ];
            }
        }

        var isLOV = false;
        if( unitSystem && unitSystem.formatDefinition && unitSystem.formatDefinition.formatType ) {
            isLOV = unitSystem.formatDefinition.formatType === -1;
        }

        // Set the max length from converted unit system
        if( !isLOV && unitSystem && unitSystem.formatDefinition && unitSystem.formatDefinition.formatType ) {
            uwPropertyService.setLength( viewObject, unitSystem.formatDefinition.formatLength );
        }

        if( !_.isEmpty( convertedValues ) ) {
            // Set the attribute values
            // handling default date value in metric and non-mertic format.
            if( viewObject.type === classifyUtils.DATE || viewObject.type === classifyUtils.DATE_ARRAY ) {
                if( viewObject.convertedValues ) {
                    if( viewObject.type === classifyUtils.DATE && viewObject.dateApi.dateObject ) {
                        viewObject.dateApi.setApiValues( viewObject.convertedValues );
                    } else if( viewObject.type === classifyUtils.DATE_ARRAY ) {
                        viewObject.displayValsModel[ '0' ].displayValue = viewObject.convertedValues;
                    }
                }
            } else {
                uwPropertyService.setValue( viewObject, convertedValues );
                if ( !Array.isArray( viewObject.dbValue ) ) {
                    viewObject.dbValues = [ viewObject.dbValue ];
                }
            }
        }
    } catch ( err ) {
        console.error( err );
    }
};

/**
 * Helper method to set converted values for the classification attribute
 *
 * @param {Object} attribute - the classification attribute
 * @param {Object} data - the viewmodel data object
 * @param {Object} indexRef - the index
 *
 */
let setConvertValueHelper = function( attributes, data, indexRef ) {
    var attributeType = CLS_ATTRIBUTE_TYPE.PRIMITIVE_ATTRIBUTE;
    attributes.forEach( ( attribute ) => {
        if ( attribute && attribute.vmos && attribute.vmos[0] && attribute.vmos[0].backupTooltip ) {
            attribute.vmos[0].minMaxMsg = attribute.vmos[0].backupTooltip;
        }
        attributeType = getAttributeType( attribute );
        switch ( attributeType ) {
            case CLS_ATTRIBUTE_TYPE.BLOCK:
                // Only handled for traditional block/view as part of this defect
                // Not handled for CST cardinal/polymeric block
                // TODO : Need to handle all use case for CST block
                if( !isCstAttribute( attribute ) )   {
                    setConvertedValForBlockType( data, attribute, indexRef );
                }
                break;
            case CLS_ATTRIBUTE_TYPE.COMPLEX:
                setConvertedValForComplexType( data, attribute, indexRef );
                break;
            case CLS_ATTRIBUTE_TYPE.PRIMITIVE:
                applyConvertedValue( data, attribute.vmos[0], attribute.vmos[2], data.convertedValues[indexRef.index] );
                indexRef.index++;
                break;
            case CLS_ATTRIBUTE_TYPE.CARDINAL:
                //  Not handling for CST cardinal/polymeric block
                // TODO : Need to handle all use case for CST block
                break;
        }
    } );
};


/**
 * Helper method to set converted values for the complex attribute type
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} attribute - the classification attribute
 * @param {Object} indexRef - the index
 *
 */
let setConvertedValForComplexType = function( data, attribute, indexRef ) {
    var val = 0;
    attribute.vmos.forEach( ( vmo ) => {
        if ( val !== 1 && val !== 2 ) {
            applyConvertedValue( data, vmo, attribute.vmos[2], data.convertedValues[indexRef.index] );
            indexRef.index++;
        }
        val++;
    } );
};


/**
 * Helper method to set converted values for the block attribute type
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} attribute - the classification attribute
 * @param {Object} indexRef - the index
 *
 */
let setConvertedValForBlockType = function( data, attribute, indexRef ) {
    var attributes = attribute.children ? attribute.children : [];
    setConvertValueHelper( attributes, data, indexRef );
};

/**
 * Sets the converted values from the SOA onto the attributes' backing data.
 *
 * @param {Object} data - the viewmodel data object
 * @param {Object} singleAttr - optional
 */
export let setConvertedValues = function( data, singleAttr ) {
    if( singleAttr ) {
        if( !data.attr_anno ) {
            data.attr_anno = [];
            data.attr_anno.push( singleAttr );
        }
    }
    var indexRef = { index: 0 };
    setConvertValueHelper( data.attr_anno, data, indexRef );
};

/**
 * Method for setting/destroying the targetObjectForSelection variable in "data", which is used to determine the
 * classification target.
 *
 * @param {Object} selected  the selected object or null
 * @param {Object} data the data object
 */
export let setTargetObjectForSelection = function( selected, data ) {
    data.targetObjectForSelection = [];
    // This change was necessitated because of the CF changes made to the WSO tiles.
    // The cellHeader1 property is not populated anymore directly.

    var selectedVerify = selected && selected.props && selected.props.object_name;
    if( selected.cellHeader1 === '' && selectedVerify && selected.props.object_name.dbValues && selected.props.object_name.dbValues[ 0 ] ) {
        selected.cellHeader1 = selected.props.object_name.dbValues[ 0 ];
    }
    data.targetObjectForSelection.push( selected );
};

/**
 * Helper method for getting the selected Object's ID
 *
 * For getting the correct ID of the selected object, following simple logic is being used. If the properties
 * item_id and/or item_revision_id are populated, then use it as Item/ItemRev (any subtypes of
 * Item/ItemRevision) Else use the object_name property for any other objects.
 *
 * @param {Object} selectedObject the object of which the ID has to be returned.
 * @returns {Object} object id
 */
function getObjectId( selectedObject ) {
    var objectId = '';
    var selectedObjectVerify = selectedObject && selectedObject.props &&
        selectedObject.props.awp0CellProperties;
    if( selectedObjectVerify && selectedObject.props.awp0CellProperties.dbValues &&
        selectedObject.props.awp0CellProperties.dbValues[ 0 ] ) {
        var dbValues = selectedObject.props.awp0CellProperties.dbValues;
        var name = '';
        var id = '';
        var revision = '';

        for( var idx = 0; idx < dbValues.length; idx++ ) {
            var propertyStr = dbValues[ idx ].replace( /\\|\s/g, '' );
            var propertyNameValuesArr = propertyStr.split( ':' );
            if( propertyNameValuesArr[ 0 ] === 'Name' ) {
                name = propertyNameValuesArr[ 1 ];
            } else if( propertyNameValuesArr[ 0 ] === 'ID' ) {
                id = propertyNameValuesArr[ 1 ];
            } else if( propertyNameValuesArr[ 0 ] === 'Revision' ) {
                revision = propertyNameValuesArr[ 1 ];
            }
        }

        if( revision === '' && id !== '' ) {
            // Item
            objectId = id;
        } else if( revision === '' && id === '' ) {
            // Non-Item (e.g. dataset )
            objectId = name;
        } else {
            // Item_revision
            objectId = id + '/' + revision;
        }
    }
    return objectId;
}

/**
 * Helper method to reset the standalone related data.
 *
 * @param {Object} data  the declarative viewmodel data
 *
 */
export let cleanupStandaloneData = function( data ) {
    if( data.standaloneObjectExists ) {
        data.standaloneObjectExists = false;
        data.clsObjTag = 'undefined';
        data.createForStandalone = false;
        appCtxSvc.unRegisterCtx( 'standaloneExists' );
    }

    var clsLocation = appCtxSvc.getCtx( 'clsLocation' );
    if( clsLocation && clsLocation.createStandAloneClicked ) {
        clsLocation.createStandAloneClicked = false;
        appCtxSvc.updateCtx( 'clsLocation', clsLocation );
    }
};

/**
 * The clsObject to be passed to createOrUpdateClassificationObjects SOA If standalone operation, then we need
 * the ico tag to be passed to above SOA Else, we pass it empty.
 *
 * @param {Object} data - the viewmodel data for this panel
 */
export let getClsObject = function( data ) {
    var clsObject = '';
    if( data.standaloneObjectExists ) {
        clsObject = data.clsObjTag;
    }
    return clsObject;
};

/**
 * Parse the getClassificationObjectInfo response
 *
 * @param {Object} clsObjProps - object props
 * @return {ObjectArray} - the array of attributes.
 */
export let parseClsProperties = function( clsObjProps ) {
    var properties = [];
    _.forEach( clsObjProps, function( prop ) {
        if( prop.propertyName !== '' ) {
            properties.push( {
                key: prop.propertyName,
                value: prop.values ? exports.getConcatenatedValues( prop.values ) : '',
                values: prop.values ? exports.getArrayValues( prop.values ) : []
            } );
        }
    } );

    return properties;
};

export let getArrayValues = function( propValues ) {
    var arrValues = [];
    _.forEach( propValues, function( value ) {
        arrValues.push( value );
    } );
    return arrValues;
};

export let getConcatenatedValues = function( propValues ) {
    var values = [];
    _.forEach( propValues, function( value ) {
        values.push( value.displayValue );
    } );

    var displayString = values.join( '}{' );

    if( values.length > 1 ) {
        displayString = '{' + displayString + '}';
    }

    return displayString;
};

/**
 * Parse the getClassificationObjectInfo response
 *
 * @param {Object} parents - the viewmodel data object
 * @param {Array} parentIds - Array in which parent Ids are to be put in
 * @return {ObjectArray} - the array of attributes.
 */
export let getParentsPath = function( parents, parentIds ) {
    var properties = [];
    var isParentIds = false;
    if( typeof parentIds === 'object' ) {
        isParentIds = true;
    }
    _.forEach( parents, function( parent ) {
        var parentId = exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_ID );

        if( parentId !== 'ICM' && parentId !== 'SAM' ) {
            properties.push( exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_NAME ) );
            if( isParentIds ) {
                parentIds.push( {
                    id: exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_ID ),
                    className: exports.getPropertyValue( parent.properties, exports.UNCT_CLASS_NAME )
                } );
            }
        }
    } );
    if( isParentIds ) {
        parentIds.reverse();
    }
    return properties.reverse();
};

export let setAttributesVisible = function( data, visible ) {
    var dataAttributeVerify = data && data.attributesVisible && data.attributesVisible !== visible;
    if( dataAttributeVerify || data && !data.attributesVisible ) {
        data.attributesVisible = visible;
        eventBus.publish( 'refresh.secondaryWorkArea', {} );
    }
};

var formatLOV = function( data, attribute, keyLOVID, dbValue, displayValue ) {
    var keyLOVDef;
    if( data.keyLOVDefinitionMapResponse ) {
        keyLOVDef = data.keyLOVDefinitionMapResponse[ keyLOVID ];
        displayValue = [];
        _.forEach( dbValue, function( dbVal ) {
            _.forEach( keyLOVDef.keyLOVEntries, function( entry ) {
                if( entry.keyLOVkey === dbVal ) {
                    displayValue.push( keyLOVDef.keyLOVOptions === 1 ? entry.keyLOVValue :
                        entry.keyLOVkey + ' ' + entry.keyLOVValue );
                }
            } );
        } );
    } else {
        keyLOVDef = attribute.attributeKeyLOVDef;
        displayValue = [];
        _.forEach( dbValue, function( dbVal ) {
            _.forEach( keyLOVDef.keyLOVEntries, function( entry ) {
                if( entry.keyLOVkey === dbVal ) {
                    displayValue.push( keyLOVDef.keyLOVOptions === 1 ? entry.keyLOVValue :
                        entry.keyLOVkey + ' ' + entry.keyLOVValue );
                }
            } );
        } );
    }
};

/**
 * Formats date property
 * @param {*} unitSystem unit system
 * @param {*} attrId attribute id
 * @param {*} attrIdPrefix attribute id prefix
 * @param {*} attrType attribute type
 * @param {*} dbValue db value
 * @param {*} displayValue display value
 * @param {*} attrOptions attribute options 
 * @returns {*} updated dbvalue/displayvalue
 */
function formatDateAndDateArray( unitSystem, attrId, attrIdPrefix, attrType, dbValue, displayValue, attrOptions ) {
    var dbValues = [];
    dbValues.push( dbValue );
    dbValue = Array.isArray( dbValue ) ? dbValue : dbValues;
    if( dbValue && dbValue[ 0 ] ) {
        var formatTypeIndex = unitSystem.formatDefinition.formatLength;
        var isCstDate = Boolean( attrId.substring( 0, 4 ) === 'cst0' || attrIdPrefix
            .substring( 0, 4 ) === 'cst0' );
        if( attrType === 'DATE' ) {
            var dateValue = classifyUtils.convertClsDateToAWDateWidgetFormat( dbValue[ 0 ],
                formatTypeIndex, isCstDate );
            if( dateValue ) {
                dbValue = dateValue.dbValue;
                var displayValues = [];
                displayValues.push( dateValue.displayValue );
                displayValue = _.clone( displayValues, true );
            }
        } else if( attrType === 'DATEARRAY' ) {
            var dateValueArray = classifyUtils.convertClsDateArrayToAWDateWidgetFormat( dbValue,
                formatTypeIndex, isCstDate );
            if( dateValueArray && dateValueArray[ 0 ] ) {
                var dbValues = [];
                var displayValues = [];
                _.forEach( dateValueArray, function( entry ) {
                    dbValues.push( entry.dbValue );
                    displayValues.push( entry.displayValue );
                } );
                dbValue = _.clone( dbValues, true );
                displayValue = _.clone( displayValues, true );
            }
        }
    } else {
        dbValue = null;
        displayValue = null;
    }
    return {
        dbValue: dbValue,
        displayValue: displayValue
    };
}

//This function might be removed later, but for now keep it to ensure that it is not lost if we do want to use it
/*
 * Sets the value for a generated cardinal instance, used for loading cardinal blocks
 *
 * @param {Object} cardinalInstance - the cardinal instance to set the children values of
 * @param {Object} valuesMap - the value map, used for when loading a cardinal block. Empty if creating for first time
 * @param {Object} data - the data object, used for load. Empty if creating for first time
 * @param {Object} classUnitSystem - the unitsystem object of the class the attribute belongs to, used for load. Empty if creating for first time
 */
/*exports.setCardinalInstanceValues = function( cardinalInstance, valuesMap, data, classUnitSystem ) {
    if( cardinalInstance.polymorphicTypeProperty ) {
        cardinalInstance.blockId = valuesMap.getPolymorphicType( cardinalInstance );
        cardinalInstance.polymorphicTypeProperty.vmos = exports.formatViewProps( data,
            cardinalInstance.polymorphicTypeProperty.origAttributeInfo, [ cardinalInstance.blockId ],
                cardinalInstance.polymorphicTypeProperty.name,
                    classUnitSystem, cardinalInstance.prefix );
        cardinalInstance.polymorphicTypeProperty.vmos[0].isRequired = true;
        exports.selectLOV( data, valuesMap, cardinalInstance );
    }
    for( var childInx in cardinalInstance.children ) {
        var child = cardinalInstance.children[ childInx ];
        var childId = child.prefix + child.id;
        if( child.type !== "Block" ) {
            var dbValue = valuesMap.getFormattedPropertyValue( childId, child.unitSystem, cardinalInstance.cardIndex );
            child.vmos = exports.formatViewProps( data, child.origAttributeInfo, dbValue, child.name, child.unitSystem, child.prefix );
        }
    }
};*/

/*
 * Generates/Removes the instances for a given block attribute, used for cardinality
 *
 * @param {Integer} cardinalValue - the number of instances to generate up to
 * @param {Object} blockAttribute - the formatted block attribute to generate/remove instances of
 */
export let getCardinalInstances = function( cardinalValue, blockAttribute ) {
    if( cardinalValue && blockAttribute ) {
        var cardinalAttrDefn = blockAttribute.cardinalController.attrDefn;
        if ( cardinalAttrDefn.maxInstances !== -1 && cardinalValue > cardinalAttrDefn.maxInstances ) {
            var msg = _exceedsInstances.replace( '{0}', cardinalAttrDefn.maxInstances );
            msg = msg.replace( '{1}', blockAttribute.name );
            messagingService.showError( msg );
            return;
        }

        if( cardinalValue > blockAttribute.instances.length ) {
            for( var i = blockAttribute.instances.length; i < cardinalValue; ++i ) {
                var tempArr = $.extend( true, {}, blockAttribute );
                tempArr.children = ngModule.copy( blockAttribute.children );
                if( blockAttribute.polymorphicTypeProperty ) {
                    tempArr.polymorphicTypeProperty = ngModule.copy( blockAttribute.polymorphicTypeProperty );
                }
                var index = i + 1;
                tempArr.instances = [];
                tempArr.cardinalController = '';
                tempArr.name += ' ' + index;
                var cardIndex = blockAttribute.cardIndex.slice();
                cardIndex.push( index );
                tempArr.cardIndex = cardIndex;
                tempArr.expanded = false;
                //If first instance, expand by default
                tempArr.propExpanded = index === 1;
                tempArr.selected = false;
                tempArr.hasBlockChildren = false;
                exports.hasBlockChildren( tempArr );
                blockAttribute.instances.push( tempArr );
            }
            return;
        }
    }
    if( cardinalValue === '' || cardinalValue < blockAttribute.instances.length ) {
        for( var j = blockAttribute.instances.length; j > cardinalValue; --j ) {
            blockAttribute.instances.pop();
        }
    }
};

/*
 * Gets attribute information from a given un-formatted attributeArray, using the given attrId
 *
 * @param {Object-Array} attributeArray - the array of un-formatted attributes to search through
 * @param {String} attrId - the irdi/id of the attribute to search for
 * @return the found attribute info or null
 */
export let getAttributeInfo = function( attributeArray, attrId ) {
    var outputAttribute = null;
    if( attrId.substring( 0, 4 ) === 'cst0' ) {
        attrId = attrId.substring( 4, attrId.length );
    }
    _.forEach( attributeArray, function( attr ) {
        var tempAttrId = attr.attributeId;
        if( tempAttrId.substring( 0, 4 ) === 'cst0' ) {
            tempAttrId = tempAttrId.substring( 4, tempAttrId.length );
        }
        if( tempAttrId === attrId ) {
            outputAttribute = attr;
        }
    } );
    return outputAttribute;
};

/*
 * Gets the keylov response information with the given attrReferenceClassIRDI, used for getting polymorphic type options
 *
 * @param {Object} data - the data object
 * @param {String} attrReferenceClassIRDI - the irdi of the searched for keylov definition
 * @return the found keylov info or null
 */
export let getPolyBlockReference = function( data, attrReferenceClassIRDI ) {
    var keylovRef = null;
    if( data && attrReferenceClassIRDI ) {
        if( data.keyLOVDefinitionMapResponse ) {
            if( _.has( data.keyLOVDefinitionMapResponse, attrReferenceClassIRDI ) ) {
                keylovRef = data.keyLOVDefinitionMapResponse[ attrReferenceClassIRDI ];
            }
        }
    }
    return keylovRef;
};

/*
 * Creates an attribute object to use for the polymorphic type controller
 *
 * @param {Object} polyTypeRef - the reference keylov response object
 * @return the generated attribute info
 */
var createPolymorphicTypeController = function( polyTypeRef ) {
    return {
        attributeId: exports.PLACEHOLDER_STRING_FOR_POLY,
        metricFormat: {
            formatDefinition: {
                formatType: 0,
                formatModifier1: -1,
                formatModifier2: -1,
                formatLength: -1
            }
        },
        nonMetricFormat: {
            formatDefinition: {
                formatType: 0,
                formatModifier1: -1,
                formatModifier2: -1,
                formatLength: -1
            }
        },
        attributeProperties: [ {
                propertyId: 'ATTRIBUTE_TYPE',
                propertyName: '',
                values: [ {
                    internalValue: 'Property',
                    displayValue: 'Property'
                } ]
            },
            {
                propertyId: 'ATTRIBUTE_NAME',
                propertyName: '',
                values: [ {
                    internalValue: exports.getPropertyValue( polyTypeRef.keyLOVProperties, exports.KEYLOV_NAME ),
                    displayValue: exports.getPropertyValue( polyTypeRef.keyLOVProperties, exports.KEYLOV_NAME )
                } ]
            },
            {
                propertyId: 'KEYLOV_IRDI_METRIC',
                propertyName: '',
                values: [ {
                    internalValue: exports.getPropertyValue( polyTypeRef.keyLOVProperties, exports.KEYLOV_ID ),
                    displayValue: exports.getPropertyValue( polyTypeRef.keyLOVProperties, exports.KEYLOV_ID )
                } ]
            }
        ]
    };
};

/*
 * Gets the view properties and values for the given formattedAttribute
 *
 * @param {Object} data - the data object
 * @param {Object} formattedAttribute - the formatted attribute to get the value for
 * @param {Object} valuesMap - the value map object that contains values from server
 * @param {Object} currentUnitSystem - the unitsystem object for the formattedAttribute
 * @param {Integer-Array} indexMap - the index map for the formattedAttribute
 */
export let getViewProps = function( data, formattedAttribute, valuesMap, currentUnitSystem, indexMap ) {
    var dbValue = valuesMap ? valuesMap.getFormattedPropertyValue( formattedAttribute.prefix + formattedAttribute.id, currentUnitSystem, indexMap ) :
        currentUnitSystem.defaultValue && currentUnitSystem.defaultValue.length > 0 ?
        _.isArray( currentUnitSystem.defaultValue ) ? currentUnitSystem.defaultValue : [ currentUnitSystem.defaultValue ] : null;
    if( currentUnitSystem.formatDefinition.formatType > COMPLEXPROPERTY && dbValue && dbValue.length > 1 ) {
        //Complex
        var noVals = false;
        var dataValue = null;
        _.forEach( dbValue, function( Val ) {
            if( Val === null ) {
                noVals = true;
            }
        } );
        if( noVals ) {
            _.forEach( valuesMap.properties, function( value ) {
                if( value.propertyId === formattedAttribute.id ) {
                    dataValue = value.values;
                }
            } );
        }
        if( dataValue !== null ) {
            dbValue = [];
            _.forEach( dataValue, function( value ) {
                dbValue.push( value.internalValue );
            } );
        }
        var vmos = setComplexValues( data, formattedAttribute, dbValue, currentUnitSystem );
        formattedAttribute.vmos = vmos;
    } else {
        formattedAttribute.vmos = exports.formatViewProps( data, formattedAttribute.origAttributeInfo, formattedAttribute.attrDefn, dbValue, null, null, valuesMap );
    }
};

/*
 * Gets the view properties and values for the given formattedAttribute
 *
 * @param {Object} data - the data object
 * @param {Object} formattedAttribute - the formatted attribute to get the value for
 * @param {Object} dbValue - the value map object that contains values from server
 * @param {Object} currentUnitSystem - the unitsystem object for the formattedAttribute
 * @returns {Object} vmos - the array of vmos with applied data
 */
export let setComplexValues = function( data, formattedAttribute, dbValue, currentUnitSystem ) {
    var vmos = exports.formatViewProps( data, formattedAttribute.origAttributeInfo, formattedAttribute.attrDefn, dbValue );
    if( currentUnitSystem.formatDefinition.formatType === 5 && vmos.length === 4 && dbValue.length > 1 ) { //range
        vmos[ 0 ] = exports.setValues( vmos[ 0 ], dbValue[ 0 ] );
        vmos[ 3 ] = exports.setValues( vmos[ 3 ], dbValue[ 1 ] );
    } else if( currentUnitSystem.formatDefinition.formatType === 6 && vmos.length === 5 && dbValue.length > 2 ) { //tolerance
        vmos[ 0 ] = exports.setValues( vmos[ 0 ], dbValue[ 0 ] );
        vmos[ 3 ] = exports.setValues( vmos[ 3 ], dbValue[ 1 ] );
        vmos[ 4 ] = exports.setValues( vmos[ 4 ], dbValue[ 2 ] );
    } else if( currentUnitSystem.formatDefinition.formatType === 7 && vmos.length === 6 && dbValue.length > 3 ) { //level
        vmos[ 0 ] = exports.setValues( vmos[ 0 ], dbValue[ 0 ] );
        vmos[ 3 ] = exports.setValues( vmos[ 3 ], dbValue[ 1 ] );
        vmos[ 4 ] = exports.setValues( vmos[ 4 ], dbValue[ 2 ] );
        vmos[ 5 ] = exports.setValues( vmos[ 5 ], dbValue[ 3 ] );
    } else if( currentUnitSystem.formatDefinition.formatType === 8 && vmos.length === 5 && dbValue.length > 2 ) { //position
        vmos[ 0 ] = exports.setValues( vmos[ 0 ], dbValue[ 0 ] );
        vmos[ 3 ] = exports.setValues( vmos[ 3 ], dbValue[ 1 ] );
        vmos[ 4 ] = exports.setValues( vmos[ 4 ], dbValue[ 2 ] );
    } else if( currentUnitSystem.formatDefinition.formatType === 9 && vmos.length === 8 && dbValue.length > 5 ) { //axis
        vmos[ 0 ] = exports.setValues( vmos[ 0 ], dbValue[ 0 ] );
        vmos[ 3 ] = exports.setValues( vmos[ 3 ], dbValue[ 1 ] );
        vmos[ 4 ] = exports.setValues( vmos[ 4 ], dbValue[ 2 ] );
        vmos[ 5 ] = exports.setValues( vmos[ 5 ], dbValue[ 3 ] );
        vmos[ 6 ] = exports.setValues( vmos[ 6 ], dbValue[ 4 ] );
        vmos[ 7 ] = exports.setValues( vmos[ 7 ], dbValue[ 5 ] );
    }
    return vmos;
};

/*
 * Helper Function for getViewProps
 *
 * @param {Object} vmos - the formatted attribute to get the value for
 * @param {Object} value - the value
 */
export let setValues = function( vmos, value ) {
    vmos.dbValue = value;
    vmos.displayValues = value;
    vmos.value = value;
    vmos.prevDisplayValues = value;
    vmos.uiValue = value;
    return vmos;
};

/*
 * Takes the inputted formatted attribute array and gets the values for each attribute.
 * Additionally, builds the values map index for each attribute.
 *
 * @param {Object} data - the data object
 * @param {Object-Array} outputAnnoArray - the formatted attributes to get the values for
 * @param {Object} valuesMap - the value map object that contains values from server
 * @param {Integer-Array} indexMap - the progressively built index map
 */
export let processValues = function( data, outputAnnoArray, valuesMap, indexMap ) {
    _.forEach( outputAnnoArray, function( formattedAttribute ) {
        if( formattedAttribute.type === 'Block' ) {
            if( formattedAttribute.cardinalController ) {
                if( indexMap ) {
                    formattedAttribute.cardIndex = indexMap.slice();
                }
                exports.getViewProps( data, formattedAttribute.cardinalController, valuesMap, formattedAttribute.cardinalController.unitSystem, indexMap );
                if( formattedAttribute.cardinalController.vmos[ 0 ].dbValue ) {
                    exports.getCardinalInstances( formattedAttribute.cardinalController.vmos[ 0 ].dbValue[ 0 ], formattedAttribute );
                    exports.processValues( data, formattedAttribute.instances, valuesMap, formattedAttribute.cardIndex );
                }
            } else if( formattedAttribute.polymorphicTypeProperty ) {
                if( _.isEmpty( formattedAttribute.cardIndex ) ) {
                    if( indexMap ) {
                        formattedAttribute.cardIndex = indexMap.slice();
                        formattedAttribute.cardIndex.push( 1 );
                    } else {
                        formattedAttribute.cardIndex.push( 1 );
                    }
                }
                formattedAttribute.blockId = valuesMap.getPolymorphicType( formattedAttribute );
                if( formattedAttribute.blockId ) {
                    formattedAttribute.polymorphicTypeProperty.vmos = exports.formatViewProps( data,
                        formattedAttribute.polymorphicTypeProperty.origAttributeInfo, formattedAttribute.polymorphicTypeProperty.attrDefn, [ formattedAttribute.blockId ] );
                    exports.selectLOV( data, valuesMap, formattedAttribute );
                }
            } else {
                if( _.isEmpty( formattedAttribute.cardIndex ) ) {
                    if( indexMap ) {
                        formattedAttribute.cardIndex = indexMap.slice();
                        formattedAttribute.cardIndex.push( 1 );
                    } else {
                        formattedAttribute.cardIndex.push( 1 );
                    }
                }
                exports.processValues( data, formattedAttribute.children, valuesMap, formattedAttribute.cardIndex );
            }
        } else {
            if( classifyUtils.isNullOrEmpty( formattedAttribute.vmos[ 0 ].dbValue ) || data.panelMode === 0 && !data.clearProperties ) {
                // If defaultValue not set by formatAttributeArray by currentUnitSystem.defaultValue or it is a create mode, then use the value from valueMap
                exports.getViewProps( data, formattedAttribute, valuesMap, formattedAttribute.unitSystem, indexMap );
            }
        }
    } );
};

/*
 * Creates view property objects for the given attribute, it's dbValue, and attrName
 *
 * @param {Object} data - the data object
 * @param {Object} attribute - the un-formatted attribute whose view props we are creating
 * @param {String} dbValue - the value to be transformed into a view prop
 * @param {Object} attrDefn - attribute definition
 * @param {Integer} - attrOptions The attrOptions object holds the several flags to decide the behavior for formatAttributeArray method
 * @param {Boolean} originalVmo - vmo from viewmodel
 * @param {Object} valuesMap values map
 * @return the created view props
 */
// eslint-disable-next-line complexity
export let formatViewProps = function( data, attribute, attrDefn, dbValue, attrOptions, originalVmo, valuesMap ) {
    // If attribute is hidden, read-only, or reference attribute, then don't render it.
    // The reference attribute needs to be rendered in view mode though!
    // If fixed (constant) value, then only render in view
    if( ( attribute.options & exports.ATTRIBUTE_HIDDEN ) !== 0 ||
        ( attribute.options & exports.ATTRIBUTE_PROTECTED ) !== 0 && data.panelMode !== -1 ||
        ( attribute.options & exports.ATTRIBUTE_REFERENCE ) !== 0 && data.panelMode !== -1 ) {
        return exports.ATTRIBUTE_REFERENCE;
    }

    //Send different arrays each for dbValue and displayValue to createViewModelProperty
    var displayValue = null;

    // check for EditMode and get common properties value
    if( data.panelMode === 1 && data.selectedCell && !data.clearProperties ) {
        attrDefn.setCommonProps( data, dbValue );
    }

    // For date attributes, special handling is required.
    // 1. Get the date's format from unitSystem.format.formatLength and clsDateFormats array
    // 2. Convert the given date from above format to the widget acceptable format ( DD-MMM-YYYYTHH:MM:SS(+/-)XX:YY,
    //    e.g. 2017-03-17T05:00:00-04:00)
    if( attrDefn.attrType === 'DATE' || attrDefn.attrType === 'DATEARRAY' ) {
        attrDefn.setDateValue( dbValue, displayValue );
    } else if( attrDefn.isLOV ) {
        attrDefn.setLOVValue( data, attribute, dbValue, displayValue, valuesMap );
    } else if( attrDefn.attrType === 'BOOLEAN' ) {
        attrDefn.setBooleanValue( dbValue, displayValue );
    } else if( attrDefn.attrType === 'INTEGER' ) {
        attrDefn.setIntegerValue( dbValue, displayValue );
    } else {
        attrDefn.setDefaultValue( dbValue, displayValue );
    }
    attrDefn.setDisplayName();
    var props = [];
    attrDefn.unitMap = data.unitMap;
    var viewProp3 = attrDefn.createViewPropUnitSystem();
    if( originalVmo && originalVmo[ 0 ] && originalVmo[ 1 ] && dbValue === originalVmo[ 0 ].dbValue ) {
        var tempVmos = [];
        if( originalVmo[ 0 ].isArray && !originalVmo[ 0 ].dbValue ) {
            originalVmo[ 0 ].dbValue = [];
        }
        for( var i = 0; i < originalVmo.length; i++ ) {
            if( i !== 2 ) {
                tempVmos.push( originalVmo[ i ] );
            } else if( i === 2 ) {
                tempVmos.push( viewProp3 );
            }
        }
        return tempVmos;
    }
    var viewProp = attrDefn.createViewPropType( data, attribute, attrOptions );
    props.push( viewProp );
    //create viewModel property for the given attribute type and annotation
    var viewProp2 = attrDefn.createViewPropAnnotation();
    props.push( viewProp2 );
    props.push( viewProp3 );
    if( viewProp.metricFormat && viewProp.metricFormat.formatDefinition && viewProp.metricFormat.formatDefinition.formatType > COMPLEXPROPERTY ) {
        props = applyComplexPlaceholders( viewProp, data, props );
    }
    return props;
};

export let applyComplexPlaceholders = function( viewProp, data, props ) {
    // Complex set type to double
    // Add placeholder text to VMO's
    viewProp.type = 'DOUBLE';
    data.advancedData = true;
    props.push( $.extend( true, {}, viewProp ) );
    // Tolerance, Level, Position, Axis
    if( viewProp.metricFormat.formatDefinition.formatType > 5 ) {
        props.push( $.extend( true, {}, viewProp ) );
        // Level
        if( viewProp.metricFormat.formatDefinition.formatType === 7 ) {
            props.push( $.extend( true, {}, viewProp ) );
        } else if( viewProp.metricFormat.formatDefinition.formatType === 9 ) {
            // Axis
            props.push( $.extend( true, {}, viewProp ) );
            props.push( $.extend( true, {}, viewProp ) );
            props.push( $.extend( true, {}, viewProp ) );
        }
    }
    if( viewProp.metricFormat.formatDefinition.formatType === 5 ) {
        // Range
        props[ 0 ].propertyRequiredText = 'Min';
        props[ 0 ].minMaxMsg = RANGE_MSG;
        props[ 0 ].backupTooltip = RANGE_MSG;
        props[ 3 ].propertyRequiredText = 'Max';
    } else if( viewProp.metricFormat.formatDefinition.formatType === 6 ) {
        // Tolerance
        props[ 3 ].propertyRequiredText = 'Min';
        props[ 4 ].propertyRequiredText = 'Max';
        props[ 0 ].propertyRequiredText = 'Nominal';
        props[ 0 ].minMaxMsg = TOLERANCE_MSG;
        props[ 0 ].backupTooltip = TOLERANCE_MSG;
    } else if( viewProp.metricFormat.formatDefinition.formatType === 7 ) {
        // Level
        props[ 4 ].propertyRequiredText = 'Min';
        props[ 5 ].propertyRequiredText = 'Max';
        props[ 0 ].propertyRequiredText = 'Nominal';
        props[ 3 ].propertyRequiredText = 'Typical';
        props[ 0 ].minMaxMsg = LEVEL_MSG;
        props[ 0 ].backupTooltip = LEVEL_MSG;
    } else if( viewProp.metricFormat.formatDefinition.formatType === 8 ) {
        // Position
        props[ 0 ].propertyRequiredText = 'X';
        props[ 3 ].propertyRequiredText = 'Y';
        props[ 4 ].propertyRequiredText = 'Z';
        props[ 0 ].minMaxMsg = POSITION_MSG;
        props[ 0 ].backupTooltip = POSITION_MSG;
    } else if( viewProp.metricFormat.formatDefinition.formatType === 9 ) {
        // Axis
        props[ 0 ].propertyRequiredText = 'X';
        props[ 3 ].propertyRequiredText = 'Y';
        props[ 4 ].propertyRequiredText = 'Z';
        props[ 5 ].propertyRequiredText = 'X°';
        props[ 6 ].propertyRequiredText = 'Y°';
        props[ 7 ].propertyRequiredText = 'Z°';
        props[ 0 ].minMaxMsg = AXIS_MSG;
        props[ 0 ].backupTooltip = AXIS_MSG;
    }
    return props;
};

/**
 * Following function deals with defining the common object for both property display name and unuit system
 * @param {Object}  data - The viewmodel data object
 */
export let formatAttributeArrayForUnitsSystem = function( data ) {
    for( var i = 0; i < data.attr_anno.length; i++ ) {
        // take first and 3rd object
        var attribute = data.attr_anno[ i ];
        var temp1 = uwPropertyService.createViewModelProperty( attribute.vmos[ 0 ].propertyName, attribute.vmos[ 0 ].propertyDisplayName + '(' + attribute.vmos[ 2 ].propertyDisplayName + ')', attribute
            .vmos[ 0 ].attrType,
            attribute.vmos[ 0 ].dbValue + '(' + attribute.vmos[ 2 ].dbValue + ')', attribute.vmos[ 0 ].displayValue + '(' + attribute.vmos[ 2 ].displayValue + ')' );
        attribute.vmos.push( temp1 );
    }
};

/**
 * Formats the attributes in the given array as required for classification location
 *
 * @param {Objects} data - The viewmodel data object
 */
export let formatAttributeArrayForClassificationLocation = function( data ) {
    for( var i = 0; i < data.attr_anno.length; i++ ) {
        var attribute = data.attr_anno[ i ];
        if( attribute.vmos[ 0 ].type !== 'STRING' || attribute.vmos[ 0 ].type !== 'STRINGARRAY' ) {
            // We need to push one more entry to enable start and end value feature
            ///data.attr_anno[i].vmos.push( attribute.vmos[0]);
            if( attribute.vmos[ 0 ].type === 'DOUBLE' || attribute.vmos[ 0 ].type === 'INTEGER' || attribute.vmos[ 0 ].type === 'DOUBLEARRAY' || attribute.vmos[ 0 ].type === 'INTEGERARRAY' ) {
                var numericRange = {};
                numericRange.selected = false;

                //add start range property
                var startRangeProperty = uwPropertyService.createViewModelProperty( '', '', 'DOUBLE', undefined, '' );
                startRangeProperty.isEditable = true;
                uwPropertyService.setPlaceHolderText( startRangeProperty, 'From' );

                // add end range property
                var endRangeProperty = uwPropertyService.createViewModelProperty( '', '', 'DOUBLE', undefined, '' );
                endRangeProperty.isEditable = true;
                uwPropertyService.setPlaceHolderText( endRangeProperty, 'To' );

                numericRange.startValue = startRangeProperty;
                numericRange.endValue = endRangeProperty; // save current values

                attribute.startRangeProperty = startRangeProperty;
                attribute.endRangeProperty = endRangeProperty;
                attribute.numericRange = numericRange;
                data.attr_anno[ i ] = attribute;
            } else if( attribute.vmos[ 0 ].type === 'DATE' || attribute.vmos[ 0 ].type === 'DATEARRAY' ) {
                var daterange = {};

                var sDate = dateTimeService.getNullDate();
                var eDate = dateTimeService.getNullDate();

                var sDateStr = dateTimeService.formatDate( sDate );
                var eDateStr = dateTimeService.formatDate( eDate );

                // add start date property
                var startDateProperty = uwPropertyService.createViewModelProperty( '', '', 'DATE', sDate, '' );
                startDateProperty.isEditable = true;
                startDateProperty.dateApi.isTimeEnabled = false;
                if( sDateStr.length === 0 ) {
                    startDateProperty.dateApi.dateFormatPlaceholder = dateTimeService.getDateFormatPlaceholder();
                } else {
                    startDateProperty.dateApi.dateValue = sDateStr;
                    startDateProperty.dateApi.dateObject = sDate;
                }

                // add end date property
                var endDateProperty = uwPropertyService.createViewModelProperty( '', '', 'DATE', eDate, '' );
                endDateProperty.isEditable = true;
                endDateProperty.dateApi.isTimeEnabled = false;
                if( eDateStr.length === 0 ) {
                    endDateProperty.dateApi.dateFormatPlaceholder = dateTimeService.getDateFormatPlaceholder();
                } else {
                    endDateProperty.dateApi.dateValue = eDateStr;
                    endDateProperty.dateApi.dateObject = eDate;
                }

                daterange.startDate = startDateProperty;
                daterange.endDate = endDateProperty;
                attribute.daterange = daterange;
                data.attr_anno[ i ] = attribute;
            }
        }
    }
};

/**
 * Clears the attribute values.
 * Keep the vmos[0].valueUpdated unchanged as saveClassificationObjects would automatically use attribute default value if no value/no empty value sent in SOA
 * @param {Object} - data - The viewmodel data object
 */
// eslint-disable-next-line complexity
export let clearAttribute = function( attribute ) {
    try {
        // Clear the dbValue from attrDefn
        attribute.attrDefn.clearDbValue();

        attribute.vmos[ 2 ].propertyName = attribute.unitSystem.startValue;
        attribute.vmos[ 2 ].uiOriginalValue = attribute.unitSystem.startValue;
        attribute.vmos[ 2 ].uiValue = attribute.unitSystem.startValue;
        // Handle based on Array, LoV, date, etc.
        if( attribute.vmos[ 0 ].isArray ) {
            if( attribute.vmos[ 0 ].hasLov ) {
                attribute.vmos[ 0 ].displayValues = [];
            }
        } else {
            if( attribute.vmos[ 0 ].hasLov ) {
                attribute.vmos[ 0 ].uiValue = '';

                //call getInitialValuesAfterClearAll to repopulate LOV Values
                //This reduces SOA call
                var deferred = AwPromiseService.instance.defer();
                attribute.vmos[ 0 ].lovApi.getInitialValuesAfterClearAll( '', deferred, attribute.name );
            } else if( attribute.vmos[ 0 ].type === 'DATE' && attribute.vmos[ 0 ].dateApi ) {
                attribute.vmos[ 0 ].dateApi.setApiValues( '' );
            }
        }
        uwPropertyService.setValue( attribute.vmos[ 0 ], attribute.vmos[ 0 ].isArray ? [] : '' );
        if( attribute.unitSystem.formatDefinition && attribute.unitSystem.formatDefinition.formatType >= 5 && attribute.unitSystem.formatDefinition.formatType < 10 ) {
            if( attribute.unitSystem.formatDefinition.formatType === 5 && attribute.vmos.length === 4 ) {
                uwPropertyService.setValue( attribute.vmos[ 3 ], attribute.vmos[ 3 ].isArray ? [] : '' );
            } else if( attribute.unitSystem.formatDefinition.formatType === 6 && attribute.vmos.length === 5 ) {
                uwPropertyService.setValue( attribute.vmos[ 3 ], attribute.vmos[ 3 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 4 ], attribute.vmos[ 4 ].isArray ? [] : '' );
            } else if( attribute.unitSystem.formatDefinition.formatType === 7 && attribute.vmos.length === 6 ) {
                uwPropertyService.setValue( attribute.vmos[ 3 ], attribute.vmos[ 3 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 4 ], attribute.vmos[ 4 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 5 ], attribute.vmos[ 5 ].isArray ? [] : '' );
            } else if( attribute.unitSystem.formatDefinition.formatType === 8 && attribute.vmos.length === 5 ) {
                uwPropertyService.setValue( attribute.vmos[ 3 ], attribute.vmos[ 3 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 4 ], attribute.vmos[ 4 ].isArray ? [] : '' );
            } else if( attribute.unitSystem.formatDefinition.formatType === 9 && attribute.vmos.length === 8 ) {
                uwPropertyService.setValue( attribute.vmos[ 3 ], attribute.vmos[ 3 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 4 ], attribute.vmos[ 4 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 5 ], attribute.vmos[ 5 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 6 ], attribute.vmos[ 6 ].isArray ? [] : '' );
                uwPropertyService.setValue( attribute.vmos[ 7 ], attribute.vmos[ 7 ].isArray ? [] : '' );
            }
        }
    } catch ( err ) {
        console.error( err );
    }
};

/**
 * Loops through all the block attributes and clears their values.
 * Keep the vmos[0].valueUpdated unchanged as saveClassificationObjects would automatically use attribute default value if no value/no empty value sent in SOA
 * @param {Object} - data - The viewmodel data object
 */
export let clearBlockAttributes = function( data, attribute ) {
    clearAllAttributes( data, attribute.children );
    //Clear cardinal and polymorphic instances
    if( attribute.cardinalController ) {
        getCardinalInstances( 0, attribute );
        clearAttribute( attribute.cardinalController );
    }
    if( attribute.polymorphicTypeProperty ) {
        clearAttribute( attribute.polymorphicTypeProperty );
    }
    var ctx = appCtxSvc.getCtx( 'classifyTableView' );
    if( ctx && ctx.attribute && ctx.attribute.tableView ) {
        if( attribute.prefix === ctx.attribute.prefix ) {
            classifyTblSvc.clearInstance( data, ctx.attribute, attribute );
        }
    }
};

/**
 * Loops through all the attributes and clears their values.
 * Keep the vmos[0].valueUpdated unchanged as saveClassificationObjects would automatically use attribute default value if no value/no empty value sent in SOA
 * @param {Object}  data - The viewmodel data object
 * @param {Object}  attributes - attributes
 */
export let clearAllAttributes = function( data, attributes ) {
    attributes.forEach( ( attribute ) => {
        if( attribute.type === 'Block' ) {
            clearBlockAttributes( data, attribute );
        } else {
            //clear default values for attributes if they are not of type FIXED
            var fixed1 = attribute.origAttributeInfo.options & exports.ATTRIBUTE_FIXED;
            var fixed2 = attribute.origAttributeInfo.options & exports.ATTRIBUTE_FIXED2;
            var isFixed = fixed1 !== 0 || fixed2 !== 0;
            if( !isFixed ) {
                clearAttribute( attribute );
                if( attribute.attrDefn.attrType === 'STRINGARRAY' ||
                    attribute.attrDefn.attrType === 'DOUBLEARRAY' ||
                    attribute.attrDefn.attrType === 'INTEGERARRAY' ) {
                    exports.clearAllArrayAttributes( data, attribute );
                }
            }
        }
    } );
};

/**
 * Clear the values in the array attributes and replaces it with default values
 * @param {*} data data
 * @param {Object}  attributeContent - attributes
 */
export let clearAllArrayAttributes = function( data, attributeContent ) {
    if( !data.classDefinitionMapResponse ) {
        return;
    }
    var index = _.findIndex( data.classDefinitionMapResponse[ data.selectedClass.id ].attributes, function( attribute ) {
        return attribute.attributeId === attributeContent.id;
    } );

    if( index !== -1 ) {
        var attribute = data.classDefinitionMapResponse[ data.selectedClass.id ].attributes[ index ];

        var attr = exports.getProperty( data, attribute, '', false );

        attr.setDbValue( data );
        var entry = attr.getAttributeEntry( data, attribute, null );

        if( entry ) {
            var indexValue = _.findIndex( data.attr_anno, function( attr ) {
                return attr.id === attribute.attributeId;
            } );
            if( indexValue !== -1 ) {
                if( entry.vmos !== undefined ) {
                    entry.vmos[ 0 ].displayValsModel = '';
                    entry.vmos[ 0 ].displayValues[ 0 ] = '';
                    entry.vmos[ 0 ].dbValue[ 0 ] = '';
                    entry.vmos[ 0 ].uiValue = '';
                    entry.vmos[ 0 ].valueUpdated = true;
                }
                data.attr_anno[ indexValue ] = entry;
            }
        }
    }
};

/**
 * Loops through all the attributes and clears their values.
 * Keep the vmos[0].valueUpdated unchanged as saveClassificationObjects would automatically use attribute default value if no value/no empty value sent in SOA
 * @param {Object} data - The viewmodel data object
 */
export let clearAttributes = function( data ) {
    if( data.nodeAttr ) {
        clearBlockAttributes( data, data.nodeAttr[ 0 ] );
        data.nodeAttr[ 0 ].clear = true;
    } else {
        clearAllAttributes( data, data.attr_anno );
    }
};

/**
 * Applys data to VMOS, to resolve issue where values do not load for existing class when user clicks edit class button.
 * @param {Object}  data - the viewmodel data object
 * @param {Object}  entry - the current attribute
 * @param {Object}  valuesMap - the loaded values for attributes from db.
 * @returns {Object} the modified entry
 */
export let applyComplexValues = function( data, entry, valuesMap ) {
    if( valuesMap && valuesMap.properties ) {
        for( var i = 0; i < valuesMap.properties.length; i++ ) {
            var prop = valuesMap.properties[ i ];
            if( prop.propertyName === entry.name ) {
                for( var j = 0; j < entry.vmos.length; j++ ) {
                    if( j !== 1 && j !== 2 ) {
                        var index = j;
                        if( j > 2 ) {
                            index = j - 2;
                        }
                        setValues( entry.vmos[ j ], prop.values[ index ].internalValue );
                    }
                }
            }
        }
    }
    return entry;
};

/**
 * Formats the attributes in the given array. This is used recursively in the case of property blocks.
 *
 * @param {Object} data - The viewmodel data object
 * @param {Array} attributeArray - The attribute array
 * @param {Object} valuesMap - The values map object that holds values tied to the attributes and block attributes
 * @param {Array} outputAnnoArray - The output attribute annotation array, with newly formatted annotations
 * @param {String} attributeIDPrefix attribute id prefix
 * @param {Boolean} isPanel if panel, false if fullview
 * @param {Boolean} formatArrSizeContr flag to say if we should format an array size controller, used for cardinality
 * @param {Integer} attrOptions The attrOptions object holds the several flags to decide the behavior for formatAttributeArray method
 * @param {Integer} parentBlockIndexs the indexes of the parent blocks
 * @param {Boolean} getNoValues flag to say if we should not get property values, used for cardinality
 */
export let formatAttributeArray = function( data, attributeArray, valuesMap, outputAnnoArray, attributeIDPrefix, isPanel, formatArrSizeContr, attrOptions, parentBlockIndexs, getNoValues ) {
    data.dependentAttributeIdsLength = 0;
    data.dAttributeStruct = [];

    _.forEach( attributeArray, function( attributeDefinition ) {
        var attribute = attributeDefinition;
        var attr = exports.getProperty( data, attribute, attributeIDPrefix, isPanel );
        if( data.selectedClass ) {
            if( !data.selectedClass.hasUnits && attr.unitSystem && attr.unitSystem.unitName && attr.unitSystem.unitName.length > 0 ) {
                data.selectedClass.hasUnits = true;
            }

            //See if atleast one attribute has annotations
            if( !data.selectedClass.hasAnno && attr.annotation.length > 0 ) {
                data.selectedClass.hasAnno = true;
            }
        }

        if( attr.type === 'Aspect' || attr.type === 'Block' || attr.attrReferenceClassIRDI && attr.attrReferenceClassIRDI !== '' ) {
            data.advancedData = ( attr.arrSizeAttrRef || attr.attrPolymorphicOptionsRef ) !== null;
            if( data.advancedData && isPanel ) {
                return;
            }
            var blockData;

            attr = exports.getBlock( data, attribute, attributeIDPrefix, isPanel );
            // outputAnnoArray.push( attr.blockAttributeData );
            blockData = attr.blockAttributeData;

            //if poly block, get keylov type controller, set value, and populate
            if( attr.attrPolymorphicOptionsRef ) {
                attr = exports.getPolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
                attr.setPolyAttr( data, valuesMap );
            }
            if( attr.arrSizeAttrRef ) {
                attr = exports.getCardinalBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
                attr.setInstances( data, attributeArray, valuesMap, outputAnnoArray );
            }

            outputAnnoArray.push( blockData );
            attr.addBlockChildren( data, valuesMap );
            blockData.suffix = attr.suffix; // Set suffix for node to indicate that at least one child of the node is required.
        } else if( !attr.attrIsPolyController && ( !attr.attrIsArrSizeCon || formatArrSizeContr ) ) {
            attr.setDbValue( data );
            var entry = attr.getAttributeEntry( data, attribute, attrOptions, valuesMap );

            if( entry && entry.vmos && entry.vmos.length > NON_COMPLEX_VMO_COUNT ) {
                let applicableValueMap = fetchApplicableValuesMap( valuesMap, attr );
                entry = applyComplexValues( data, entry, applicableValueMap );
            }

            if( entry ) {
                outputAnnoArray.push( entry );
            }
        }
    } );
    if( valuesMap && !getNoValues ) {
        var indexMap = parentBlockIndexs ? parentBlockIndexs : null;
        exports.processValues( data, outputAnnoArray, valuesMap, indexMap );
    }
};

/**
 * Determines if the valuesMap applies to a parent block. If so then the complex data is applied to its children.
 *
 * @param {Object} valuesMap - The values map object that holds values tied to the attributes and block attributes
 * @param {Object} attr - properties for a given attribute
 */

export let fetchApplicableValuesMap = function( valuesMap, attr ) {
    if( valuesMap && valuesMap.blockProperties ) {
        let grandparent_prefix = attr.idPrefix.split( '.' )[0].substring( 4 );
        let parent_prefix = attr.idPrefix.split( '.' )[1];
        if( !grandparent_prefix && !parent_prefix ) {
            grandparent_prefix = attr.idPrefix.split( '-' )[0].substring( 4 );
            parent_prefix = attr.idPrefix.split( '-' )[1];
        }
        if( grandparent_prefix && parent_prefix && valuesMap.blockProperties.blockDataMap ) {
            return valuesMap.blockProperties.blockDataMap[grandparent_prefix].blocks[0].blockDataMap[parent_prefix].blocks[0];
        }
    }
    return valuesMap;
};

/**
 * Formats the attributes in the given array. This is used recursively in the case of property blocks.
 * This is mainly used for Classification Manager
 *
 * @param {Object} data - The viewmodel data object
 * @param {Array} attributeArray - The attribute array
 * @param {Object} valuesMap - The values map object that holds values tied to the attributes and block attributes
 * @param {Array} outputAnnoArray - The output attribute annotation array, with newly formatted annotations
 * @param {String} attributeIDPrefix attribute id prefix
 * @param {Boolean} isPanel if panel, false if fullview
 * @param {Boolean} formatArrSizeContr flag to say if we should format an array size controller, used for cardinality
 * @param {Integer} attrOptions The attrOptions object holds the several flags to decide the behavior for formatAttributeArray method
 * @param {Integer} parentBlockIndexs the indexes of the parent blocks
 * @param {Boolean} getNoValues flag to say if we should not get property values, used for cardinality
 */
export let formatAttributeArrayForAdmin = function( data, attributeArray, valuesMap, outputAnnoArray, attributeIDPrefix, isPanel, formatArrSizeContr, attrOptions, parentBlockIndexs, getNoValues ) {
    data.dependentAttributeIdsLength = 0;
    data.dAttributeStruct = [];

    _.forEach( attributeArray, function( attributeDefinition ) {
        var attribute = attributeDefinition;
        var attr = exports.getProperty( data, attribute, attributeIDPrefix, isPanel );

        if( attr.type === 'Aspect' || attr.type === 'Block' || attr.attrReferenceClassIRDI && attr.attrReferenceClassIRDI !== '' ) {
            data.advancedData = ( attr.arrSizeAttrRef || attr.attrPolymorphicOptionsRef ) !== null;
            if( data.advancedData && isPanel ) {
                return;
            }
            var blockData;
            attr = exports.getBlock( data, attribute, attributeIDPrefix, isPanel );
            blockData = attr.blockAttributeData;

            //cardinal block
            if( attr.arrSizeAttrRef && !attr.attrPolymorphicOptionsRef ) {
                attr = exports.getCardinalBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
                //attr.setInstances( data, attributeArray, valuesMap, outputAnnoArray );
                blockData.pureCardinalBlock = true;
                if( attr.blockDefinition ) {
                    exports.formatAttributeArrayForAdmin( data, attr.blockDefinition.attributes, valuesMap,
                        blockData.children, attr.idPrefix + attr.id + '.', attr.isPanel, false, null, blockData.cardIndex, true );
                }
            } //if poly block along with cardinal block, get keylov type controller, set value, and populate
            else if( attr.arrSizeAttrRef && attr.attrPolymorphicOptionsRef ) {
                //cardinal block
                attr = exports.getCardinalBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
                attr.setInstances( data, attributeArray, valuesMap, outputAnnoArray );
                attr = exports.getPolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
                attr.setPolyAttrForAdmin( data, valuesMap, attribute );

                blockData.visible = true;
                blockData.expanded = true;
                blockData.hasBlockChildren = false;

                //Now, create plain polymorphic block
                var temp = exports.getBlock( data, attribute, attributeIDPrefix, isPanel );
                var polyBlock = temp.blockAttributeData;
                temp = exports.getPolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, polyBlock );
                temp.setPolyAttrForAdmin( data, valuesMap, attribute );

                polyBlock.name = polyBlock.name + ': ' + polyBlock.polymorphicTypeProperty.name;
                polyBlock.children = [];
                polyBlock.visible = true;
                polyBlock.expanded = false;
                polyBlock.hasBlockChildren = true;

                //get keylov entry
                //for each keylov entry
                _.forEach( polyBlock.polymorphicTypeProperty.vmos[ 0 ].lovApi.klEntries, function( klentry ) {
                    //Block creation : Its a normal block
                    var keyBlock = exports.getBlock( data, attribute, attributeIDPrefix, isPanel );
                    var keyBlockData = keyBlock.blockAttributeData;
                    keyBlock = exports.getPolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, keyBlockData );
                    keyBlock.setPolyAttrForAdmin( data, valuesMap, attribute );
                    keyBlockData.name = keyBlockData.name + ': ' + klentry.propDisplayValue;
                    keyBlockData.children = [];
                    keyBlockData.visible = true;
                    keyBlockData.expanded = false;
                    keyBlockData.hasBlockChildren = false;
                    keyBlockData.blockEntry = klentry.propInternalValue;

                    var attributesDefinitions = data.blockDefinitionMapResponse[ klentry.propInternalValue ].attributes;
                    var children = [];
                    exports.formatAttributeArrayForAdmin( data, attributesDefinitions, null, children, attributeIDPrefix, false, false, null, keyBlockData.cardIndex, false );
                    var childBlock = _.filter( children, function( child ) {
                        return child.type === 'Block';
                    } );
                    exports.hasBlockChildren( childBlock );
                    keyBlockData.children = children;
                    blockData.children.push( keyBlockData );
                } );

               // blockData.children.push( polyBlock );
            } else if( !attr.arrSizeAttrRef && attr.attrPolymorphicOptionsRef ) {
                attr = exports.getPolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
                attr.setPolyAttrForAdmin( data, valuesMap, attribute );
                _.forEach( blockData.polymorphicTypeProperty.vmos[ 0 ].lovApi.klEntries, function( klentry ) {
                    //Name from the list
                    var prop = klentry.propInternalValue;

                    //Block creation : Its a normal block
                    var keyBlock = exports.getBlock( data, attribute, attributeIDPrefix, isPanel );
                    var keyBlockData = keyBlock.blockAttributeData;
                    keyBlock = exports.getPolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, keyBlockData );
                    keyBlock.setPolyAttrForAdmin( data, valuesMap, attribute );
                    keyBlockData.name = keyBlockData.name + ': ' + klentry.propDisplayValue;
                    keyBlockData.children = [];
                    keyBlockData.visible = true;
                    var attributesDefinitions = data.blockDefinitionMapResponse[ klentry.propInternalValue ].attributes;
                    var children = [];
                    exports.formatAttributeArrayForAdmin( data, attributesDefinitions, null, children, attributeIDPrefix, false, false, null, keyBlockData.cardIndex, false );
                    var childBlock = _.filter( children, function( child ) {
                        return child.type === 'Block';
                    } );
                    exports.hasBlockChildren( childBlock );
                    keyBlockData.children = children;
                    blockData.children.push( keyBlockData );
                } );
            } else if( !attr.arrSizeAttrRef && !attr.attrPolymorphicOptionsRef ) {
                if( attr.blockDefinition ) {
                    exports.formatAttributeArrayForAdmin( data, attr.blockDefinition.attributes, valuesMap,
                        blockData.children, attr.idPrefix + attr.id + '.', attr.isPanel, false, null, blockData.cardIndex, true );
                }
            }

            outputAnnoArray.push( blockData );
            attr.setDbValue( data );
            var entry = attr.getAttributeEntry( data, attribute, attrOptions );
            if ( entry && entry.vmos && entry.vmos.length > NON_COMPLEX_VMO_COUNT ) {
                entry = applyComplexValues( data, entry, valuesMap );
            }
            if( entry ) {
                outputAnnoArray.push( entry );
            }
        } else if( !attr.attrIsArrSizeCon || formatArrSizeContr ) {
            attr.setDbValue( data );
            var entry = attr.getAttributeEntry( data, attribute, attrOptions );
            if( entry && entry.vmos && entry.vmos.length > NON_COMPLEX_VMO_COUNT ) {
                entry = applyComplexValues( data, entry, valuesMap );
            }
            if( entry ) {
                outputAnnoArray.push( entry );
            }
        }
    } );
    if( valuesMap && !getNoValues ) {
        var indexMap = parentBlockIndexs ? parentBlockIndexs : null;
        exports.processValues( data, outputAnnoArray, valuesMap, indexMap );
    }
};

/* Adds attributes based on polymorphic selection, called from directive when keylov value changes
 *
 * @param {Object} data - view model data
 * @param {Object} valuesMap - the valuesMap object, used for load
 * @param {Object} owningBlock - the block that owns the polymorphic type we are reacting to. Used for load, empty when creating for first time
 *
 */
export let selectLOV = function( data, valuesMap, owningBlock ) {
    var owningAttribute = null;
    var prop = null;
    var attributePrefix = '';
    var valuesToUse = valuesMap;
    if( !owningBlock ) {
        owningAttribute = data.eventData.owningAttribute;
        prop = data.eventData.property[ 0 ];
        var vmObject = owningAttribute.polymorphicTypeProperty.vmos[ 0 ];
        var ind = _.findIndex( vmObject.lovApi.klEntries, function( entry ) {
            return prop.dbValue === entry.propDisplayValue || prop.dbValue === entry.propInternalValue;
        } );
        if( ind !== -1 ) {
            owningAttribute.blockId = prop.dbValue;
        }
        //Create value map of current children and set then use it as our value map when switching values
        var originalValuesMap = classifyUtils.getClsUtilValueMap( data, owningAttribute.id, null, null, owningAttribute.children );
        valuesToUse = originalValuesMap;
        if( valuesToUse.properties.length > 0 ) {
            owningAttribute.originalValuesMap = valuesToUse;
        } else {
            valuesToUse = owningAttribute.originalValuesMap ? owningAttribute.originalValuesMap : valuesToUse;
        }
    } else if( owningBlock && valuesMap ) {
        owningAttribute = owningBlock;
        prop = owningAttribute.polymorphicTypeProperty.vmos[ 0 ];
        attributePrefix = owningAttribute.prefix + owningAttribute.id + '.';
    }
    if( _.isArray( prop.dbValue ) && !_.isEmpty( prop.dbValue ) ) {
        //Grab first value, as this should not be an array for polytype
        prop.dbValue = prop.dbValue[ 0 ];
    }

    if( prop.dbValue ) {
        var keys = Object.keys( data.blockDefinitionMapResponse );
        var len = keys.length;
        if( prop.dbValue !== data.i18n.select && ( prop.dbValue <= len || data.blockDefinitionMapResponse.hasOwnProperty( prop.dbValue ) ) ) {
            if( data.blockDefinitionMapResponse[ prop.dbValue ] ) {
                // Moved hasBlockChildren setting because it was causing property groups to not display children, as they were not part of the block definition map response.
                owningAttribute.hasBlockChildren = false;
                owningAttribute.children = [];
                var attributesDefinitions = data.blockDefinitionMapResponse[ prop.dbValue ].attributes;
                var children = [];
                exports.formatAttributeArray( data, attributesDefinitions, valuesToUse, children, attributePrefix, false, false, null, owningAttribute.cardIndex, false );
                var childBlock = _.filter( children, function( child ) {
                    return child.type === 'Block';
                } );
                exports.hasBlockChildren( childBlock );
                owningAttribute.children = children;
            }
        }
    } else if( !data.assignVisible && data.panelMode === 1 ) {
        if( !prop.propertyRequiredText ) {
            prop.uiValue = data.i18n.select;
        }
        owningAttribute.blockId = '';
        owningAttribute.children = [];
        uwPropertyService.setIsEditable( prop, true );
    } else {
        owningAttribute.hasBlockChildren = false;
        owningAttribute.blockId = '';
        owningAttribute.children = [];
    }
};

/**
 *   @param {Object} propertyGroup property group
 */
export let hasBlockChildren = function( propertyGroup ) {
    if( propertyGroup ) {
        if( propertyGroup.children && !propertyGroup.cardinalController ) {
            _.forEach( propertyGroup.children, function( child ) {
                if( child.type === 'Block' ) {
                    propertyGroup.hasBlockChildren = true;
                    exports.hasBlockChildren( child );
                }
            } );
        } else if( propertyGroup.instances && propertyGroup.instances.length !== 0 && propertyGroup.cardinalController ) {
            _.forEach( propertyGroup.instances, function( instance ) {
                propertyGroup.hasBlockChildren = true;
                exports.hasBlockChildren( instance );
            } );
        } else if( propertyGroup.children && propertyGroup.cardinalController && propertyGroup.polymorphicTypeProperty &&
            appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.classificationManagerLocation' ) {
            _.forEach( propertyGroup.children, function( child ) {
                propertyGroup.hasBlockChildren = true;
                exports.hasBlockChildren( child );
            } );
        } else if( propertyGroup.children && propertyGroup.cardinalController && !propertyGroup.polymorphicTypeProperty &&
            appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.classificationManagerLocation' ) {
            _.forEach( propertyGroup.children, function( child ) {
                propertyGroup.hasBlockChildren = true;
                exports.hasBlockChildren( child );
            } );
        } else {
            propertyGroup.hasBlockChildren = false;
        }
    }
};

/**
 * To get classified workspace object id
 * @param {response} response the declarative viewmodel data
 * @return {String} classifed object id
 */
export let getClassifiedWorkspaceObjectID = function( response ) {
    var modelObjects = response.ServiceData.modelObjects;
    var classifiedObjectId;
    for( var key in modelObjects ) {
        var modelObject = modelObjects[ key ];
        if( modelObject && modelObject.props ) {
            if( modelObject.props.IMAN_classification || modelObject.props.Cls0ClassifiedBy ) {
                if( modelObject && modelObject.props.object_string && modelObject.props.object_string.dbValues[ 0 ] ) {
                    classifiedObjectId = modelObject.props.object_string.dbValues[ 0 ];
                    break;
                }
            }
        }
    }
    return classifiedObjectId;
};

/**
 * Defines attribute
 * @param {Object} data view model
 * @param {Object} attribute attribute
 *  @param {String} attributeIDPrefix prefix
 * @param {boolean} isPanel true if panel, false otherwise
 */
function Attribute( data, attribute, attributeIDPrefix, isPanel ) {
    this.id = attribute.attributeId;
    this.name = exports.getPropertyValue( attribute.attributeProperties, exports.UNCT_CLASS_ATTRIBUTE_NAME );
    this.type = exports.getPropertyValue( attribute.attributeProperties, exports.UNCT_ATTRIBUTE_TYPE );
    this.attrReferenceClassIRDI = exports.getPropertyValue( attribute.attributeProperties,
        exports.UNCT_REFERENCED_CLASS_IRDI );
    this.attrIsArrSizeCon = exports.getPropertyValue( attribute.attributeProperties,
        exports.UNCT_IS_ARRAY_SIZE_CONTROLLER );
    this.arrSizeAttrRef = exports.getPropertyValue( attribute.attributeProperties,
        exports.UNCT_ARRAY_SIZE_ATTRIBUTE_REFERENCE );
    this.attrIsPolyController = exports.getPropertyValue( attribute.attributeProperties,
        exports.UNCT_IS_POLYMORPHISM_CONTROLLER );
    this.attrPolymorphicOptionsRef = exports.getPolyBlockReference( data, this.attrReferenceClassIRDI );

    var isInterDependentKLAttribute = exports.getPropertyValue( attribute.attributeProperties, exports.UNCT_DEPENDENCY_CONFIGURATION );
    this.isInterDependentKLAttribute = Boolean( isInterDependentKLAttribute );

    this.isRequiredCST = exports.getPropertyValue( attribute.attributeProperties, exports.UNCT_ATTRIBUTE_IS_REQUIRED ); //annotation for display alongside with attribute value.
    this.annotation = exports.getPropertyValue( attribute.attributeProperties, exports.UNCT_ATTRIBUTE_ANNOTATION );

    this.metricKeyLovIrdi = exports.getPropertyValue( attribute.attributeProperties, exports.UNCT_METRIC_KEYLOV_IRDI );
    this.nonMetricKeyLovIrdi = exports.getPropertyValue( attribute.attributeProperties, exports.UNCT_NONMETRIC_KEYLOV_IRDI );

    this.unitSystem = data.unitSystem.dbValue ? attribute.metricFormat : attribute.nonMetricFormat;
    this.displayName = this.annotation ? this.name + ' [' + this.annotation + ']' : this.name;
    this.attrType = this.unitSystem.formatDefinition.formatType === -1 ? 'STRING' :
        classifyUtils.typeEnumMap[ this.unitSystem.formatDefinition.formatType ];
    //arraySize -1 indicates unlimited
    this.isArray = attribute.arraySize > 0 || attribute.arraySize === -1;
    this.arraySize = attribute.arraySize;
    if ( attribute.maxInstances ) {
        this.maxInstances = attribute.maxInstances;
    }

    if( this.isArray ) {
        this.attrType += 'ARRAY';
    }

    this.isLOV = classifyLOVService.isKeyLov( data, attribute, this.unitSystem, this.metricKeyLovIrdi, this.nonMetricKeyLovIrdi );
    if( this.isLOV ) {
        this.keyLOVID = classifyLOVService.getKeyLOVID( data, attribute, this, data.unitSystem.dbValue );
    }
    if( this.attrType === 'BOOLEAN' && this.isLOV ) {
        this.attrType = 'STRING';
        this.unitSystem.formatDefinition.formatType = -1;
    }

    this.isPanel = isPanel;
    this.idPrefix = attributeIDPrefix;
    this.origAttrInfo = attribute;

//get localization
//Internal Value;Display Value;Result
//Edit;True;Show L10N button and allow user to edit values.
//Edit;False;With the current implmenetation this will NEVER happen - Invalid
//ReadOnly;True;Show L10N button but not allow user to edit values or add new ones
//ReadOnly;False;Do not show the L10N button

    if( data.clsObjectDefs && data.clsObjectDefs[1] ) {
        var clsObjectDefs = data.clsObjectDefs[1][0]; //clsObjects;
        if( clsObjectDefs.clsObjects && clsObjectDefs.clsObjects[0].properties &&
            clsObjectDefs.clsObjects[0].properties[0].propertyId === 'LOCALIZATION_ACCESS' ) {
            var localizationAccess =  clsObjectDefs.clsObjects[0].properties[0];

            if( attribute.options & exports.ATTRIBUTE_LOCALIZATION && localizationAccess.values[0].displayValue === 'true' ) {
                this.isLocalizable = true;
                var clsTab = appCtxSvc.getCtx( 'clsTab' );
                clsTab.editLocalization = localizationAccess.values[0].internalValue === 'Edit';
                appCtxSvc.registerCtx( 'editLocalization', clsTab );
            }
        }
    }
}

/**
 * sets dbValue
 * @param {Object} data view model
 */
Attribute.prototype.setDbValue = function( data, numberToString ) {
    this.dbValue = null;
    // if we have a default value for the unitsystem and are in create or editClass, set dbValue as default.
    // If not, then keep as null
    if( data.panelMode === 0 || data.editClassInProgress || data.panelMode === 1 && ( _.isPlainObject( data.selectedCell ) &&
            _.isPlainObject( data.selectedClass ) && data.selectedCell.cellInternalHeader1 !== data.selectedClass.id ) ) {
        if( this.unitSystem.defaultValue && this.unitSystem.defaultValue.length > 0 ) {
            if( _.isArray( this.unitSystem.defaultValue ) ) {
                this.dbValue = classifyUtils.convertValue( this.unitSystem.defaultValue, this.unitSystem, numberToString );
            } else {
                this.dbValue = [];
                this.dbValue.push( classifyUtils.convertValue( this.unitSystem.defaultValue, this.unitSystem, numberToString ) );
            }
        }
    }
};

/**
 * Clears dbValue
 * @param {Object} data view model
 */
Attribute.prototype.clearDbValue = function() {
    this.dbValue = null;
    this.displayValue = null;
};

/**
 * sets dbValue
 * @param {Object} data view model
 */
Attribute.prototype.setDisplayName = function() {
    this.displayName = this.name;
};
/**
 * Return attribute entry with base parameters
 * @returns {Object} attribute entry
 */
Attribute.prototype.getAttrEntry = function() {
    return {
        //The attribute Id, as abstracted from the class descriptor
        id: this.id,
        isCardinalControl: this.attrIsArrSizeCon,
        editable: true,
        name: this.name,
        //Used for reformatting view props when needed
        origAttributeInfo: this.origAttrInfo,
        prefix: this.idPrefix,
        type: this.type,
        unitSystem: this.unitSystem,
        visible: this.isPanel
    };
};

/**
 * Returns attribute entry with vmos set
 * Defines property
 * @param {Object} data view model
 * @param {Object} attribute attribute
 * @param {Integer} attrOptions The attrOptions object holds the several flags to decide the behavior for formatAttributeArray method
 * @param {Object}  valuesMap ValuesMap Object
 * @returns {Object} attribute entry
 *
 */
Attribute.prototype.getAttributeEntry = function( data, attribute, attrOptions, valuesMap ) {
    var vmoArray = exports.formatViewProps( data, attribute, this, null, attrOptions, null, valuesMap );
    if( vmoArray === exports.ATTRIBUTE_REFERENCE ) {
        return;
    }
    // We need to set this if we got a default value, otherwise save wont pick it up
    vmoArray[ 0 ].valueUpdated = this.unitSystem.defaultValue && ( data.panelMode === 0 || data.editClassInProgress ) ?
        true : vmoArray[ 0 ].valueUpdated;
    var entry = this.getAttrEntry( attribute );
    entry.vmos = vmoArray;
    entry.attrDefn = this;
    return entry;
};

Attribute.prototype.setCommonProps = function( data ) {
    var propCount = 0;
    if( data && data.selectedCell.cellExtendedProperties && data.selectedCell.cellExtendedProperties.length ) {
        propCount = data.selectedCell.cellExtendedProperties.length;
    }
    if( propCount > 0 ) {
        var dbValue = null;
        var unitSystem = this.unitSystem;
        for( var ix = 0; ix < propCount; ix++ ) {
            if( this.name === data.selectedCell.cellExtendedProperties[ ix ].key ) {
                dbValue = [];
                if( data.selectedCell.cellExtendedProperties[ ix ].value !== '' ) {
                    var values = data.selectedCell.cellExtendedProperties[ ix ].values;
                    _.forEach( values, function( value1 ) {
                        var formatType = unitSystem.formatDefinition.formatType;
                        if( formatType === 1 || formatType === 2 ) {
                            //split display name and unit system
                            var displayValueAndUnitName = classifyUtils.getSeparatedDispValAndUnitNameForNumericAttr( value1.displayValue, unitSystem );
                            value1.internalValue = displayValueAndUnitName.displayValue;
                        }
                        dbValue.push( classifyUtils.convertValue( value1.internalValue, unitSystem, true ) );
                    } );
                }
                break;
            }
        }
        this.dbValue = dbValue;
    }
};

Attribute.prototype.setDateValue = function( dbValue, displayValue ) {
    dbValue = dbValue ? dbValue : this.dbValue;
    var updValue = formatDateAndDateArray( this.unitSystem, this.id, this.idPrefix, this.attrType, dbValue, displayValue );
    this.dbValue = updValue.dbValue;
    this.displayValue = updValue.displayValue;
};

Attribute.prototype.setLOVValue = function( data, attribute, dbValue, displayValue, valuesMap ) {
    var dbValues = [];
    dbValue = dbValue ? dbValue : this.dbValue;
    dbValues.push( dbValue );
    var keyLOVDef;
    var objValue = Array.isArray( dbValue ) ? dbValue : dbValues;
    if( data.keyLOVDefinitionMapResponse && this.isInterDependentKLAttribute !== true ) {
        this.keyLOVID = classifyLOVService.getKeyLOVID( data, attribute, this, data.unitSystem.dbValue );
        keyLOVDef = data.keyLOVDefinitionMapResponse[ this.keyLOVID ];
        displayValue = [];

        _.forEach( objValue, function( dbVal ) {
            _.forEach( keyLOVDef.keyLOVEntries, function( entry ) {
                if( entry.keyLOVkey === dbVal ) {
                    displayValue.push( keyLOVDef.keyLOVOptions === 1 ? entry.keyLOVValue :
                        entry.keyLOVkey + ' ' + entry.keyLOVValue );
                }
            } );
        } );
    } else {
        keyLOVDef = attribute.attributeKeyLOVDef;
        displayValue = [];
        _.forEach( objValue, function( dbVal ) {
            _.forEach( keyLOVDef.keyLOVEntries, function( entry ) {
                if( entry.keyLOVkey === dbVal ) {
                    displayValue.push( keyLOVDef.keyLOVOptions === 1 ? entry.keyLOVValue :
                        entry.keyLOVkey + ' ' + entry.keyLOVValue );
                }
            } );
        } );
    }
    this.dbValue = dbValue;
    //if dbvalue not found in klentries, get displayvalue from response. This may happen if keylov entry is deleted
    if ( dbValue && displayValue.length === 0 ) {
        _.forEach( valuesMap.properties, function( value ) {
            if( value.propertyId === attribute.attributeId && value.values.length > 0 ) {
                displayValue = value.values[0].displayValue;
            }
        } );
    }
    this.displayValue = displayValue;
};

Attribute.prototype.setBooleanValue = function( dbValue, displayValue ) {
    dbValue = dbValue ? dbValue : this.dbValue;
    if( dbValue && dbValue.length > 0  && dbValue[0] !== '' ) {
        var tempVal = dbValue[ 0 ] === true ? [ 'true' ] : [ 'false' ];
        displayValue = tempVal;
    }
    this.dbValue = dbValue;
    this.displayValue = displayValue;
};

Attribute.prototype.setIntegerValue = function( dbValue, displayValue ) {
    dbValue = dbValue ? dbValue : this.dbValue;
    if( dbValue && dbValue.length === 1 ) {
        dbValue = classifyUtils.isNullOrEmpty( dbValue[ 0 ] ) ? null : dbValue;
        displayValue = dbValue;
    }
    this.dbValue = dbValue;
    this.displayValue = displayValue;
};

Attribute.prototype.setDefaultValue = function( dbValue, displayValue ) {
    dbValue = dbValue ? dbValue : this.dbValue;
    displayValue = _.clone( dbValue, true );
    this.dbValue = dbValue;
    this.displayValue = displayValue;
};

/**
 * Sets values for fixed type attributes
 *
 * @param {Object} data - Declarative View Model
 * @param {Object} attribute - Attribute from
 */
Attribute.prototype.setFixedValues = function( data, attribute ) {
    if( data.panelMode === 0 || data.editClassInProgress || data.panelMode === 1 &&
        ( _.isPlainObject( data.selectedCell ) && _.isPlainObject( data.selectedClass ) && data.selectedCell.cellInternalHeader1 !== data.selectedClass.id ) ) {
        this.setDbValue( data, true );
        // For date attributes, special handling is required.
        // 1. Get the date's format from unitSystem.format.formatLength and clsDateFormats array
        // 2. Convert the given date from above format to the widget acceptable format ( DD-MMM-YYYYTHH:MM:SS(+/-)XX:YY,
        //    e.g. 2017-03-17T05:00:00-04:00)
        const dbValue = null;
        const displayValue = null;
        if( this.attrType === 'DATE' || this.attrType === 'DATEARRAY' ) {
            this.setDateValue( dbValue, displayValue );
        } else if( this.isLOV ) {
            this.setLOVValue( data, attribute, dbValue, displayValue );
        } else if( this.attrType === 'BOOLEAN' ) {
            this.setBooleanValue( dbValue, displayValue );
        } else {
            this.setDefaultValue( dbValue, displayValue );
        }
    }
};

Attribute.prototype.getDbValueForCreateViewModelProperty = function() {
    return this.attrType !== 'DATE' && !classifyUtils.isNullOrEmpty( this.dbValue ) && !_.isArray( this.dbValue ) ? [ this.dbValue ] : this.dbValue;
};

Attribute.prototype.getDisplayValueForCreateViewModelProperty = function() {
    return !classifyUtils.isNullOrEmpty( this.displayValue ) && !_.isArray( this.displayValue ) ? [ this.displayValue ] : this.displayValue;
};

Attribute.prototype.updateViewPropForUnitSystem = function( data, attribute, unitSystem, isCstAttr ) {
    attribute.attrDefn.unitSystem = unitSystem;
    attribute.unitSystem = unitSystem;
    var vmo = attribute.vmos[ 0 ];
    //If constant (fixed) value, the attribute is not editable. Constant is to be checked according to unit system.
    if( data.unitSystem.dbValue ? ( this.origAttrInfo.options & exports.ATTRIBUTE_FIXED ) !== 0 : ( this.origAttrInfo.options & exports.ATTRIBUTE_FIXED2 ) !== 0 ) {
        this.setFixedValues( data, attribute );
        uwPropertyService.setIsEditable( vmo, false );
    } else {
        // Can be editable if in view mode and assign mode
        uwPropertyService.setIsEditable( vmo, data.panelMode !== -1 ? !data.assignVisible : false );
        // We do not need to use default values if it is a copy classification case
        if( typeof data.localPropertyValues !== 'object' ) {
            vmo.dbValue = this.getDbValueForCreateViewModelProperty();
            vmo.displayValue = this.getDisplayValueForCreateViewModelProperty();
            vmo.displayValues = vmo.displayValue;
            //  handling default date format
            if( unitSystem && unitSystem.defaultValue !== '' ) {
                if( vmo.type === classifyUtils.DATE || vmo.type === classifyUtils.DATE_ARRAY ) {
                    if( vmo.dateApi ) {
                        getDateConvertValuesRequest( vmo, unitSystem, isCstAttr );
                    }
                }
            }
        }
    }
    vmo.minMaxMsg = attribute.attrDefn.getMinMaxRange();
    vmo.labelProps = attribute.attrDefn.getLabelProps();
};

// eslint-disable-next-line complexity
Attribute.prototype.createViewPropType = function( data, attribute, attrOptions ) {
    //Figure out whether we need to make fields editable
    var editable = data.panelMode !== -1 ? !data.assignVisible : false;
    //If constant (fixed) value, the attribute is not editable. Constant is to be checked according to unit system.
    if( data.unitSystem.dbValue ? ( attribute.options & exports.ATTRIBUTE_FIXED ) !== 0 : ( attribute.options & exports.ATTRIBUTE_FIXED2 ) !== 0 ) {
        this.setFixedValues( data, attribute );
        editable = false;
    }
    // Since createViewModelProperty always expects an array, sending the dbValue and displayValue as an array.
    var dbValue = this.getDbValueForCreateViewModelProperty();
    var displayValue = this.getDisplayValueForCreateViewModelProperty();

    var viewProp = uwPropertyService.createViewModelProperty( this.id, this.displayName, this.attrType, dbValue, displayValue );
    viewProp.attributeInfo = attribute.attributeProperties;
    viewProp.propertyLabelDisplay = 'PROPERTY_LABEL_AT_LEFT';
    if( this.attrType === 'BOOLEAN' ) {
        if( !data.assignVisible && data.panelMode !== -1 ) {
            viewProp.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';
            if( data.assignVisible ) {
                viewProp.editable = false;
                viewProp.isPropertyModifiable = false;
            }
        }

        //If boolean, reset dbValue to a non-array value. Required for displaying attribute correctly
        if( viewProp.dbValue && viewProp.dbValue.length > 0 ) {
            viewProp.dbValue = viewProp.dbValue[ 0 ];
        }
    }
    uwPropertyService.setHasLov( viewProp, this.isLOV );

    if( attrOptions !== 2 ) {
        /**
         * Special case for classification location, as
         *      1. array properties will still be shown as single valued entries
         *      2. required properties will be shown as normal properties
         **/
        uwPropertyService.setIsArray( viewProp, this.isArray );
        uwPropertyService.setIsRequired( viewProp, ( attribute.options & exports.ATTRIBUTE_MANDATORY ) !== 0 || this.isRequiredCST === 'true' );
    }
    uwPropertyService.setIsRichText( viewProp, false );
    uwPropertyService.setIsEnabled( viewProp, true );
    uwPropertyService.setIsEditable( viewProp, editable );
    uwPropertyService.setIsNull( viewProp, false );
    uwPropertyService.setError( viewProp, '' );
    uwPropertyService.setNumberOfCharacters( viewProp, -1 );
    uwPropertyService.setNumberOfLines( viewProp, -1 );
    uwPropertyService.setArrayLength( viewProp, attribute.arraySize );
    if( !this.isLOV ) {
        var length = this.unitSystem.formatDefinition.formatLength;
        if ( length === 99 ) {
            if ( this.attrType === 'STRING' ) {
                length =  256;
            } else if ( this.attrType === 'STRINGARRAY' ) {
                length =  256 / attribute.arraySize - 3;
                uwPropertyService.setNumberOfLines( viewProp, 3 );
            }
        }
        uwPropertyService.setLength( viewProp, length );
    }
    uwPropertyService.setDataType( viewProp, this.attrType );
    if( this.isArray ) {
        uwPropertyService.setMaxRowCount( viewProp, attribute.arraySize );
        // While editing the array, CF code expects this to be set.
        viewProp.value = _.clone( this.dbValue, true );
    }

    viewProp.attributeId = attribute.attributeId;

    if( this.unitSystem.formatDefinition.formatType === 0 ) {
        viewProp.inputType = 'text';
    }

    viewProp.metricFormat = attribute.metricFormat;
    viewProp.nonMetricFormat = attribute.nonMetricFormat;
    if( this.isLOV ) {
        var keyLOVDefinition = null;

        // The KeyLOV here could be a regular keyLOV OR an interdependent KeyLOV.
        if( this.isInterDependentKLAttribute ) {
            //below is essential
            data.dependentAttributeIdsLength += 1;

            //For now, grab the attribute array from data
            var attributeArray = null;
            if( data.pasteIsClicked === true ) {
                attributeArray = data.classDefinitionMapResponse[ appCtxSvc
                    .getCtx( 'IcoReplica.vmo.cellInternalHeader1' ) ].attributes;
            } else {
                attributeArray = data.classDefinitionMapResponse[ data.selectedClass.id ].attributes;
            }

            var dependentAttributeIds = exports.getDependentKeyLOVAttributes( attributeArray );
            var attrdepAttribute = exports.getPropertyValue( attribute.attributeProperties,
                exports.UNCT_DEPENDENCY_ATTRIBUTE );
            keyLOVDefinition = attribute.attributeKeyLOVDef;

            // The dependent attributes second level onwards have entries for parent dependencies as well
            // We need to remove those (keys such as #>, #< etc...).
            if( attrdepAttribute && attrdepAttribute !== '' ) {
                var localKeyLOVdefinition = keyLOVDefinition;
                var localKeyLovEntries = [];
                _.forEach( keyLOVDefinition.keyLOVEntries, function( entry ) {
                    var subStr = entry.keyLOVkey.substring( 0, 1 );
                    var isValueDeprecated = entry.isDeprecated;
                    if( subStr !== classifyUtils.KL_HASH_STR && isValueDeprecated === false ) {
                        localKeyLovEntries.push( entry );
                    }
                } );
                localKeyLOVdefinition.keyLOVEntries = localKeyLovEntries;
                keyLOVDefinition = localKeyLOVdefinition;
            }

            // Here, we are passing the viewProp as well because we need to have the info about dependent attributes later during selections.
            // The viewProp is saved in a 'global' map there.

            //If paste is active then processCellSelection is not happened.
            viewProp.lovApi = null;
            if( data.pasteIsClicked === true ) {
                //We are parsing the attributeID as Int for now to work with current SOA, will need to be changed in future
                viewProp.lovApi = classifyLOVService.getLOVApi( data, appCtxSvc
                    .getCtx( 'IcoReplica.vmo.cellInternalHeader1' ), classifyLOVService
                    .getAttributeIntegerFromString( attribute.attributeId ), keyLOVDefinition,
                    true, dependentAttributeIds, viewProp );
            } else {
                //We are parsing the attributeID as Int for now to work with current SOA, will need to be changed in future
                viewProp.lovApi = classifyLOVService.getLOVApi( data, data.selectedClass.id,
                    classifyLOVService.getAttributeIntegerFromString( attribute.attributeId ),
                    keyLOVDefinition, true, dependentAttributeIds, viewProp );
            }
        } else {
            keyLOVDefinition = data.keyLOVDefinitionMapResponse ? data.keyLOVDefinitionMapResponse[ this.keyLOVID ] : {};
            var locKeyLOVdefinition = keyLOVDefinition;
            var locKeyLovEntries = [];
            _.forEach( keyLOVDefinition.keyLOVEntries, function( entry ) {
                var subStr = entry.keyLOVkey.substring( 0, 2 );
                var isValueDeprecated = entry.isDeprecated;
                if( subStr !== classifyUtils.KL_SEPARATOR && isValueDeprecated === false ) {
                    locKeyLovEntries.push( entry );
                }
            } );
            locKeyLOVdefinition.keyLOVEntries = locKeyLovEntries;
            keyLOVDefinition = locKeyLOVdefinition;
            if( data.pasteIsClicked === true ) {
                viewProp.lovApi = classifyLOVService.getLOVApi( data, appCtxSvc
                    .getCtx( 'IcoReplica.vmo.cellInternalHeader1' ), attribute.attributeId,
                    keyLOVDefinition );
            } else {
                viewProp.lovApi = classifyLOVService.getLOVApi( data, data.selectedClass.id,
                    attribute.attributeId, keyLOVDefinition );
            }
        }
    }
    viewProp.minMaxMsg = this.getMinMaxRange();
    viewProp.labelProps = this.getLabelProps();
    uwPropertyService.setIsLocalizable( viewProp, this.isLocalizable );
    if( this.isLocalizable ) {
        viewProp.uwAnchor = 'classifyAwMultiLanguageProperty';
    }
    return viewProp;
};

Attribute.prototype.createViewPropAnnotation = function() {
    var annotation = this.annotation ? '[' + this.annotation + ']' : this.annotation;
    return uwPropertyService.createViewModelProperty( annotation, annotation, this.attrType,
        this.dbValue, this.displayValue );
};

Attribute.prototype.createViewPropUnitSystem = function() {
    var viewProp = uwPropertyService.createViewModelProperty( this.unitSystem.unitName, this.unitSystem.unitName, this.attrType,
        this.dbValue, this.displayValue );
    if( viewProp.propertyName && viewProp.propertyName.length > 0 ) {
        this.unitSystem.startValue = this.unitSystem.unitName;
        viewProp.hasLov = true;
        viewProp.unitType = true;
        viewProp.type = 'STRING';
        viewProp.lovApi = [];
        viewProp.unitProp = this.name;
        viewProp.unitMap = this.unitMap;
        viewProp.display = [];
        viewProp.display.propertyDisplayName = this.unitSystem.unitName;
        var units = [];
        var names = [];
        var unitDefs = [];
        if( this.unitMap ) {
            var temp = viewProp.propertyName;
            var measure = _.filter( this.unitMap, function( child ) {
                for( var u = 0; u < child.length; u++ ) {
                    if( child[ u ].displayName === temp ) {
                        return child;
                    }
                }
            } );
            if( measure !== undefined && measure.length > 0 ) {
                var item = measure[ 0 ];
                if( item !== undefined ) {
                    for( var x = 0; x < item.length; x++ ) {
                        names.push( item[ x ].displayName );
                        unitDefs.push( item[ x ] );
                        var newUnit = {
                            children: {},
                            hasChildren: false,
                            propDisplayDescription: '',
                            propDisplayValue: item[ x ].displayName,
                            propertyDisplayName: item[ x ].displayName,
                            measure: measure.measure,
                            unitID: item[ x ].unitID,
                            system: item[ x ].systemOfMeasurement,
                            selected: false,
                            listElementDisplayValue: item[ x ].displayName
                        };
                        units.push( newUnit );
                    }
                    this.unitDefs = unitDefs;
                    this.lovApi = units;
                    this.lovApi.num = item.length;
                }
                viewProp.unitDefs = this.unitDefs;
                viewProp.lovApi = this.lovApi;
                viewProp.uiValue = this.unitSystem.unitName;
                viewProp.uiOriginalValue = this.unitSystem.unitName;
                viewProp.items = this.lovApi;
                viewProp.names = names;
                if( viewProp.names.length > 0 ) {
                    viewProp.availableIntentValues = [];
                    viewProp.availableIntentValues.response = viewProp.lovApi;
                }
            }
        }
    }
    return viewProp;
};

Attribute.prototype.getMinMaxRange = function() {
    var msg = '';
    var unitSystemInfo = this.unitSystem;
    if( unitSystemInfo.minimumValue || unitSystemInfo.maximumValue ) {
        var minValue = classifyUtils.convertValue( unitSystemInfo.minimumValue, unitSystemInfo, false );
        var maxValue = classifyUtils.convertValue( unitSystemInfo.maximumValue, unitSystemInfo, false );

        if( minValue && !maxValue ) { // minimum
            msg = ngModule.copy( _showMinMsg );
            msg = msg.replace( '{0}', unitSystemInfo.minimumValue );
        } else if( !minValue && maxValue ) { // maximum
            msg = ngModule.copy( _showMaxMsg );
            msg = msg.replace( '{0}', unitSystemInfo.maximumValue );
        } else if( minValue && maxValue ) { // range
            msg = ngModule.copy( _showRangeMsg );
            msg = msg.replace( '{0}', unitSystemInfo.minimumValue );
            msg = msg.replace( '{1}', unitSystemInfo.maximumValue );
        }
        this.minMaxMsg = msg;
    }
    return msg;
};

Attribute.prototype.getLabelProps = function() {
    var props = [];
    var ctx = appCtxSvc.getCtx( 'clsTab' );
    if( ctx && ctx.preferences ) {
        var attrProperties = this.origAttrInfo.attributeProperties;
        // props = [];
        _.forEach( ctx.preferences, function( pref ) {
            props.push( {
                key: pref.propInternalValue,
                value: exports.getPropertyValue( attrProperties, pref.propInternalValue )
            } );
        } );
        this.labelProps = props;
    }
    return props;
};

/**
 * Defines property
 * @param {Object} data view model
 * @param {Object} attribute attribute,
 * @param {Object} attributeIDPrefix attribute prefix
 * @param {Object} isPanel true if panel, false otherwise
 */
function PropertyDefn( data, attribute, attributeIDPrefix, isPanel ) {
    Attribute.call( this, data, attribute, attributeIDPrefix, isPanel );
}
PropertyDefn.prototype = Object.create( Attribute.prototype );
PropertyDefn.prototype.constructor = PropertyDefn;

/**
 * Defines block
 * @param {Object} data view model
 * @param {Object} attribute attribute
 * @param {Object} attributeIDPrefix attribute prefix
 * @param {Object} isPanel true if panel, false otherwise
 * @param {Object} blockData block attribute data from parent
 */
function Block( data, attribute, attributeIDPrefix, isPanel, blockData ) {
    Attribute.call( this, data, attribute, attributeIDPrefix, isPanel );
    var tempAttrId = this.id;
    if( this.attrReferenceClassIRDI && this.attrReferenceClassIRDI !== '' ) {
        tempAttrId = this.attrReferenceClassIRDI;
    }
    // set has blocks flag to true, used for Prop Group Tree
    data.hasBlocks = true;

    if( tempAttrId.substring( 0, 4 ) === 'cst0' ) {
        tempAttrId = tempAttrId.substring( 4, tempAttrId.length );
    }
    this.blockDefinition = data.blockDefinitionMapResponse[ tempAttrId ];
    this.blockId = this.attrPolymorphicOptionsRef ? '' : tempAttrId;

    this.blockAttributeData = blockData ? blockData : this.getParentBlock( attribute, attributeIDPrefix, isPanel );
}
Block.prototype = Object.create( Attribute.prototype );
Block.prototype.constructor = Block;

/**
 * Sets parent block
 * @param {Object} attribute attribute
 * @returns {Object} block
 */
Block.prototype.getParentBlock = function( attribute ) {
    var entry = this.getAttrEntry( attribute, this.idPrefix, this.isPanel );
    entry.blockId = this.blockId;
    entry.blockId = this.blockId;
    entry.cardinalController = null;
    entry.cardIndex = [];
    entry.children = [];
    entry.editable = true;
    entry.instances = [];
    entry.isCardinalControl = false;
    entry.polymorphicTypeProperty = null;
    entry.propExpanded = true;
    entry.type = 'Block';

    return entry;
};

/**
 * Add children to the block
 * This is the duplicated method for Admin
 * @param {Object} data view model
 * @param {Object} valuesMap values
 */
Block.prototype.addBlockChildrenForAdmin = function( data, valuesMap ) {
    this.suffix = ''; // Set default suffix to nothing, will be set if a child of the node is required.
    if( this.blockDefinition ) {
        exports.formatAttributeArrayForAdmin( data, this.blockDefinition.attributes, valuesMap,
            this.blockAttributeData.children, this.idPrefix + this.id + '.', this.isPanel, false, null, this.blockAttributeData.cardIndex, true );
    }
};

/**
 * Add children to the block
 * @param {Object} data view model
 * @param {Object} valuesMap values
 */
Block.prototype.addBlockChildren = function( data, valuesMap ) {
    this.suffix = ''; // Set default suffix to nothing, will be set if a child of the node is required.
    if( this.blockDefinition ) {
        exports.formatAttributeArray( data, this.blockDefinition.attributes, valuesMap,
            this.blockAttributeData.children, this.idPrefix + this.id + '.', this.isPanel, false, null, this.blockAttributeData.cardIndex, true );
        //loop through this.blockAttributeData.child vmos[0] for isRequired
        if( this.blockAttributeData ) {
            for( var i = 0; i < this.blockAttributeData.children.length; i++ ) {
                var child = this.blockAttributeData.children[ i ];
                if( child.suffix && child.suffix === '*' ) {
                    this.suffix = '*'; // set the suffix because a child of the node is required.
                    break;
                }
                if( child.vmos && child.vmos[ 0 ].isRequired ) { // Is a child set to required?
                    this.suffix = '*'; // set the suffix because a child of the node is required.
                    break;
                }
            }
        }
    }
};

/**
 * Defines cardinal block
 * @param {Object} data view model
 * @param {Object} attribute attribute
 *  @param {String} attributeIDPrefix prefix
 * @param {boolean} isPanel true if panel, false otherwise
 * @param {Object} blockData block attribute data of parent
 */
function CardinalBlock( data, attribute, attributeIDPrefix, isPanel, blockData ) {
    Block.call( this, data, attribute, attributeIDPrefix, isPanel, blockData );
}
CardinalBlock.prototype = Object.create( Block.prototype );
CardinalBlock.prototype.constructor = CardinalBlock;

/**
 * Sets Instances on cardinal block
 * @param {Object} data view model
 * @param {Object} attributeArray attributes
 * @param {Object} valuesMap values
 * @param {ObjectArray} outputAnnoArray output array
 */
CardinalBlock.prototype.setInstances = function( data, attributeArray, valuesMap, outputAnnoArray ) {
    var cardSizeController = [];
    var cardSizeAttrArray = [];
    var cardController = exports.getAttributeInfo( attributeArray, this.arrSizeAttrRef, true );
    cardController.maxInstances = this.arraySize;
    cardSizeController.push( cardController );
    exports.formatAttributeArray( data, cardSizeController, valuesMap, cardSizeAttrArray, this.idPrefix, this.isPanel, true, null, this.blockAttributeData.cardIndex, true );
    this.blockAttributeData.cardinalController = cardSizeAttrArray[ 0 ];
    //Push the cardinal attribute into the output array
    outputAnnoArray.push( cardSizeAttrArray[ 0 ] );
};

/**
 *  Defines polymorphic block
 * @param {Object} data view model
 * @param {Object} attribute attribute
 *  @param {String} attributeIDPrefix prefix
 * @param {boolean} isPanel true if panel, false otherwise
 * @param {Object} blockData block attribute data of parent
 */
function PolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, blockData ) {
    Block.call( this, data, attribute, attributeIDPrefix, isPanel, blockData );
}
PolymorphicBlock.prototype = Object.create( Block.prototype );
PolymorphicBlock.prototype.constructor = PolymorphicBlock;

/**
 * Sets polymorphic property
 *
 * @param {Object} data view model
 * @param {Object} valuesMap values
 */
PolymorphicBlock.prototype.setPolyAttr = function( data, valuesMap ) {
    var polyTypeController = [];
    var polyTypePropArray = [];

    //Get Polymorphic Type property
    polyTypeController.push( createPolymorphicTypeController( this.attrPolymorphicOptionsRef ) );
    exports.formatAttributeArray( data, polyTypeController, valuesMap, polyTypePropArray, this.idPrefix, this.isPanel, false, null, this.blockAttributeData.cardIndex, true );

    //Above we should get a value if loading, then below we need to add the properties (setPolyMorphicProperties) then format them
    this.blockAttributeData.polymorphicTypeProperty = polyTypePropArray[ 0 ];
};

/**
 * Sets polymorphic property
 *
 * @param {Object} data view model
 * @param {Object} valuesMap values
 */
PolymorphicBlock.prototype.setPolyAttrForAdmin = function( data, valuesMap, attribute ) {
    var polyTypeController = [];
    var polyTypePropArray = [];

    var attributeString = null;
    //Get Polymorphic Type property
    polyTypeController.push( createPolymorphicTypeController( this.attrPolymorphicOptionsRef ) );

    if( attribute.attributeId.substring( 0, 4 ) === 'cst0' ) {
        attributeString = attribute.attributeId.substring( 4, attribute.attributeId.length );
    } else {
        attributeString = attribute.attributeId;
    }

    polyTypeController[ 0 ].attributeId = attributeString;
    exports.formatAttributeArrayForAdmin( data, polyTypeController, valuesMap, polyTypePropArray, this.idPrefix, this.isPanel, false, null, this.blockAttributeData.cardIndex, true );

    //Above we should get a value if loading, then below we need to add the properties (setPolyMorphicProperties) then format them
    this.blockAttributeData.polymorphicTypeProperty = polyTypePropArray[ 0 ];
};

/**
 * Creates a new attribute
 *
 * @param {Object} data view model
 * @param {Object} attribute attribute
 * @return {Object} - attribute
 */
export let getAttribute = function( data, attribute ) {
    return new Attribute( data, attribute );
};

/**
 * Creates a new property
 *
 * @param {Object} data view model
 * @param {Object} attribute attribute
 * @param {String} attributeIDPrefix prefix
 * @param {boolean} isPanel true if panel, false otherwise
 * @return {Object} - property
 */
export let getProperty = function( data, attribute, attributeIDPrefix, isPanel ) {
    return new PropertyDefn( data, attribute, attributeIDPrefix, isPanel );
};

/**
 * Creates a new block
 * @param {Object} data view model
 * @param {Object} attribute attribute
 * @param {String} attributeIDPrefix prefix
 * @param {boolean} isPanel true if panel, false otherwise
 * @return {Object} - block
 */
export let getBlock = function( data, attribute, attributeIDPrefix, isPanel ) {
    return new Block( data, attribute, attributeIDPrefix, isPanel );
};

/**
 * Creates a new cardinal block
 * @param {Object} data view model
 * @param {Object} attribute attribute
 * @param {String} attributeIDPrefix prefix
 * @param {boolean} isPanel true if panel, false otherwise
 * @param {Object} blockData block attribute data of parent
 * @return {Object} - cardinal block
 */
export let getCardinalBlock = function( data, attribute, attributeIDPrefix, isPanel, blockData ) {
    return new CardinalBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
};

/**
 * Creates a new polymorphic block
 * @param {Object} data view model
 * @param {Object} attribute attribute
 * @param {String} attributeIDPrefix prefix
 * @param {boolean} isPanel true if panel, false otherwise
 * @param {Object} blockData block attribute data of parent
 * @return {Object} - polymorphic block
 */
export let getPolymorphicBlock = function( data, attribute, attributeIDPrefix, isPanel, blockData ) {
    return new PolymorphicBlock( data, attribute, attributeIDPrefix, isPanel, blockData );
};

/*
 * Gets the formatted filter key which will be compatible for performSearchViewModel4
 * @param {Integer} attrKey - the attribute key
 */

export let getFilterCompatibleKey = function( attrKey ) {
    let filterKey = '';
    if( attrKey > 0 ) {
        filterKey = CLS_FILTER_KEY + '.' + attrKey;
    } else {
        filterKey = CLS_FILTER_KEY + '.N' + Math.abs( attrKey );
    }
    return filterKey;
};

/**
 * Checks isValidData to determine if current attribute is valid to save.
 * @param {Object} isValidData - the current valid object for attribute.
 * @returns {Object} returns true/false
 */
export let checkValid = function( isValidData ) {
    var validToSave = true;
    if( isValidData.iskeyValid === false ||
        isValidData.isInRange === false ||
        isValidData.isValidValue === false ||
        isValidData.isValidMinMax === false ||
        isValidData.isValidTolerance === false ||
        isValidData.isValidNominal === false ||
        isValidData.isAllComplexFilled === false ) {
        validToSave = false;
    }
    return validToSave;
};

var loadConfiguration = function() {
    localeSvc.getTextPromise( 'ClassificationPanelMessages', true ).then( function( localTextBundle ) {
        _showMinMsg = localTextBundle.showMinMessage;
        _showMaxMsg = localTextBundle.showMaxMessage;
        _showRangeMsg = localTextBundle.showRangeMessage;
        _owningUser = localTextBundle.OwningUser;
        _modifiedUser = localTextBundle.ModifiedUser;
        _dateModified = localTextBundle.DateModified;
        _path = localTextBundle.Path;
        _exceedsInstances = localTextBundle.exceedsInstances;
    } );
};

loadConfiguration();

/*
 * Handles show/hide metric command
 * @param {boolean} metric - true if metric selected, false otherwise
 */
export let selectMetric = function( metric ) {
    // initialConvertCount = 0;
    var ctx = {
        metric: metric
    };
    eventBus.publish( 'classify.showHideMetric', ctx );
};

/*
 * Handles show/hide command
 */
export let clearAllProps = function() {
    eventBus.publish( 'classify.clearAllProps' );
};

var _timeout = null;

export let filterHierarchy = function( data ) {
    var conditions = data.getConditionStates();
    if( !_.isNull( _timeout ) ) {
        AwTimeoutService.instance.cancel( _timeout );
    }
    _timeout = AwTimeoutService.instance( function() {
        if( data.searchBox.dbValue &&
            data.searchBox.dbValue.length >= 1 && !conditions.isValidSearchInput ) {
            eventBus.publish( data.tableSummaryDataProviderName + '.invalidSearchString', {} );
        } else {
            data.isTreeExpanding = false;
            eventBus.publish( data.tableSummaryDataProviderName + '.dataProvider.reset' );
            eventBus.publish( data.tableSummaryDataProviderName + '.clearClassBreadCrumb' );
        }
    }, 1500 );
};

/**
 * Returns object for the cell's tooltip
 * @param {Object} clsObj classification object
 * @param {Object} lastModifiedDate last modified date
 * @param {String} currentClassName current class name
 * @param {boolean} parents list of parents
 * @return {Object} props - tooltip object
 */
export let getExtendedCellTooltipProps = function( clsObj, lastModifiedDate, currentClassName, parents ) {
    var props = [];
    var owningUser = exports.getPropertyValue( clsObj.properties, exports.UNCT_OWNING_USER );
    if ( owningUser ) {
        props.push( {
            key: _owningUser,
            value: owningUser
        } );
    }

    var lastModifiedUser = exports.getPropertyValue( clsObj.properties, exports.UNCT_MODIFY_USER );
    if ( lastModifiedUser ) {
        props.push( {
            key: _modifiedUser,
            value: lastModifiedUser
        } );
    }

    props.push( {
        key: _dateModified,
        value: lastModifiedDate.displayValue
    } );

    props.push( {
        key: _path,
        value: parents.join( ' > ' ) + ' > ',
        value1: currentClassName
    } );

    return props;
};

export let updateL10NContext = function( data ) {
    var mselected = appCtxSvc.getCtx( 'mselected' );
    var vmo = viewModelObjectService.createViewModelObject( data.ico.uid );
    appCtxSvc.updateCtx( 'mselected', [ vmo ] );

    var context = {
        commandContext: data.eventData.commandContext
    };
    eventBus.publish( 'classify.openEditLocalizationSinglePanel', context );
};

export let addClassifyL10NContext = function( commandContext ) {
    var context = {
        commandContext: commandContext
    };
    eventBus.publish( 'classify.addClassifyL10NContext', context );
};

export default exports = {
    CLS_FILTER_KEY,
    TO_KEYWORD,
    STRING_FILTER_KEYWORD,
    NUMERIC_FILTER_KEYWORD,
    DATE_FILTER_KEYWORD,
    WILDCARD_KEYWORD,
    BRACKET_KEYWORDS,
    SPACE_KEYWORD,
    UNCT_ATTR_PROP,
    UNCT_CLASS_ID,
    UNCT_CLASS_TYPE,
    UNCT_CLASS_OBJECT_TYPE,
    UNCT_CLASS_NAME,
    UNCT_CLASS_UNIT_SYSTEM,
    UNCT_DEPENDENCY_ATTRIBUTE,
    UNCT_DEPENDENCY_CONFIGURATION,
    UNCT_CLASS_ATTRIBUTE_NAME,
    UNCT_CLASS_ATTRIBUTE_ID,
    UNCT_CLASS_USER_DATA_1,
    UNCT_CLASS_USER_DATA_2,
    UNCT_CLASS_SHORTNAME,
    UNCT_MODIFY_DATE,
    UNCT_MODIFY_USER,
    UNCT_OWNING_USER,
    UNCT_ICO_UID,
    ICS_CONNECT_STANDALONE,
    UNCT_ATTRIBUTE_ANNOTATION,
    UNCT_ATTRIBUTE_TYPE,
    UNCT_SORT_OPTION_CLASS_ID,
    UNCT_METRIC_KEYLOV_IRDI,
    UNCT_NONMETRIC_KEYLOV_IRDI,
    UNCT_REFERENCED_CLASS_IRDI,
    UNCT_ATTRIBUTE_IS_REQUIRED,
    UNCT_CLASS_DESCRIPTION,
    UNCT_CLASS_PROBABILITY,
    POLYMORPHIC_OPTIONS_REFERENCE,
    UNCT_IS_ARRAY_SIZE_CONTROLLER,
    UNCT_IS_POLYMORPHISM_CONTROLLER,
    UNCT_ARRAY_SIZE_ATTRIBUTE_REFERENCE,
    PLACEHOLDER_STRING_FOR_POLY,
    KEYLOV_ID,
    KEYLOV_NAME,
    loadMetadata,
    loadStorageAttributes,
    loadSearchSimilarConfig,
    loadStorageMetadata,
    loadClassChildren,
    loadClassSuggestions,
    loadClassSuggestionProperties,
    LOAD_CLASS_CHILDREN_DEFAULT,
    LOAD_CLASS_CHILDREN_ASC,
    LOAD_CLASS_UNITS,
    ATTRIBUTE_MANDATORY,
    ATTRIBUTE_HIDDEN,
    ATTRIBUTE_PROTECTED,
    ATTRIBUTE_REFERENCE,
    ATTRIBUTE_FIXED,
    ATTRIBUTE_FIXED2,
    ATTRIBUTE_LOCALIZATION,
    UNCT_CLASS_ATTRIBUTES,
    UNCT_ATTR_PROP_DISP,
    UNCT_ATTRIBUTE_TYPE_DISP,
    UNCT_CLASS_ATTRIBUTE_NAME_DISP,
    UNCT_ATTRIBUTE_ANNOTATION_DISP,
    UNCT_REFERENCED_CLASS_IRDI_DISP,
    UNCT_IS_ARRAY_SIZE_CONTROLLER_DISP,
    UNCT_METRIC_KEYLOV_IRDI_DISP,
    UNCT_NONMETRIC_KEYLOV_IRDI_DISP,
    UNCT_CLASS_ID_DISP,
    UNCT_CLASS_TYPE_DISP,
    UNCT_CLASS_OBJECT_TYPE_DISP,
    UNCT_CLASS_NAME_DISP,
    UNCT_CLASS_UNIT_SYSTEM_DISP,
    UNCT_CLASS_ATTRIBUTES_DISP,
    DOC_TYPE_ICON,
    accessCls0IsHidden,
    applyComplexPlaceholders,
    addClassifyL10NContext,
    changeViewMode,
    checkForInvalidSearch,
    checkValid,
    cleanupStandaloneData,
    clearAllArrayAttributes,
    clearAllAttributes,
    clearAllProps,
    clearAttribute,
    clearAttributes,
    clearBlockAttributes,
    clearClassBreadCrumb,
    clearCreateTreeData,
    clearSearchBox,
    convertSingleAttr,
    convertValues,
    convertValuesReturn,
    fetchApplicableValuesMap,
    filterHierarchy,
    findClassificationInfo,
    formatAttributeArray,
    formatAttributeArrayForAdmin,
    formatAttributeArrayForUnitsSystem,
    formatAttributeArrayForClassificationLocation,
    formatViewProps,
    generateCells,
    getAnnotations,
    getArrayValues,
    getAttributeInfo,
    getCardinalInstances,
    getChildren,
    getClsObject,
    getConcatenatedValues,
    getConvertValuesRequest,
    getDeleteInput,
    getDependentKeyLOVAttributes,
    getExtendedCellTooltipProps,
    getParentIds,
    getParentsPath,
    getPolyBlockReference,
    getReleaseDisplayName,
    getViewProps,
    getClassifiedWorkspaceObjectID,
    getAttribute,
    getProperty,
    getBlock,
    getCardinalBlock,
    getFilterCompatibleKey,
    getIcon,
    getPolymorphicBlock,
    getPropertyValue,
    getUnitSystem,
    hasBlockChildren,
    isAttributeValueInRange,
    isBlockDirty,
    isDirty,
    isSingleKeyLOVvalid,
    keyLovValidation,
    parseClassDescriptions,
    parseClsProperties,
    parseIndividualClassDescriptor,
    parseSearchString,
    parseUnitSystem,
    processValues,
    selectLOV,
    selectMetric,
    setAttributesVisible,
    setCellProperty,
    setComplexValues,
    setConvertedValues,
    setDefaultValuesAndUnitSystem,
    setIsAlreadyPrompted,
    setTargetObjectForSelection,
    setValues,
    setViewMode,
    updateL10NContext
};
/**
 * Classification panel service utility
 *
 * @memberof NgServices
 * @member classifyService
 */
app.factory( 'classifyService', () => exports );
