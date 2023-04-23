// Copyright (c) 2020 Siemens

/**
 * This module provides methods to process data parse configurations in the Declarative View Model
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined in this module is
 * injected by AngularJS.
 *
 * @module js/dataMapperService
 */
import app from 'app';
import declarativeDataCtxSvc from 'js/declarativeDataCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import uwPropertySvc from 'js/uwPropertyService';
import awIconSvc from 'js/awIconService';
import visualIndicatorSvc from 'js/visualIndicatorService';
import dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';
import logger from 'js/logger';
import declUtils from 'js/declUtils';
import debugService from 'js/debugService';

/**
 * Cached reference to dependent services
 */

/**
 * Marker text within a value used to indicate when a property contains a UTC date/time that needs to be converted
 * to to local time zone and session specific format.
 *
 * @private
 */
var UTC_DATE_TIME_MARKER = '{__UTC_DATE_TIME}'; // $NON-NLS-1$

/**
 * Define the base object used to provide all of this module's external API on.
 *
 * @private
 */
var exports = {};
/**
 * Check if valid prop type
 * @param {String} type - Property type string
 * @return {boolean} Reference to service API.
 */
var isValidPropType = function( type ) {
    return /^(BOOLEAN|DATE|DATETIME|DOUBLE|INTEGER|STRING|OBJECT)$/.test( type );
};
/**
 * Check if valid array prop type
 * @param {String} type - Property type string
 * @return {boolean} Reference to service API.
 */
var isValidArrayPropType = function( type ) {
    return /^(BOOLEAN|DATE|DATETIME|DOUBLE|INTEGER|STRING|OBJECT)ARRAY$/.test( type );
};
/**
 * @param {String} propType - The property type
 * @param {Boolean} isArray - If the property is of array type
 * @returns {String} - The correct property type
 */
var getPropertyType = function( propType, isArray ) {
    propType = propType.toUpperCase();
    if( isArray ) {
        if( isValidArrayPropType( propType ) ) {
            return propType;
        } else if( isValidPropType( propType ) ) {
            return propType + 'ARRAY';
        }
    } else {
        if( isValidPropType( propType ) ) {
            return propType;
        }
    }

    logger.warn( 'Unknown property type ' + propType );
    return 'UNKNOWN';
};

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c ) {
        // eslint-disable-next-line no-bitwise
        const r = Math.random() * 16 | 0;
        // eslint-disable-next-line no-bitwise
        const v = c === 'x' ? r : r & 0x3 | 0x8;
        return v.toString( 16 );
    } );
};

/**
 * Convert one single response object to VMO
 * @param {Object} dataParseDef - The data parse definition
 * @returns {Object} - VMO containing view model properties
 */
var constructViewModelObject = function( dataParseDef ) {
    var serverVMO = {
        props: {}
    };
    serverVMO.uid = dataParseDef.identifier || uuidv4();
    serverVMO.type = dataParseDef.type;
    serverVMO.modelType = dataParseDef.modelType;
    _.forOwn( dataParseDef, function( val, key ) {
        if( key === 'props' ) {
            _.forOwn( val, function( propDef, propId ) {
                serverVMO.props[ propId ] = {};
                Object.assign( serverVMO.props[ propId ], propDef );
                serverVMO.props[ propId ].displayName = propDef.displayName || propDef.name;
                serverVMO.props[ propId ].propType = getPropertyType( propDef.type, propDef.isArray );
                serverVMO.props[ propId ].isArray = propDef.isArray === true;
                serverVMO.props[ propId ].displayValue = _.isArray( propDef.displayValue ) ? propDef.displayValue : [ propDef.displayValue ];
                if( propDef.isArray === true ) {
                    serverVMO.props[ propId ].value = _.isArray( propDef.value ) ? propDef.value : [ propDef.value ];
                } else {
                    serverVMO.props[ propId ].value = propDef.value;
                }
            } );
        }
    } );
    return viewModelObjectService.constructViewModelObject( serverVMO, true );
};

/**
 * Replace any occurrences of UTC date/time values with the {@link #UTC_DATE_TIME_MARKER} with the date/time in the
 * local time zone.
 *
 * @private
 *
 * @param { Object } cellProperties - object of cellProperties to consider.
 * @return { Object } Object if values after replacement of any strings.
 */
var _convertUTCTimeValues = function( cellProperties ) {
    for( var prop in cellProperties ) {
        if( Object.prototype.hasOwnProperty.call( cellProperties, prop ) ) {
            var value = cellProperties[ prop ].value;

            var markerNdx = value ? value.indexOf( UTC_DATE_TIME_MARKER ) : -1;

            if( markerNdx !== -1 ) {
                var prefix = value.substring( 0, markerNdx );
                var utc = value.substring( markerNdx + UTC_DATE_TIME_MARKER.length );

                var date = new Date( utc );
                cellProperties[ prop ].value = prefix + dateTimeSvc.formatSessionDateTime( date );
            }
        }
    }
    return cellProperties;
};
/**
 * Convert one single response object to afx object
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context.
 * @param {Object} dataParseDefinition - The data parse definition
 * @param {Object} dataCtxNode - The data context node.
 * @param {Object} depModuleObj - The dependent module
 * @returns {Object} - vmo containing view model properties
 */
var convertResponseObjToVMO = function( declViewModel, dataParseDefinition, dataCtxNode, depModuleObj ) {
    var functionsList = declViewModel.getFunctions();
    var dataParseDef = _.cloneDeep( dataParseDefinition );
    declarativeDataCtxSvc.applyScope( declViewModel, dataParseDef, functionsList, dataCtxNode, depModuleObj );
    var viewModelObject = constructViewModelObject( dataParseDef );
    _.forOwn( dataParseDef, function( val, key ) {
        if( key === 'props' ) {
            _.forOwn( val, function( propDef, propId ) {
                if( propDef.dataProvider ) {
                    viewModelObject.props[ propId ].dataProvider = propDef.dataProvider;
                    uwPropertySvc.setHasLov( viewModelObject.props[ propId ], true );
                    viewModelObject.props[ propId ].emptyLOVEntry = propDef.emptyLOVEntry;
                    viewModelObject.props[ propId ].isSelectOnly = propDef.isSelectOnly;
                }
                viewModelObject.props[ propId ].getViewModel = function() {
                    return declViewModel;
                };
                if( viewModelObject.props[ propId ].type === 'DATE' ) {
                    viewModelObject.props[ propId ].dateApi = viewModelObject.props[ propId ].dateApi || {};
                    viewModelObject.props[ propId ].dateApi.isDateEnabled = true;
                    viewModelObject.props[ propId ].dateApi.isTimeEnabled = false;
                    if( propDef.type === 'DATETIME' ) {
                        viewModelObject.props[ propId ].dateApi.isTimeEnabled = true;
                    }
                }
            } );
        } else {
            viewModelObject[ key ] = val;
        }
    } );
    if( viewModelObject && viewModelObject.indicators ) {
        var indicators = visualIndicatorSvc.getIndicatorFromJSON( viewModelObject.indicators );
        if( indicators.length > 0 ) {
            viewModelObject.indicators = indicators;
        }
    }

    if( viewModelObject && viewModelObject.cellProperties ) {
        var cellProperties = _convertUTCTimeValues( viewModelObject.cellProperties );
        if( cellProperties ) {
            viewModelObject.cellProperties = cellProperties;
        }
    }

    if( viewModelObject && !viewModelObject.typeIconURL ) {
        var typeIconURL = awIconSvc.getTypeIconFileUrl( viewModelObject );
        if( typeIconURL ) {
            viewModelObject.typeIconURL = typeIconURL;
        }
    }

    if( !viewModelObject.thumbnailURL ) {
        var thumbnailURL = awIconSvc.getThumbnailFileUrl( viewModelObject );
        if( thumbnailURL ) {
            viewModelObject.thumbnailURL = thumbnailURL;
        }
    }

    viewModelObject.hasThumbnail = !declUtils.isNil( dataParseDef.thumbnailURL ); // Set thumbnail flag
    return viewModelObject;
};
/**
 * Apply the DataParseDefinitions to an array of response objects (as returned from a server).
 * This returns an array of objects which are consumable by various afx widgets.
 *
 * @param {Object} sourceObj - The object to apply dataParseDefinitions
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context.
 * @param {ObjectArray} actionDataParsers - The dataParseDefinitions.
 * @param {Object} dataCtxNode - The data context node.
 * @param {Object} depModuleObj - The dependent module
 * @return {Object} - the modified sourceObj with dataParseDefinition applied
 */
export let applyDataParseDefinitions = function( sourceObj, declViewModel, actionDataParsers, dataCtxNode, depModuleObj ) {
    if( !_.isArray( actionDataParsers ) ) {
        return sourceObj;
    }
    if( logger.isDeclarativeLogEnabled() ) {
        debugService.debugPreProcessingDataParser( sourceObj, declViewModel, actionDataParsers, dataCtxNode );
    }
    _.forEach( actionDataParsers, function( actionDpd ) {
        var dataParseDefinition = declViewModel.getDataParseDefinition( actionDpd.id );
        if( _.isUndefined( dataParseDefinition ) ) {
            logger.warn( 'Missing DataParseDefinition with id ' + actionDpd.id + ' in DeclViewModel' );
            return;
        }
        if( dataParseDefinition.typeHierarchy ) {
            dataParseDefinition.modelType = { typeHierarchyArray: '{{response.typeHierarchy}}' };
        }
        var responseObjsPath = actionDpd.responseObjs;
        var responseObjs = _.get( sourceObj, responseObjsPath );
        debugService.debug( 'dataParsers', declViewModel._internal.panelId, actionDpd.id, responseObjs );
        var afxObjects = null;
        if( _.isArray( responseObjs ) ) {
            afxObjects = [];
            _.forEach( responseObjs, function( responseObj ) {
                dataCtxNode.response = responseObj;
                dataCtxNode.i18n = dataCtxNode.i18n || dataCtxNode.data.i18n;
                var afxObject = convertResponseObjToVMO( declViewModel, dataParseDefinition, dataCtxNode, depModuleObj );
                delete dataCtxNode.response;
                afxObjects.push( afxObject );
            } );
        } else if( _.isObject( responseObjs ) ) {
            dataCtxNode.response = responseObjs;
            afxObjects = convertResponseObjToVMO( declViewModel, dataParseDefinition, dataCtxNode, depModuleObj );
            delete dataCtxNode.response;
        }
        _.set( sourceObj, responseObjsPath, afxObjects );
    } );
    if( logger.isDeclarativeLogEnabled() ) {
        debugService.debugPostProcessingDataParser( sourceObj, declViewModel, actionDataParsers, dataCtxNode );
    }
    return sourceObj;
};

exports = {
    applyDataParseDefinitions
};
export default exports;
/**
 * The data mapper service
 *
 * @member dataMapperService
 * @memberof NgServices
 *
 * @param {declarativeDataCtxSvc} declarativeDataCtxSvc - Service to use.
 * @param {viewModelObjectService} viewModelObjectService - Service to use.
 * @param {uwPropertySvc} uwPropertySvc - Service to use.
 * @param {awIconSvc} awIconSvc - Service to use.
 * @param {visualIndicatorSvc} visualIndicatorSvc - Service to use.
 * @param {dateTimeSvc} dateTimeSvc - Service to use.
 *
 *  @return {dataMapperService} Reference to service API.
 */
app.factory( 'dataMapperService', () => exports );
