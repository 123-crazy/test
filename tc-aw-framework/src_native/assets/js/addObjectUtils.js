/* eslint-disable max-lines */
// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
* @module js/addObjectUtils
*/
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import listBoxSvc from 'js/listBoxService';
import filterPanelUtils from 'js/filterPanelUtils';
import tcSesnD from 'js/TcSessionData';
import cdm from 'soa/kernel/clientDataModel';
import _cmm from 'soa/kernel/clientMetaModel';
import appCtxService from 'js/appCtxService';
import _dmSrv from 'soa/dataManagementService';
import _objTypesSrv from 'js/objectTypesService';
import _soaService from 'soa/kernel/soaService';
import _uwPropSrv from 'js/uwPropertyService';
import _messagingService from 'js/messagingService';
import localeService from 'js/localeService';

import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import analyticsSvc from 'js/analyticsService';
import $ from 'jquery';

import 'soa/kernel/propertyPolicyService';

var exports = {};
var PRESET_CATEGORY = 'WorkspaceObject.object_type';

var _failureToAttachFiles;
var _fileInputForms;
var _datasetInfoIndex = 0;
var _fmsUrl = '';

var _getCreateInputObject = function( boName, propertyNameValues, compoundCreateInput ) {
    return {
        boName: boName,
        propertyNameValues: propertyNameValues,
        compoundCreateInput: compoundCreateInput
    };
};

/**
 * Method to register a callback function(s)
 *
 * @param {*} data VM data
 * @param {*} ctx  context
 */
 export let registerNewTabPageSubCB = function( data, ctx ) {
    data.updateDatasetInfo = function( fileName, fileNameNoExt, fileExt, files, validFile ) {
        data.fileName = fileName;
        data.fileNameNoExt = fileNameNoExt;
        data.fileExt = fileExt;
        data.files = files;
        data.validFile = validFile;
        if ( data.fileName ) {
            eventBus.publish( 'dataset.initDSCreateParams' );
        }
        if ( data.targetObject !== undefined && this.fileName ) {
            eventBus.publish( 'dataset.getDatasetTypesWithDefaultRelation' );
        }
        if ( ctx !== undefined && ctx.scheduleTask !== undefined && ctx.scheduleTask.selectedObject !== undefined && this.fileName && !this.validFile ) {
            eventBus.publish( 'datasetForDeliverable.getDatasetTypesWithDefaultRelation' );
        }
    };
};


/**
 * populateUploadFileInfo - calls callback function (from main newTabPageSubView panel)
 *                          to update selected file information
 *
 * @param {*} data  data the viewModel data object
 * @param {*} subPanelContext - Outer panel context
 * @param {*} ctx - context
 */
 export let populateUploadFileInfo = function( data, subPanelContext ) {
    if ( data.fileName ) {
        subPanelContext.updateDatasetInfo( data.fileName, data.fileNameNoExt, data.fileExt, data.files, data.validFile );
    }
};

/**
 * Private method to create input for create item
 *
 * @param fullPropertyName property name
 * @param count current count
 * @param propertyNameTokens property name tokens
 * @param createInputMap create input map
 * @param operationInputViewModelObject view model object
 * @return {String} full property name
 */
var _addChildInputToParentMap = function( fullPropertyName, count, propertyNameTokens, createInputMap, vmProp ) {
    var propName = propertyNameTokens[ count ];
    var childFullPropertyName = fullPropertyName;
    if( count > 0 ) {
        childFullPropertyName += '__' + propName; //$NON-NLS-1$
    } else {
        childFullPropertyName += propName;
    }

    // Check if the child create input is already created
    var childCreateInput = _.get( createInputMap, childFullPropertyName );
    if( !childCreateInput && vmProp && vmProp.intermediateCompoundObjects ) {
        var compoundObject = _.get( vmProp.intermediateCompoundObjects, childFullPropertyName );
        if( compoundObject ) {
            // Get the parent create input
            var parentCreateInput = _.get( createInputMap, fullPropertyName );
            if( parentCreateInput ) {
                // Create the child create input
                // Add the child create input to parent create input
                childCreateInput = _getCreateInputObject( compoundObject.modelType.owningType, {}, {} );
                if( !parentCreateInput.compoundCreateInput.hasOwnProperty( propName ) ) {
                    parentCreateInput.compoundCreateInput[ propName ] = [];
                }
                parentCreateInput.compoundCreateInput[ propName ].push( childCreateInput );

                createInputMap[ childFullPropertyName ] = childCreateInput;
            }
        }
    }
    return childFullPropertyName;
};

var _processPropertyForCreateInput = function( propName, vmProp, createInputMap ) {
    if( vmProp ) {
        var valueStrings = _uwPropSrv.getValueStrings( vmProp );
        if( valueStrings && valueStrings.length > 0 ) {
            var propertyNameTokens = propName.split( '__' );
            var fullPropertyName = '';
            for( var i = 0; i < propertyNameTokens.length; i++ ) {
                if( i < propertyNameTokens.length - 1 ) {
                    // Handle child create inputs
                    fullPropertyName = _addChildInputToParentMap( fullPropertyName, i, propertyNameTokens,
                        createInputMap, vmProp );
                } else {
                    // Handle property
                    var createInput = createInputMap[ fullPropertyName ];
                    if( createInput ) {
                        var propertyNameValues = createInput.propertyNameValues;
                        _.set( propertyNameValues, propertyNameTokens[ i ], valueStrings );
                    }
                }
            }
        }
    }
};

/**
 * Process the searchCategoryFilter objects.
 *
 * @param {Array} searchCategoryFilter - search category filters
 * @param {Object} data - data containing searchFilterMap
 * @param {Object} searchFilter - default value if none found in searchCategoryFilter
 * @param {String} categoryName - category name
 * @param {boolean} isDateFilter - is date filter
 */
let _processSearchCategoryFilter = function( searchCategoryFilter, data, searchFilter, categoryName, isDateFilter ) {
    var index1 = _.findIndex( searchCategoryFilter, function( selectedFilter ) {
        return selectedFilter.stringDisplayValue === searchFilter.stringDisplayValue ||
            selectedFilter.stringValue === searchFilter.stringValue;
    } );
    if( index1 > -1 ) {
        searchCategoryFilter.splice( index1, 1 );

        if( searchCategoryFilter.length === 0 ) {
            delete data.searchFilterMap[ categoryName ];

            if( isDateFilter ) {
                var tmpCategoryName = categoryName.substring( 0, categoryName.indexOf( '_0Z0_' ) );

                if( categoryName.lastIndexOf( '_0Z0_year_month_day' ) > 0 ) {
                    // ignore
                } else if( categoryName.lastIndexOf( '_0Z0_week' ) > 0 ) {
                    delete data.searchFilterMap[ tmpCategoryName + '_0Z0_year_month_day' ];
                } else if( categoryName.lastIndexOf( '_0Z0_year_month' ) > 0 ) {
                    delete data.searchFilterMap[ tmpCategoryName + '_0Z0_year_month_day' ];
                    delete data.searchFilterMap[ tmpCategoryName + '_0Z0_week' ];
                } else if( categoryName.lastIndexOf( '_0Z0_year' ) > 0 ) {
                    delete data.searchFilterMap[ tmpCategoryName + '_0Z0_year_month_day' ];
                    delete data.searchFilterMap[ tmpCategoryName + '_0Z0_week' ];
                    delete data.searchFilterMap[ tmpCategoryName + '_0Z0_year_month' ];
                }
            }

            if( filterPanelUtils.getHasTypeFilter() && categoryName === filterPanelUtils.PRESET_CATEGORY ) {
                //reset to all preset categories
                var ctx = appCtxService.getCtx( 'searchIncontextInfo' );
                if( ctx ) {
                    var values = ctx.inContextMap[ filterPanelUtils.PRESET_CATEGORY ];
                    var filterValues = values.map( function( value ) {
                        return value;
                    } );
                    var inContextMap = [];
                    inContextMap[ categoryName ] = filterValues;
                    data.searchFilterMap[ categoryName ] = inContextMap[ categoryName ];
                } else {
                    data.searchFilterMap[ categoryName ] = data.sourceSearchFilterMap[ categoryName ];
                }

                filterPanelUtils.setPresetFilters( true );
            }
        }
    } else {
        searchCategoryFilter.push( searchFilter );
    }
};

/**
 * Get the assignable projects according to different versionSupport
 *
 * @param {Object} data - the view model data object
 * @param {Object} sortCriteria -
 * @param {Integer} startIndex -
 * @param {Object} filterVal -
 * @returns {Promise} Promise object
 */
export let getPropertiesProject = function( data, sortCriteria, startIndex, filterVal ) {
    var userCtx = appCtxService.getCtx( 'user' );

    if( exports.isSupportedTCVersion() ) {
        // Create the input structure
        return _soaService.postUnchecked( 'Core-2017-05-ProjectLevelSecurity', 'getProjectsForAssignOrRemove', {
            projectsInput: [ {
                user: {
                    type: userCtx.type,
                    uid: userCtx.uid
                },
                selectedObjects: [],
                assignedObjects: [],
                isAceContext: false,
                filterText: filterVal,
                paginationInfo: {
                    startIndexForAvailableProjects: startIndex ? startIndex : 0,
                    maxToReturnForAvailableProjects: 50
                }
            } ]
        } ).then( function( response ) {
            if( response ) {
                data.projects = exports.getProjects( response );
                if( !_.isEmpty( sortCriteria ) ) {
                    data.projects = exports.sortProjects( data.projects, sortCriteria );
                }
                data.totalProjectsFound = response.totalFound;
                return data.projects;
            }
            return null;
        } );
    }

    return _soaService.postUnchecked( 'Core-2006-03-DataManagement', 'getProperties', {
        attributes: [ 'assignable_projects' ],
        objects: [ userCtx ]
    } ).then( function( response ) {
        if( response ) {
            var totalProjects = exports.getProjects( response );
            if( filterVal ) {
                var filteredObjects = _.filter( totalProjects, function( o ) {
                    return o.props.project_name.dbValues[ 0 ].indexOf( filterVal ) > -1 ||
                        o.props.object_string.dbValues[ 0 ].indexOf( filterVal ) > -1;
                } );
                data.projects = filteredObjects;
            } else {
                data.projects = totalProjects;
            }
            data.totalProjectsFound = data.projects.length;
            return data.projects;
        }
        return null;
    } );
};

/**
 * Checks the TC version and returns the boolean <br>
 * Used before calling SOA which is available in 11.3 and later version
 *
 * @returns {Boolean} true if supported TC version, false otherwise
 */
export let isSupportedTCVersion = function() {
    var tcMajor = tcSesnD.getTCMajorVersion();
    var tcMinor = tcSesnD.getTCMinorVersion();
    var qrmNumber = tcSesnD.getTCQRMNumber();

    if( tcMajor === 11 && tcMinor >= 3 || tcMajor === 11 && tcMinor >= 2 && qrmNumber >= 4 ) {
        return true;
    }
    if( tcMajor > 11 ) {
        return true;
    }

    return false;
};

/**
 * set the pin on the data
 *
 * @param {Object} data - the view model data
 */
export let setPin = function( data ) {
    data.pinnedToForm.dbValue = false;
    data.unpinnedToForm.dbValue = true;
    eventBus.publish( 'awAdd.pinnedToForm', {
        pinnedToForm: true
    } );
};

/**
 * set unpin on the data
 *
 * @param {Object} data - the view model data
 */
export let setUnPin = function( data ) {
    data.pinnedToForm.dbValue = true;
    data.unpinnedToForm.dbValue = false;
    eventBus.publish( 'awAdd.pinnedToForm', {
        pinnedToForm: false
    } );
};

/**
 * set the pin on the data
 *
 * @param {Boolean} pinnedToForm -
 * @param {Boolean} unpinnedToForm -
 */
export let setPinnedToForm = function( pinnedToForm, unpinnedToForm ) {
    pinnedToForm.dbValue = false;
    unpinnedToForm.dbValue = true;
    eventBus.publish( 'awAdd.pinnedToForm', {
        pinnedToForm: true
    } );
};

/**
 * clears selected types
 */
export let clearSelectedType = function( clearSelectedTypeFn ) {
    clearSelectedTypeFn();
};

/**
 * shows more link styles
 */
export let showMoreLinkStyles = function( showMoreLinkStylesFn ) {
    showMoreLinkStylesFn();
};

/**
 * set unpin on the data
 *
 * @param {Boolean} pinnedToForm -
 * @param {Boolean} unpinnedToForm -
 */
export let setUnPinnedToForm = function( pinnedToForm, unpinnedToForm ) {
    pinnedToForm.dbValue = true;
    unpinnedToForm.dbValue = false;
    eventBus.publish( 'awAdd.pinnedToForm', {
        pinnedToForm: false
    } );
};

/**
 * set the selection model of given dataprovider
 *
 * @param {DataProvider} Dataprovider - whose selection model to update selectionMode
 * @param {selectionMode} selectionMode - single / multiple
 */
export let updateSelectionModeForDataProvider = function( dataProvider, selectionMode ) {
    if( selectionMode ) {
        dataProvider.selectionModel.setMode( selectionMode );
    }
};

/**
 * Get the most recent used types
 *
 * @param {Object} data the view model data object
 * @param {String} filterTypesString the filter types joined by comma.
 * @return {Object} a promise with no data, once the data is loaded at client side.
 */
export let getRecentUsedTypes = function( data, filterTypesString ) {
    var deferred = AwPromiseService.instance.defer();

    var filterTypes = [];
    if( filterTypesString ) {
        filterTypes = filterTypesString.split( ',' );
    }

    _objTypesSrv.getRecentModelTypes().then( function( recentTypeNames ) {
        var uids = [];
        var recentUsedTypes = [];
        for( var i = 0; i < recentTypeNames.length; i++ ) {
            var type = _cmm.getType( recentTypeNames[ i ] );
            if( type &&
                ( filterTypes.length === 0 || _.intersection( filterTypes, type.typeHierarchyArray ).length > 0 ) ) {
                uids.push( type.uid );
                recentUsedTypes.push( type );
            }
        }

        if( data.maxRecentTypeCount ) {
            uids = _.slice( uids, 0, data.maxRecentTypeCount );
            recentUsedTypes = _.slice( recentUsedTypes, 0, data.maxRecentTypeCount );
        }

        _dmSrv.loadObjects( uids ).then( function() {
            data.recentUsedTypes = recentUsedTypes;
            data.recentUsedTypes.length = recentUsedTypes.length;
            deferred.resolve( null );
        } );
    } );

    return deferred.promise;
};

/**
 * Update the recent model types preference
 *
 * @param {String} recentTypeName -
 */
export let updateRecentUsedTypes = function( recentTypeName ) {
    if( recentTypeName ) {
        _objTypesSrv.updateRecentModelTypes( recentTypeName );
    }
};

/**
 * Get input data for object creation.
 *
 * @param {Object} data - the view model data object
 * @return {Object} create input
 */
export let getCreateInput = function( data ) {
    var createInputMap = {};
    createInputMap[ '' ] = _getCreateInputObject( data.objCreateInfo.createType, {}, {} );

    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );
        if( vmProp && ( vmProp.isAutoAssignable || _uwPropSrv.isModified( vmProp ) ) ) {
            _processPropertyForCreateInput( propName, vmProp, createInputMap );
        }
    } );

    // 'data.workflowData' and 'data.dataToBeRelated' need be set properly at application's Add panel if they are required for create input.
    var dataToBeRelated = data.dataToBeRelated;
    if( !dataToBeRelated ) {
        dataToBeRelated = {};
    }

    _fileInputForms = data.fileInputForms;
    if( !_fileInputForms ) {
        _fileInputForms = [];
    }

    _.forEach( data.customPanelInfo, function( customPanelVMData ) {
        // copy custom panel's dataToBeRelated
        var customDataToBeRelated = customPanelVMData.dataToBeRelated;
        if( customDataToBeRelated ) {
            dataToBeRelated = Object.assign( dataToBeRelated, customDataToBeRelated );
        }

        // copy custom panel's fileInputForms
        var customFileInputForms = customPanelVMData.fileInputForms;
        if( customFileInputForms ) {
            _fileInputForms = _fileInputForms.concat( customFileInputForms );
        }

        // copy custom panel's properties
        var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
        _.forEach( oriVMData, function( propVal, propName ) {
            if( _.has( customPanelVMData, propName ) ) {
                var vmProp = customPanelVMData[ propName ];
                _processPropertyForCreateInput( propName, vmProp, createInputMap );
            }
        } );
    } );

    // In order to use 'data.workflowData', awp0ProcessTemplates must be set on objects
    // XRT Create Descriptor ( <property name="revision:awp0ProcessTemplates" ></property>).
    // Setting it will expose the Workflow drop down selection list and enable the user to
    // select a workflow process temaplate that will be used to submit the newly creaated object.
    var workflowData = {};
    if( data.revision__awp0ProcessTemplates ) {
        if( data.revision__awp0ProcessTemplates.dbValue ) {
            workflowData = {
                submitToWorkflow: [ '1' ],
                workflowTemplateName: [ data.revision__awp0ProcessTemplates.dbValue ]
            };
        }
    } else if( data.workflowData ) {
        workflowData = data.workflowData;
    }

    // store for later use
    data.filesToBeRelated = dataToBeRelated.attachFiles;

    //
    // Check if creation is conditional for a set of valid types
    // Do not send target as part of creation, this is likely creation under object set
    // Object set cases could override the server's default paste behavior.
    //

    data.pasteOnTargetCondition = false;

    return [ {
        clientId: 'CreateObject',
        createData: _.get( createInputMap, '' ),
        dataToBeRelated: dataToBeRelated,
        workflowData: workflowData,
        targetObject: null,
        pasteProp: ''
    } ];
};

/**
 * Get the search keywords string from current search result
 *
 * @param {Object} data the view model data object
 */
export let updateResultKeyWords = function( data ) {
    var searchKeyword = appCtxService.ctx.searchCriteria;
    var totalFound = data.totalFound;
    var thresholdExceeded = appCtxService.ctx.searchIncontextInfo.thresholdExceeded;
    var KeyWordsString = null;
    if( totalFound === 0 && thresholdExceeded === 'true' ) {
        localeService.getLocalizedTextFromKey( 'UIMessages.thresholdExceeded' ).then( result => {
            KeyWordsString = result.format( searchKeyword );
            _uwPropSrv.updateDisplayValues( data.keyWord, [ KeyWordsString ] );
        } );
    } else {
        localeService.getLocalizedTextFromKey( 'UIMessages.results' ).then( result => {
            KeyWordsString = searchKeyword + ' (' + totalFound + ' ' + result + ')';
            _uwPropSrv.updateDisplayValues( data.keyWord, [ KeyWordsString ] );
        } );
    }
};

/**
 * update the performSearch searchCriteria variable
 * also removes the list of expanded categories from the search criteria when performing a new search
 * @param {Object} data the view model data object
 *
 */
var updateSearchCriteria = function( data ) {
    if( data.searchBox ) {
        if( !appCtxService.ctx.searchInfo ) {
            appCtxService.ctx.searchInfo = {};
        }
        appCtxService.ctx.searchInfo.incontextSearchNew = 'true';
        appCtxService.ctx.searchCriteria = data.searchBox.dbValue;
        var incontextSearchFilterPanelCtx = appCtxService.getCtx( 'incontextSearchFilterPanel' );
        if( incontextSearchFilterPanelCtx && incontextSearchFilterPanelCtx.listOfExpandedCategories ) {
            delete incontextSearchFilterPanelCtx.listOfExpandedCategories;
            appCtxService.updatePartialCtx( 'incontextSearchFilterPanel', incontextSearchFilterPanelCtx );
        }
    }
};

/**
 * Process response of findDisplayableSubBusinessObjectsWithDisplayNames SOA
 * @param {Object} response - response of findDisplayableSubBusinessObjectsWithDisplayNames SOA
 * @returns {StringArray} type names array
 */
var processSoaResponse = function( response ) {
    var typeNames = [];
    if( response.output ) {
        for( var ii = 0; ii < response.output.length; ii++ ) {
            var displayableBOTypeNames = response.output[ ii ].subTypeNames;
            for( var jj = 0; jj < displayableBOTypeNames.length; jj++ ) {
                var SearchFilter = {
                    searchFilterType: 'StringFilter',
                    stringValue: ''
                };
                SearchFilter.stringValue = displayableBOTypeNames[ jj ];
                typeNames.push( SearchFilter );
            }
        }
    }
    return typeNames;
};

/**
 * Find Subtype Business Object
 * @param {Object} data the view model data object
 */
export let findSubBusinessObjectsAndInvokeSearch = function( data ) {
    var subBusinessObjects = null;
    // showSearchFilter is set for the condition of showing the Search-Filter panel
    data.showSearchFilter = true;
    data.selectedSearchFilters = [];
    updateSearchCriteria( data );
    var inputData = {
        inBOTypeNames: []
    };
    // if user added type-filter, then the inputData.input.boTypeName is set to typeFilter[0].
    // User who don't use type-filter or the value is "", by default the inputData.input = []
    if( data.typeFilter ) {
        var typeFilter = data.typeFilter.split( ',' );
        for( var type in typeFilter ) {
            if( typeFilter.hasOwnProperty( type ) ) {
                inputData.inBOTypeNames.push( {
                    typeName: typeFilter[ type ],
                    contextName: 'subtypes',
                    exclusionPreference: ''
                } );
            }
        }
        filterPanelUtils.setHasTypeFilter( true );
    } else {
        filterPanelUtils.setHasTypeFilter( false );
    }

    filterPanelUtils.setPresetFilters( true );

    _soaService.postUnchecked( 'Core-2013-05-DataManagement', 'getSubTypeNames', inputData ).then( function( response ) {
        if( response ) {
            subBusinessObjects = processSoaResponse( response );
            if( !data.typeFilter ) {
                data.searchFilterMap = {};
            } else {
                data.searchFilterMap = {
                    'WorkspaceObject.object_type': subBusinessObjects
                };
            }
            if( data.searchFilter ) {
                try {
                    exports.processSearchFilters( data.searchFilter, data.searchFilterMap ).then( function( processResultResponse ) {
                        if( processResultResponse !== null ) {
                            data.searchFilterMap = processResultResponse.searchFilterMap;
                            if( processResultResponse.hasInvalidFilter ) {
                                filterPanelUtils.displayPrefilterError( data.searchFilter );
                            }
                            filterPanelUtils.saveIncontextFilterMap( data );
                            eventBus.publish( 'searchResultItems.doSearch' );
                        }
                    } );
                } catch ( e ) {
                    filterPanelUtils.displayPrefilterError( data.searchFilter );
                    filterPanelUtils.saveIncontextFilterMap( data );
                    eventBus.publish( 'searchResultItems.doSearch' );
                }
            } else {
                filterPanelUtils.saveIncontextFilterMap( data );
                eventBus.publish( 'searchResultItems.doSearch' );
            }
        }
    } );
};

/**
 * Process Search Filters.
 *
 * @param {String} searchFilter - The search filter to be processed
 *
 * @param {String} searchFilterMap - The existing search filter map
 *
 * @return {processResult} the process result that contains the processed search filter map and error info.
 */
export let processSearchFilters = function( searchFilter, searchFilterMap ) {
    var processResult = {};
    var _searchFilterMap = searchFilterMap;
    var hasInvalidFilter = false;

    var filterNameValues = searchFilter.split( ' AND ' );
    var aTypePropertyNames = [];
    for( var ii = 0; ii < filterNameValues.length; ii++ ) {
        var aFilterNameValue = filterNameValues[ ii ].split( '=' );
        var aTypeProperty = aFilterNameValue[ 0 ].split( '.' );
        aTypePropertyNames[ ii ] = aTypeProperty[ 0 ].trim();
    }
    return _soaService.ensureModelTypesLoaded( aTypePropertyNames ).then( function() {
        for( var ii = 0; ii < filterNameValues.length; ii++ ) {
            var aSearchFilter;
            var aFilterNameValue = filterNameValues[ ii ].split( '=' );
            var aTypeProperty = aFilterNameValue[ 0 ].split( '.' );
            var filterType;
            var aTypePropertyName = aTypeProperty[ 0 ].trim();
            var toIndex = aFilterNameValue[ 1 ].indexOf( ' TO ' );
            if( aTypePropertyName === 'Classification' ) {
                //it's a classification filter, no support yet.
                hasInvalidFilter = true;
                logger.error( 'Classification filter is not supported and will be ignored:', filterNameValues[ ii ] );
                continue;
            } else {
                var type = _cmm.getType( aTypePropertyName );
                if( !type ) {
                    hasInvalidFilter = true;
                    logger.error( 'The pre-filter will be ignored because the specified type cannot be found:',
                        aTypeProperty[ 0 ] );
                    continue;
                }
                var aPropertyName = aTypeProperty[ 1 ].trim();
                var propName = filterPanelUtils.getPropertyFromFilter( aPropertyName );
                var pd = type.propertyDescriptorsMap[ propName ];
                if( !pd ) {
                    hasInvalidFilter = true;
                    logger.error( 'The pre-filter will be ignored because the specified property cannot be found:',
                        propName );
                    continue;
                }
                filterType = filterPanelUtils.getFilterType( pd.valueType );

                var aFilterValue = aFilterNameValue[ 1 ].trim();
                if( toIndex !== -1 ) {
                    aSearchFilter = filterPanelUtils.getRangeSearchFilter( filterType, aFilterValue );
                } else {
                    aSearchFilter = filterPanelUtils.getSingleSearchFilter( filterType, aFilterValue );
                }

                if( aSearchFilter ) {
                    var categoryName = aFilterNameValue[ 0 ].trim();
                    var existingFilters = _searchFilterMap[ categoryName ];
                    if( filterPanelUtils.getHasTypeFilter() && categoryName === PRESET_CATEGORY || !existingFilters ) {
                        _searchFilterMap[ categoryName ] = [ aSearchFilter ];
                    } else {
                        _searchFilterMap[ categoryName ].push( aSearchFilter );
                    }
                    if( filterPanelUtils.getHasTypeFilter() && categoryName === PRESET_CATEGORY ) {
                        filterPanelUtils.setPresetFilters( false );
                    }
                } else {
                    hasInvalidFilter = true;
                }
            }
        }
        processResult.searchFilterMap = _searchFilterMap;
        processResult.hasInvalidFilter = hasInvalidFilter;
        return processResult;
    } );
};

/**
 * Update navigate (non-hierarchical) search filter
 *
 * @param {Object} data the view model data object
 * @param {Object} category category
 * @param {Object} filter filter
 */
export let updateSearchFilter = function( data, category, filter ) {
    if( !category || !filter ) {
        return;
    }

    // Determine search category and filter
    if( !_.isEmpty( category ) ) {
        var categoryName = filter.categoryName ? filter.categoryName : category.internalName;
        var searchCategoryFilter;
        if( filterPanelUtils.getHasTypeFilter() && categoryName === PRESET_CATEGORY ) {
            if( filterPanelUtils.isPresetFilters() ) {
                searchCategoryFilter = null;
            } else {
                searchCategoryFilter = data.searchFilterMap[ categoryName ];
            }
        } else {
            searchCategoryFilter = data.searchFilterMap[ categoryName ];
        }
        var searchFilter = _.find( data.sourceSearchFilterMap[ categoryName ], function( o ) {
            return o.stringValue === filter.internalName;
        } );

        // Find the search filter in the currently active category
        var index = _.findIndex( searchCategoryFilter, function( selectedFilter ) {
            return selectedFilter.stringDisplayValue === searchFilter.stringDisplayValue ||
                selectedFilter.stringValue === searchFilter.stringValue;
        } );

        // If the filter was active, log to AW analytics as a filter removal, otherwise log as filter add
        var sanEvent;
        if( index > -1 ) {
            sanEvent = {
                sanCommandId: 'removeSearchFilter',
                sanCommandTitle: 'Remove Search Filter',
                sanCmdLocation: 'toolsInfoSearchPanel'
            };
        } else {
            sanEvent = {
                sanCommandId: 'addSearchFilter',
                sanCommandTitle: 'Add Search Filter',
                sanCmdLocation: 'toolsInfoSearchPanel'
            };
        }
        analyticsSvc.logNonDeclarativeCommands( sanEvent );
    }

    exports.updateFilter( data, category.internalName, filter, true );
};

/**
 * Update hierarchical search filter
 *
 * @param {Object} data the view model data object
 * @param {Object} category category
 * @param {Object} node hierarchical node
 */
export let updateHierarchicalSearchFilter = function( data, category, node ) {
    if( !category || !node ) {
        return;
    }

    var filter = {};
    filter.categoryName = category.internalName;
    filter.internalName = node.stringValue;
    //Check if data.searchFilterMap already contains hierarchical category, remove if it exists.
    if( data.searchFilterMap[ category.internalName ] !== undefined ) {
        data.searchFilterMap[ category.internalName ] = '';
    }
    exports.updateFilter( data, category.internalName, filter, true, category.type );
};

/**
 * Update search date/numeric range filter
 *
 * @param {Object} data the view model data object
 * @param {Object} category -
 * @param {Object} rangeType -
 * @param {Integer} startValue -
 * @param {Integer} endValue -
 */
function _updateSearchRangeFilter( data, category, rangeType, startValue, endValue ) {
    var categoryName = category.internalName;

    if( !categoryName || !startValue && !endValue ) {
        return;
    }

    var filter = {};
    filter.categoryName = categoryName;
    if( rangeType === filterPanelUtils.DATE_RANGE_FILTER ) {
        filter.internalName = filterPanelUtils.getDateRangeString( startValue, endValue );
    } else {
        filter.internalName = filterPanelUtils.getNumericRangeString( startValue, endValue );
    }
    filter.categoryType = rangeType;
    exports.updateFilter( data, categoryName, filter, true );
}

/**
 * Update search date range filter
 *
 * @param {Object} data the view model data object
 * @param {Object} category - the category
 */
export let updateSearchDateRangeFilter = function( data, category ) {
    var startValue = category.daterange.startDate.dateApi.dateObject;
    var endValue = category.daterange.endDate.dateApi.dateObject;
    _updateSearchRangeFilter( data, category, filterPanelUtils.DATE_RANGE_FILTER, startValue, endValue );
};

/**
 * Update search numeric range filter
 *
 * @param {Object} data - the view model data object
 * @param {Object} category - the category
 */
export let updateSearchNumericRangeFilter = function( data, category ) {
    var startValue = category.numericrange.startValue.dbValue;
    var endValue = category.numericrange.endValue.dbValue;
    _updateSearchRangeFilter( data, category, filterPanelUtils.NUMERIC_RANGE_FILTER, startValue, endValue );
};

/**
 * Update keyword filter
 *
 * @param {Object} data the view model data object
 * @param {Object} prop view model property
 * @param {Object} filterValue filter value
 *
 */
export let updateKeywordFilters = function( data, prop, filterValue ) {
    // Log filter removal to AW analytics
    var sanEvent = {
        sanCommandId: 'removeSearchFilterCrumb',
        sanCommandTitle: 'Remove Crumb Filter',
        sanCmdLocation: 'toolsInfoSearchPanel'
    };

    analyticsSvc.logNonDeclarativeCommands( sanEvent );

    var categoryName = prop.searchResultCategoryInternalName;
    if( filterValue !== null ) {
        exports.updateFilter( data, categoryName, filterValue, false );
    } else {
        _.forEach( prop.filterValues, function( filterValue ) {
            exports.updateFilter( data, categoryName, filterValue, false, filterValue.searchFilterType );
        } );
    }
};
/**
 * Update filter
 *
 * @param {Object} data - the view model data object
 * @param {Object} categoryName - category name
 * @param {Object} filter - filter
 * @param {Object} addFlag - add flag, true to add filter, false to remove filter
 * @param {Object} categoryType - category type
 */
export let updateFilter = function( data, categoryName, filter, addFlag, categoryType ) {
    categoryName = filter.categoryName ? filter.categoryName : categoryName;
    var searchFilter;
    var isDateFilter = filter.type === filterPanelUtils.DATE_FILTER;
    if( !isDateFilter ) {
        isDateFilter = filter.type === filterPanelUtils.DATE_DRILLDOWN_FILTER;
    }
    var isDateRange = filter.categoryType === filterPanelUtils.DATE_RANGE_FILTER;
    var isNumericRange = filter.categoryType === filterPanelUtils.NUMERIC_RANGE_FILTER;

    if( isDateRange ) {
        //if daterange exists for the category, delete and re-add new date range
        searchFilter = _.find( data.sourceSearchFilterMap[ categoryName ], function( o ) {
            return o.selected === true;
        } );
        if( searchFilter ) {
            delete data.searchFilterMap[ categoryName ];
            searchFilter = null;
        }
        if( addFlag ) {
            searchFilter = filterPanelUtils.getDateRangeFilter( filter.internalName.substring( 12,
                filter.internalName.length ) );
        }
    } else if( isNumericRange ) {
        var searchFilterMap = data.searchFilterMap[ categoryName ];
        //if numericrange exists for the category, delete and re-add new date range
        var index = _.findIndex( searchFilterMap, function( o ) {
            return _.startsWith( o.startEndRange, filterPanelUtils.NUMERIC_RANGE );
        } );

        if( index > -1 ) {
            //Remove range from list of values
            searchFilterMap.splice( index, 1 );
            data.searchFilterMap[ categoryName ] = searchFilterMap;
            searchFilter = null;
        }
        if( addFlag ) {
            searchFilter = filterPanelUtils.getNumericRangeFilter( filter.internalName.substring( 14,
                filter.internalName.length ) );
        }
    } else {
        searchFilter = _.find( data.sourceSearchFilterMap[ categoryName ], function( o ) {
            return o.stringValue === filter.internalName || o.stringValue === filter.stringValue;
        } );
    }
    if( !searchFilter ) {
        return;
    }
    if( categoryType === 'ObjectFilter' ) {
        searchFilter.searchFilterType = 'StringFilter';
    } else if( !isNumericRange && searchFilter.searchFilterType === 'NumericFilter' ) {
        //non-range numeric filter needs to be treated as StringFilter in performSearchViewModel4 SOA
        searchFilter.searchFilterType = 'StringFilter';
    }

    if( searchFilter.searchFilterType === 'StringFilter' && searchFilter.stringValue === '$NONE' ) {
        searchFilter.endDateValue = '';
        searchFilter.startDateValue = '';
    }

    //put new category filter to search filter map
    var searchCategoryFilter = null;

    if( filterPanelUtils.getHasTypeFilter() && categoryName === PRESET_CATEGORY ) {
        if( filterPanelUtils.isPresetFilters() ) {
            searchFilter.selected = false;
            searchCategoryFilter = null;
        } else {
            searchCategoryFilter = data.searchFilterMap[ categoryName ];
        }
    } else {
        searchCategoryFilter = data.searchFilterMap[ categoryName ];
    }
    if( !searchCategoryFilter ) {
        if( addFlag ) {
            data.searchFilterMap[ categoryName ] = [ searchFilter ];
            if( filterPanelUtils.getHasTypeFilter() && categoryName === PRESET_CATEGORY ) {
                filterPanelUtils.setPresetFilters( false );
            }
        } else {
            //In the case of REMOVING multiple filters, if the parent filter (e.g. Year filter) was removed,
            //the month, week, and day filters would have been removed with it, so in this case we should just return,
            //instead of putting the leaf filters back to filter map. AW-47270
            return;
        }
    } else {
        _processSearchCategoryFilter( searchCategoryFilter, data, searchFilter, categoryName, isDateFilter );
    }
};

/**
 * when calling createRelations SOA , based on the secondaryObject's length, create the different SOA input
 *
 * @param {Object} data the view model data object
 */
export let getCreateRelationsInput = function( data ) {
    var input = [];
    for( var secondObj in data.sourceObjects ) {
        var primaryObjectInrelation = data.targetObject;
        var secondaryObjectInrelation = data.sourceObjects[ secondObj ];
        var relationName = data.creationRelation.dbValue;
        var s2pSubString = 'S2P:';
        if( _.includes( relationName, s2pSubString ) ) {
            primaryObjectInrelation = data.sourceObjects[ secondObj ];
            secondaryObjectInrelation = data.targetObject;
            relationName = relationName.replace( 'S2P:', '' );
        }
        var inputData = {
            primaryObject: primaryObjectInrelation,
            secondaryObject: secondaryObjectInrelation,
            relationType: relationName,
            clientId: '',
            userData: {
                uid: 'AAAAAAAAAAAAAA',
                type: 'unknownType'
            }
        };
        input.push( inputData );
    }
    return input;
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} the response of createRelateAndSubmitObjects SOA call
 * @return the created object
 */
export let getCreatedObject = function( response ) {
    var createdObjects = exports.getCreatedObjects( response );
    if( createdObjects && createdObjects.length > 0 ) {
        return createdObjects[ 0 ];
    }
    return null;
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} response - the response of createRelateAndSubmitObjects SOA call
 * @return {ObjectArray} Array of created objects
 */
 export let getCreatedObjects = function( response ) {
    var addObjectCtx = appCtxService.getCtx( 'addObject' );
    var newObjects = [];

    var validTypes = addObjectCtx && _.isArray( addObjectCtx.validTypes ) ? addObjectCtx.validTypes : [];

    if( response.output ) {
        for( var index in response.output ) {
            if( response.output[ index ].objects ) {
                var newObject = response.output[ index ].objects[ 0 ];
                newObject = cdm.getObject( newObject.uid );

                // If the created Object is a subtype of Item, then take its item revision
                if( newObject.modelType.typeHierarchyArray.indexOf( 'Item' ) > -1 ) {
                    if( validTypes.indexOf( newObject.type ) === -1 ) {
                        var itemRevPastedOnTarget = true;
                        if( newObject.modelType.constantsMap &&
                            newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate ) {
                            if( newObject.modelType.constantsMap.Fnd0ItemRevPasteOnTargetUponCreate === 'false' ) {
                                itemRevPastedOnTarget = false;
                            }
                        }
                        if( itemRevPastedOnTarget ) {
                            var createdItemObj = cdm.getObject( newObject.uid );
                            if( createdItemObj && createdItemObj.props && createdItemObj.props.revision_list ) {
                                newObject = cdm.getObject( createdItemObj.props.revision_list.dbValues[ 0 ] );
                            } else if( response.output[ index ].objects.length >= 3 ) {
                                // TODO: remove this when all consumers load revision_list property
                                // Assuming the [2] element is Item Revision !!!
                                newObject = response.output[ index ].objects[ 2 ];
                            }
                        }
                    }
                }
                newObjects.push( newObject );
            }
        }
    }
    return newObjects;
};

/**
 * For create relation operation, get the source and target model objects to be used in the eventData of
 *cdm.relatedModified event.
 *
 * @param {ObjectArray} sourceObjects The source view model objects
 * @param {ObjectArray} targetObject The target view model objects
 * @param {String} relationName The relation name string
 * @return {Object} An object containing the source and target model objects array
 */
export let getModelObjectsForCreateRelation = function( sourceObjects, targetObjects, relationName ) {
    var retObj = {};
    var sObjects = _.transform( sourceObjects, function( objects, n ) {
        if( n && n.uid ) {
            var obj = cdm.getObject( n.uid );
            if( obj ) {
                objects.push( obj );
            }
        }
        return true;
    }, [] );

    retObj.sourceModelObjects = sObjects;

    if( _.includes( relationName, 'S2P:' ) ) {
        // For reverse relation i.e. secondary to primary e.g. S2P:Cm0BeforeDependency,
        // then both the target object is same as source objects.
        retObj.targetModelObjects = sObjects;
    } else {
        var tObjects = _.transform( targetObjects, function( objects, n ) {
            if( n && n.alternateID ) {
                var obj = n;
            } else if( n && n.uid ) {
                var obj = cdm.getObject( n.uid );
            }
            if( obj ) {
                objects.push( obj );
            }
            return true;
        }, [] );

        retObj.targetModelObjects = tObjects;
    }

    return retObj;
};

/**
 * Sort projects
 *
 * @param {Object} projects - unsorted projects
 * @param {Object} sortCriteria - the sort criteria
 * @returns {ObjectArray} The sorted projects array
 */
export let sortProjects = function( projects, sortCriteria ) {
    var fieldName = sortCriteria[ 0 ].fieldName;
    var ind = fieldName.indexOf( '.' );
    if( ind > 0 ) {
        fieldName = fieldName.substring( ind + 1, fieldName.length );
    }

    var foundProps = [];
    _.forEach( projects, function( project ) {
        var props = project.props;
        var tmpProp = {
            id: props.project_id.uiValues[ 0 ],
            value: props[ fieldName ].uiValues[ 0 ]
        };

        foundProps.push( tmpProp );
    } );

    var tmpProjects = _.sortBy( foundProps, 'value' );

    if( sortCriteria[ 0 ].sortDirection === 'DESC' ) {
        tmpProjects.reverse();
    }
    var newProjects = [];
    _.forEach( tmpProjects, function( proj ) {
        var index = _.findIndex( projects, function( project ) {
            return project.props.project_id.uiValues[ 0 ] === proj.id;
        } );
        if( index > -1 ) {
            newProjects.push( projects[ index ] );
        }
    } );

    return newProjects;
};

/**
 * Get projects
 *
 * @param {response} response the response of getProperties SOA call
 * @returns {ObjectArray} The projects array
 */
export let getProjects = function( response ) {
    var projects = null;
    if( response.availableProjectList ) {
        projects = _.values( response.availableProjectList );
    } else {
        projects = _.values( response.modelObjects );
    }
    projects = _.filter( projects, function( o ) {
        return o.type === 'TC_Project';
    } );
    return projects;
};

/**
 * Get file format type
 *
 * @param {Object} data - The view model data
 * @return {String} true if file format is TEXT, else false
 */
export let getFileFormat = function( data ) {
    var isText = false;
    if( data.reference.dbValue ) {
        isText = data.reference.dbValue.fileFormat === 'TEXT';
    }
    return isText;
};

/**
 * Sets the file name
 * @param {Object} data - The view model data
 */
export let initDSCreateParams = function( data ) {
    data.datasetName.dbValue = data.fileNameNoExt;
    data.datasetDesc.dbValue = null;

    data.isDatasetCreate = true;

    if( data.fileName && data.fileName.length > 0 && !data.validFile ) {
        // Reset dataset type and reference value
        data.datasetType.dbValue = null;
        data.reference.dbValue = null;
    }
};

/**
 * Get Dataset Types
 *
 * @param {Object} response the response of getDatasetTypesWithDefaultRelation SOA call
 * @returns {ObjectArray} Array of list model objects
 */
export let getDatasetTypeFromTypeInfo = function( response ) {
    var datasetTypeList = [];
    datasetTypeList.push( cdm.getObject( response.infos[ 0 ].tag.uid ) );
    return listBoxSvc.createListModelObjects( datasetTypeList, 'props.datasettype_name' );
};

/**
 * Get Dataset Types list
 *
 * @param {Object} response - the response of getDatasetTypesWithDefaultRelation SOA call
 * @param {Array} datasetTypeList - datasetType list array
 * @param {Object} datasetType - dataset type model object
 * @returns {ObjectArray} Array of list model objects
 */
export let getDatasetTypesFromTypesWithRelInfo = function( response, datasetTypeList, datasetType ) {
   let datasetTypeListIn = [];
   const outputArray = response.output[ 0 ].datasetTypesWithDefaultRelInfo;
   let originalType;
   let originalTypeUiValue;
   if( datasetTypeList && datasetTypeList.length === 1 ) {
       originalType = datasetTypeList[ 0 ].propInternalValue;
       originalTypeUiValue = datasetTypeList[ 0 ].propDisplayValue;
   }
   _.forEach( outputArray, entry => {
       let datasetTypeObj = cdm.getObject( entry.datasetType.uid );
       if( datasetType && datasetType.valueUpdated && entry.datasetType && entry.datasetType.props && entry.datasetType.props.datasettype_name &&
           entry.datasetType.props.datasettype_name.uiValues[ 0 ].toUpperCase() === datasetType.uiValue.toUpperCase() ) {
           datasetTypeListIn = [ datasetTypeObj, ...datasetTypeListIn ];
       } else if( originalTypeUiValue && originalTypeUiValue.toUpperCase() === entry.datasetType.props.datasettype_name.uiValues[ 0 ].toUpperCase() ) {
           datasetTypeListIn = [ originalType, ...datasetTypeListIn ];
       } else {
           datasetTypeListIn = [ ...datasetTypeListIn, datasetTypeObj ];
       }
   } );
   return listBoxSvc.createListModelObjects( datasetTypeListIn, 'props.datasettype_name' );
};

/**
 * Get the References list
 *
 * @param {Object} response the response of getDatasetTypeInfo SOA call
 * @returns {ObjectArray} Array of list model objects
 */
export let getReferences = function( response ) {
    var refInfos = response.infos[ 0 ].refInfos;
    return listBoxSvc.createListModelObjects( refInfos, 'referenceName' );
};

/**
 * Get the File extension, strip off the .*
 * If there are multiple extension with same reference name, merge them
 *
 * @param {Object} response the response
 * @returns {String} - extension
 */
export let getFileExtension = function( response ) {
    var refInfos = response.infos[ 0 ].refInfos;
    var tempRefName;
    var finalFileExts;
    //append file extension to one string when they have same reference name
    _.forEach( refInfos, function( refInfo ) {
        var fileExtension = refInfo.fileExtension;
        var validFileExt = fileExtension.trim();
        validFileExt = validFileExt.replace( '.', '' );
        validFileExt = validFileExt.replace( '*', '' );

        if( _.isEmpty( tempRefName ) ) {
            tempRefName = refInfo.referenceName;
            finalFileExts = validFileExt;
        } else {
            if( tempRefName === refInfo.referenceName ) {
                finalFileExts += ',.' + validFileExt;
            }
        }
    } );
    return finalFileExts;
};

const syncPropWithPropDesc = ( propValue, propDesc ) => {
    if( propDesc ) {
        propValue.isArray = propDesc.anArray;
        propValue.isCharArray = propDesc.valueType === 1;
        propValue.displayName = propDesc.displayName;
        propValue.maxLength = propDesc.maxLength;
        propValue.maxArraySize = propDesc.maxArraySize ? propDesc.maxArraySize : -1;
        const constantsMap = propDesc.constantsMap;
        if( constantsMap ) {
            propValue.value = constantsMap.initialValue;
            propValue.initialValue = constantsMap.initialValue;
            propValue.isEditable = constantsMap.editable === '1';
            propValue.isRequired = constantsMap.required === '1';
            propValue.isAutoAssignable = constantsMap.autoassignable === '1';
            propValue.isRichText = constantsMap.Fnd0RichText === '1';
            propValue.isEnabled = constantsMap.editable ? constantsMap.editable === '1' : true;
            propValue.referenceTypeName = constantsMap.ReferencedTypeName || '';
            if( propValue.propType === 'DATE' || propValue.propType === 'DATEARRAY' ) {
                //from SOA getTypeDescriptions2, timeEnabled is undefined when Fnd0EnableTimeForDateProperty is default false.
                propValue.isTimeEnabled = _.isUndefined( constantsMap.timeEnabled ) ? false : constantsMap.timeEnabled === '1';
            }
        }
    }
};

/**
 * Update the References list
 *
 * @param {Object} data - The view model data
 */
export let updateTypeAndReferences = function( data ) {
   // Update creationType
    data.creationType = data.datasetType.dbValue;
    // eslint-disable-next-line no-nested-ternary
    const typeInfo = typeof data.creationType === 'string' ?
        _cmm.getType( data.creationType ) :
        data.creationType.props.datasettype_name ? _cmm.getType( data.creationType.props.datasettype_name.dbValues[0] ) : null;
    if( typeInfo ) {
        const objectNamePropDesc = typeInfo.propertyDescriptorsMap.object_name;
        const objectDescPropDesc = typeInfo.propertyDescriptorsMap.object_desc;
        syncPropWithPropDesc( data.datasetName, objectNamePropDesc );
        syncPropWithPropDesc( data.datasetDesc, objectDescPropDesc );
    }

    // Update references
    var outputArray = data.datasetTypesWithDefaultRelInfo;
    if( outputArray ) {
        var referenceObj;
        _.forEach( outputArray, function( entry ) {
            var datasetTypeObj = cdm.getObject( entry.datasetType.uid );
            var dobj = _.get( datasetTypeObj, 'props.object_string' );
            if( dobj.dbValues[ 0 ] === data.datasetType.dbValue.props.object_string.dbValues[ 0 ] ) {
                referenceObj = entry.refInfos;
            }
        } );
        data.references = listBoxSvc.createListModelObjects( referenceObj, 'referenceName' );
    }
};

/**
 * Get all of the potential relations the target object can have to the given type
 *
 * @param {String} typeName ID of the type that is being created
 * @param {ModelObject} targetObject The target that is being added to
 * @returns {List<String>} All valid relations
 */
const getAllRelations = function( typeName, targetObject ) {
    return _soaService.postUnchecked( 'Core-2014-10-DataManagement', 'getPasteRelations2', {
            inputs: [ {
                obj: targetObject,
                childTypeName: typeName
            } ]
        } )
        .then( response => response.outputs[ 0 ].pasteRelInfo.map( x => x.pastRelName ) );
};

const getTypeName = type => ( type.props.datasettype_name || type.props.type_name ).dbValues[ 0 ];

/**
 * Update the RelationList
 *
 * @param {Object} data the view model data object
 * @param {Object} typeName name of the currently selected type
 * @returns {ObjectArray} - List of list model objects
 */
export let updateRelationList = function( data, typeName, objectSourceSet = null ) {
    //get the full type information for the selected type
    typeName = typeName || getTypeName( data.creationType );
    //must load type to check hierarchy from object set
    return _soaService.ensureModelTypesLoaded( [ typeName ] )
        .then( () => {
            const typeInfo = _cmm.getType( typeName );
            const relationMap = data.relationMap;
            const configuredRelations = _.uniq( Object.keys( relationMap ).reduce( ( acc, srcTypeName ) => {
                return _cmm.isInstanceOf( srcTypeName, typeInfo ) || _cmm.isInstanceOf( getNonRevisionType( srcTypeName ), typeInfo ) ? [ ...acc, ...relationMap[ srcTypeName ] ] :
                    acc;
            }, [] ) );
            ( configuredRelations.length === 0 ? getAllRelations( typeName, data.targetObject ) : AwPromiseService.instance.resolve( [] ) )
            .then( allRelations => {
                const relations = [ ...configuredRelations, ...allRelations ];
                return _soaService.ensureModelTypesLoaded( relations )
                    .then( () => {
                        // LCS-638566 Filter out runtime properties so that the runtime properties are not displayed in relation list.
                        // But if there are only runtime properties, return the first one as the default
                        let filteredRelations = _.filter( relations, function( relation ) {
                            return _cmm.getType( relation ) !== null && _cmm.getType( relation ) !== undefined;
                        } );
                        if( filteredRelations.length === 0 ) {
                            filteredRelations.push( relations[0] );
                        }
                        data.relationList = listBoxSvc.createListModelObjectsFromStrings( filteredRelations );
                        if( data.defaultRelation ) {
                            if( data.defaultRelation.name ) {
                                data.creationRelation.dbValue = data.defaultRelation.name;
                            } else {
                                //no default relation configured
                                data.creationRelation.dbValue = data.relationList[ 0 ].propInternalValue;
                            }
                        }
                        var relationArray = [];
                        _.forEach( data.relationList, function( relation ) {
                            relationArray.push( relation.propInternalValue );
                        } );
                        var typeIsNotValidForObjectSet = configuredRelations.length === 0;
                        if( typeIsNotValidForObjectSet && objectSourceSet ) {
                            _messagingService.reportNotyMessage( data, data._internal.messages, 'invalidObjectWarning' );
                        }
                        return listBoxSvc.createListModelObjectsFromStrings( relationArray );
                    } );
            } );
        } );
};

export let backToTypeSelPanel = function( data ) {
    if( data.selectedTab.panelId === 'newTabPageSub' ) {
        data.creationType = null;
        data.objCreateInfo = null;
        data.isDatasetCreate = false;
        data.validFile = false;
    }
};

export let updateTargetObject = function( data ) {
    var contextUid = data.eventMap[ 'breadcrumb.navigation' ].contextUid;
    var existingObj = appCtxService.getCtx( 'addObject.targetObject' );
    if( contextUid && existingObj.uid !== contextUid ) {
        var modelObject = cdm.getObject( contextUid );
        if( modelObject && !_.isEmpty( modelObject.props ) ) {
            appCtxService.updatePartialCtx( 'addObject.targetObject', modelObject );
        }
    }
};

export let uploadFilePreinit = function( _uid, _ticket, _filename ) {
    var deferred = AwPromiseService.instance.defer();

    var callbackFailure = function() {
        removeListeners();
        deferred.reject( 'Upload failed' );
    };

    var callbackSuccess = function() {
        removeListeners();
        deferred.resolve( 'Upload succeeded' );
    };

    var removeListeners = function() {
        window.top.document.removeEventListener( 'fmsuploadfailed', callbackFailure );
        window.top.document.removeEventListener( 'fmsuploadsuccess', callbackSuccess );
    };

    window.top.document.addEventListener( 'fmsuploadsuccess', callbackSuccess, false );
    window.top.document.addEventListener( 'fmsuploadfailed', callbackFailure, false );

    // Call the host to initialize the upload
    eventBus.publish( 'hosting.fmsupload', {
        uid: _uid,
        ticket: _ticket,
        filename: _filename
    } );

    return deferred.promise;
};

/**
 * Initialize search result label for Result and Filter tabs.
 *
 * @param {Object} data the view model data object
 *
 */
export let initSearchResultKeyFunction = function( data ) {
    data.keyWordLabel = data.keyWord;
};

/**
 * Split type list string on IURLActionCommandHandler#COMMANDARGS_DELIMITER ( & )
 *
 * @param {String} typeListString - Properly formatted type list string
 * @return {String[]} List of types
 */
export let getTypeList = function( typeListString ) {
    return typeListString.split( '&' );
};

/**
 * Replace item revision with item. Note, there is no good way to find item type from item revision
 * type without looping through all item subtypes and check the Revision type constant of each item type,
 * so follow RAC to do string comparison.
 *
 * @param {String} type Name of the type that may be Revision
 * @returns {String} Name of actual type
 */
const getNonRevisionType = type => {
    if( _.endsWith( type, 'Revision' ) ) {
        var idx = type.indexOf( 'Revision' );
        //trim required to handle "Item Revision" and "ItemRevision"
        return type.substring( 0, idx ).trim();
    }
    return type;
};

/**
 * Update the add object context
 *
 * @param {Object} panelContext - (Optional) The context for the panel. May contain command arguments.
 */
export let updateAddObjectContext = function( panelContext ) {
    console.log(panelContext);
    //If the panel is already opened do nothing
    //Eventually this could be modified to update the context and expect the panel to respond to the change
    //Just doing nothing (next action will close panel) to match existing behavior
    if( appCtxService.getCtx( 'activeToolsAndInfoCommand.commandId' ) === 'Awp0ShowCreateObject' ) {
        return;
    }

    var targetObjectVMO = appCtxService.getCtx( 'selected' );

    var addObjectContext = {
        relationType: 'contents',
        refreshFlag: false,
        targetObject: targetObjectVMO,
        loadSubTypes: true,
        typeFilterNames: 'WorkspaceObject',
        relationMap: panelContext ? panelContext.relationMap : null
    };
    if( panelContext && panelContext.visibleTabs ) {
        addObjectContext.visibleTabs = panelContext.visibleTabs;
    }
    if( panelContext && !_.isUndefined( panelContext.showConfiguredRevision ) ) {
        addObjectContext.showConfiguredRevision = panelContext.showConfiguredRevision;
    }
    if( panelContext && panelContext.isConfRevPWAEnabledThroughPref && panelContext.isConfRevPWAEnabledThroughPref === 'false' ) {
        addObjectContext.showConfiguredRevision = 'false';
    }

    var baseTypeNameList = [];
    var shouldCheckIfDataset = true;

    if( !panelContext ) {
        panelContext = {};
    }

    //If a panel context is set and includes a list of types the command is being executed from URL
    var executedFromURL = panelContext.types && panelContext.types.length;
    console.log(executedFromURL);
    if( executedFromURL ) {
        baseTypeNameList = exports.getTypeList( panelContext.types );
        console.log(baseTypeNameList);
        //Only show "New" tab
        addObjectContext.visibleTabs = 'new';
        //Don't show Recent section
        addObjectContext.maxRecentCount = 0;
        //Don't include sub types
        addObjectContext.loadSubTypes = false;
    } else if( panelContext.target && panelContext.relationMap ) {
        //Add to specific logic
        //Don't check for dataset types
        shouldCheckIfDataset = false;
        //loadSubTypes has to be unset
        delete addObjectContext.loadSubTypes;
        //Set the target object
        // For tree view, ViewModelTreeNode is required for retaining selection when added from
        // objectSet "Add To" command. So the check of alternateID is added
        addObjectContext.targetObject = targetObjectVMO.alternateID ? targetObjectVMO : panelContext.target;
        //Get the type name list
        baseTypeNameList = Object.keys( panelContext.relationMap ).map( getNonRevisionType );
        addObjectContext.typeFilterNames = Object.keys( panelContext.relationMap ).join( ',' );
        addObjectContext.validTypes = Object.keys( panelContext.relationMap );
        //Set the relation type
        addObjectContext.relationType = Object.keys(
            Object.keys( panelContext.relationMap ).reduce( function( map, i ) {
                var rels = panelContext.relationMap[ i ];
                rels.map( function( i ) {
                    map[ i ] = true;
                } );
                return map;
            }, {} ) ).join( ',' );
        //Set the search filter
        if( panelContext.searchFilter ) {
            addObjectContext.searchFilter = panelContext.searchFilter;
        }
    } else {
        //Otherwise get the type list from the preference
        baseTypeNameList = appCtxService.getCtx( 'preferences.AWC_DefaultCreateTypes' );
    }

    //If no types are set (in preference or URL)
    if( !baseTypeNameList || baseTypeNameList.length === 0 ) {
        //Default to Item and Folder
        baseTypeNameList = [ 'Item', 'Folder' ];
    }
    //If there is a single type specified do auto-select when the type is loaded
    if( baseTypeNameList.length === 1 ) {
        console.log(addObjectContext);
        addObjectContext.autoSelectOnUniqueType = true;
    }
    addObjectContext.includedTypes = baseTypeNameList.join( ',' );
    addObjectContext.typeFilterNamesArray = addObjectContext.typeFilterNames.split( ',' );
    //Register the context
    appCtxService.registerCtx( 'addObject', addObjectContext );

    var isDataset = baseTypeNameList.indexOf( 'Dataset' ) !== -1 || panelContext.objectSetSourceHasDataset === true;

    //If this is dataset
    console.log("isDataset"+isDataset);
    console.log("shouldCheckIfDataset   "+shouldCheckIfDataset);
    console.log(addObjectContext);
    if( isDataset ) {
        //Show dataset upload panel
        addObjectContext.showDataSetUploadPanel = true;
        appCtxService.updateCtx( 'addObject', addObjectContext );
    } else if( shouldCheckIfDataset ) {
        //Otherwise call SOA for some reason
        _soaService.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
            datasetTypeNames: baseTypeNameList
        } ).then( function( response ) {
            addObjectContext.showDataSetUploadPanel = response.infos.length > 0;
            addObjectContext.moreLinkShown = response.infos.length > 0;
            appCtxService.updateCtx( 'addObject', addObjectContext );
        } );
    }
};

/**
 * Gets the created object from createRelateAndSubmitObjects SOA response. Returns ItemRev if the creation type
 * is subtype of Item.
 *
 * @param {Object} the response of createRelateAndSubmitObjects SOA call
 * @return the created object
 */
export let getDatasets = function( response ) {
    var datasets = [];

    if( response.output ) {
        for( var index in response.output ) {
            if( response.output[ index ].datasets && response.output[ index ].datasets.length > 0 ) {
                datasets = datasets.concat( response.output[ index ].datasets );
            }
        }
    }

    return datasets;
};

/**
 * Start the multi file upload process.  It first checks if there is data.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {string} fmsUrl - The FMS URL
 */
export let startMultiFileUpload = function( data, fmsUrl ) {
    _fmsUrl = fmsUrl;

    var filesToBeRelated = [];
    _.forEach( data.filesToBeRelated, function( object ) {
        filesToBeRelated.push( object );
    } );

    // Check if all files uploaded
    if( data.datasetInfos && filesToBeRelated.length !== data.datasetInfos.length ) {
        // not all files will be uploaded, inform the user

        var datasetFileNames = [];
        for( var y = 0; y < data.datasetInfos.length; ++y ) {
            var datasetName = data.datasetInfos[ y ].commitInfo[0].datasetFileTicketInfos[ 0 ].datasetFileInfo.fileName;
            datasetFileNames.push( datasetName );
        }

        // find differences between expected and actual list
        var diff = _.difference( filesToBeRelated, datasetFileNames );

        // display message for each missing file
        _.forEach( diff, function( object ) {
            var failureToAttachFilesMsg = _failureToAttachFiles.replace( '{0}', object );
            _messagingService.showError( failureToAttachFilesMsg );
        } );

        logger.error( 'Failed to attach file(s) chosen. Some file extension(s) are not eligible based on IRDC for ' +
            '"' + data.createdMainObject.modelType.name + '"' + ' Object type.' );
    }

    if( !data.datasetInfos || data.datasetInfos.length === 0 ) {
        // no files to upload
        if( data.pasteOnTargetCondition ) {
            eventBus.publish( 'addObject.toTargetSuccess' );
        } else {
            eventBus.publish( 'addObject.setTarget' );
        }
        _datasetInfoIndex = -1;
    } else {
        _datasetInfoIndex = -1;
        eventBus.publish( 'addObject.initNextUpload' );
    }
};

/**
 * Sets the needed data prior to the POST action and the commitFiles SOA.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let initNextUpload = function( data ) {
    // first, check if we just uploaded a file; if so, reset the input element
    if( _datasetInfoIndex >= 0 && data.formData ) {
        data.formData.value = '';
        data.formData = null;
        eventBus.publish( 'progress.end', {
            endPoint: _fmsUrl
        } );
    }

    // next, advance the index and see if we are finished
    _datasetInfoIndex++;
    if( _datasetInfoIndex >= data.datasetInfos.length ) {
        // no more files to upload - commit datasets
        eventBus.publish( 'addObject.commitUploadedDataset' );

        _datasetInfoIndex = -1;
        return;
    }

    // get the values that we will need for the upload and the commit
    var commitInfo = data.datasetInfos[ _datasetInfoIndex ].commitInfo[ 0 ];
    data.fileName = commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.fileName;
    var fmsTicket = commitInfo.datasetFileTicketInfos[ 0 ].ticket;

    if( setFmsTicketVar( data, data.fileName, fmsTicket ) ) {
        var commitInput = {
            dataset: commitInfo.dataset,
            createNewVersion: false,
            datasetFileTicketInfos: [ {
                datasetFileInfo: {
                    clientId: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.clientId,
                    fileName: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.fileName,
                    namedReferencedName: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.namedReferenceName,
                    isText: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.isText,
                    allowReplace: commitInfo.datasetFileTicketInfos[ 0 ].datasetFileInfo.allowReplace
                },
                ticket: commitInfo.datasetFileTicketInfos[ 0 ].ticket
            } ]
        };

        // save all inputs so single commit may be performed
        if( !data.commitInput ) {
            data.commitInput = [];
        }
        data.commitInput.push( commitInput );

        eventBus.publish( 'progress.start', {
            endPoint: _fmsUrl
        } );

        // this is an empty event; it's needed to allow some processing to execute before the upload occurs
        eventBus.publish( 'addObject.uploadReady' );
    } else {
        // error
        _messagingService.reportNotyMessage( data, data._internal.messages, 'uploadFailed' );
        data.commitInfo = {};

        // move on to next file
        exports.initNextUpload( data );
    }
};

/**
 * Sets the proper fmsTicket variable that will trigger the proper aw-file-upload to set data.formData to the proper
 * file input.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {string} fileName - The name of the file, used to ID the proper fmsTicket variable
 * @param {object} ticketValue - The FMS ticket that will be assigned to the variable
 * @returns {Boolean} true if successful, false otherwise
 */
function setFmsTicketVar( data, fileName, ticketValue ) {
    var i;
    var fileInputForms = data.fileInputForms;

    if( !fileInputForms && data.customPanelInfo && data.customPanelInfo.Awp0MultiFileUpload ) {
        fileInputForms = data.customPanelInfo.Awp0MultiFileUpload.fileInputForms;
    }

    if( fileInputForms ) {
        for( i = 0; i < fileInputForms.length; i++ ) {
            if( fileInputForms[ i ].selectedFile && fileInputForms[ i ].selectedFile !== '' &&
                fileInputForms[ i ].selectedFile === fileName ) {
                fileInputForms[ i ].fmsTicket = ticketValue;

                if( fileInputForms[ i ].file ) {
                    data.formData = new FormData();
                    data.formData.append( 'fmsFile', fileInputForms[ i ].file, fileName );
                    data.formData.append( 'fmsTicket', fileInputForms[ i ].fmsTicket );
                } else {
                    var formElement = $( '#' + fileInputForms[ i ].id );
                    data.formData = new FormData( $( formElement )[ 0 ] );
                    data.formData.append( 'fmsTicket', fileInputForms[ i ].fmsTicket );
                }

                return true;
            }
        }
    }

    var pasteInputFiles = data.pasteFiles;
    if( !pasteInputFiles && data.customPanelInfo && data.customPanelInfo.Awp0MultiFileUpload ) {
        pasteInputFiles = data.customPanelInfo.Awp0MultiFileUpload.pasteInputFiles;
    }

    if( pasteInputFiles ) {
        for( i = 0; i < pasteInputFiles.length; i++ ) {
            if( fileName === pasteInputFiles[ i ].name ) {
                data.formData = new FormData();
                data.formData.append( 'fmsFile', pasteInputFiles[ i ], fileName );
                data.formData.append( 'fmsTicket', ticketValue );
                return true;
            }
        }
    }

    return false;
}

/**
 * Get the value to use for "accepts" attribute on file upload widget
 *
 * @param {Object} relationMap Relation map provided to the panel
 * @returns {String} File extension string
 */
export const getDatasetFileExtensions = function( { relationMap } ) {
    const datasetTypeNames = Object.keys( relationMap );
    //if generic Dataset allow all file types
    return datasetTypeNames.includes( 'Dataset' ) ? AwPromiseService.instance.resolve( '' ) : _soaService.postUnchecked( 'Core-2007-06-DataManagement', 'getDatasetTypeInfo', {
        datasetTypeNames
    } ).then( function( response ) {
        const validExtensions = response.infos.reduce( ( extensions, { refInfos } ) => {
            const nxtExts = refInfos
                .filter( x => x.fileFormat === 'BINARY' )
                .map( x => x.fileExtension.slice( 1 ) ); //*.xlsx -> .xlsx
            return [ ...extensions, ...nxtExts ];
        }, [] );
        return _.uniq( validExtensions ).join( ',' ).slice( 1 );
    } );
};

localeService.getLocalizedTextFromKey( 'UIElementsMessages.failureToAttachFiles', true ).then(
    result => _failureToAttachFiles = result || '{0}' ); // add defaulting to avoid failure during unit test runs

export default exports = {
    getDatasetFileExtensions,
    getPropertiesProject,
    isSupportedTCVersion,
    setPin,
    setUnPin,
    setPinnedToForm,
    setUnPinnedToForm,
    updateSelectionModeForDataProvider,
    getRecentUsedTypes,
    updateRecentUsedTypes,
    getCreateInput,
    updateResultKeyWords,
    findSubBusinessObjectsAndInvokeSearch,
    processSearchFilters,
    updateSearchFilter,
    updateHierarchicalSearchFilter,
    updateSearchDateRangeFilter,
    updateSearchNumericRangeFilter,
    updateKeywordFilters,
    updateFilter,
    getCreateRelationsInput,
    getCreatedObject,
    getCreatedObjects,
    getModelObjectsForCreateRelation,
    sortProjects,
    getProjects,
    getFileFormat,
    initDSCreateParams,
    getDatasetTypeFromTypeInfo,
    getDatasetTypesFromTypesWithRelInfo,
    getReferences,
    getFileExtension,
    updateTypeAndReferences,
    updateRelationList,
    backToTypeSelPanel,
    updateTargetObject,
    uploadFilePreinit,
    initSearchResultKeyFunction,
    getTypeList,
    updateAddObjectContext,
    getDatasets,
    startMultiFileUpload,
    initNextUpload,
    clearSelectedType,
    showMoreLinkStyles,
    populateUploadFileInfo,
    registerNewTabPageSubCB
};

app.factory( 'addObjectUtils', () => exports );

